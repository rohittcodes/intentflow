"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronRight, Clock, CheckCircle2, XCircle, Code2 } from "lucide-react";
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
        return <CheckCircle2 className="w-16 h-16 text-green-500" />;
      case "failed":
        return <XCircle className="w-16 h-16 text-red-500" />;
      case "running":
        return <Clock className="w-16 h-16 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-16 h-16 text-gray-400" />;
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
            <div className="flex items-center justify-between p-20 border-b border-black-alpha-8">
              <div className="flex items-center gap-12">
                <Code2 className="w-20 h-20 text-heat-100" />
                <div>
                  <h2 className="text-label-large font-bold text-accent-black">
                    Node Inspector
                  </h2>
                  <p className="text-body-small text-black-alpha-56">
                    {nodeName || nodeId}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-32 h-32 rounded-8 hover:bg-black-alpha-4 flex items-center justify-center transition-colors"
              >
                <X className="w-18 h-18 text-black-alpha-56" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-20 space-y-20">
              {!nodeResult ? (
                <div className="text-center py-40">
                  <Clock className="w-48 h-48 text-black-alpha-24 mx-auto mb-16" />
                  <p className="text-body-medium text-black-alpha-48">
                    No execution data available
                  </p>
                </div>
              ) : (
                <>
                  {/* Status Card */}
                  <div
                    className={`p-16 rounded-16 border ${getStatusColor(
                      nodeResult.status
                    )}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-12">
                        {getStatusIcon(nodeResult.status)}
                        <div>
                          <p className="text-label-medium font-bold capitalize">
                            {nodeResult.status || "Unknown"}
                          </p>
                          {duration !== null && (
                            <p className="text-body-small opacity-70">
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
                      <div className="space-y-12">
                        {nodeResult.toolCalls.map((call, idx) => (
                          <div
                            key={idx}
                            className="p-12 bg-background-base rounded-12 border border-black-alpha-8"
                          >
                            <p className="text-label-small font-bold text-accent-black mb-8">
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

                  {/* Error Section */}
                  {nodeResult.error && (
                    <Section
                      title="Error"
                      isExpanded={expandedSections.has("error")}
                      onToggle={() => toggleSection("error")}
                    >
                      <div className="p-12 bg-red-50 border border-red-200 rounded-12">
                        <pre className="text-body-small text-red-700 font-mono whitespace-pre-wrap break-words">
                          {nodeResult.error}
                        </pre>
                      </div>
                    </Section>
                  )}

                  {/* Metadata */}
                  <div className="p-16 bg-background-base rounded-16 border border-black-alpha-8">
                    <p className="text-[10px] uppercase tracking-wider text-black-alpha-40 font-bold mb-12">
                      Metadata
                    </p>
                    <div className="space-y-8 text-body-small">
                      <div className="flex justify-between">
                        <span className="text-black-alpha-56">Node ID</span>
                        <span className="text-accent-black font-mono text-xs">
                          {nodeResult.nodeId}
                        </span>
                      </div>
                      {nodeResult.startedAt && (
                        <div className="flex justify-between">
                          <span className="text-black-alpha-56">Started</span>
                          <span className="text-accent-black">
                            {new Date(nodeResult.startedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      {nodeResult.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-black-alpha-56">Completed</span>
                          <span className="text-accent-black">
                            {new Date(nodeResult.completedAt).toLocaleTimeString()}
                          </span>
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
        className="w-full flex items-center justify-between p-16 bg-background-base hover:bg-black-alpha-4 transition-colors"
      >
        <span className="text-label-medium font-bold text-accent-black">
          {title}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-16 h-16 text-black-alpha-56" />
        ) : (
          <ChevronRight className="w-16 h-16 text-black-alpha-56" />
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
            <div className="p-16 bg-accent-white">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Code Block Component
function CodeBlock({ code, compact = false }: { code: string; compact?: boolean }) {
  return (
    <div className={`bg-[#1E1E1E] rounded-12 overflow-hidden ${compact ? 'max-h-200' : 'max-h-400'} overflow-y-auto`}>
      <pre className="p-12 text-[11px] leading-relaxed font-mono text-[#D4D4D4]">
        {code}
      </pre>
    </div>
  );
}
