"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";

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

  // When workspace changes, reset project
  useEffect(() => {
    setActiveProjectId(null);
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
