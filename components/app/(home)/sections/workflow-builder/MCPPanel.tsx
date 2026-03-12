"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Globe, Brain, Database, Package, ChevronDown, Settings2, ShieldCheck, Check } from "lucide-react";
import type { Node } from "@xyflow/react";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
      case 'web': return <Globe className="h-4 w-4" />;
      case 'ai': return <Brain className="h-4 w-4" />;
      case 'data': return <Database className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto w-full p-2 pb-20 space-y-8">
      {/* Configuration */}
      <div className="space-y-4 px-1 max-w-[320px] mx-auto">
        {/* Server Selector */}
        <div className="space-y-3">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            MCP Server
          </Label>
          {!mcpServers || mcpServers.length === 0 ? (
            <div className="p-6 bg-muted/20 rounded-lg border border-dashed border-border text-center space-y-3">
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-[10px] text-muted-foreground italic font-medium">
                  No MCP servers available in your registry
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenSettings?.();
                }}
                className="w-full h-8 font-bold uppercase tracking-wider text-[10px] rounded-md"
              >
                Add Server in Registry
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
                <Select
                  value={selectedServerId || ""}
                  onValueChange={(serverId) => {
                    const val = serverId === "none" ? null : serverId;
                    setSelectedServerId(val);
                    // In add-to-agent mode, call the callback
                    if (mode === 'add-to-agent' && onAddToAgent && val) {
                      const server = mcpServers.find(s => s._id === val);
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
                >
                  <SelectTrigger className="w-full h-8 bg-muted/20 border-border/50 font-bold text-[11px] rounded-md transition-all">
                    <SelectValue placeholder="Select an MCP server..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-[10px] italic font-bold uppercase tracking-widest text-muted-foreground">Select an MCP server...</SelectItem>
                    {mcpServers.map((server) => (
                      <SelectItem key={server._id} value={server._id} className="text-[11px] font-bold uppercase tracking-widest">
                        {server.name} {server.tools && `(${server.tools.length} tools)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

              {selectedServer && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Server Info Card */}
                  <Card className="bg-muted/20 border-border/50 shadow-none rounded-lg overflow-hidden">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                          <div className="text-primary">
                            {getCategoryIcon(selectedServer.category)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-bold truncate">
                              {selectedServer.name}
                            </h4>
                            {selectedServer.connectionStatus === 'connected' && (
                              <Badge variant="secondary" className="h-5 px-1.5 bg-green-500/10 text-green-600 border-green-500/20 text-[9px] font-bold uppercase tracking-tight gap-1">
                                <Check className="h-2.5 w-2.5" />
                                Active
                              </Badge>
                            )}
                          </div>
                          {selectedServer.description && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 italic">
                              {selectedServer.description}
                            </p>
                          )}
                          <div className="pt-1">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-background border-border/50">
                              {selectedServer.category}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Show/Hide Tools Button */}
                      {selectedServer.tools && selectedServer.tools.length > 0 && (
                        <div className="pt-2 border-t border-border/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDetails(!showDetails)}
                            className="w-full justify-between h-8 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-all p-0"
                          >
                            <span className="flex items-center gap-2">
                              <Settings2 className="h-3.5 w-3.5" />
                              Available Tools ({selectedServer.tools.length})
                            </span>
                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showDetails && "rotate-180")} />
                          </Button>

                          {/* Tools List */}
                          <AnimatePresence>
                            {showDetails && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-2 overflow-hidden"
                              >
                                <div className="space-y-1.5 pt-1">
                                  {selectedServer.tools.map((tool: string) => (
                                    <div key={tool} className="flex items-center gap-2 px-2.5 py-1.5 bg-background/50 rounded-md border border-border/30 group hover:border-primary/30 transition-all">
                                      <div className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors shrink-0" />
                                      <code className="text-[10px] font-mono text-foreground break-all leading-tight">
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
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add New Server Link */}
        <div className="pt-4 border-t border-border/50 px-1">
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Registry</h5>
              <p className="text-[10px] text-muted-foreground italic font-medium">
                Manage your MCP servers and registry in settings.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenSettings?.();
              }}
              className="w-full h-8 font-bold uppercase tracking-wider text-[10px] border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm rounded-md"
            >
              Go to MCP Registry →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
