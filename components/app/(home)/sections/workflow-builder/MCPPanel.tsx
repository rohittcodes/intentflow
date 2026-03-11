"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Globe, Brain, Database, Package, Loader2, ChevronDown } from "lucide-react";
import type { Node } from "@xyflow/react";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

interface MCPPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
  mode?: 'configure' | 'add-to-agent';
  onAddToAgent?: (mcpConfig: any) => void;
  onOpenSettings?: () => void;
}

export default function MCPPanel({
  node,
  onClose,
  onUpdate,
  mode = 'configure',
  onAddToAgent,
  onOpenSettings
}: MCPPanelProps) {
  const { user } = useUser();
  const nodeData = node?.data as any;

  // Fetch enabled MCP servers from central registry
  const mcpServers = useQuery(api.mcpServers.getEnabledMCPs,
    user?.id ? {} : "skip"
  );

  // Store only the selected server ID
  const [selectedServerId, setSelectedServerId] = useState<string | null>(() => {
    return nodeData?.mcpServerId || null;
  });

  const [showDetails, setShowDetails] = useState(false);
  const selectedServer = mcpServers?.find(s => s._id === selectedServerId);

  // Auto-save selected server ID (only in configure mode) with change check
  useEffect(() => {
    if (!node?.id || mode === 'add-to-agent') return;

    const timeoutId = setTimeout(() => {
      const hasChanged = selectedServerId !== node.data?.mcpServerId;

      if (hasChanged) {
        onUpdate(node.id, {
          mcpServerId: selectedServerId,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedServerId, node?.id, node?.data, onUpdate, mode]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'web': return <Globe className="w-16 h-16" />;
      case 'ai': return <Brain className="w-16 h-16" />;
      case 'data': return <Database className="w-16 h-16" />;
      default: return <Package className="w-16 h-16" />;
    }
  };

  return (
    <AnimatePresence>
      {(node || mode === 'add-to-agent') && (
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed right-20 top-80 bottom-20 w-[calc(100vw-240px)] max-w-520 bg-accent-white border border-border shadow-lg overflow-y-auto z-50 rounded-16 flex flex-col"
        >
          {/* Header */}
          <div className="p-20 border-b border-border">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                {mode === 'add-to-agent' ? 'Add MCP to Agent' : 'MCP Node'}
              </h2>
              <button
                onClick={onClose}
                className="w-32 h-32 rounded-6 hover:bg-secondary transition-colors flex items-center justify-center"
              >
                <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Select an MCP server from your registry to invoke its tools
            </p>
          </div>

          {/* Configuration */}
          <div className="p-20 space-y-20">
            {/* Server Selector */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-8">
                MCP Server
              </label>

              {!mcpServers || mcpServers.length === 0 ? (
                <div className="p-16 bg-background rounded-xl border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-12">
                    No MCP servers available in your registry
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings?.();
                    }}
                    className="px-16 py-8 bg-primary hover:bg-primary/90 text-white rounded-md text-xs font-medium transition-all"
                  >
                    Go to Settings
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <select
                    value={selectedServerId || ""}
                    onChange={(e) => {
                      const serverId = e.target.value || null;
                      setSelectedServerId(serverId);

                      // In add-to-agent mode, call the callback
                      if (mode === 'add-to-agent' && onAddToAgent && serverId) {
                        const server = mcpServers.find(s => s._id === serverId);
                        if (server) {
                          onAddToAgent({
                            mcpServerId: server._id,
                            name: server.name,
                            tools: server.tools || [],
                          });
                          toast.success(`Added ${server.name} to agent`);
                          setTimeout(() => onClose(), 1000);
                        }
                      }
                    }}
                    className="w-full px-14 py-10 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Select an MCP server...</option>
                    {mcpServers.map((server) => {
                      return (
                        <option key={server._id} value={server._id}>
                          {server.name} {server.tools && `(${server.tools.length} tools)`}
                        </option>
                      );
                    })}
                  </select>

                  {selectedServer && (
                    <div className="mt-12">
                      {/* Server Info Card */}
                      <div className="p-16 bg-background rounded-xl border border-border">
                        <div className="flex items-start gap-12">
                          <div className={`text-primary`}>
                            {getCategoryIcon(selectedServer.category)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-8 mb-4">
                              <h4 className="text-sm font-medium text-foreground">
                                {selectedServer.name}
                              </h4>
                            </div>
                            {selectedServer.description && (
                              <p className="text-xs text-muted-foreground mb-8">
                                {selectedServer.description}
                              </p>
                            )}
                            <div className="flex items-center gap-12 text-xs">
                              <span className="text-muted-foreground">
                                Category: {selectedServer.category}
                              </span>
                              {selectedServer.connectionStatus === 'connected' && (
                                <span className="px-6 py-2 bg-secondary text-primary rounded-6 border border-primary">
                                  Connected
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Show/Hide Tools Button */}
                        {selectedServer.tools && selectedServer.tools.length > 0 && (
                          <div className="mt-12">
                            <button
                              onClick={() => setShowDetails(!showDetails)}
                              className="flex items-center gap-8 text-xs text-primary hover:text-heat-200 font-medium"
                            >
                              <ChevronDown className={`w-14 h-14 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                              {showDetails ? 'Hide' : 'Show'} Available Tools ({selectedServer.tools.length})
                            </button>

                            {/* Tools List */}
                            <AnimatePresence>
                              {showDetails && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-8"
                                >
                                  <div className="space-y-6">
                                    {selectedServer.tools.map((tool: string) => (
                                      <div key={tool} className="p-8 bg-accent-white rounded-6 border border-border">
                                        <code className="text-xs font-mono text-primary">
                                          {tool}
                                        </code>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add New Server Link */}
            <div className="pt-16 border-t border-border">
              <p className="text-xs text-muted-foreground mb-8">
                Need to add a new MCP server?
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings?.();
                }}
                className="text-xs text-primary hover:text-heat-200 font-medium"
              >
                Go to Settings → MCP Registry
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
