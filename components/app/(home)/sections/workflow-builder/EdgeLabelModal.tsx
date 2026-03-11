"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Edge } from "@xyflow/react";

interface EdgeLabelModalProps {
  edge: Edge | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (edgeId: string, label: string) => void;
}

export default function EdgeLabelModal({ edge, isOpen, onClose, onSave }: EdgeLabelModalProps) {
  const [label, setLabel] = useState(edge?.label as string || '');
  const [labelType, setLabelType] = useState<'custom' | 'true' | 'false' | 'none'>(
    edge?.label === 'true' ? 'true' :
    edge?.label === 'false' ? 'false' :
    edge?.label ? 'custom' : 'none'
  );

  const handleSave = () => {
    if (!edge) return;

    let finalLabel = '';
    if (labelType === 'true') finalLabel = 'true';
    else if (labelType === 'false') finalLabel = 'false';
    else if (labelType === 'custom') finalLabel = label;

    onSave(edge.id, finalLabel);
    onClose();
  };

  if (!edge) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-secondary8 z-[200] flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-accent-white rounded-16 shadow-2xl max-w-400 w-full"
          >
            {/* Header */}
            <div className="p-6 border-b border-border">
              <h2 className="text-title-h4 text-foreground">Edit Connection</h2>
              <p className="text-xs text-muted-foreground mt-4">
                Add a label to this connection
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Label Type */}
              <div>
                <label className="block text-label-small text-muted-foreground mb-8">
                  Label Type
                </label>
                <div className="space-y-8">
                  <button
                    onClick={() => setLabelType('none')}
                    className={`w-full p-3 rounded-md border-2 transition-all text-left ${
                      labelType === 'none'
                        ? 'border-primary bg-secondary'
                        : 'border-border bg-background hover:border-border-light'
                    }`}
                  >
                    <p className="text-xs text-foreground font-medium">No Label</p>
                    <p className="text-xs text-muted-foreground mt-4">Standard connection</p>
                  </button>

                  <button
                    onClick={() => setLabelType('true')}
                    className={`w-full p-3 rounded-md border-2 transition-all text-left ${
                      labelType === 'true'
                        ? 'border-primary bg-secondary'
                        : 'border-border bg-background hover:border-border-light'
                    }`}
                  >
                    <p className="text-xs text-foreground font-medium">True Branch</p>
                    <p className="text-xs text-muted-foreground mt-4">For If/Else true condition</p>
                  </button>

                  <button
                    onClick={() => setLabelType('false')}
                    className={`w-full p-3 rounded-md border-2 transition-all text-left ${
                      labelType === 'false'
                        ? 'border-primary bg-secondary'
                        : 'border-border bg-background hover:border-border-light'
                    }`}
                  >
                    <p className="text-xs text-foreground font-medium">False Branch</p>
                    <p className="text-xs text-muted-foreground mt-4">For If/Else false condition</p>
                  </button>

                  <button
                    onClick={() => setLabelType('custom')}
                    className={`w-full p-3 rounded-md border-2 transition-all text-left ${
                      labelType === 'custom'
                        ? 'border-primary bg-secondary'
                        : 'border-border bg-background hover:border-border-light'
                    }`}
                  >
                    <p className="text-xs text-foreground font-medium">Custom Label</p>
                    <p className="text-xs text-muted-foreground mt-4">Your own text</p>
                  </button>
                </div>
              </div>

              {/* Custom Label Input */}
              {labelType === 'custom' && (
                <div>
                  <label className="block text-label-small text-muted-foreground mb-8">
                    Label Text
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Enter label text"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-20 py-10 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-24 py-10 bg-primary hover:bg-primary/90 text-white rounded-md transition-all active:scale-[0.98] text-sm font-medium"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
