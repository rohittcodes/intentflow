"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface WorkspaceContextType {
  activeWorkspaceId: Id<"workspaces"> | null;
  setActiveWorkspaceId: (id: Id<"workspaces"> | null) => void;
  activeProjectId: Id<"projects"> | null;
  setActiveProjectId: (id: Id<"projects"> | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<Id<"workspaces"> | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<Id<"projects"> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [projectInitialized, setProjectInitialized] = useState(false);

  const userContext = useQuery(api.users.getUserContext);
  const updateActiveWorkspace = useMutation(api.users.updateActiveWorkspace);
  const updateActiveProject = useMutation(api.users.updateActiveProject);

  // Fetch projects for the active workspace so we can auto-select
  const projects = useQuery(
    api.projects.getProjects,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip"
  );

  // Initialize workspace from persisted user context (once)
  useEffect(() => {
    if (userContext && !isInitialized) {
      if (userContext.activeWorkspaceId) {
        setActiveWorkspaceId(userContext.activeWorkspaceId as Id<"workspaces">);
      }
      setIsInitialized(true);
    }
  }, [userContext, isInitialized]);

  // Auto-select project: prefer persisted activeProjectId, else pick first available
  useEffect(() => {
    if (!activeWorkspaceId || !Array.isArray(projects) || projectInitialized) return;

    if (userContext?.activeProjectId) {
      // Check it still belongs to this workspace
      const found = projects.find((p) => p._id === userContext.activeProjectId);
      if (found) {
        setActiveProjectId(found._id as Id<"projects">);
        setProjectInitialized(true);
        return;
      }
    }

    // Fall back to first project
    if (projects.length > 0) {
      setActiveProjectId(projects[0]._id as Id<"projects">);
    }
    setProjectInitialized(true);
  }, [activeWorkspaceId, projects, projectInitialized, userContext?.activeProjectId]);

  // Sync workspace to backend
  useEffect(() => {
    if (activeWorkspaceId && isInitialized) {
      updateActiveWorkspace({ workspaceId: activeWorkspaceId }).catch(console.error);
    }
  }, [activeWorkspaceId, isInitialized, updateActiveWorkspace]);

  // Sync project to backend
  useEffect(() => {
    if (isInitialized && projectInitialized) {
      updateActiveProject({ projectId: activeProjectId ?? undefined }).catch(console.error);
    }
  }, [activeProjectId, isInitialized, projectInitialized, updateActiveProject]);

  // When workspace changes, reset project so it re-initialises
  useEffect(() => {
    setActiveProjectId(null);
    setProjectInitialized(false);
  }, [activeWorkspaceId]);

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspaceId,
        setActiveWorkspaceId,
        activeProjectId,
        setActiveProjectId,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
