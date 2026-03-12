"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Filter,
  RefreshCw,
  ChevronDown,
  ScrollText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "completed" | "failed" | "running";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string; class: string }> = {
    completed: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Success",
      class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    failed: {
      icon: <XCircle className="h-3 w-3" />,
      label: "Failed",
      class: "bg-red-500/10 text-red-600 border-red-500/20",
    },
    running: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: "Running",
      class: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
  };
  const c = config[status] ?? { icon: <Clock className="h-3 w-3" />, label: status, class: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border", c.class)}>
      {c.icon}
      {c.label}
    </span>
  );
}

function formatDuration(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function LogsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const executions = useQuery(
    api.executions.listForWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip"
  );

  const filtered = (executions ?? []).filter(
    (e) => statusFilter === "all" || e.status === statusFilter
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pb-8 space-y-6"
    >
      <PageHeader
        title="Execution Logs"
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Runs</SelectItem>
                <SelectItem value="completed">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-muted/30 border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Workflow</span>
          <span>Status</span>
          <span>Started At</span>
          <span>Duration</span>
          <span>Details</span>
        </div>

        {/* Table Body */}
        {!executions ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading executions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <ScrollText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No runs yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Run a workflow and the logs will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((exec, i) => (
              <div key={exec._id}>
                <div
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-4 items-center hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === exec._id ? null : exec._id)}
                >
                  {/* Workflow name */}
                  <div className="font-medium text-sm truncate">
                    {exec.workflowName}
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={exec.status} />
                  </div>

                  {/* Started at */}
                  <div className="text-xs text-muted-foreground">
                    {formatDate(exec.startedAt)}
                  </div>

                  {/* Duration */}
                  <div className="text-xs text-muted-foreground font-mono">
                    {formatDuration(exec.startedAt, exec.completedAt ?? undefined)}
                  </div>

                  {/* Expand toggle */}
                  <div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        expandedRow === exec._id && "rotate-180"
                      )}
                    />
                  </div>
                </div>

                {/* Expanded Details Row */}
                {expandedRow === exec._id && (
                  <div className="px-4 pb-4 bg-muted/10 border-t border-border/20">
                    <div className="grid grid-cols-2 gap-6 pt-4">
                      {exec.error && (
                        <div className="col-span-2">
                          <p className="text-xs font-semibold text-red-500 mb-1">Error</p>
                          <pre className="text-xs text-muted-foreground bg-red-500/5 border border-red-500/10 rounded-lg p-3 overflow-auto max-h-40">
                            {exec.error}
                          </pre>
                        </div>
                      )}
                      {exec.input && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Input</p>
                          <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-auto max-h-32 border border-border/30">
                            {JSON.stringify(exec.input, null, 2)}
                          </pre>
                        </div>
                      )}
                      {exec.output && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Output</p>
                          <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-auto max-h-32 border border-border/30">
                            {JSON.stringify(exec.output, null, 2)}
                          </pre>
                        </div>
                      )}
                      {exec.cumulativeUsage && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Token Usage</p>
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <div>Input: <span className="font-mono text-foreground">{exec.cumulativeUsage.input_tokens}</span></div>
                            <div>Output: <span className="font-mono text-foreground">{exec.cumulativeUsage.output_tokens}</span></div>
                            <div>Total: <span className="font-mono font-bold text-foreground">{exec.cumulativeUsage.total_tokens}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
