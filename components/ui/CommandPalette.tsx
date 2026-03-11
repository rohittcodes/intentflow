"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search, FolderGit2, Blocks, Workflow, Plus, Users } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "../providers/WorkspaceProvider";
import { cn } from "@/lib/utils";

export function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspace();
  const [inputValue, setInputValue] = useState("");

  // Fetch contextual data for the palette
  const workspaces = useQuery(api.workspaces.getWorkspaces);
  const projects = useQuery(api.projects.getProjects, 
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip"
  );
  // Optional: If we had a query for workflows, we'd fetch them here too

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden shadow-2xl max-w-2xl bg-background/80 backdrop-blur-xl border-border/50">
        <VisuallyHidden.Root>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden.Root>
        <Command
          className="flex h-full w-full flex-col overflow-hidden bg-transparent"
          shouldFilter={true}
        >
          <div className="flex items-center border-b border-border/50 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-primary" />
            <Command.Input
              value={inputValue}
              onValueChange={setInputValue}
              placeholder="Search workspaces, projects, or type a command..."
              className={cn(
                "flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none",
                "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Quick Actions" className="px-2 text-xs font-medium text-muted-foreground mb-2">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/settings/members"))}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-muted aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 mt-1"
              >
                <Users className="mr-2 h-4 w-4 text-primary" />
                Invite Team Member
              </Command.Item>
            </Command.Group>

            {projects && projects.length > 0 && (
              <Command.Group heading="Projects" className="px-2 text-xs font-medium text-muted-foreground mb-2">
                {projects.map((project) => (
                  <Command.Item
                    key={project._id}
                    onSelect={() => runCommand(() => {
                      // Optional: Navigate to project specifically
                      router.push(`/dashboard?projectId=${project._id}`);
                    })}
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-muted aria-selected:text-accent-foreground mt-1"
                  >
                    <FolderGit2 className="mr-2 h-4 w-4 text-emerald-500" />
                    {project.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {workspaces && workspaces.length > 0 && (
              <Command.Group heading="Switch Workspace" className="px-2 text-xs font-medium text-muted-foreground mb-2">
                {workspaces.map((workspace) => (
                  <Command.Item
                    key={workspace._id}
                    onSelect={() => runCommand(() => {
                      // A little complex to trigger the context update here directly without the mutation, 
                      // but they can navigate to dashboard settings at least 
                      router.push(`/dashboard/settings`); 
                    })}
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-muted aria-selected:text-accent-foreground mt-1"
                  >
                    <Blocks className="mr-2 h-4 w-4 text-orange-500" />
                    {workspace.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
