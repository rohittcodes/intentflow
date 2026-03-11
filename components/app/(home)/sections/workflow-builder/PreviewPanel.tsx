"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WorkflowExecution, NodeExecutionResult } from "@/lib/workflow/types";

interface PreviewPanelProps {
  execution: WorkflowExecution | null;
  nodeResults: Record<string, NodeExecutionResult>;
  isRunning: boolean;
  onClose: () => void;
}

export default function PreviewPanel({ execution, nodeResults, isRunning, onClose }: PreviewPanelProps) {
  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed right-20 top-80 h-[calc(100vh-100px)] w-480 bg-accent-white border border-border shadow-lg overflow-y-auto z-50 rounded-16"
      >
        {/* Header */}
        <div className="p-6 border-b border-border sticky top-0 bg-accent-white">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-title-h3 text-foreground">Workflow Preview</h2>
            <button
              onClick={onClose}
              className="w-32 h-32 rounded-6 hover:bg-secondary transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Badge */}
          {execution && (
            <div className={`inline-flex items-center gap-2 px-12 py-6 rounded-md text-xs ${execution.status === 'running' ? 'bg-secondary text-primary' :
                execution.status === 'completed' ? 'bg-secondary text-primary' :
                  execution.status === 'failed' ? 'bg-secondary text-foreground' :
                    'bg-gray-50 text-gray-600'
              }`}>
              {execution.status === 'running' && (
                <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {execution.status}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {isRunning && Object.keys(nodeResults).length === 0 ? (
            <div className="text-center py-32">
              <svg className="w-48 h-48 mx-auto mb-4 text-primary animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-sm text-muted-foreground">Starting workflow...</p>
            </div>
          ) : Object.keys(nodeResults).length === 0 ? (
            <div className="text-center py-32">
              <svg className="w-48 h-48 mx-auto mb-4 text-black-alpha-32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-muted-foreground">Click Preview to run workflow</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(nodeResults).map(([nodeId, result]) => (
                <div key={nodeId} className="bg-background rounded-xl p-4 border border-border">
                  {/* Node Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-label-medium text-foreground font-medium">
                      {nodeId}
                    </h3>
                    <span className={`text-xs px-8 py-4 rounded-6 ${result.status === 'running' ? 'bg-secondary text-primary' :
                        result.status === 'completed' ? 'bg-secondary text-primary' :
                          result.status === 'failed' ? 'bg-secondary text-foreground' :
                            'bg-gray-50 text-gray-600'
                      }`}>
                      {result.status}
                    </span>
                  </div>

                  {/* Node Output */}
                  {result.output && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-8">Output:</p>
                      <div className="bg-accent-white rounded-md p-3 border border-border">
                        <pre className="text-xs text-foreground whitespace-pre-wrap overflow-auto max-h-200">
                          {typeof result.output === 'string'
                            ? result.output
                            : JSON.stringify(result.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {result.error && (
                    <div className="mt-3">
                      <p className="text-xs text-foreground mb-8">Error:</p>
                      <div className="bg-secondary rounded-md p-3 border border-border">
                        <pre className="text-xs text-foreground whitespace-pre-wrap">
                          {result.error}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Timing */}
                  {result.startedAt && result.completedAt && (
                    <p className="text-xs text-black-alpha-32 mt-8">
                      Duration: {Math.round((new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime()) / 1000)}s
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
