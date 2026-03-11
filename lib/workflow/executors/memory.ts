import { WorkflowNode, WorkflowState, ApiKeys } from "../types";
import { anyApi } from "convex/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemoryFact {
  fact: string;
}

interface ManagerDecision {
  op: "ADD" | "UPDATE" | "DELETE" | "NOOP";
  targetId?: string; // Convex memory ID for UPDATE/DELETE
  reason?: string;
}

interface MemoryChange {
  op: "ADD" | "UPDATE" | "DELETE" | "NOOP";
  content: string;
  memoryId?: string;
}

interface MemoryOptions {
  apiKeys?: ApiKeys;
  convex?: any; // ConvexHttpClient
  userId?: string;
  threadId?: string;
  workflowId?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a memory extraction assistant. Given a piece of text, extract all distinct, atomic facts worth remembering.

Rules:
- Each fact must be a single, self-contained statement
- Facts must be specific (not vague summaries)
- Omit filler, pleasantries, and meta-commentary
- Return a JSON array of strings: ["fact1", "fact2", ...]
- If there are no memorable facts, return an empty array: []`;

const MANAGER_SYSTEM_PROMPT = `You are a memory manager. Given a new fact and a list of existing, semantically similar memories, decide the correct operation.

Operations:
- ADD: The fact is genuinely new information not covered by any existing memory
- UPDATE: The fact refines, corrects, or updates an existing memory (return its ID)
- DELETE: The fact contradicts or invalidates an existing memory (return its ID)
- NOOP: The fact is redundant — it is already captured by an existing memory

Return ONLY valid JSON: {"op":"ADD"|"UPDATE"|"DELETE"|"NOOP","targetId":"<existing memory _id or null>","reason":"<brief explanation>"}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate an OpenAI text-embedding-3-small embedding vector */
async function embed(text: string, apiKey: string): Promise<number[]> {
  const client = new OpenAI({ apiKey });
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

/** Call a cheap LLM for extraction or management decisions */
async function callLLM(
  systemPrompt: string,
  userMessage: string,
  apiKeys: ApiKeys
): Promise<string> {
  // Prefer haiku for speed/cost; fall back to openai mini
  if (apiKeys.anthropic) {
    const client = new Anthropic({ apiKey: apiKeys.anthropic });
    const res = await client.messages.create({
      model: "claude-haiku-20240307",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = res.content[0];
    return block.type === "text" ? (block as any).text : "";
  }
  if (apiKeys.openai) {
    const client = new OpenAI({ apiKey: apiKeys.openai });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }
  throw new Error("Memory node: No LLM API key available (need Anthropic or OpenAI)");
}

/** Parse JSON from LLM response, stripping markdown fences if present */
function parseJSON<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/** Resolve the scope ID from runtime context */
function resolveScopeId(
  scope: string,
  options: MemoryOptions
): string {
  if (scope === "thread") return options.threadId ?? options.userId ?? "default";
  if (scope === "workflow") return options.workflowId ?? options.userId ?? "default";
  return options.userId ?? "default"; // "user" scope
}

// ─── Mode: Smart (Extract + Manage) ─────────────────────────────────────────

async function runSmartMode(
  node: WorkflowNode,
  state: WorkflowState,
  options: MemoryOptions,
  addLog: (msg: string, level?: string) => void
): Promise<any> {
  const { apiKeys, convex, userId } = options;
  if (!apiKeys || !convex || !userId) {
    throw new Error("Memory node (smart): requires apiKeys, convex client, and userId");
  }

  const scope = (node.data.memoryScope as string) ?? "user";
  const scopeId = resolveScopeId(scope, options);
  const agentId = (node.data.memoryAgentId as string) ?? node.id;

  // Get the text to process — prefer lastOutput, fall back to the full variables snapshot
  const rawContent =
    state.variables.lastOutput
      ? typeof state.variables.lastOutput === "string"
        ? state.variables.lastOutput
        : JSON.stringify(state.variables.lastOutput)
      : JSON.stringify(state.variables);

  if (!rawContent || rawContent === "null") {
    addLog("Memory node: no content to process", "warn");
    return { memoriesChanged: [], message: "No content to process" };
  }

  // ── Phase 1: Extract atomic facts ─────────────────────────────────────────
  addLog(`Memory node: extracting facts from ${rawContent.length} chars`);
  const extractionRaw = await callLLM(
    EXTRACTION_SYSTEM_PROMPT,
    rawContent.slice(0, 8000), // hard cap to keep costs low
    apiKeys
  );
  const facts = parseJSON<string[]>(extractionRaw) ?? [];
  addLog(`Memory node: extracted ${facts.length} facts`);

  if (facts.length === 0) {
    return { memoriesChanged: [], message: "No facts extracted from content" };
  }

  const changes: MemoryChange[] = [];
  const openaiKey = apiKeys.openai ?? "";

  if (!openaiKey) {
    throw new Error("Memory node: OpenAI API key required for embeddings");
  }

  // ── Phase 2 + 3: Embed, search, decide + execute ──────────────────────────
  for (const fact of facts) {
    try {
      // Generate embedding for this fact
      const embedding = await embed(fact, openaiKey);

      // Search Convex for semantically similar existing memories
      const similar: any[] = await convex.action(anyApi.memories.searchMemories, {
        userId,
        scope,
        queryEmbedding: embedding,
        topK: 5,
      });

      // Build manager prompt with existing memories context
      const similarText =
        similar.length > 0
          ? similar
            .map((m) => `  - [id: ${m._id}] "${m.content}" (score: ${m._score?.toFixed(3) ?? "?"})\n`)
            .join("")
          : "  (none — this is a fresh memory store)";

      const managerPrompt = [
        `New fact: "${fact}"`,
        "",
        "Existing similar memories:",
        similarText,
        "",
        "Decide operation (ADD / UPDATE / DELETE / NOOP):",
      ].join("\n");

      const decisionRaw = await callLLM(MANAGER_SYSTEM_PROMPT, managerPrompt, apiKeys);
      const decision = parseJSON<ManagerDecision>(decisionRaw) ?? { op: "ADD" };

      addLog(`Memory node: "${fact.slice(0, 60)}…" → ${decision.op}`);

      // Execute the decided operation
      switch (decision.op) {
        case "ADD":
          await convex.mutation(anyApi.memories.addMemory, {
            userId,
            content: fact,
            embedding,
            scope,
            scopeId,
            agentId,
            sourceNodeId: node.id,
          });
          changes.push({ op: "ADD", content: fact });
          break;

        case "UPDATE":
          if (decision.targetId) {
            await convex.mutation(anyApi.memories.updateMemory, {
              memoryId: decision.targetId,
              content: fact,
              embedding,
            });
            changes.push({ op: "UPDATE", content: fact, memoryId: decision.targetId });
          } else {
            // Fallback to ADD if no target
            await convex.mutation(anyApi.memories.addMemory, {
              userId,
              content: fact,
              embedding,
              scope,
              scopeId,
              agentId,
              sourceNodeId: node.id,
            });
            changes.push({ op: "ADD", content: fact });
          }
          break;

        case "DELETE":
          if (decision.targetId) {
            await convex.mutation(anyApi.memories.deleteMemory, {
              memoryId: decision.targetId,
            });
            changes.push({ op: "DELETE", content: fact, memoryId: decision.targetId });
          }
          break;

        case "NOOP":
        default:
          changes.push({ op: "NOOP", content: fact });
          break;
      }
    } catch (factErr) {
      addLog(`Memory node: error processing fact "${fact.slice(0, 40)}" — ${factErr}`, "warn");
    }
  }

  const summary = `Memory updated: ${changes.filter((c) => c.op === "ADD").length} added, ${changes.filter((c) => c.op === "UPDATE").length} updated, ${changes.filter((c) => c.op === "DELETE").length} deleted, ${changes.filter((c) => c.op === "NOOP").length} unchanged`;
  addLog(`Memory node: ${summary}`);

  return {
    memoriesChanged: changes,
    message: summary,
  };
}

// ─── Mode: Retrieve (Semantic Search → Inject) ───────────────────────────────

async function runRetrieveMode(
  node: WorkflowNode,
  state: WorkflowState,
  options: MemoryOptions,
  addLog: (msg: string, level?: string) => void
): Promise<any> {
  const { apiKeys, convex, userId } = options;
  if (!apiKeys || !convex || !userId) {
    throw new Error("Memory node (retrieve): requires apiKeys, convex client, and userId");
  }
  if (!apiKeys.openai) {
    throw new Error("Memory node (retrieve): OpenAI key required for embeddings");
  }

  const scope = (node.data.memoryScope as string) ?? "user";
  const topK = (node.data.memoryTopK as number) ?? 5;

  // Build query from memoryQuery field (supports {{variable}}) or lastOutput
  let query = (node.data.memoryQuery as string) ?? "";
  // Resolve {{variable}} references
  query = query.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) =>
    String(state.variables[key] ?? "")
  );
  if (!query) {
    query =
      typeof state.variables.lastOutput === "string"
        ? state.variables.lastOutput
        : JSON.stringify(state.variables.lastOutput ?? "");
  }

  addLog(`Memory node (retrieve): querying "${query.slice(0, 80)}…" top-${topK}`);

  const embedding = await embed(query, apiKeys.openai);
  const results: any[] = await convex.action(anyApi.memories.searchMemories, {
    userId,
    scope,
    queryEmbedding: embedding,
    topK,
  });

  addLog(`Memory node (retrieve): found ${results.length} memories`);

  // Inject the retrieved memories into state.memory so agent.ts picks them up
  const injected: Record<string, string> = {};
  results.forEach((m, i) => {
    injected[`memory_${i + 1}`] = m.content;
  });

  return {
    retrievedMemories: results.map((m) => ({
      content: m.content,
      score: m._score,
      scope: m.scope,
      createdAt: m.createdAt,
    })),
    // These become state.memory entries — agent.ts prepends them to system prompts
    __memoryInjections: injected,
    message: `Retrieved ${results.length} memories for context injection`,
  };
}

// ─── Mode: Clear ─────────────────────────────────────────────────────────────

async function runClearMode(
  node: WorkflowNode,
  _state: WorkflowState,
  options: MemoryOptions,
  addLog: (msg: string, level?: string) => void
): Promise<any> {
  const { convex, userId } = options;
  if (!convex || !userId) {
    throw new Error("Memory node (clear): requires convex client and userId");
  }

  const scope = (node.data.memoryScope as string) ?? "user";
  const scopeId = resolveScopeId(scope, options);

  addLog(`Memory node (clear): deleting all ${scope}/${scopeId} memories`);

  const deleted: number = await convex.mutation(anyApi.memories.clearScope, {
    userId,
    scope,
    scopeId,
  });

  addLog(`Memory node (clear): deleted ${deleted} memories`);
  return {
    memoriesCleared: deleted,
    message: `Cleared ${deleted} memories for scope ${scope}/${scopeId}`,
  };
}

// ─── Main Executor ────────────────────────────────────────────────────────────

/**
 * Mem0-Style Memory Node Executor
 *
 * Three modes:
 *   smart    — LLM extracts atomic facts → embed → vector search → Manager LLM
 *              decides ADD/UPDATE/DELETE/NOOP → Convex mutations
 *   retrieve — Embed query → Convex vector search → inject top-K into state.memory
 *   clear    — Delete all memories for this scope/scopeId
 */
export async function executeMemoryNode(
  node: WorkflowNode,
  state: WorkflowState,
  options?: MemoryOptions
): Promise<any> {
  const logs: string[] = [];
  const addLog = (msg: string, level = "info") => {
    console.log(`[MemoryNode:${level}] ${msg}`);
    logs.push(msg);
  };

  const mode = (node.data.memoryMode as string) ?? "smart";

  try {
    let result: any;

    switch (mode) {
      case "retrieve":
        result = await runRetrieveMode(node, state, options ?? {}, addLog);
        break;
      case "clear":
        result = await runClearMode(node, state, options ?? {}, addLog);
        break;
      case "smart":
      default:
        result = await runSmartMode(node, state, options ?? {}, addLog);
        break;
    }

    // If retrieve mode returned memory injections, merge them into state.memory
    if (result.__memoryInjections && state.memory) {
      Object.assign(state.memory, result.__memoryInjections);
    }

    return {
      ...result,
      __logs: logs,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    addLog(`Memory node execution failed: ${msg}`, "error");
    throw new Error(`Memory node failed: ${msg}`);
  }
}
