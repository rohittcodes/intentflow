"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Workflow } from "@/lib/workflow/types";

interface PublishModalProps {
  workflow: Workflow | null;
  isOpen: boolean;
  onClose: () => void;
  onPublish: (config: PublishConfig) => void;
}

interface PublishConfig {
  name: string;
  description: string;
  isPublic: boolean;
  requiresAuth: boolean;
}

export default function PublishModal({ workflow, isOpen, onClose, onPublish }: PublishModalProps) {
  const [name, setName] = useState(workflow?.name || "My Workflow");
  const [description, setDescription] = useState(workflow?.description || "");
  const [isPublic, setIsPublic] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(true);
  const [published, setPublished] = useState(false);

  const handlePublish = () => {
    onPublish({
      name,
      description,
      isPublic,
      requiresAuth,
    });
    setPublished(true);
  };

  const endpointUrl = workflow
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/workflows/${workflow.id}/execute`
    : '';

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
  };

  const handleCopyCurl = () => {
    const curl = `curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Your input message here"}'`;
    navigator.clipboard.writeText(curl);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-secondary8 z-[100] flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-accent-white rounded-16 shadow-2xl max-w-600 w-full max-h-[80vh] overflow-y-auto"
          >
            {!published ? (
              <>
                {/* Header */}
                <div className="p-24 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-title-h3 text-foreground">Publish Workflow</h2>
                    <button
                      onClick={onClose}
                      className="w-32 h-32 rounded-6 hover:bg-secondary transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-8">
                    Publish your workflow as an API endpoint
                  </p>
                </div>

                {/* Form */}
                <div className="p-24 space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-label-small text-muted-foreground mb-8">
                      Workflow Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-label-small text-muted-foreground mb-8">
                      Description (optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                      placeholder="Describe what this workflow does..."
                    />
                  </div>

                  {/* Public Access */}
                  <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                    <div>
                      <h3 className="text-label-small text-foreground mb-4">Public Access</h3>
                      <p className="text-xs text-muted-foreground">
                        Allow anyone to call this endpoint
                      </p>
                    </div>
                    <button
                      onClick={() => setIsPublic(!isPublic)}
                      className={`w-44 h-24 rounded-full transition-colors relative ${isPublic ? 'bg-primary' : 'bg-muted'
                        }`}
                    >
                      <motion.div
                        className="w-8 h-8 bg-white rounded-full absolute top-2 shadow-sm"
                        animate={{ left: isPublic ? '22px' : '2px' }}
                        transition={{ duration: 0.2 }}
                      />
                    </button>
                  </div>

                  {/* Require Authentication */}
                  <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                    <div>
                      <h3 className="text-label-small text-foreground mb-4">Require Authentication</h3>
                      <p className="text-xs text-muted-foreground">
                        Require API key for execution
                      </p>
                    </div>
                    <button
                      onClick={() => setRequiresAuth(!requiresAuth)}
                      className={`w-44 h-24 rounded-full transition-colors relative ${requiresAuth ? 'bg-primary' : 'bg-muted'
                        }`}
                    >
                      <motion.div
                        className="w-8 h-8 bg-white rounded-full absolute top-2 shadow-sm"
                        animate={{ left: requiresAuth ? '22px' : '2px' }}
                        transition={{ duration: 0.2 }}
                      />
                    </button>
                  </div>

                  {/* Workflow Stats */}
                  {workflow && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <h3 className="text-label-small text-blue-900 mb-3">Workflow Summary</h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-blue-600">Nodes:</span>
                          <span className="text-blue-900 font-medium ml-8">{workflow.nodes.length}</span>
                        </div>
                        <div>
                          <span className="text-blue-600">Connections:</span>
                          <span className="text-blue-900 font-medium ml-8">{workflow.edges.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-24 border-t border-border flex items-center justify-between">
                  <button
                    onClick={onClose}
                    className="px-20 py-10 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    className="px-32 py-10 bg-primary hover:bg-primary/90 text-white rounded-md transition-all active:scale-[0.98] text-sm font-medium"
                  >
                    Publish Workflow
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="p-24">
                  <div className="text-center mb-24">
                    <div className="w-64 h-64 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-32 h-32 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-title-h3 text-foreground mb-8">Workflow Published!</h2>
                    <p className="text-sm text-muted-foreground">
                      Your workflow is now available as an API endpoint
                    </p>
                  </div>

                  {/* Endpoint URL */}
                  <div className="mb-24">
                    <label className="block text-label-small text-muted-foreground mb-8">
                      API Endpoint
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-xs text-foreground font-mono overflow-x-auto">
                        {endpointUrl}
                      </div>
                      <button
                        onClick={handleCopyEndpoint}
                        className="px-16 py-10 bg-background hover:bg-secondary border border-border rounded-md text-xs text-foreground transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* cURL Example */}
                  <div className="mb-24">
                    <label className="block text-label-small text-muted-foreground mb-8">
                      Example cURL Request
                    </label>
                    <div className="relative">
                      <pre className="px-3 py-2 bg-gray-900 text-green-400 rounded-md text-xs font-mono overflow-x-auto">
                        {`curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Your input message"}'`}
                      </pre>
                      <button
                        onClick={handleCopyCurl}
                        className="absolute top-8 right-8 px-12 py-6 bg-white/10 hover:bg-white/20 rounded-6 text-xs text-white transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* JavaScript Example */}
                  <div className="mb-24">
                    <label className="block text-label-small text-muted-foreground mb-8">
                      JavaScript Example
                    </label>
                    <pre className="px-3 py-2 bg-gray-900 text-green-400 rounded-md text-xs font-mono overflow-x-auto">
                      {`const response = await fetch('${endpointUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    input: 'Your input message'
  })
});

const result = await response.json();
console.log(result);`}
                    </pre>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-24 border-t border-border">
                  <button
                    onClick={onClose}
                    className="w-full px-20 py-10 bg-primary hover:bg-primary/90 text-white rounded-md transition-all active:scale-[0.98] text-sm font-medium"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
