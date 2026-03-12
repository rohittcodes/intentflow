"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronRight, Clock, CheckCircle2, XCircle, Code2, List, Activity } from "lucide-react";
import { useState } from "react";
import { NodeExecutionResult } from "@/lib/workflow/types";

interface OutputDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeName: string;
  nodeResult: NodeExecutionResult | null;
}

export default function OutputDrawer({
  isOpen,
  onClose,
  nodeId,
  nodeName,
  nodeResult,
}: OutputDrawerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["output"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const formatJSON = (data: any) => {
    if (data === null || data === undefined) return "null";
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "running":
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 border-green-200 text-green-700";
      case "failed":
        return "bg-red-50 border-red-200 text-red-700";
      case "running":
        return "bg-blue-50 border-blue-200 text-blue-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  const duration = nodeResult?.startedAt && nodeResult?.completedAt
    ? Math.round(
      (new Date(nodeResult.completedAt).getTime() -
        new Date(nodeResult.startedAt).getTime()) /
      1000
    )
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[200]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[500px] bg-accent-white border-l border-black-alpha-8 shadow-2xl z-[201] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-black-alpha-8">
              <div className="flex items-center gap-3">
                <Code2 className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-sm font-medium font-bold text-foreground">
                    Node Inspector
                  </h2>
                  <p className="text-xs text-black-alpha-56">
                    {nodeName || nodeId}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-32 h-32 rounded-md hover:bg-secondary flex items-center justify-center transition-colors"
              >
                <X className="w-18 h-18 text-black-alpha-56" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!nodeResult ? (
                <div className="text-center py-40">
                  <Clock className="w-48 h-48 text-black-alpha-24 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No execution data available
                  </p>
                </div>
              ) : (
                <>
                  {/* Status Card */}
                  <div
                    className={`p-4 rounded-16 border ${getStatusColor(
                      nodeResult.status
                    )}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(nodeResult.status)}
                        <div>
                          <p className="text-label-medium font-bold capitalize">
                            {nodeResult.status || "Unknown"}
                          </p>
                          {duration !== null && (
                            <p className="text-xs opacity-70">
                              {duration}s execution time
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input Section */}
                  {nodeResult.input && (
                    <Section
                      title="Input"
                      isExpanded={expandedSections.has("input")}
                      onToggle={() => toggleSection("input")}
                    >
                      <CodeBlock code={formatJSON(nodeResult.input)} />
                    </Section>
                  )}

                  {/* Output Section */}
                  {(nodeResult.output || nodeResult.result) && (
                    <Section
                      title="Output"
                      isExpanded={expandedSections.has("output")}
                      onToggle={() => toggleSection("output")}
                    >
                      <CodeBlock
                        code={formatJSON(
                          nodeResult.output || nodeResult.result
                        )}
                      />
                    </Section>
                  )}

                  {/* Tool Calls Section */}
                  {nodeResult.toolCalls && nodeResult.toolCalls.length > 0 && (
                    <Section
                      title={`Tool Calls (${nodeResult.toolCalls.length})`}
                      isExpanded={expandedSections.has("toolCalls")}
                      onToggle={() => toggleSection("toolCalls")}
                    >
                      <div className="space-y-3">
                        {nodeResult.toolCalls.map((call, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-background rounded-xl border border-black-alpha-8"
                          >
                            <p className="text-label-small font-bold text-foreground mb-8">
                              {call.name || `Tool ${idx + 1}`}
                            </p>
                            {call.arguments && (
                              <div className="mb-8">
                                <p className="text-[10px] uppercase tracking-wider text-black-alpha-40 font-bold mb-4">
                                  Arguments
                                </p>
                                <CodeBlock
                                  code={formatJSON(call.arguments)}
                                  compact
                                />
                              </div>
                            )}
                            {call.output && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-black-alpha-40 font-bold mb-4">
                                  Output
                                </p>
                                <CodeBlock
                                  code={formatJSON(call.output)}
                                  compact
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Logs Section */}
                  {nodeResult.logs && nodeResult.logs.length > 0 && (
                    <Section
                      title={`Execution Logs (${nodeResult.logs.length})`}
                      isExpanded={expandedSections.has("logs")}
                      onToggle={() => toggleSection("logs")}
                    >
                      <div className="space-y-8">
                        {nodeResult.logs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`p-10 rounded-md border text-[11px] leading-relaxed ${log.level === 'error'
                              ? 'bg-red-50 border-red-100 text-red-700'
                              : log.level === 'warn'
                                ? 'bg-amber-50 border-amber-100 text-amber-700'
                                : 'bg-secondary border-black-alpha-8 text-foreground/64'
                              }`}
                          >
                            <div className="flex justify-between mb-4 font-bold uppercase tracking-wider text-[9px]">
                              <span>{log.level}</span>
                              <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p>{log.message}</p>
                            {log.data && (
                              <div className="mt-4">
                                <CodeBlock code={formatJSON(log.data)} compact />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Error Section */}
                  {nodeResult.error && (
                    <Section
                      title="Error"
                      isExpanded={expandedSections.has("error")}
                      onToggle={() => toggleSection("error")}
                    >
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                        <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap break-words">
                          {nodeResult.error}
                        </pre>
                      </div>
                    </Section>
                  )}

                  {/* Metadata */}
                  <div className="p-4 bg-background rounded-16 border border-black-alpha-8">
                    <p className="text-[10px] uppercase tracking-wider text-black-alpha-40 font-bold mb-3">
                      Metadata
                    </p>
                    <div className="space-y-8 text-xs">
                      <div className="flex justify-between">
                        <span className="text-black-alpha-56">Node ID</span>
                        <span className="text-foreground font-mono text-xs">
                          {nodeResult.nodeId}
                        </span>
                      </div>
                      {nodeResult.startedAt && (
                        <div className="flex justify-between">
                          <span className="text-black-alpha-56">Started</span>
                          <span className="text-foreground">
                            {new Date(nodeResult.startedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      {nodeResult.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-black-alpha-56">Completed</span>
                          <span className="text-foreground">
                            {new Date(nodeResult.completedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      {nodeResult.usage && (
                        <div className="mt-3 pt-12 border-t border-black-alpha-8 space-y-8">
                          <p className="text-[10px] uppercase tracking-wider text-black-alpha-40 font-bold mb-8">
                            Token Usage
                          </p>
                          <div className="flex justify-between">
                            <span className="text-black-alpha-56">Input Tokens</span>
                            <span className="text-foreground">{nodeResult.usage.input_tokens}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-black-alpha-56">Output Tokens</span>
                            <span className="text-foreground">{nodeResult.usage.output_tokens}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span className="text-black-alpha-56">Total Tokens</span>
                            <span className="text-foreground">{nodeResult.usage.total_tokens || (nodeResult.usage.input_tokens! + nodeResult.usage.output_tokens!)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Section Component
function Section({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-black-alpha-8 rounded-16 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-background hover:bg-secondary transition-colors"
      >
        <span className="text-label-medium font-bold text-foreground">
          {title}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-black-alpha-56" />
        ) : (
          <ChevronRight className="w-4 h-4 text-black-alpha-56" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-accent-white">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Code Block Component
function CodeBlock({ code, compact = false }: { code: string; compact?: boolean }) {
  return (
    <div className={`bg-[#1E1E1E] rounded-xl overflow-hidden ${compact ? 'max-h-200' : 'max-h-400'} overflow-y-auto`}>
      <pre className="p-3 text-xs leading-relaxed font-mono text-[#D4D4D4] whitespace-pre overflow-x-auto">
        {code}
      </pre>
    </div>
  );
}
