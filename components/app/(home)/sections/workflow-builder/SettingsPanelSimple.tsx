"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Trash2, Plug, Plus, ChevronDown, ChevronRight, TestTube, Globe, Brain, Database, Package, Loader2, Shield, Lock, ClipboardPaste, Edit, Eye, EyeOff, Key } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import PasteConfigModal from "./PasteConfigModal";

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
      <CheckCircle className="w-16 h-16 text-primary" />
    ) : (
      <XCircle className="w-16 h-16 text-black-alpha-32" />
    );

  return (<>
    <div className="h-full flex flex-col bg-accent-white">
      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-20 space-y-24">
        {loading ? (
          <div className="text-center py-32">
            <div className="inline-block w-32 h-32 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-muted-foreground mt-12">Loading configuration...</p>
          </div>
        ) : (
          <div className="space-y-20">
            {/* LLM Providers */}
            <div>
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-sm font-medium font-medium text-foreground">LLM Providers</h3>
                <button
                  onClick={() => setShowAddLLMKey(true)}
                  className="px-12 py-6 bg-primary hover:bg-primary/90 text-white rounded-md text-xs font-medium transition-all active:scale-[0.98] flex items-center gap-6"
                >
                  <Plus className="w-14 h-14" />
                  Add API Key
                </button>
              </div>

              {/* Provider Cards with Keys */}
              <div className="space-y-8">
                {['anthropic', 'openai', 'groq'].map(provider => {
                  const providerKey = userLLMKeys?.find(k => k.provider === provider && k.isActive);
                  const hasEnvKey = provider === 'anthropic' ? serverConfig?.anthropicConfigured :
                    provider === 'openai' ? serverConfig?.openaiConfigured :
                      serverConfig?.groqConfigured;

                  return (
                    <div key={provider} className="p-12 bg-background rounded-md border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                          <StatusIcon configured={!!(providerKey || hasEnvKey)} />
                          <div>
                            <p className="text-xs text-foreground font-medium capitalize">{provider}</p>
                            {providerKey ? (
                              <p className="text-xs text-muted-foreground">
                                Key: {providerKey.keyPrefix} {providerKey.label && `(${providerKey.label})`}
                              </p>
                            ) : hasEnvKey ? (
                              <p className="text-xs text-muted-foreground">Using environment variable</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not configured</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          {providerKey && (
                            <>
                              <button
                                onClick={async () => {
                                  if (user?.id) {
                                     await deleteLLMKey({ id: providerKey._id });
                                    toast.success(`${provider} key removed`);
                                  }
                                }}
                                className="p-6 hover:bg-secondary rounded-6 transition-colors"
                                title="Remove key"
                              >
                                <Trash2 className="w-14 h-14 text-muted-foreground hover:text-foreground" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedProvider(provider as any);
                              setShowAddLLMKey(true);
                            }}
                            className="p-6 hover:bg-secondary rounded-6 transition-colors"
                            title={providerKey ? "Update key" : "Add key"}
                          >
                            {providerKey ? (
                              <Edit className="w-14 h-14 text-muted-foreground hover:text-foreground" />
                            ) : (
                              <Plus className="w-14 h-14 text-muted-foreground hover:text-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 p-12 bg-secondary border border-primary rounded-md">
                <p className="text-xs text-foreground/64">
                  <strong>Note:</strong> Your API keys take priority over environment variables.
                  Keys are encrypted and stored securely per user.
                </p>
              </div>
            </div>



            {/* MCP Registry */}
            <div>
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-sm font-medium font-medium text-foreground">MCP Registry</h3>
                <div className="flex gap-8">
                  <button
                    onClick={() => setShowPasteConfigModal(true)}
                    className="px-12 py-6 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-xs font-medium transition-all active:scale-[0.98] flex items-center gap-6 border border-border"
                  >
                    <ClipboardPaste className="w-14 h-14" />
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
                    className="px-12 py-6 bg-primary hover:bg-primary/90 text-white rounded-md text-xs font-medium transition-all active:scale-[0.98] flex items-center gap-6"
                  >
                    <Plus className="w-14 h-14" />
                    Add Rube MCP
                  </button>
                  <button
                    onClick={() => setShowAddMCPModal(true)}
                    className="px-12 py-6 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-xs font-medium transition-all active:scale-[0.98] flex items-center gap-6 border border-border"
                  >
                    <Plus className="w-14 h-14" />
                    Add Custom Server
                  </button>
                </div>
              </div>

              {/* MCP Cards */}
              <div className="space-y-8">
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
            <div>
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-sm font-medium font-medium text-foreground">Custom Integrations</h3>
              </div>
              <div className="space-y-8">
                {connectors?.map((conn) => (
                  <div key={conn._id} className="p-12 bg-background border border-border rounded-md flex items-center justify-between group">
                    <div className="flex items-center gap-12">
                      <div className="p-8 bg-secondary rounded-md text-primary">
                        {conn.type === 'database' ? <Database className="w-16 h-16" /> : <Globe className="w-16 h-16" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{conn.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{conn.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={async () => {
                          if (confirm(`Remove integration "${conn.name}"?`)) {
                            await deleteConnector({ id: conn._id });
                            toast.success("Integration removed");
                          }
                        }}
                        className="p-6 hover:bg-secondary rounded-6 text-muted-foreground hover:text-accent-red transition-all"
                      >
                        <Trash2 className="w-14 h-14" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!connectors || connectors.length === 0) && (
                  <div className="text-center py-20 bg-secondary rounded-xl border border-dashed border-border">
                    <p className="text-xs text-black-alpha-40">No custom integrations yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="p-16 bg-secondary border border-primary rounded-md">
              <div className="flex items-start gap-12">
                <AlertCircle className="w-20 h-20 text-primary flex-shrink-0 mt-2" />
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
    }</>)


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
        case 'web': return <Globe className="w-16 h-16" />;
        case 'ai': return <Brain className="w-16 h-16" />;
        case 'data': return <Database className="w-16 h-16" />;
        default: return <Package className="w-16 h-16" />;
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
        return <Loader2 className="w-16 h-16 animate-spin text-primary" />;
      }
      switch (server.connectionStatus) {
        case 'connected': return <CheckCircle className="w-16 h-16" />;
        case 'error': return <XCircle className="w-16 h-16" />;
        default: return <AlertCircle className="w-16 h-16" />;
      }
    };

    const getAuthIcon = () => {
      switch (server.authType) {
        case 'api-key': return <Key className="w-12 h-12 text-muted-foreground" />;
        case 'bearer': return <Shield className="w-12 h-12 text-muted-foreground" />;
        case 'oauth-coming-soon': return <Lock className="w-12 h-12 text-black-alpha-32" />;
        default: return null;
      }
    };

    return (
      <div className={`bg-background rounded-md border ${server.enabled ? 'border-border' : 'border-black-alpha-8 opacity-60'}`}>
        {/* Header */}
        <div className="p-12 flex items-center gap-8">
          <button
            onClick={onExpandToggle}
            className="p-4 hover:bg-secondary rounded-4 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-16 h-16" /> : <ChevronRight className="w-16 h-16" />}
          </button>

          <div className={`${getStatusColor()}`}>{getCategoryIcon()}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-8">
              <p className="text-xs text-foreground font-medium">{server.name}</p>
              {server.isOfficial && (
                <span className="px-6 py-2 bg-secondary text-primary text-xs rounded-4 font-medium">
                  Official
                </span>
              )}
              {getAuthIcon()}
            </div>
            {server.description && (
              <p className="text-xs text-muted-foreground mt-2">{server.description}</p>
            )}
          </div>

          <div className={`${getStatusColor()}`}>{getStatusIcon()}</div>

          <div className="flex items-center gap-8">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={server.enabled}
                onChange={onToggle}
                className="sr-only peer"
              />
              <div className="w-36 h-20 bg-secondary/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-16 after:w-16 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-12 pb-12 border-t border-border">
            <div className="pt-12 space-y-12">
              {/* URL & Auth */}
              <div className="grid grid-cols-2 gap-12">
                <div>
                  <p className="text-xs text-muted-foreground mb-4">URL</p>
                  <code className="text-xs font-mono text-foreground bg-secondary px-8 py-4 rounded-4 block truncate">
                    {server.url}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-4">Authentication</p>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-foreground capitalize">
                      {server.authType === 'oauth-coming-soon' ? 'OAuth (Coming Soon)' : server.authType.replace('-', ' ')}
                    </span>
                    {server.accessToken && <span className="text-xs text-black-alpha-32">•••••••</span>}
                  </div>
                </div>
              </div>

              {/* Tools */}
              {server.tools && server.tools.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-4">Available Tools ({server.tools.length})</p>
                  <div className="flex flex-wrap gap-4">
                    {server.tools.map((tool) => (
                      <span key={tool} className="px-8 py-4 bg-secondary text-xs text-foreground rounded-4">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-12 text-xs">
                {server.lastTested && (
                  <span className="text-muted-foreground">
                    Last tested: {new Date(server.lastTested).toLocaleString()}
                  </span>
                )}
                {server.lastError && (
                  <span className="text-foreground">
                    Error: {server.lastError}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-8 pt-8">
                <button
                  onClick={onTest}
                  disabled={isTesting}
                  className="px-12 py-6 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-xs transition-all flex items-center gap-6 disabled:opacity-50"
                >
                  <TestTube className="w-14 h-14" />
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={onEdit}
                  className="px-12 py-6 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-xs transition-all flex items-center gap-6"
                >
                  <Edit className="w-14 h-14" />
                  Edit
                </button>
                {!server.isOfficial && (
                  <button
                    onClick={onDelete}
                    className="px-12 py-6 bg-secondary hover:bg-accent-black hover:text-white text-muted-foreground rounded-md text-xs transition-all flex items-center gap-6"
                  >
                    <Trash2 className="w-14 h-14" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Add MCP Modal Component
  interface AddMCPModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingServer?: MCPServer | null;
    onSave: (data: {
      name: string;
      url: string;
      description?: string;
      category: string;
      authType: string;
      accessToken?: string;
      tools?: string[];
      headers?: any;
    }) => Promise<void>;
  }

  function AddMCPModal({ isOpen, onClose, onSave, editingServer }: AddMCPModalProps) {
    const [formData, setFormData] = useState({
      name: editingServer?.name || '',
      url: editingServer?.url || '',
      description: editingServer?.description || '',
      category: editingServer?.category || 'custom',
      authType: editingServer?.authType || 'none',
      accessToken: editingServer?.accessToken || ''
    });
    const [isTesting, setIsTesting] = useState(false);
    const [discoveredTools, setDiscoveredTools] = useState<string[] | null>(editingServer?.tools || null);

    if (!isOpen) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-accent-white rounded-16 shadow-2xl max-w-md w-full mx-20 max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-24 border-b border-border flex-shrink-0">
            <h3 className="text-title-h4 text-foreground">
              {editingServer ? 'Edit MCP Server' : 'Add MCP Server'}
            </h3>
          </div>

          <div className="p-24 space-y-16 overflow-y-auto flex-1">
            <div>
              <label className="text-xs text-foreground/64 mb-4 block">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., My MCP Server"
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground"
              />
            </div>

            <div>
              <label className="text-xs text-foreground/64 mb-4 block">URL</label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://mcp.example.com"
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-foreground/64 mb-4 block">Description (optional)</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this MCP server"
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground"
              />
            </div>

            <div>
              <label className="text-xs text-foreground/64 mb-4 block">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground"
              >
                <option value="web">Web</option>
                <option value="ai">AI</option>
                <option value="data">Data</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-foreground/64 mb-4 block">Authentication</label>
              <select
                value={formData.authType}
                onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground"
              >
                <option value="none">None</option>
                <option value="api-key">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="oauth-coming-soon" disabled>OAuth (Coming Soon)</option>
              </select>
            </div>

            {(formData.authType === 'api-key' || formData.authType === 'bearer') && (
              <div>
                <label className="text-xs text-foreground/64 mb-4 block">
                  {formData.authType === 'api-key' ? 'API Key' : 'Bearer Token'}
                </label>
                <input
                  type="password"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  placeholder={formData.authType === 'api-key' ? 'sk-...' : 'Bearer token'}
                  className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground font-mono"
                />
              </div>
            )}

            {/* Test Connection Button */}
            <div>
              <button
                type="button"
                onClick={async () => {
                  if (!formData.url) {
                    toast.error('Please enter a URL first');
                    return;
                  }

                  setIsTesting(true);
                  setDiscoveredTools(null);

                  try {
                    const response = await fetch('/api/test-mcp-connection', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        url: formData.url,
                        authToken: formData.accessToken,
                      }),
                    });

                    const result = await response.json();

                    if (result.success) {
                      setDiscoveredTools(result.tools || []);
                      toast.success(`Connection successful! ${result.tools?.length || 0} tools discovered`);
                    } else {
                      toast.error('Connection failed', {
                        description: result.error || result.details,
                      });
                    }
                  } catch (error) {
                    toast.error('Failed to test connection');
                  } finally {
                    setIsTesting(false);
                  }
                }}
                disabled={isTesting || !formData.url}
                className="w-full px-16 py-10 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-xs font-medium transition-all flex items-center justify-center gap-6 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-14 h-14 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="w-14 h-14" />
                    Test Connection
                  </>
                )}
              </button>
            </div>

            {/* Discovered Tools */}
            {discoveredTools && discoveredTools.length > 0 && (
              <div>
                <label className="text-xs text-foreground/64 mb-4 block">
                  Discovered Tools ({discoveredTools.length})
                </label>
                <div className="p-12 bg-secondary rounded-md border border-primary">
                  <div className="flex flex-wrap gap-4">
                    {discoveredTools.map((tool) => (
                      <span key={tool} className="px-6 py-2 bg-white text-primary rounded-4 text-xs font-medium border border-primary">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-20 border-t border-border flex gap-8 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-20 py-12 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave({
                ...formData,
                tools: discoveredTools || [],
                headers: editingServer?.headers
              })}
              className="flex-1 px-20 py-12 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-medium transition-all"
            >
              {editingServer ? 'Update' : 'Add to Registry'}
            </button>
          </div>
        </motion.div>
      </motion.div>
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-accent-white rounded-16 shadow-2xl max-w-md w-full mx-20 max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-24 border-b border-border flex-shrink-0">
            <h3 className="text-title-h4 text-foreground">
              {selectedProvider ? `Update ${selectedProvider} API Key` : 'Add LLM API Key'}
            </h3>
          </div>

          <div className="p-24 space-y-16 overflow-y-auto flex-1">
            <div>
              <label className="text-xs text-foreground/64 mb-4 block">Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value as 'anthropic' | 'openai' | 'groq' })}
                disabled={!!selectedProvider}
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground capitalize"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-foreground/64 mb-4 block">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={
                    formData.provider === 'anthropic' ? 'sk-ant-...' :
                      formData.provider === 'openai' ? 'sk-proj-...' :
                        'gsk_...'
                  }
                  className="w-full pr-32 px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-4 hover:bg-secondary rounded-4 transition-colors"
                >
                  {showKey ? (
                    <EyeOff className="w-16 h-16 text-muted-foreground" />
                  ) : (
                    <Eye className="w-16 h-16 text-muted-foreground" />
                  )}
                </button>
              </div>
              <a
                href={getProviderHelpLink(formData.provider)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-heat-200 mt-2 underline block"
              >
                Get your {formData.provider} API key →
              </a>
            </div>

            <div>
              <label className="text-xs text-foreground/64 mb-4 block">Label (optional)</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Production, Development"
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground"
              />
            </div>

            <div className="p-12 bg-secondary border border-primary rounded-md">
              <p className="text-xs text-foreground/64">
                <strong>Security:</strong> Your API key will be encrypted and stored securely.
                It will only be accessible by you and never shared across users.
              </p>
            </div>
          </div>

          <div className="p-20 border-t border-border flex gap-8 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-20 py-12 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-sm font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
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
              className="flex-1 px-20 py-12 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-6"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-14 h-14 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save API Key'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }
}
