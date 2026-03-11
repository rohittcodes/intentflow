"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Star, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      onClick={() => !isEditingTitle && !isEditingDescription && onOpen(workflow.id)}
      className="group relative flex flex-col h-full min-h-[180px] cursor-pointer transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 rounded-[32px] border-border overflow-hidden bg-background"
    >
      <CardHeader className="p-8 pb-3">
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
                  className="flex-1 px-3 py-1.5 bg-muted/50 border border-primary rounded-xl text-lg font-bold focus:outline-none ring-2 ring-primary/20 transition-all"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-primary/10" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4 text-primary" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-muted" onClick={handleCancelTitle}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group/title">
                <h3 className="text-xl font-bold tracking-tight transition-colors group-hover:text-primary line-clamp-1">
                  {workflow.title}
                </h3>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover/title:opacity-100 transition-opacity rounded-full hover:bg-muted"
                  onClick={handleTitleClick}
                >
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
          {workflow.isStarred && (
            <div className="p-1.5 bg-primary/10 rounded-full flex-shrink-0 animate-in zoom-in duration-300">
              <Star className="h-4 w-4 text-primary fill-primary" />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="px-8 pb-4 pt-0 flex-1">
        {isEditingDescription ? (
          <div className="flex flex-col gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancelDescription(e as any);
              }}
              className="w-full px-3 py-2 bg-muted/50 border border-primary rounded-xl text-xs font-medium focus:outline-none ring-2 ring-primary/20 resize-none transition-all"
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="ghost" className="h-8 text-[10px] font-bold rounded-lg" onClick={handleCancelDescription}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-[10px] font-bold rounded-lg px-4" onClick={handleSaveDescription}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4 group/desc mt-2">
            <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed line-clamp-2 min-h-[2.5rem] flex-1">
              {workflow.description || "No description provided."}
            </p>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover/desc:opacity-100 transition-opacity rounded-full hover:bg-muted"
              onClick={handleDescriptionClick}
            >
              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-8 pb-8 pt-4 border-t border-border/30 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-4">
          {workflow.nodeCount !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground font-bold text-[9px] tracking-widest uppercase">
              {workflow.nodeCount} NODES
            </div>
          )}
          <span className="text-[9px] font-black text-muted-foreground/50 tracking-widest uppercase">
            {workflow.createdAt}
          </span>
        </div>

        <AnimatePresence>
          {isHovered && !isEditingTitle && !isEditingDescription && (
            <motion.div
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              className="flex gap-2"
            >
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full hover:bg-primary/10 transition-colors"
                onClick={handleStar}
              >
                {workflow.isStarred ? (
                  <Star className="h-4 w-4 text-primary fill-primary" />
                ) : (
                  <Star className="h-4 w-4 text-muted-foreground/50" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardFooter>
    </Card>
  );
}
