"use client";

import { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import {
  Brain,
  Search,
  Trash2,
  ChevronDown,
  ChevronRight,
  Zap,
  BookOpen,
  Globe,
  GitBranch,
  Layers,
  Info,
} from "lucide-react";
import VariableReferencePicker from "./VariableReferencePicker";

interface MemoryNodePanelProps {
  node: Node | null;
  nodes: Node[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
}

const MODES = [
  {
    id: "smart",
    label: "Smart Write",
    icon: Brain,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    desc: "LLM extracts facts from upstream output and intelligently ADD / UPDATE / DELETE memories",
  },
  {
    id: "retrieve",
    label: "Retrieve",
    icon: Search,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    desc: "Semantic search — injects the most relevant memories into the next agent's context",
  },
  {
    id: "clear",
    label: "Clear",
    icon: Trash2,
    color: "text-red-500",
    bg: "bg-red-50 border-red-200",
    desc: "Delete all memories for the selected scope",
  },
];

const SCOPES = [
  { id: "user", label: "User", icon: Globe, desc: "Persists across all workflows for this user" },
  { id: "workflow", label: "Workflow", icon: GitBranch, desc: "Persists across all runs of this workflow" },
  { id: "thread", label: "Thread", icon: Layers, desc: "Only for this single workflow run" },
];

export default function MemoryNodePanel({
  node,
  nodes,
  onClose,
  onDelete,
  onUpdate,
}: MemoryNodePanelProps) {
  const nodeData = node?.data as any;

  const [mode, setMode] = useState<string>(nodeData?.memoryMode ?? "smart");
  const [scope, setScope] = useState<string>(nodeData?.memoryScope ?? "user");
  const [query, setQuery] = useState<string>(nodeData?.memoryQuery ?? "");
  const [topK, setTopK] = useState<number>(nodeData?.memoryTopK ?? 5);
  const [agentId, setAgentId] = useState<string>(nodeData?.memoryAgentId ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-save with debounce
  useEffect(() => {
    if (!node?.id) return;
    const id = setTimeout(() => {
      onUpdate(node.id, {
        memoryMode: mode,
        memoryScope: scope,
        memoryQuery: query,
        memoryTopK: topK,
        memoryAgentId: agentId || undefined,
      });
    }, 400);
    return () => clearTimeout(id);
  }, [mode, scope, query, topK, agentId, node?.id, onUpdate]);

  if (!node) return null;

  const selectedMode = MODES.find((m) => m.id === mode)!;
  const selectedScope = SCOPES.find((s) => s.id === scope)!;

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2 w-[260px]">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          Memory Node
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-purple-500 bg-purple-50 px-6 py-2 rounded-4">
            Mem0
          </span>
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Intelligent memory — extracts atomic facts, compares against existing memories, and
          auto-manages ADD / UPDATE / DELETE via a manager LLM.
        </p>
      </div>

      {/* Mode Selection */}
      <div>
        <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest mb-1">
          Mode
        </label>
        <div className="space-y-4">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`w-full p-2 rounded-lg border text-left transition-all ${active ? m.bg : "bg-accent-white border-border hover:border-black-alpha-16"
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${active ? m.color : "text-black-alpha-40"}`} />
                  <span className={`text-xs font-bold  ${active ? m.color : "text-foreground"}`}>
                    {m.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Memory Scope */}
      <div className="pt-4 border-t border-border">
        <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest mb-1">
          Memory Scope
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SCOPES.map((s) => {
            const Icon = s.icon;
            const active = scope === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setScope(s.id)}
                title={s.desc}
                className={`p-2 rounded-lg border text-center transition-all ${active
                  ? "bg-purple-50 border-purple-200 text-purple-700"
                  : "bg-accent-white border-border text-black-alpha-56 hover:border-purple-100"
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${active ? "text-purple-600" : "text-black-alpha-32"}`} />
                <span className="text-[10px] font-bold uppercase tracking-tight block">{s.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-black-alpha-40 leading-snug">{selectedScope.desc}</p>
      </div>

      {/* Retrieve Mode Options */}
      {mode === "retrieve" && (
        <div className="pt-4 border-t border-border space-y-4">
          {/* Query */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest">
                Search Query
              </label>
              <VariableReferencePicker
                nodes={nodes}
                currentNodeId={node.id}
                onSelect={(ref) => setQuery((prev) => prev + `{{${ref}}}`)}
              />
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              placeholder="What to search for... (leave empty to use lastOutput)"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-purple-400 transition-all resize-none"
            />
            <p className="mt-1 text-[10px] text-black-alpha-36">
              Supports <code className="font-mono">{"{{variable}}"}</code> references. If empty,
              uses the upstream lastOutput.
            </p>
          </div>

          {/* Top-K Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest">
                Inject Top
              </label>
              <span className="text-sm font-semibold text-purple-600">{topK} memories</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <p className="mt-1 text-[10px] text-black-alpha-36">
              Top-{topK} most semantically relevant memories will be injected into the next
              agent's system prompt.
            </p>
          </div>
        </div>
      )}

      {/* Clear Mode Warning */}
      {mode === "clear" && (
        <div className="pt-4 border-t border-border">
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-start gap-2">
              <Trash2 className="w-3.5 h-3.5 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-700 mb-2">Destructive operation</p>
                <p className="text-[11px] text-red-600 leading-relaxed">
                  All memories in the <strong>{selectedScope.label}</strong> scope will be permanently deleted when this node executes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-2 text-xs font-bold text-black-alpha-40 uppercase tracking-widest hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
          Advanced
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Agent ID / Attribution Label */}
            <div>
              <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest mb-1">
                Agent Attribution Label
              </label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="e.g. customer-support-agent"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-purple-400 transition-all"
              />
              <p className="mt-1 text-[10px] text-black-alpha-36">
                Tags memories with this label so you can filter by agent in the future.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* How It Works callout */}
      <div className="p-3 bg-secondary rounded-lg space-y-6">
        <div className="flex items-center gap-6">
          <Info className="w-4 h-4 text-black-alpha-32" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-black-alpha-32">
            How it works
          </span>
        </div>
        {mode === "smart" && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Phase 1</strong> — An extraction LLM distills atomic facts from the upstream
            output.<br />
            <strong>Phase 2</strong> — Each fact is embedded and vector-searched against existing memories.<br />
            <strong>Phase 3</strong> — A manager LLM decides ADD / UPDATE / DELETE / NOOP per fact.
          </p>
        )}
        {mode === "retrieve" && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The query is embedded, then Convex vector search returns the top-{topK} semantically
            similar memories. They are injected into the <code className="font-mono">state.memory</code> map,
            which the next Agent node automatically prepends to its system prompt.
          </p>
        )}
        {mode === "clear" && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Deletes all memories scoped to the current{" "}
            <strong>{selectedScope.label.toLowerCase()}</strong>. Useful for resetting between
            sessions or after a workflow completes.
          </p>
        )}
      </div>
    </div>
  );
}
