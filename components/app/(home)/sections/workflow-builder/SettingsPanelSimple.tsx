"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Trash2, Plug, Plus, ChevronDown, ChevronRight, TestTube, Globe, Brain, Database, Package, Loader2, Shield, Lock, ClipboardPaste, Edit, Eye, EyeOff, Key, ArrowRight, ArrowLeft, X, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import PasteConfigModal from "./PasteConfigModal";
import AddMCPModal from "./AddMCPModal";


interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServerAPIConfig {
  anthropicConfigured: boolean;
  groqConfigured: boolean;
  openaiConfigured: boolean;
  hasKeys: boolean;
}

interface MCPServer {
  _id: Id<"mcpServers">;
  userId: string;
  name: string;
  url: string;
  description?: string;
  category: string;
  authType: string;
  accessToken?: string;
  tools?: string[];
  connectionStatus: string;
  lastTested?: string;
  lastError?: string;
  enabled: boolean;
  isOfficial: boolean;
  headers?: any;
  createdAt: string;
  updatedAt: string;
}

export type { MCPServer };


interface MCPCardProps {
  server: MCPServer;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isExpanded: boolean;
  onExpandToggle: () => void;
  isTesting: boolean;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { user } = useUser();
  const [serverConfig, setServerConfig] = useState<ServerAPIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLLMKey, setShowAddLLMKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'anthropic' | 'openai' | 'groq' | null>(null);


  // LLM Keys queries and mutations
  const userLLMKeys = useQuery(api.userLLMKeys.getUserLLMKeys,
    user?.id ? {} : "skip"
  );
  const upsertLLMKey = useMutation(api.userLLMKeys.upsertLLMKey);
  const deleteLLMKey = useMutation(api.userLLMKeys.deleteLLMKey);
  const toggleLLMKeyActive = useMutation(api.userLLMKeys.toggleKeyActive);

  // MCP Registry state
  const mcpServers = useQuery(api.mcpServers.listUserMCPs,
    user?.id ? {} : "skip"
  ) as MCPServer[] | undefined;

  const addMCPServer = useMutation(api.mcpServers.addMCPServer);
  const updateMCPServer = useMutation(api.mcpServers.updateMCPServer);
  const deleteMCPServer = useMutation(api.mcpServers.deleteMCPServer);
  const toggleMCPEnabled = useMutation(api.mcpServers.toggleMCPEnabled);
  const seedOfficialMCPs = useMutation(api.mcpServers.seedOfficialMCPs);
  const updateConnectionStatus = useMutation(api.mcpServers.updateConnectionStatus);
  const cleanupOfficialMCPs = useMutation(api.mcpServers.cleanupOfficialMCPs);

  // Connectors state
  const connectors = useQuery(api.knowledgeConnectors.listConnectors);
  const deleteConnector = useMutation(api.knowledgeConnectors.deleteConnector);

