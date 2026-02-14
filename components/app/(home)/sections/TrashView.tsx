"use client";

import { useState, useEffect } from "react";
import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface TrashedWorkflow {
  id: string;
  _id: string;
  name: string;
  description?: string;
  deletedAt: string;
  nodeCount: number;
  edgeCount: number;
}

export default function TrashView() {
  const [trashedWorkflows, setTrashedWorkflows] = useState<TrashedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Load trashed workflows
  const loadTrashed = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/workflows/trash");
      const data = await response.json();
      setTrashedWorkflows(data.workflows || []);
    } catch (error) {
      console.error("Failed to load trashed workflows:", error);
      toast.error("Failed to load trashed workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrashed();
  }, []);

  // Restore workflow from trash
  const handleRestore = async (workflowId: string, name: string) => {
    try {
      const response = await fetch("/api/workflows/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });

      if (response.ok) {
        toast.success(`"${name}" restored successfully`);
        loadTrashed();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to restore workflow");
      }
    } catch (error) {
      console.error("Failed to restore workflow:", error);
      toast.error("Failed to restore workflow");
    }
  };

  // Permanently delete workflow
  const handlePermanentDelete = async (workflowId: string, name: string) => {
    try {
      const response = await fetch(`/api/workflows/trash?id=${workflowId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`"${name}" permanently deleted`);
        setConfirmDelete(null);
        loadTrashed();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete workflow");
      }
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast.error("Failed to delete workflow");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex-1 overflow-y-auto p-24">
      {/* Header */}
      <div className="mb-24">
        <div className="flex items-center gap-12 mb-8">
          <Trash2 className="w-24 h-24 text-black-alpha-48" />
          <h1 className="text-title-h1 text-accent-black">Trash</h1>
        </div>
        <p className="text-body-medium text-black-alpha-64">
          Workflows in trash can be restored or permanently deleted
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-64">
          <div className="w-32 h-32 border-4 border-heat-100 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && trashedWorkflows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-64 text-center">
          <Trash2 className="w-64 h-64 text-black-alpha-16 mb-16" />
          <h3 className="text-title-h3 text-accent-black mb-8">Trash is empty</h3>
          <p className="text-body-medium text-black-alpha-48 max-w-400">
            Deleted workflows will appear here. You can restore them or permanently delete them.
          </p>
        </div>
      )}

      {/* Trashed Workflows List */}
      {!loading && trashedWorkflows.length > 0 && (
        <div className="space-y-12">
          {trashedWorkflows.map((workflow) => (
            <motion.div
              key={workflow._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-accent-white border border-border-faint rounded-12 p-20 hover:border-heat-100 transition-colors"
            >
              <div className="flex items-start justify-between gap-16">
                <div className="flex-1 min-w-0">
                  <h3 className="text-label-large text-accent-black font-medium mb-4">
                    {workflow.name}
                  </h3>
                  {workflow.description && (
                    <p className="text-body-small text-black-alpha-64 mb-8 line-clamp-2">
                      {workflow.description}
                    </p>
                  )}
                  <div className="flex items-center gap-16 text-body-small text-black-alpha-48">
                    <span>{workflow.nodeCount} nodes</span>
                    <span>•</span>
                    <span>{workflow.edgeCount} connections</span>
                    <span>•</span>
                    <span>Deleted {formatDate(workflow.deletedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  {/* Restore Button */}
                  <button
                    onClick={() => handleRestore(workflow._id, workflow.name)}
                    className="px-12 py-8 bg-heat-4 hover:bg-heat-8 border border-heat-100 rounded-8 text-body-small text-heat-100 transition-colors flex items-center gap-6"
                    title="Restore workflow"
                  >
                    <RotateCcw className="w-14 h-14" />
                    Restore
                  </button>

                  {/* Delete Permanently Button */}
                  <button
                    onClick={() => setConfirmDelete(workflow._id)}
                    className="px-12 py-8 bg-background-base hover:bg-black-alpha-8 border border-border-faint rounded-8 text-body-small text-black-alpha-64 hover:text-accent-black transition-colors flex items-center gap-6"
                    title="Delete permanently"
                  >
                    <X className="w-14 h-14" />
                    Delete Forever
                  </button>
                </div>
              </div>

              {/* Confirmation Dialog */}
              <AnimatePresence>
                {confirmDelete === workflow._id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-16 pt-16 border-t border-border-faint"
                  >
                    <div className="flex items-start gap-12 p-12 bg-heat-4 border border-heat-100 rounded-8">
                      <AlertTriangle className="w-20 h-20 text-heat-100 flex-shrink-0 mt-2" />
                      <div className="flex-1">
                        <p className="text-body-small text-accent-black font-medium mb-4">
                          Permanently delete this workflow?
                        </p>
                        <p className="text-body-small text-black-alpha-64 mb-12">
                          This action cannot be undone. The workflow will be permanently removed.
                        </p>
                        <div className="flex items-center gap-8">
                          <button
                            onClick={() => handlePermanentDelete(workflow._id, workflow.name)}
                            className="px-12 py-6 bg-heat-100 hover:bg-heat-120 text-accent-white rounded-6 text-body-small font-medium transition-colors"
                          >
                            Delete Forever
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-12 py-6 bg-background-base hover:bg-black-alpha-8 border border-border-faint rounded-6 text-body-small text-accent-black transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
