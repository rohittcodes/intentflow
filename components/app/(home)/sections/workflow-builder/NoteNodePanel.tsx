"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import type { Node } from "@xyflow/react";

interface NoteNodePanelProps {
  node: Node | null;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
}

export default function NoteNodePanel({ node, onClose, onDelete, onUpdate }: NoteNodePanelProps) {
  const nodeData = node?.data as any;
  const [noteText, setNoteText] = useState(nodeData?.noteText || "Add your notes here...");

  // Auto-save changes
  useEffect(() => {
    if (!node?.id) return;

    const timeoutId = setTimeout(() => {
      onUpdate(node.id, {
        noteText,
        nodeName: noteText.slice(0, 30) + (noteText.length > 30 ? '...' : ''), // Update node label
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [noteText]);


  if (!node) return null;

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-4 w-full">
      {/* Sticky Note */}
      <div className="px-1">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
          Note Content
        </Label>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={10}
          placeholder="Add documentation, comments, or reminders..."
          className="w-full px-4 py-3 bg-secondary/50 border border-primary/20 rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/40 transition-colors resize-y font-sans leading-relaxed"
          style={{ minHeight: '180px' }}
        />
        <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-[10px] text-primary/70 leading-relaxed italic">
            <strong>Sticky notes are visual-only.</strong> They don't execute or connect.
            Use them to document your workflow or leave reminders.
          </p>
        </div>
      </div>
    </div>
  );
}
