"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
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
    <div className="flex-1 overflow-y-auto p-20">
      {/* Sticky Note */}
      <div>
        <label className="block text-sm font-medium text-accent-black mb-8 flex items-center gap-8">
          <svg className="w-16 h-16 text-heat-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Note Content
        </label>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={10}
          placeholder="Add documentation, comments, or reminders..."
          className="w-full px-14 py-10 bg-heat-4 border border-heat-100 rounded-10 text-sm text-accent-black placeholder-black-alpha-48 placeholder:opacity-50 focus:outline-none focus:border-heat-100 transition-colors resize-y font-sans"
          style={{ minHeight: '200px' }}
        />
        <div className="mt-12 p-12 bg-heat-4 border border-heat-100 rounded-8">
          <p className="text-xs text-heat-100 leading-relaxed">
            <strong>Sticky notes are visual-only.</strong> They don't execute or connect to other nodes.
            Use them to document your workflow, explain logic, or leave reminders.
          </p>
        </div>
      </div>
    </div>
  );
}
