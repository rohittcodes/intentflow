"use client";

import { useState } from "react";
import { Edit2, Star, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Workflow {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  createdAt: string;
  isStarred?: boolean;
  nodeCount?: number;
  edgeCount?: number;
}

interface WorkflowCardProps {
  workflow: Workflow;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onStar: (id: string, convexId: string) => void;
  onDelete: (id: string, convexId: string, name: string) => void;
  onUpdateTitle?: (id: string, convexId: string, newTitle: string) => void;
  onUpdateDescription?: (id: string, convexId: string, newDescription: string) => void;
}

export default function WorkflowCard({
  workflow,
  onOpen,
  onEdit,
  onStar,
  onDelete,
  onUpdateTitle,
  onUpdateDescription,
}: WorkflowCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(workflow.title);
  const [editedDescription, setEditedDescription] = useState(workflow.description || "");

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(workflow.id);
  };

  const router = useRouter();
  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStar(workflow.id, workflow._id || workflow.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(workflow.id, workflow._id || workflow.id, workflow.title);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditedTitle(workflow.title);
  };

  const handleDescriptionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingDescription(true);
    setEditedDescription(workflow.description || "");
  };

  const handleSaveTitle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (editedTitle.trim() && editedTitle !== workflow.title && onUpdateTitle) {
      onUpdateTitle(workflow.id, workflow._id || workflow.id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (editedDescription !== workflow.description && onUpdateDescription) {
      onUpdateDescription(workflow.id, workflow._id || workflow.id, editedDescription.trim());
    }
    setIsEditingDescription(false);
  };

  const handleCancelTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedTitle(workflow.title);
    setIsEditingTitle(false);
  };

  const handleCancelDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedDescription(workflow.description || "");
    setIsEditingDescription(false);
  };

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isEditingTitle && !isEditingDescription && router.push(`/dashboard/workflow/${workflow.id}`)}
      className="group relative flex flex-col h-full min-h-[140px] cursor-pointer hover:border-primary/50 rounded-xl border-border overflow-hidden bg-background"
    >
      <CardHeader className="p-5 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") handleCancelTitle(e as any);
                  }}
                  className="flex-1 px-2 py-1 bg-muted/50 border border-primary rounded-lg text-base font-bold focus:outline-none ring-1 ring-primary/20 transition-all"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-primary/10" onClick={handleSaveTitle}>
                  <Check className="h-3.5 w-3.5 text-primary" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-muted" onClick={handleCancelTitle}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h3 className="text-base font-bold tracking-tight transition-colors group-hover:text-primary line-clamp-1">
                  {workflow.title}
                </h3>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover/title:opacity-100 rounded-full hover:bg-muted"
                  onClick={handleTitleClick}
                >
                  <Edit2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
          {workflow.isStarred && (
            <div className="p-1 bg-primary/10 rounded-full flex-shrink-0">
              <Star className="h-3 w-3 text-primary fill-primary" />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-3 pt-0 flex-1">
        {isEditingDescription ? (
          <div className="flex flex-col gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancelDescription(e as any);
              }}
              className="w-full px-2 py-1.5 bg-muted/50 border border-primary rounded-lg text-xs font-medium focus:outline-none ring-1 ring-primary/20 resize-none transition-all"
              rows={2}
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold rounded-md" onClick={handleCancelDescription}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-[10px] font-bold rounded-md px-3" onClick={handleSaveDescription}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 group/desc mt-1">
            <p className="text-[11px] font-medium text-muted-foreground/80 leading-relaxed line-clamp-2 min-h-[2rem] flex-1">
              {workflow.description || "No description provided."}
            </p>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover/desc:opacity-100 rounded-full hover:bg-muted"
              onClick={handleDescriptionClick}
            >
              <Edit2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-3 border-t border-border/10 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3">
          {workflow.nodeCount !== undefined && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-bold text-[8px] tracking-wider uppercase">
              {workflow.nodeCount} NODES
            </div>
          )}
          <span className="text-[8px] font-bold text-muted-foreground/40 tracking-wider uppercase">
            {workflow.createdAt}
          </span>
        </div>

        {!isEditingTitle && !isEditingDescription && (
          <div className="flex gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full hover:bg-primary/10"
              onClick={handleStar}
            >
              {workflow.isStarred ? (
                <Star className="h-3.5 w-3.5 text-primary fill-primary" />
              ) : (
                <Star className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardFooter>

    </Card>
  );
}
