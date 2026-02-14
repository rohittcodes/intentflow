"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Star, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

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
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [isDescriptionHovered, setIsDescriptionHovered] = useState(false);

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
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isEditingTitle && !isEditingDescription && onOpen(workflow.id)}
      className="group relative flex flex-col gap-12 rounded-12 border border-black-alpha-8 bg-accent-white p-16 hover:border-heat-100 cursor-pointer transition-all hover:shadow-sm h-full min-h-160"
    >
      {/* Workflow Content */}
      <div className="flex flex-col gap-4 flex-1">
        {/* Title */}
        <div className="flex items-start gap-8">
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") handleCancelTitle(e as any);
                  }}
                  className="flex-1 px-8 py-4 border border-heat-100 rounded-6 text-label-large text-accent-black focus:outline-none focus:ring-2 focus:ring-heat-100"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-4 hover:bg-heat-8 rounded-6 transition-colors"
                  title="Save"
                >
                  <Check className="w-14 h-14 text-heat-100" />
                </button>
                <button
                  onClick={handleCancelTitle}
                  className="p-4 hover:bg-black-alpha-8 rounded-6 transition-colors"
                  title="Cancel"
                >
                  <X className="w-14 h-14 text-black-alpha-64" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-8 group/title">
                <h3 className="text-label-large text-accent-black group-hover:text-heat-100 transition-colors flex-1">
                  {workflow.title}
                </h3>
                <button
                  onClick={handleTitleClick}
                  className="opacity-0 group-hover/title:opacity-100 p-2 hover:bg-black-alpha-8 rounded-4 transition-all"
                  title="Edit title"
                >
                  <Edit2 className="w-12 h-12 text-black-alpha-48" />
                </button>
              </div>
            )}
          </div>
          {workflow.isStarred && (
            <Star className="w-14 h-14 text-heat-100 fill-heat-100 flex-shrink-0 mt-2" />
          )}
        </div>

        {/* Description */}
        {isEditingDescription ? (
          <div className="flex flex-col gap-6" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancelDescription(e as any);
              }}
              className="w-full px-8 py-6 border border-heat-100 rounded-6 text-body-small text-accent-black focus:outline-none focus:ring-2 focus:ring-heat-100 resize-none"
              rows={2}
              placeholder="Add a description..."
              autoFocus
            />
            <div className="flex items-center gap-6">
              <button
                onClick={handleSaveDescription}
                className="px-10 py-4 bg-heat-100 hover:bg-heat-120 text-accent-white rounded-6 text-body-small font-medium transition-colors flex items-center gap-4"
              >
                <Check className="w-12 h-12" />
                Save
              </button>
              <button
                onClick={handleCancelDescription}
                className="px-10 py-4 bg-background-base hover:bg-black-alpha-8 border border-border-faint rounded-6 text-body-small text-accent-black transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-8 group/desc">
            <p className="text-body-small text-black-alpha-64 line-clamp-2 min-h-[2.5rem] flex-1">
              {workflow.description || "No description provided."}
            </p>
            <button
              onClick={handleDescriptionClick}
              className="opacity-0 group-hover/desc:opacity-100 p-2 hover:bg-black-alpha-8 rounded-4 transition-all flex-shrink-0"
              title="Edit description"
            >
              <Edit2 className="w-12 h-12 text-black-alpha-48" />
            </button>
          </div>
        )}
      </div>

      {/* Footer with Actions */}
      <div className="mt-auto flex items-center justify-between gap-12 text-body-small text-black-alpha-48 border-t border-transparent group-hover:border-border-faint pt-12 -mb-4">
        <div className="flex items-center gap-12">
          {workflow.nodeCount !== undefined && (
            <>
              <span>{workflow.nodeCount} nodes</span>
              <span>•</span>
            </>
          )}
          <span>Updated {workflow.createdAt}</span>
        </div>

        {/* Actions - Bottom Right */}
        <AnimatePresence>
          {isHovered && !isEditingTitle && !isEditingDescription && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="flex gap-4"
            >
              <button
                onClick={handleStar}
                className="p-4 rounded-6 hover:bg-heat-4 transition-colors"
                title={workflow.isStarred ? "Unstar workflow" : "Star workflow"}
              >
                {workflow.isStarred ? (
                  <Star className="w-14 h-14 text-heat-100 fill-heat-100" />
                ) : (
                  <Star className="w-14 h-14 text-black-alpha-64 hover:text-heat-100" />
                )}
              </button>
              <button
                onClick={handleDelete}
                className="p-4 rounded-6 hover:bg-black-alpha-8 transition-colors"
                title="Delete workflow"
              >
                <Trash2 className="w-14 h-14 text-black-alpha-64 hover:text-accent-black" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
