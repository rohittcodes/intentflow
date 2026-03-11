import { v } from "convex/values";
import { query, mutation, action, internalQuery } from "./_generated/server";
import { anyApi } from "convex/server";

/**
 * Mem0-Style Memory Layer — Convex Backend
 *
 * Each memory is a single atomic fact extracted from workflow outputs.
 * Memories are scoped to: "thread" | "workflow" | "user".
 * Semantic retrieval is powered by Convex's built-in vector index.
 */

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Insert a new atomic memory row */
export const addMemory = mutation({
  args: {
    userId: v.string(),
    content: v.string(),
    embedding: v.array(v.float64()),
    scope: v.string(),
    scopeId: v.string(),
    agentId: v.optional(v.string()),
    sourceNodeId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }
    const now = new Date().toISOString();
    return await ctx.db.insert("memories", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Update the content and embedding of an existing memory */
export const updateMemory = mutation({
  args: {
    memoryId: v.id("memories"),
    content: v.string(),
    embedding: v.array(v.float64()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const existing = await ctx.db.get(args.memoryId);
    if (!existing || existing.userId !== identity?.subject) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.memoryId, {
      content: args.content,
      embedding: args.embedding,
      metadata: args.metadata ?? existing.metadata,
      updatedAt: new Date().toISOString(),
    });
    return args.memoryId;
  },
});

/** Delete a single memory by ID */
export const deleteMemory = mutation({
  args: {
    memoryId: v.id("memories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const existing = await ctx.db.get(args.memoryId);
    if (!existing || existing.userId !== identity?.subject) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.memoryId);
  },
});

/** Delete all memories for a given scope/scopeId (used by Clear mode) */
export const clearScope = mutation({
  args: {
    userId: v.string(),
    scope: v.string(),
    scopeId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }
    const rows = await ctx.db
      .query("memories")
      .withIndex("by_scope", (q) =>
        q.eq("userId", args.userId).eq("scope", args.scope).eq("scopeId", args.scopeId)
      )
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return rows.length;
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List all memories for a given scope/scopeId (for the UI inspector) */
export const listMemories = query({
  args: {
    scope: v.string(),
    scopeId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("memories")
      .withIndex("by_scope", (q) =>
        q.eq("userId", identity.subject).eq("scope", args.scope).eq("scopeId", args.scopeId)
      )
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Semantic vector search for existing memories.
 * Returns up to `topK` memories ordered by cosine similarity.
 * Used by the executor to find candidates for UPDATE/DELETE/NOOP decisions.
 */
export const searchMemories = action({
  args: {
    userId: v.string(),
    scope: v.string(),
    queryEmbedding: v.array(v.float64()),
    topK: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const results = await ctx.vectorSearch("memories", "by_embedding", {
      vector: args.queryEmbedding,
      limit: args.topK ?? 5,
      filter: (q) => q.eq("userId", args.userId),
    });

    // Hydrate with full document content
    const memories = await Promise.all(
      results.map(async ({ _id, _score }) => {
        const doc = await ctx.runQuery(anyApi.memories.getById, { memoryId: _id });
        return doc ? { ...doc, _score } : null;
      })
    );
    return memories.filter(Boolean);
  },
});

/** Internal helper: get a single memory by ID (used in searchMemories action) */
export const getById = internalQuery({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.memoryId);
  },
});
