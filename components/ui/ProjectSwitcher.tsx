"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, FolderOpen, AlertCircle } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

export default function ProjectSwitcher() {
  const { activeWorkspaceId, activeProjectId, setActiveProjectId } = useWorkspace();

  const projects = useQuery(
    api.projects.getProjects,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip"
  );

  const createProject = useMutation(api.projects.createProject);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !activeWorkspaceId) return;

    setIsSubmitting(true);
    try {
      const id = await createProject({
        workspaceId: activeWorkspaceId!,
        name: newProjectName.trim(),
      });
      setActiveProjectId(id);
      setIsDialogOpen(false);
      setNewProjectName("");
      toast.success("Project created");
    } catch (error) {
      toast.error("Failed to create project");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeWorkspaceId) return null;

  // Loading skeleton
  if (projects === undefined) {
    return <div className="h-9 w-full animate-pulse bg-muted rounded-md" />;
  }

  // No projects — show inline prompt to create one
  if (projects.length === 0) {
    return (
      <>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 w-full h-9 px-3 rounded-md border border-dashed border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs text-muted-foreground hover:text-foreground"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="truncate">Create a project first</span>
        </button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="rounded-2xl sm:max-w-sm">
            <form onSubmit={handleCreateProject}>
              <DialogHeader>
                <DialogTitle>Create your first project</DialogTitle>
                <DialogDescription>
                  Projects organise your workflows and resources. You need at least one to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <Label htmlFor="project-name" className="text-xs font-semibold">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="e.g. Marketing Launch"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="h-9"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs font-bold"
                  disabled={isSubmitting || !newProjectName.trim()}
                >
                  {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Create Project
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Projects available — render select
  return (
    <>
      <div className="w-full">
        <Select
          value={activeProjectId || ""}
          onValueChange={(value) => {
            if (value === "new") {
              setIsDialogOpen(true);
            } else {
              setActiveProjectId(value as any);
            }
          }}
        >
          <SelectTrigger className="w-full h-9 text-xs">
            <SelectValue placeholder="Select project">
              <div className="flex items-center gap-2 overflow-hidden w-full">
                <FolderOpen className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {projects.find((p) => p._id === activeProjectId)?.name || "Select project"}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project._id} value={project._id} className="text-sm">
                {project.name}
              </SelectItem>
            ))}
            <SelectItem value="new" className="text-primary font-medium text-sm">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Projects organise your workflows and resources within a workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Label htmlFor="new-project-name" className="text-xs font-semibold">Project Name</Label>
              <Input
                id="new-project-name"
                placeholder="e.g. Marketing Launch"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="h-9"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs font-bold"
                disabled={isSubmitting || !newProjectName.trim()}
              >
                {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