  const [expandedMCPs, setExpandedMCPs] = useState<Set<string>>(new Set());
  const [testingMCPs, setTestingMCPs] = useState<Set<string>>(new Set());
  const [showAddMCPModal, setShowAddMCPModal] = useState(false);
  const [showPasteConfigModal, setShowPasteConfigModal] = useState(false);
  const [editingMCP, setEditingMCP] = useState<MCPServer | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const config = await response.json();
          setServerConfig(config);
        }
      } catch (error) {
        console.warn('Failed to load server API config:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const StatusIcon = ({ configured }: { configured: boolean }) =>
    configured ? (
      <CheckCircle className="w-4 h-4 text-primary" />
    ) : (
      <XCircle className="w-4 h-4 text-black-alpha-32" />
    );

  return (<>
    <div className="h-full flex flex-col bg-accent-white">
      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3 space-y-4 w-full">
          {loading ? (
            <div className="text-center py-32">
              <div className="inline-block w-32 h-32 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-muted-foreground mt-3">Loading configuration...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* LLM Providers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">LLM Providers</h3>
                  <Button
                    onClick={() => setShowAddLLMKey(true)}
                    className="h-8 text-[10px] font-bold uppercase tracking-wider"
                    variant="outline"
                  >
                    <Plus className="w-3 h-3" />
                    Add API Key
                  </Button>
                </div>

              {/* Provider Cards with Keys */}
              <div className="space-y-2">
                {['anthropic', 'openai', 'groq'].map(provider => {
                  const providerKey = userLLMKeys?.find(k => k.provider === provider && k.isActive);
                  const hasEnvKey = provider === 'anthropic' ? serverConfig?.anthropicConfigured :
                    provider === 'openai' ? serverConfig?.openaiConfigured :
                      serverConfig?.groqConfigured;

                  return (
                    <div key={provider} className="p-2 bg-background rounded-md border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon configured={!!(providerKey || hasEnvKey)} />
                          <div>
                            <p className="text-[11px] text-foreground font-semibold capitalize">{provider}</p>
                            {providerKey ? (
                              <p className="text-[10px] text-muted-foreground">
                                Key: {providerKey.keyPrefix} {providerKey.label && `(${providerKey.label})`}
                              </p>
                            ) : hasEnvKey ? (
                              <p className="text-[10px] text-muted-foreground">Using environment variable</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not configured</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {providerKey && (
                            <>
                              <button
                                onClick={async () => {
                                  if (user?.id) {
                                    await deleteLLMKey({ id: providerKey._id });
                                    toast.success(`${provider} key removed`);
                                  }
                                }}
                                className="p-2 hover:bg-secondary rounded-6 transition-colors"
                                title="Remove key"
                              >
                                <Trash2 className=" text-muted-foreground hover:text-foreground" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedProvider(provider as any);
                              setShowAddLLMKey(true);
                            }}
                            className="p-2 hover:bg-secondary rounded-6 transition-colors"
                            title={providerKey ? "Update key" : "Add key"}
                          >
                            {providerKey ? (
                              <Edit className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 p-3 bg-secondary border border-primary rounded-md">
                <p className="text-[10px] text-foreground/64 leading-tight">
                  <strong className="text-primary font-bold">Note:</strong> Your API keys take priority over environment variables.
                  Keys are encrypted and stored securely per user.
                </p>
              </div>
            </div>



            {/* MCP Registry */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MCP Registry</h3>
              </div>
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPasteConfigModal(true)}
                    className="flex-1 h-8 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-border/50"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    Paste Config
                  </button>
                  <button
                    onClick={async () => {
                      if (user?.id) {
                        const loadingToast = toast.loading("Adding Rube MCP...");
                        try {
                          await seedOfficialMCPs({});
                          toast.success("Rube MCP added to your registry", { id: loadingToast });
                        } catch (error) {
                          toast.error("Failed to add Rube MCP", { id: loadingToast });
                        }
                      }
                    }}
                    className="flex-1 h-8 bg-primary hover:bg-primary/90 text-white rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Rube MCP
                  </button>
                </div>
                <button
                  onClick={() => setShowAddMCPModal(true)}
                  className="h-8 w-full bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-border/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Server
                </button>
              </div>

              {/* MCP Cards */}
              <div className="space-y-2">
                {mcpServers?.map((server) => (
                  <MCPCard
                    key={server._id}
                    server={server}
                    isExpanded={expandedMCPs.has(server._id)}
                    isTesting={testingMCPs.has(server._id)}
                    onExpandToggle={() => {
                      const newExpanded = new Set(expandedMCPs);
                      if (newExpanded.has(server._id)) {
                        newExpanded.delete(server._id);
                      } else {
                        newExpanded.add(server._id);
                      }
                      setExpandedMCPs(newExpanded);
                    }}
                    onToggle={async () => {
                      await toggleMCPEnabled({ id: server._id });
                      toast.success(`${server.name} ${server.enabled ? 'disabled' : 'enabled'}`);
                    }}
                    onTest={async () => {
                      setTestingMCPs(prev => new Set(Array.from(prev).concat(server._id)));
                      try {
                        const response = await fetch('/api/test-mcp-connection', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            url: server.url,
                            authToken: server.accessToken,
                            headers: server.headers,
                          }),
                        });
                        const result = await response.json();
                        if (result.success) {
                          await updateConnectionStatus({ id: server._id, status: "connected", tools: result.tools || [] });
                          toast.success(`Connected to ${server.name}`);
                        } else {
                          await updateConnectionStatus({ id: server._id, status: "error", error: result.error || "Connection failed" });
                          toast.error(`Failed to connect to ${server.name}`);
                        }
                      } catch (error) {
                        await updateConnectionStatus({ id: server._id, status: "error", error: "Connection failed" });
                        toast.error(`Failed to connect to ${server.name}`);
                      } finally {
                        setTestingMCPs(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(server._id);
                          return newSet;
                        });
                      }
                    }}
                    onEdit={() => {
                      setEditingMCP(server);
                      setShowAddMCPModal(true);
                    }}
                    onDelete={async () => {
                      if (confirm(`Delete ${server.name}?`)) {
                        await deleteMCPServer({ id: server._id });
                        toast.success(`${server.name} deleted`);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Custom Integrations & Data Sources */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Custom Integrations</h4>
              </div>
              <div className="space-y-8">
                {connectors?.map((conn) => (
                  <div key={conn._id} className="p-3 bg-background border border-border rounded-md flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-8 bg-secondary rounded-md text-primary">
                        {conn.type === 'database' ? <Database className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{conn.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{conn.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={async () => {
                          if (confirm(`Remove integration "${conn.name}"?`)) {
                            await deleteConnector({ id: conn._id });
                            toast.success("Integration removed");
                          }
                        }}
                        className="p-6 hover:bg-secondary rounded-6 text-muted-foreground hover:text-accent-red transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!connectors || connectors.length === 0) && (
                  <div className="text-center py-20 bg-secondary rounded-lg border border-dashed border-border">
                    <p className="text-xs text-black-alpha-40">No custom integrations yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-secondary border border-primary rounded-md">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground font-medium mb-4">
                    How to Configure
                  </p>
                  <p className="text-xs text-foreground/64">
                    LLM & Integration keys are set in <code className="px-4 py-2 bg-white rounded text-xs font-mono">.env.local</code>.
                    MCP servers can be imported from cursor config above.
                  </p>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div >

    {
      showAddMCPModal && (
        <AddMCPModal
          isOpen={showAddMCPModal}
          onClose={() => {
            setShowAddMCPModal(false);
            setEditingMCP(null);
          }}
          editingServer={editingMCP}
          onSave={async (data) => {
            try {
              if (editingMCP) {
                // Update existing server
                await updateMCPServer({
                  id: editingMCP._id,
                  ...data
                });
                toast.success(`${data.name} updated`);
                setShowAddMCPModal(false);
                setEditingMCP(null);
              } else if (user?.id) {
                // If tools already discovered via Test Connection button, use those
                if (data.tools && data.tools.length > 0) {
                  await addMCPServer({
                    ...data,
                  });
                  toast.success(`${data.name} added with ${data.tools.length} tools`);
                } else {
                  // Otherwise, test the connection first to discover tools
                  const loadingToast = toast.loading(`Testing connection to ${data.name}...`);

                  const testResponse = await fetch('/api/test-mcp-connection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      url: data.url,
                      authToken: data.accessToken,
                      headers: data.headers,
                    }),
                  });

                  const testResult = await testResponse.json();

                  if (!testResult.success) {
                    toast.error(`Failed to connect to ${data.name}`, {
                      description: testResult.error || 'Unable to discover tools',
                      id: loadingToast,
                    });
                    return; // Don't save if connection fails
                  }

                  // Save with discovered tools
                  await addMCPServer({
                    ...data,
                    tools: testResult.tools || [],
                  });

                  toast.success(`${data.name} added with ${testResult.tools?.length || 0} tools`, {
                    id: loadingToast,
                  });
                }
              }
              setShowAddMCPModal(false);
            } catch (error) {
              toast.error('Failed to save MCP server');
            }
          }}
        />
      )
    }

    {/* Add/Edit LLM Key Modal */}
    {
      showAddLLMKey && (
        <AddLLMKeyModal
          isOpen={showAddLLMKey}
          onClose={() => {
            setShowAddLLMKey(false);
            setSelectedProvider(null);
          }}
          selectedProvider={selectedProvider}
          onSave={async (provider, apiKey, label) => {
            if (user?.id) {
              await upsertLLMKey({
                provider,
                apiKey,
                label
              });
              toast.success(`${provider} API key saved`);
              setShowAddLLMKey(false);
              setSelectedProvider(null);
            }
          }}
        />
      )
    }

    {/* Paste Config Modal */}
    {
      showPasteConfigModal && (
        <PasteConfigModal
          isOpen={showPasteConfigModal}
          onClose={() => setShowPasteConfigModal(false)}
          onSave={async (servers) => {
            try {
              if (!user?.id) {
                toast.error('User not authenticated');
                return;
              }

              // Save all servers from the pasted config
              const importedServers: any[] = [];

              for (const serverData of servers) {
                // Check if server with same name already exists
                const existingServer = mcpServers?.find(s => s.name === serverData.name);
                let serverId: string;

                if (existingServer) {
                  // Update existing server
                  await updateMCPServer({
                    id: existingServer._id,
                    ...serverData,
                  });
                  serverId = existingServer._id;
                } else {
                  // Add new server
                  const newServerId = await addMCPServer({
                    ...serverData,
                  });
                  serverId = newServerId;
                }

                importedServers.push({ ...serverData, _id: serverId });
              }

              // Test all imported servers automatically
              toast.info(`Testing ${importedServers.length} imported server${importedServers.length > 1 ? 's' : ''}...`);

              for (const server of importedServers) {
                try {
                  const testResponse = await fetch('/api/test-mcp-connection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      url: server.url,
                      authToken: server.accessToken,
                      headers: server.headers,
                    }),
                  });

                  const testResult = await testResponse.json();

                  if (testResult.success) {
                    // Update with discovered tools
                    await updateConnectionStatus({
                      id: server._id,
                      status: "connected",
                      tools: testResult.tools || []
                    });
                    toast.success(`✅ ${server.name}: ${testResult.tools?.length || 0} tools discovered`);
                  } else {
                    await updateConnectionStatus({
                      id: server._id,
                      status: "error",
                      error: testResult.error || "Connection failed"
                    });
                    toast.error(`❌ ${server.name}: ${testResult.error || 'Connection failed'}`);
                  }
                } catch (error) {
                  await updateConnectionStatus({
                    id: server._id,
                    status: "error",
                    error: error instanceof Error ? error.message : "Test failed"
                  });
                  toast.error(`❌ ${server.name}: Test failed`);
                }
              }

              setShowPasteConfigModal(false);
            } catch (error) {
              toast.error('Failed to import MCP configuration');
              console.error('Import error:', error);
            }
          }}
        />
      )
    }</>
  );
}



  // MCP Card Component
  function MCPCard({
    server,
    isExpanded,
    isTesting,
    onExpandToggle,
    onToggle,
    onTest,
    onEdit,
    onDelete
  }: MCPCardProps) {
    const getCategoryIcon = () => {
      switch (server.category) {
        case 'web': return <Globe className="w-4 h-4" />;
        case 'ai': return <Brain className="w-4 h-4" />;
        case 'data': return <Database className="w-4 h-4" />;
        default: return <Package className="w-4 h-4" />;
      }
    };

    const getStatusColor = () => {
      switch (server.connectionStatus) {
        case 'connected': return 'text-primary';
        case 'error': return 'text-foreground';
        default: return 'text-black-alpha-32';
      }
    };

    const getStatusIcon = () => {
      if (isTesting) {
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      }
      switch (server.connectionStatus) {
        case 'connected': return <CheckCircle className="w-4 h-4" />;
        case 'error': return <XCircle className="w-4 h-4" />;
        default: return <AlertCircle className="w-4 h-4" />;
      }
    };

    const getAuthIcon = () => {
      switch (server.authType) {
        case 'api-key': return <Key className="w-3.5 h-3.5 text-muted-foreground" />;
        case 'bearer': return <Shield className="w-3.5 h-3.5 text-muted-foreground" />;
        case 'oauth-coming-soon': return <Lock className="w-3.5 h-3.5 text-black-alpha-32" />;
        default: return null;
      }
    };

    return (
      <div className={`bg-background rounded-md border ${server.enabled ? 'border-border shadow-xs' : 'border-border/10 opacity-60'} overflow-hidden transition-all hover:border-border/20`}>
        {/* Header */}
        <div className="p-2.5 flex items-center gap-2">
          <button
            onClick={onExpandToggle}
            className="p-1 hover:bg-secondary rounded-md transition-colors shrink-0"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>


          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className={`${getStatusColor()} shrink-0`}>{getCategoryIcon()}</div>
              <p className="text-[11px] text-foreground font-bold truncate">{server.name}</p>
              {server.isOfficial && (
                <span className="px-1.5 py-0 bg-primary/10 text-primary text-[9px] rounded-sm font-bold uppercase tracking-wider">
                  Official
                </span>
              )}
              {getAuthIcon()}
            </div>
            {server.description && (
              <p className="text-[10px] text-muted-foreground truncate mt-1 opacity-70 group-hover:opacity-100 transition-opacity">{server.description}</p>
            )}
          </div>

          <div className={`${getStatusColor()} shrink-0`}>{getStatusIcon()}</div>

          <div className="flex items-center gap-2 ml-1">
            <Switch
              checked={server.enabled}
              onCheckedChange={onToggle}
              className="scale-75 origin-right"
            />
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-border bg-muted/5">
            <div className="pt-3 space-y-4">
              {/* Endpoint Section */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Server Endpoint</p>
                <div className="flex items-center gap-2 p-1.5 bg-background border border-border rounded-md">
                  <div className="p-1 bg-secondary rounded text-primary">
                    <Globe className="w-3 h-3" />
                  </div>
                  <code className="text-[11px] font-mono text-foreground flex-1 truncate">
                    {server.url}
                  </code>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Authentication</p>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-secondary rounded text-muted-foreground">
                      {server.authType === 'api-key' ? <Key className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    </div>
                    <span className="text-xs text-foreground font-medium capitalize">
                      {server.authType === 'oauth-coming-soon' ? 'OAuth' : server.authType.replace('-', ' ')}
                    </span>
                    {server.accessToken && <span className="text-[10px] text-muted-foreground/50 tracking-widest ml-auto">••••</span>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Connection Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${server.lastError ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {server.lastError ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {server.lastTested ? new Date(server.lastTested).toLocaleDateString() : 'Never tested'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tools Section */}
              {server.tools && server.tools.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Available Tools <span className="text-muted-foreground/50 lowercase font-normal">({server.tools.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {server.tools.slice(0, 12).map((tool) => (
                      <span key={tool} className="px-2 py-0.5 bg-background border border-border text-[10px] text-foreground rounded-md hover:border-primary/30 transition-colors cursor-default">
                        {tool}
                      </span>
                    ))}
                    {server.tools.length > 12 && (
                      <span className="px-2 py-0.5 bg-muted text-[10px] text-muted-foreground rounded-md">
                        +{server.tools.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onTest}
                    disabled={isTesting}
                    className="h-7 px-2.5 bg-primary text-white hover:bg-primary/90 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                  >
                    <TestTube className="w-3 h-3" />
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                    <button
                      onClick={onEdit}
                      className="h-7 px-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Add LLM Key Modal Component
  interface AddLLMKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedProvider: 'anthropic' | 'openai' | 'groq' | null;
    onSave: (provider: string, apiKey: string, label?: string) => Promise<void>;
  }

  function AddLLMKeyModal({ isOpen, onClose, selectedProvider, onSave }: AddLLMKeyModalProps) {
    const [formData, setFormData] = useState({
      provider: selectedProvider || 'anthropic',
      apiKey: '',
      label: '',
    });
    const [showKey, setShowKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      if (selectedProvider) {
        setFormData(prev => ({ ...prev, provider: selectedProvider }));
      }
    }, [selectedProvider]);

    if (!isOpen) return null;

    const getProviderHelpLink = (provider: string) => {
      switch (provider) {
        case 'anthropic':
          return 'https://console.anthropic.com/settings/keys';
        case 'openai':
          return 'https://platform.openai.com/api-keys';
        case 'groq':
          return 'https://console.groq.com/keys';
        default:
          return '#';
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-border bg-background shadow-2xl">
          <DialogHeader className="px-4 py-2 border-b border-border bg-muted/30">
            <DialogTitle className="text-sm font-bold text-foreground text-left">
              {selectedProvider ? `Update ${selectedProvider} API Key` : 'Add LLM API Key'}
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-3 overflow-y-auto max-h-[70vh] custom-scrollbar">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                Provider
              </Label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value as 'anthropic' | 'openai' | 'groq' })}
                disabled={!!selectedProvider}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-xs text-foreground capitalize outline-none focus:ring-1 focus:ring-primary/30 transition-all font-medium"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                API Key
              </Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={
                    formData.provider === 'anthropic' ? 'sk-ant-...' :
                      formData.provider === 'openai' ? 'sk-proj-...' :
                        'gsk_...'
                  }
                  className="pr-10 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <a
                href={getProviderHelpLink(formData.provider)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline mt-1 flex items-center gap-1 font-medium transition-colors"
              >
                Get your {formData.provider} API key
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                Label <span className="text-muted-foreground/50 font-normal lowercase">(optional)</span>
              </Label>
              <Input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Production, Development"
                className="text-xs"
              />
            </div>

            <div className="p-4 bg-muted/30 border border-border/50 rounded-lg flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-md text-primary">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Security</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Your API key will be encrypted and stored securely. It will only be accessible by you and never shared across users.
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-border bg-muted/30 flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 text-xs font-bold text-muted-foreground hover:text-foreground h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!formData.apiKey) {
                  toast.error('Please enter an API key');
                  return;
                }
                setIsSaving(true);
                try {
                  await onSave(formData.provider, formData.apiKey, formData.label);
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving || !formData.apiKey}
              className="flex-1 text-xs font-bold h-10"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save API Key'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  );
}
