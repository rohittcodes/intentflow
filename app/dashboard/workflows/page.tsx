"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import WorkflowCard from "@/components/app/(home)/sections/WorkflowCard";
import { api } from "@/lib/convex/client";
import { useMutation } from "convex/react";

interface Workflow {
  id: string;
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
  isStarred?: boolean;
  nodeCount?: number;
  edgeCount?: number;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Load workflows
  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/workflows");
      const data = await response.json();

      if (data.workflows && Array.isArray(data.workflows)) {
        setWorkflows(
          data.workflows.map((w: any) => ({
            id: w.id,
            _id: w._id || w.id,
            title: w.name,
            description: w.description,
            createdAt: new Date(w.updatedAt || w.createdAt).toLocaleDateString(),
            isStarred: w.isStarred || false,
            nodeCount: w.nodeCount,
            edgeCount: w.edgeCount,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading workflows:", error);
      toast.error("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  // Separate starred and non-starred workflows
  const starredWorkflows = useMemo(
    () => workflows.filter((w) => w.isStarred),
    [workflows]
  );

  const allWorkflows = useMemo(
    () => workflows.filter((w) => !w.isStarred),
    [workflows]
  );

  // Filter only the "All Workflows" section by search
  const filteredAllWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return allWorkflows;

    const query = searchQuery.toLowerCase();
    return allWorkflows.filter(
      (w) =>
        w.title.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query)
    );
  }, [allWorkflows, searchQuery]);

  // Handlers
  const handleCreateWorkflow = () => {
    router.push("/flow/new");
  };

  const handleOpenWorkflow = (id: string) => {
    router.push(`/flow/${id}`);
  };

  const handleEditWorkflow = (id: string) => {
    router.push(`/flow/${id}`);
  };

  const handleStarWorkflow = async (id: string, convexId: string) => {
    try {
      const response = await fetch("/api/workflows/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: convexId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        setWorkflows((prev) =>
          prev.map((w) =>
            w._id === convexId ? { ...w, isStarred: data.isStarred } : w
          )
        );
        toast.success(
          data.isStarred ? "Workflow starred" : "Workflow unstarred"
        );
      } else {
        toast.error("Failed to update workflow");
      }
    } catch (error) {
      console.error("Error starring workflow:", error);
      toast.error("Failed to update workflow");
    }
  };

  const handleDeleteWorkflow = async (
    id: string,
    convexId: string,
    name: string
  ) => {
    try {
      const response = await fetch(`/api/workflows?id=${convexId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`"${name}" moved to trash`);
        loadWorkflows(); // Reload workflows
      } else {
        toast.error("Failed to delete workflow");
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast.error("Failed to delete workflow");
    }
  };

  const handleUpdateTitle = async (
    id: string,
    convexId: string,
    newTitle: string
  ) => {
    try {
      const response = await fetch("/api/workflows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: convexId,
          name: newTitle,
        }),
      });

      if (response.ok) {
        // Update local state
        setWorkflows((prev) =>
          prev.map((w) => (w._id === convexId ? { ...w, title: newTitle } : w))
        );
        toast.success("Title updated");
      } else {
        toast.error("Failed to update title");
      }
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Failed to update title");
    }
  };

  const handleUpdateDescription = async (
    id: string,
    convexId: string,
    newDescription: string
  ) => {
    try {
      const response = await fetch("/api/workflows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: convexId,
          description: newDescription,
        }),
      });

      if (response.ok) {
        // Update local state
        setWorkflows((prev) =>
          prev.map((w) =>
            w._id === convexId ? { ...w, description: newDescription } : w
          )
        );
        toast.success("Description updated");
      } else {
        toast.error("Failed to update description");
      }
    } catch (error) {
      console.error("Error updating description:", error);
      toast.error("Failed to update description");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pb-32"
    >
      <div className="mb-32">
        <h1 className="text-title-h1 text-accent-black mb-4">Workflows</h1>
        <p className="text-body-medium text-black-alpha-64">
          Create, manage, and organize your automation workflows
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-64">
          <div className="w-32 h-32 border-4 border-heat-100 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          <section className="mb-40">
            <h2 className="text-title-h3 text-accent-black mb-16">
              Quick Actions
            </h2>
            <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-3">
              <div
                onClick={handleCreateWorkflow}
                className="group relative flex flex-col items-center justify-center gap-12 rounded-12 border-2 border-dashed border-black-alpha-12 p-16 hover:bg-black-alpha-4 hover:border-heat-100 cursor-pointer transition-all h-full min-h-160"
              >
                <div className="flex h-48 w-48 items-center justify-center rounded-full bg-heat-8 group-hover:bg-heat-12 transition-colors">
                  <Plus className="h-24 w-24 text-heat-100" />
                </div>
                <div className="text-center">
                  <h3 className="text-label-large text-accent-black mb-4">
                    Create Workflow
                  </h3>
                  <p className="text-body-small text-black-alpha-56">
                    Start building from scratch
                  </p>
                </div>
              </div>
            </div>
          </section>
          {starredWorkflows.length > 0 && (
            <section className="mb-40">
              <div className="flex items-center gap-8 mb-16">
                <h2 className="text-title-h3 text-accent-black">
                  Starred Workflows
                </h2>
              </div>
              <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-3">
                {starredWorkflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onOpen={handleOpenWorkflow}
                    onEdit={handleEditWorkflow}
                    onStar={handleStarWorkflow}
                    onDelete={handleDeleteWorkflow}
                    onUpdateTitle={handleUpdateTitle}
                    onUpdateDescription={handleUpdateDescription}
                  />
                ))}
              </div>
            </section>
          )}
          <section>
            <div className="flex items-start justify-between gap-16 mb-16">
              <div className="flex-1">
                <h2 className="text-title-h3 text-accent-black mb-12">
                  All Workflows
                </h2>
                <div className="relative max-w-480">
                  <Search className="absolute left-12 top-1/2 -translate-y-1/2 w-16 h-16 text-black-alpha-48" />
                  <input
                    type="text"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-40 pr-40 py-10 bg-accent-white border border-border-faint rounded-8 text-body-medium text-accent-black placeholder:text-black-alpha-48 focus:outline-none focus:border-heat-100 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-12 top-1/2 -translate-y-1/2 p-4 hover:bg-black-alpha-8 rounded-6 transition-colors"
                    >
                      <X className="w-16 h-16 text-black-alpha-48" />
                    </button>
                  )}
                </div>
              </div>

              {!searchQuery && filteredAllWorkflows.length > 0 && (
                <span className="text-body-small text-black-alpha-48 mt-8">
                  {filteredAllWorkflows.length} workflow
                  {filteredAllWorkflows.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {filteredAllWorkflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-64 text-center">
                <div className="w-64 h-64 rounded-full bg-black-alpha-4 flex items-center justify-center mb-16">
                  <Search className="w-32 h-32 text-black-alpha-24" />
                </div>
                <h3 className="text-title-h3 text-accent-black mb-8">
                  {searchQuery ? "No workflows found" : "No workflows yet"}
                </h3>
                <p className="text-body-medium text-black-alpha-48 max-w-400">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : starredWorkflows.length > 0
                      ? "All your workflows are starred"
                      : "Create your first workflow to get started"}
                </p>
              </div>
            ) : (
              <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-3 mt-16">
                {filteredAllWorkflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onOpen={handleOpenWorkflow}
                    onEdit={handleEditWorkflow}
                    onStar={handleStarWorkflow}
                    onDelete={handleDeleteWorkflow}
                    onUpdateTitle={handleUpdateTitle}
                    onUpdateDescription={handleUpdateDescription}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </motion.div>
  );
}
