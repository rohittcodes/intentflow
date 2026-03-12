"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Settings2,
  Sparkles,
  SearchCode,
  Target,
  History,
  Check,
  Ban,
  AlertCircle
} from "lucide-react";
import VariableReferencePicker from "./VariableReferencePicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    bg: "bg-purple-500/10 border-purple-500/20",
    accent: "bg-purple-500",
    desc: "LLM extracts facts from upstream output and intelligently ADD / UPDATE / DELETE memories",
  },
  {
    id: "retrieve",
    label: "Retrieve",
    icon: Search,
    color: "text-blue-600",
    bg: "bg-blue-500/10 border-blue-500/20",
    accent: "bg-blue-500",
    desc: "Semantic search — injects the most relevant memories into the next agent's context",
  },
  {
    id: "clear",
    label: "Clear",
    icon: Trash2,
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/20",
    accent: "bg-red-500",
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
    <div className="flex-1 overflow-y-auto p-2 space-y-5 w-full pb-10">
      {/* Header */}
      <div className="space-y-3 pt-1 px-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cognitive Memory</Label>
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[9px] font-bold uppercase tracking-widest px-1.5 h-5 rounded-sm">
            Mem0 SDK
          </Badge>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-2.5 px-1 border-t border-border/50 pt-4">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Operation Mode</Label>
        <div className="space-y-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <Button
                key={m.id}
                variant="outline"
                onClick={() => setMode(m.id)}
                className={cn(
                  "w-full h-auto p-3 justify-start items-center gap-3 transition-all rounded-md border-border/50 bg-muted/5 hover:bg-muted/10",
                  active && cn("bg-background border shadow-sm", m.bg, active && "border-primary/40 text-primary")
                )}
              >
                <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0 border", active ? cn(m.accent, "text-white border-white/20") : "bg-muted text-muted-foreground border-transparent")}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 text-left">
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", active ? "text-foreground" : "text-muted-foreground")}>
                    {m.label}
                  </span>
                </div>
                {active && <Check className="h-3 w-3 text-primary" />}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Memory Scope */}
      <div className="space-y-2.5 px-1 border-t border-border/50 pt-4">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scope</Label>
        <div className="grid grid-cols-3 gap-2 pb-1">
          {SCOPES.map((s) => {
            const Icon = s.icon;
            const active = scope === s.id;
            return (
              <Button
                key={s.id}
                variant="outline"
                onClick={() => setScope(s.id)}
                className={cn(
                  "h-auto flex-col gap-1.5 p-2 rounded-md transition-all border-border/50 bg-muted/5",
                  active && "bg-purple-500/10 border-purple-500/40 text-purple-600 shadow-sm"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", active ? "text-purple-600" : "text-muted-foreground/50")} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{s.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Retrieve Mode Options */}
      <AnimatePresence mode="wait">
        {mode === "retrieve" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 px-1 border-t border-border/50 pt-6"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Semantic Search</Label>
                <VariableReferencePicker
                  nodes={nodes}
                  currentNodeId={node.id}
                  onSelect={(ref) => setQuery((prev) => prev + `{{${ref}}}`)}
                />
              </div>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Query for semantic retrieval..."
                className="min-h-[70px] bg-muted/20 border-border/50 text-sm focus-visible:ring-blue-500/20 rounded-md p-3"
              />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500/60" />
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Depth Control</Label>
                </div>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 font-mono text-[10px] px-2">
                  k={topK}
                </Badge>
              </div>
              <Slider
                min={1}
                max={20}
                step={1}
                value={[topK]}
                onValueChange={([val]) => setTopK(val)}
                className="py-2"
              />
              <p className="text-[10px] text-muted-foreground italic font-medium px-1 leading-relaxed">
                Top-{topK} relevant memories will be prepended to the next agent's system prompt.
              </p>
            </div>
          </motion.div>
        )}

        {mode === "clear" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="px-1 border-t border-border/50 pt-6"
          >
            <Card className="bg-red-500/5 border-red-500/20 shadow-none border-dashed rounded-lg overflow-hidden">
              <CardContent className="p-4 flex gap-3">
                <div className="h-8 w-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Ban className="h-4 w-4 text-red-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-red-700 font-bold uppercase tracking-wider">Destructive Wipe</p>
                  <p className="text-[10px] text-red-600/70 leading-relaxed italic font-medium">
                    All memories in <strong>{selectedScope.label}</strong> scope will be permanently removed during workflow execution.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced */}
      <div className="px-1 border-t border-border/50 pt-6">
        <Accordion type="single" collapsible>
          <AccordionItem value="advanced" className="border-none">
            <AccordionTrigger className="hover:no-underline py-0">
              <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Advanced Configuration</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-6 space-y-4">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agent Attribution</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                    <History className="h-3.5 w-3.5" />
                  </div>
                  <Input
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    placeholder="e.g. support-bot-v2"
                    className="h-9 pl-9 bg-muted/10 border-border/50 font-mono text-[11px] focus-visible:ring-purple-500/20 rounded-md"
                  />
                </div>
                <p className="text-[9px] text-muted-foreground italic font-medium opacity-60">
                  Tag memories for future filtering by specific agent instance.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* How It Works callout */}
      <Card className="bg-secondary/40 border-border/30 shadow-none rounded-lg px-1">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/10 pb-2">
            <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0 opacity-60" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Knowledge Lifecycle</span>
          </div>

          <div className="space-y-3">
            {mode === "smart" && (
              <div className="space-y-2">
                {[
                  { step: '1', label: 'Distill', text: 'LLM extracts atomic facts from raw output.' },
                  { step: '2', label: 'Match', text: 'Vector search against existing scope.' },
                  { step: '3', label: 'Reconcile', text: 'Manager decides Sync vs New vs Delete.' }
                ].map((item) => (
                  <div key={item.step} className="flex gap-2.5">
                    <span className="h-4 w-4 rounded bg-purple-500/10 text-purple-600 text-[9px] font-bold flex items-center justify-center shrink-0">{item.step}</span>
                    <p className="text-[10px] text-muted-foreground italic leading-tight">
                      <strong className="text-foreground not-italic">{item.label}:</strong> {item.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {mode === "retrieve" && (
              <p className="text-[10px] text-muted-foreground italic leading-relaxed font-medium">
                Embeds input query & conducts Convex Vector Search. Returns top-{topK} context windows injected into the <code className="bg-blue-500/5 px-1 rounded-sm text-blue-600 font-mono">state.memory</code> register.
              </p>
            )}
            {mode === "clear" && (
              <p className="text-[10px] text-muted-foreground italic leading-relaxed font-medium text-red-700/60">
                Purges all vector records associated with the <strong>{selectedScope.label.toLowerCase()}</strong> scope. Irreversible operation.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
