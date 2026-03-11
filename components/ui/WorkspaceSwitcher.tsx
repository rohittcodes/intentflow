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
import { Plus, Loader2, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

export default function WorkspaceSwitcher() {
  const workspaces = useQuery(api.workspaces.getWorkspaces);
  const createWorkspace = useMutation(api.workspaces.createWorkspace);
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select a default workspace if none is currently active
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !activeWorkspaceId) {
      const defaultWorkspace = workspaces.find(w => w.type === "personal") || workspaces[0];
      setActiveWorkspaceId(defaultWorkspace._id);
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspaceId]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsSubmitting(true);
    try {
      const id = await createWorkspace({ name: newWorkspaceName.trim() });
      setActiveWorkspaceId(id);
      setIsDialogOpen(false);
      setNewWorkspaceName("");
      toast.success("Workspace created successfully");
    } catch (error) {
      toast.error("Failed to create workspace");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!workspaces || workspaces === null) return <div className="h-10 w-full animate-pulse bg-muted rounded-md" />;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <Select
          value={activeWorkspaceId || ""}
          onValueChange={(value) => {
            if (value === "new") {
              setIsDialogOpen(true);
            } else {
              setActiveWorkspaceId(value as any);
            }
          }}
        >
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Select workspace">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {workspaces.find((w) => w._id === activeWorkspaceId)?.name || "Select workspace"}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace._id} value={workspace._id}>
                {workspace.name}
              </SelectItem>
            ))}
            <SelectItem value="new" className="text-primary font-medium">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New Workspace</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <form onSubmit={handleCreateWorkspace}>
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
                <DialogDescription>
                  Workspaces are shared environments where you can collaborate on projects.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. My Team"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !newWorkspaceName.trim()}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Workspace
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
