"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Layers, LayoutGrid, Plus, Pencil, Copy, Trash2, PlayCircle, Loader2, Star, Search, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";
import WorkflowCard from "@/components/app/(home)/sections/WorkflowCard";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function WorkflowsPage() {
  const router = useRouter();
  const { activeWorkspaceId, activeProjectId } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDesc, setNewWorkflowDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workflowsData = useQuery(
    api.workflows.list,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, projectId: activeProjectId || undefined } : "skip"
  );

  const saveWorkflowMutation = useMutation(api.workflows.saveWorkflow);

  const handleCreateWorkflow = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newWorkflowName.trim() || !activeWorkspaceId) return;

    setIsSubmitting(true);
    try {
      const id = await saveWorkflowMutation({
        workspaceId: activeWorkspaceId,
        projectId: activeProjectId || undefined,
        name: newWorkflowName.trim(),
        description: newWorkflowDesc.trim(),
        nodes: [
          {
            id: "start-node",
            type: "start",
            position: { x: 100, y: 100 },
            data: {
              label: "Start",
              nodeType: "start",
              inputVariables: [
                {
                  name: "input_as_text",
                  type: "string",
                  required: false,
                  defaultValue: "",
                  description: "",
                },
              ],
            },
          },
        ],
        edges: [],
      });
      toast.success("Workflow created successfully");
      setIsCreateDialogOpen(false);
      setNewWorkflowName("");
      setNewWorkflowDesc("");
      router.push(`/dashboard/workflow/${id}`);
    } catch (error) {
      console.error("Error creating workflow:", error);
      toast.error("Failed to create workflow");
    } finally {
      setIsSubmitting(false);
    }
  };

  const workflows = useMemo(() => {
    if (!workflowsData) return [];
    return workflowsData.map((w: any) => ({
      id: w._id,
      _id: w._id,
      title: w.name,
      description: w.description,
      createdAt: new Date(w.updatedAt || w.createdAt).toLocaleDateString(),
      isStarred: w.isStarred || false,
      nodeCount: w.nodes?.length || 0,
      edgeCount: w.edges?.length || 0,
    }));
  }, [workflowsData]);

  const loading = workflowsData === undefined;

  const starredWorkflows = useMemo(
    () => workflows.filter((w) => w.isStarred),
    [workflows]
  );

  const allWorkflows = useMemo(
    () => workflows.filter((w) => !w.isStarred),
    [workflows]
  );

  const filteredAllWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return allWorkflows;

    const query = searchQuery.toLowerCase();
    return allWorkflows.filter(
      (w) =>
        w.title.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query)
    );
  }, [allWorkflows, searchQuery]);

  const toggleStar = useMutation(api.workflows.toggleStar);
  const moveToTrash = useMutation(api.workflows.moveToTrash);
  const updateMetadata = useMutation(api.workflows.updateMetadata);

  const handleOpenWorkflow = (id: string) => {
    router.push(`/flow/${id}`);
  };

  const handleEditWorkflow = (id: string) => {
    router.push(`/flow/${id}`);
  };

  const handleStarWorkflow = async (id: string, convexId: string) => {
    try {
      await toggleStar({ id: convexId as any });
      toast.success("Workflow status updated");
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
      await moveToTrash({ id: convexId as any });
      toast.success(`"${name}" moved to trash`);
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
      await updateMetadata({
        id: convexId as any,
        name: newTitle,
      });
      toast.success("Title updated");
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
      await updateMetadata({
        id: convexId as any,
        description: newDescription,
      });
      toast.success("Description updated");
    } catch (error) {
      console.error("Error updating description:", error);
      toast.error("Failed to update description");
    }
  };

  return (
    <div className="pb-8 space-y-8">
      <PageHeader title="Workflows" />

      {!activeProjectId ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/10 mt-8">
          <div className="p-3 rounded-full bg-background border border-border mb-4">
            <LayoutGrid className="h-6 w-6 text-muted-foreground/30" />
          </div>
          <h3 className="text-base font-bold tracking-tight mb-1">Select a Project</h3>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto font-medium">
            You need to create a <strong className="font-bold text-foreground">Project</strong> to manage your workflows.
          </p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[140px] rounded-xl animate-pulse bg-muted/50 border border-border/50" />
          ))}
        </div>
      ) : (
        <>
          <section>
            <div className="flex items-center justify-between mb-4 mt-2">
              <h2 className="text-base font-semibold tracking-tight">Quick Actions</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Card
                    className={cn(
                      "group relative flex flex-col items-center justify-center gap-4 border border-border p-5 h-full min-h-[140px] rounded-xl cursor-pointer bg-muted/50 transition-colors hover:bg-muted/80"
                    )}
                  >
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl shadow-sm bg-background text-foreground"
                    )}>
                      <Plus className="h-6 w-6" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-base font-bold tracking-tight">
                        Create Workflow
                      </h3>
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Start building from scratch
                      </p>
                    </div>
                    <div className="absolute top-3 right-3 text-[9px] font-bold text-primary/50 uppercase">
                      New Flow
                    </div>
                  </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-border bg-background">
                  <DialogHeader className="p-8 pb-4">
                    <DialogTitle className="text-2xl font-bold tracking-tight">Create Workflow</DialogTitle>
                    <DialogDescription className="text-xs leading-relaxed mt-2">
                      Workflows allow you to automate complex tasks by connecting different tools and AI models.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateWorkflow}>
                    <div className="px-8 py-4 space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workflow Name</label>
                        <Input
                          placeholder="e.g. Content Generator, Data Scraper"
                          value={newWorkflowName}
                          onChange={(e) => setNewWorkflowName(e.target.value)}
                          className="h-9 shadow-sm"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description (optional)</label>
                        <Input
                          placeholder="What does this workflow do?"
                          value={newWorkflowDesc}
                          onChange={(e) => setNewWorkflowDesc(e.target.value)}
                          className="h-9 shadow-sm"
                        />
                      </div>
                    </div>
                    <DialogFooter className="p-8 pt-4 bg-muted/50 border-t">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="h-9 font-bold">Cancel</Button>
                      <Button type="submit" disabled={isSubmitting || !newWorkflowName.trim()} className="h-9 font-bold uppercase tracking-widest text-[10px] px-8">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Workflow
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </section>

          {starredWorkflows.length > 0 && (
            <section className="mt-12">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <h2 className="text-base font-semibold tracking-tight">Starred</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

          <section className="mt-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-10 border-t border-border/30">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold tracking-tight">All Workflows</h2>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    {filteredAllWorkflows.length} TOTAL FLOW{filteredAllWorkflows.length !== 1 ? "S" : ""}
                  </span>
                </div>
              </div>

              <div className="relative w-full md:w-72 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-muted/30 border-border/40 focus:border-primary/40 focus:bg-background rounded-lg text-xs transition-all shadow-none"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>

            {filteredAllWorkflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/40 rounded-xl bg-muted/5 mt-2">
                <div className="p-3 rounded-full bg-background border border-border/60 mb-4">
                  <Search className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <h3 className="text-base font-semibold tracking-tight mb-1">
                  {searchQuery ? "No workflows found" : "No workflows yet"}
                </h3>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mb-6 font-medium">
                  {searchQuery
                    ? "Try adjusting your search query to find what you're looking for."
                    : starredWorkflows.length > 0
                      ? "All your workflows are currently in your starred section."
                      : "Start by creating your first workflow to automate your process."}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreateWorkflow} className="h-8 rounded-lg px-6 text-xs font-bold shadow-sm">
                    Create Workflow
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
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
    </div>
  );
}
