"use client";

import { useState, useEffect, ReactNode } from "react";
import { Workflow } from "@/lib/workflow/types";

interface WorkflowNameEditorProps {
  workflow: Workflow | null;
  onSave: (name: string) => void;
  renameTrigger?: number;
  rightAccessory?: ReactNode;
}

export default function WorkflowNameEditor({ workflow, onSave, renameTrigger = 0, rightAccessory }: WorkflowNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(workflow?.name || "New Workflow");

  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
    }
  }, [workflow?.name]);

  useEffect(() => {
    if (renameTrigger > 0) {
      setIsEditing(true);
    }
  }, [renameTrigger]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setName(workflow?.name || "New Workflow");
      setIsEditing(false);
    }
  };

  if (!workflow) return null;

  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="px-3 py-1.5 bg-muted/20 border border-primary/50 rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[200px]"
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="px-3 py-1.5 bg-transparent hover:bg-muted/30 border border-transparent hover:border-border rounded-md text-sm font-semibold text-foreground transition-all flex items-center gap-2 group"
        >
          <span>{name}</span>
          <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
      {rightAccessory ? (
        <div className="flex items-center gap-2">
          {rightAccessory}
        </div>
      ) : null}
    </div>
  );
}
