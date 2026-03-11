"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, Trash2, Settings2, Plus, X, ListFilter, HelpCircle, Check, Info, Layers, AlertTriangle, LayoutGrid } from "lucide-react";
import VariableReferencePicker from "./VariableReferencePicker";
import GuardrailsNodePanel from "./GuardrailsNodePanel";
import ApprovalNodePanel from "./ApprovalNodePanel";
import MemoryNodePanel from "./MemoryNodePanel";
import InputNodePanel from "./InputNodePanel";
import RouterNodePanel from "./RouterNodePanel";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { llmProviders } from "@/lib/config/llm-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NodePanelProps {
  node: any | null;
  nodes?: any[]; // All nodes for variable reference
  onClose: () => void;
  onAddMCP: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
  onOpenSettings?: () => void; // To open Settings panel for MCP configuration
}

export default function NodePanel({
  node,
  nodes,
  onClose,
  onAddMCP,
  onDelete,
  onUpdate,
  onOpenSettings,
}: NodePanelProps) {
  const nodeData = node ? {
    id: node.id,
    label: node.data?.nodeName || node.data?.label || 'Agent',
    type: node.data?.nodeType || node.type || 'agent'
  } : null;
  const { user } = useUser();

  // MCP states - now store only server IDs, not full configs
  const [showMCPSelector, setShowMCPSelector] = useState(false);
  const [expandedMcpId, setExpandedMcpId] = useState<string | null>(null);
  const [currentMCPServerIds, setCurrentMCPServerIds] = useState<string[]>([]);
  const [showModelsDropdown, setShowModelsDropdown] = useState(false);

  // Fetch enabled MCP servers from central registry
  const mcpServers = useQuery(api.mcpServers.getEnabledMCPs,
    user?.id ? {} : "skip"
  );

  // Fetch user's LLM API keys to determine available models
  const userLLMKeys = useQuery(api.userLLMKeys.getUserLLMKeys,
    user?.id ? {} : "skip"
  );

  // Get available models based on active API keys grouped by use cases
  const getAvailableModels = () => {
    if (!userLLMKeys) return [];

    const activeKeys = userLLMKeys.filter(key => key.isActive);
    const availableModelIds = new Set<string>();

    activeKeys.forEach(key => {
      const providerConfig = llmProviders.find(p => p.id === key.provider);
      if (providerConfig) {
        providerConfig.models.forEach(m => availableModelIds.add(`${m.provider}/${m.id}`));
      }
    });

    const grouped: Record<string, Array<{ id: string; name: string; provider: string }>> = {};

    llmProviders.forEach(provider => {
      provider.models.forEach(model => {
        const fullId = `${model.provider}/${model.id}`;
        if (availableModelIds.has(fullId)) {
          const m = { id: fullId, name: model.name, provider: provider.name };
          const useCases = model.useCases && model.useCases.length > 0 ? model.useCases : ['Other'];
          useCases.forEach(uc => {
            if (!grouped[uc]) grouped[uc] = [];

            // Check to avoid adding same model to same category multiple times just in case
            if (!grouped[uc].find(existingItem => existingItem.id === m.id)) {
              grouped[uc].push(m);
            }
          });
        }
      });
    });

    return Object.entries(grouped)
      .map(([category, models]) => ({ provider: category, models }))
      .sort((a, b) => a.provider.localeCompare(b.provider));
  };

  // Helper to update JSON schema from fields array
  const updateSchemaFromFields = (
    fields: Array<{ name: string; type: string; required: boolean }>,
  ) => {
    const properties: any = {};
    const required: string[] = [];

    fields.forEach((field) => {
      if (field.name) {
        properties[field.name] = { type: field.type };
        if (field.required) {
          required.push(field.name);
        }
      }
    });

    const schema: any = {
      type: "object",
      properties,
    };

    if (required.length > 0) {
      schema.required = required;
    }

    setJsonOutputSchema(JSON.stringify(schema, null, 2));
  };



  // Initialize from nodeData if available
  const [name, setName] = useState(nodeData?.label || "My agent");
  const [instructions, setInstructions] = useState((nodeData as any)?.instructions || "");
  const [includeChatHistory, setIncludeChatHistory] = useState(true);
  const [model, setModel] = useState("anthropic/claude-sonnet-4-5-20250929");
  const [outputFormat, setOutputFormat] = useState("Text");
  const [customModel, setCustomModel] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSearchSources, setShowSearchSources] = useState(false);
  const [jsonOutputSchema, setJsonOutputSchema] = useState(`{
  "type": "object",
  "properties": {
    "result": { "type": "string" }
  }
}`);
  const [schemaFields, setSchemaFields] = useState<
    Array<{ name: string; type: string; required: boolean }>
  >([{ name: "result", type: "string", required: false }]);
  const lastLoadedNodeId = useRef<string | null>(null);
  const lastSyncedInstructionsRef = useRef<string | null>(null);

  // Load actual node data when panel opens
  useEffect(() => {
    if (!nodeData || !nodes) return;

    const actualNode = nodes.find((n) => n.id === nodeData.id);
    if (!actualNode) return;

    const data = actualNode.data as any;
    const isNewNode = lastLoadedNodeId.current !== nodeData.id;
    const incomingInstructions =
      typeof data.instructions === "string" ? data.instructions : "";

    if (isNewNode) {
      setTimeout(() => {
        if (lastLoadedNodeId.current !== nodeData.id) return; // Guard against rapid changes
        setName(data.name || data.nodeName || nodeData.label);
        setInstructions(incomingInstructions);
        setIncludeChatHistory(data.includeChatHistory ?? true);
        setModel(data.model || "anthropic/claude-sonnet-4-5-20250929");
        setOutputFormat(data.outputFormat || "Text");
        setShowSearchSources(data.showSearchSources ?? false);
        lastSyncedInstructionsRef.current = incomingInstructions;

        // Initialize MCP servers from node data
        if (data.mcpServerIds && Array.isArray(data.mcpServerIds)) {
          setCurrentMCPServerIds(data.mcpServerIds);
        } else if (data.mcpTools && Array.isArray(data.mcpTools)) {
          if (mcpServers && mcpServers.length > 0) {
            const mcpIds = data.mcpTools
              .map((tool: any) => {
                const normalizeUrl = (url: string) =>
                  url?.replace(/\{[^}]+\}/g, '').replace(/\/+$/, '').toLowerCase();
                const toolUrlNormalized = normalizeUrl(tool.url || '');
                const matchingServer = mcpServers.find((server: any) => {
                  const serverUrlNormalized = normalizeUrl(server.url || '');
                  return toolUrlNormalized === serverUrlNormalized ||
                    server.name?.toLowerCase() === tool.name?.toLowerCase();
                });
                return matchingServer?._id;
              })
              .filter(Boolean);
            if (mcpIds.length > 0) setCurrentMCPServerIds(mcpIds);
          }
        }

        if (data.jsonOutputSchema) {
          setJsonOutputSchema(data.jsonOutputSchema);
          try {
            const parsed = JSON.parse(data.jsonOutputSchema);
            if (parsed.properties) {
              const fields = Object.entries(parsed.properties).map(
                ([propName, prop]: [string, any]) => ({
                  name: propName,
                  type: prop.type || "string",
                  required: parsed.required?.includes(propName) || false,
                }),
              );
              setSchemaFields(fields);
            }
          } catch (e) { }
        }
        lastLoadedNodeId.current = nodeData.id;
      }, 0);
      return;
    }

    if (isNewNode) {
      lastLoadedNodeId.current = nodeData.id;
    }

    if (incomingInstructions !== lastSyncedInstructionsRef.current) {
      lastSyncedInstructionsRef.current = incomingInstructions;
      if (incomingInstructions !== instructions) {
        setTimeout(() => {
          setInstructions(incomingInstructions);
        }, 0);
      }
    } else if (
      incomingInstructions === instructions &&
      incomingInstructions !== lastSyncedInstructionsRef.current
    ) {
      lastSyncedInstructionsRef.current = incomingInstructions;
    }
  }, [nodeData, nodes, instructions, mcpServers]);

  // Auto-save changes with proper dependency tracking
  useEffect(() => {
    if (!nodeData?.id) return;

    const timeoutId = setTimeout(() => {
      try {
        // Build mcpTools from currentMCPServerIds
        const mcpTools = currentMCPServerIds
          .map((serverId: string) => {
            const server = mcpServers?.find((s: any) => s._id === serverId);
            if (server) {
              return {
                id: server._id,
                name: server.name,
                url: server.url,
                label: server.name,
                authType: server.authType,
              };
            }
            return null;
          })
          .filter(Boolean);

        onUpdate(nodeData.id, {
          name,
          nodeName: name,
          instructions,
          includeChatHistory,
          model,
          outputFormat,
          jsonOutputSchema:
            outputFormat === "JSON" ? jsonOutputSchema : undefined,
          showSearchSources,
          mcpTools: mcpTools.length > 0 ? mcpTools : undefined,
          mcpServerIds: currentMCPServerIds.length > 0 ? currentMCPServerIds : undefined,
        });
      } catch (error) {
        console.error("Error updating node:", error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    name,
    instructions,
    includeChatHistory,
    model,
    outputFormat,
    jsonOutputSchema,
    showSearchSources,
    currentMCPServerIds,
    mcpServers,
    onUpdate,
  ]);

  if (!nodeData) return null;

  return (
    <div className="flex-1 overflow-y-auto p-0 space-y-2 w-[260px]">
      {nodeData.type === "guardrails" ? (
        <GuardrailsNodePanel
          node={node}
          updateNodeData={onUpdate}
        />
      ) : nodeData.type === "user-approval" ? (
        <ApprovalNodePanel
          node={node}
          updateNodeData={onUpdate}
        />
      ) : nodeData.type === "memory" ? (
        <MemoryNodePanel
          node={node}
          nodes={nodes ?? []}
          onClose={onClose}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ) : nodeData.type === "start" || nodeData.type === "custom-input" ? (
        <InputNodePanel
          node={node}
          updateNodeData={onUpdate}
        />
      ) : nodeData.type === "router" ? (
        <RouterNodePanel
          node={node}
          updateNodeData={onUpdate}
        />
      ) : (
        <ScrollArea className="h-full">
          <div className="space-y-2 pb-12">
            {/* Instructions Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instructions</Label>
                {nodes && (
                  <VariableReferencePicker
                    nodes={nodes}
                    currentNodeId={nodeData?.id || ""}
                    onSelect={(ref) => setInstructions(instructions + ` {{${ref}}}`)}
                  />
                )}
              </div>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Enter agent instructions..."
                className="min-h-[140px] resize-y bg-muted/20 focus-visible:ring-primary/20 transition-all text-sm leading-relaxed"
              />
              <div className="flex items-center gap-2 px-1">
                <Info className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground font-medium">
                  Use <code className="px-1.5 py-0.5 bg-muted rounded text-primary font-mono">{`{{variable}}`}</code> to reference data
                </p>
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Include chat history toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:border-border/50 transition-all">
              <div className="space-y-1">
                <Label className="text-sm font-bold">Include history</Label>
                <p className="text-[10px] text-muted-foreground font-medium italic">Maintain context across turns</p>
              </div>
              <Switch
                checked={includeChatHistory}
                onCheckedChange={setIncludeChatHistory}
              />
            </div>

            {/* Model Field */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Model</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between bg-muted/20 border-border/50 hover:bg-muted/30 transition-all font-medium h-10 px-4"
                  >
                    <span className="truncate">
                      {model ? (
                        getAvailableModels().flatMap(p => p.models).find(m => m.id === model)?.name || model
                      ) : (
                        <span className="text-muted-foreground italic">Select a model...</span>
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[300px]" align="start">
                  <ScrollArea className="h-[300px] -mx-1 px-1">
                    {getAvailableModels().length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-xs text-muted-foreground mb-4">No API keys configured</p>
                        <Button size="sm" onClick={onOpenSettings} className="w-full">Add API Keys</Button>
                      </div>
                    ) : (
                      <>
                        {getAvailableModels().map((categoryGroup) => (
                          <DropdownMenuGroup key={categoryGroup.provider}>
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">
                              {categoryGroup.provider}
                            </DropdownMenuLabel>
                            {categoryGroup.models.map((modelOption) => (
                              <DropdownMenuItem
                                key={modelOption.id}
                                onClick={() => setModel(modelOption.id)}
                                className={cn(
                                  "flex flex-col items-start gap-1 py-2 px-3",
                                  model === modelOption.id && "bg-primary/10 text-primary"
                                )}
                              >
                                <div className="flex w-full justify-between items-center">
                                  <span className="font-semibold text-xs">{modelOption.name}</span>
                                  {model === modelOption.id && <Check className="h-3 w-3" />}
                                </div>
                                <span className="text-[10px] text-muted-foreground">{modelOption.provider}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="opacity-50" />
                          </DropdownMenuGroup>
                        ))}
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => setModel("custom")} className="py-2 px-3">
                            <Plus className="h-3 w-3 mr-2" />
                            <span className="text-xs font-semibold">Custom Model...</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </>
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>

              {model === "custom" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <Input
                    value={customModel}
                    onChange={(e) => {
                      setCustomModel(e.target.value);
                      setModel(e.target.value);
                    }}
                    placeholder="provider/model-name"
                    className="bg-muted/20 border-border/50 font-mono text-xs h-10 px-4 focus-visible:ring-primary/20"
                  />
                </div>
              )}
            </div>

            <Separator className="opacity-50" />

            {/* MCP Tools Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tools</Label>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setShowMCPSelector((prev) => !prev);
                            if (!showMCPSelector && mcpServers && mcpServers.length > 0) {
                              setExpandedMcpId(mcpServers[0]._id);
                            }
                          }}
                          className="h-8 w-8 rounded-full border border-border/50 bg-background hover:bg-muted transition-all"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add tools</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {onOpenSettings && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={onOpenSettings}
                            className="h-8 w-8 rounded-full border border-border/50 bg-background hover:bg-muted transition-all"
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Configure MCPs</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              {/* MCP Selector (Inline Registry) */}
              <AnimatePresence>
                {showMCPSelector && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-2"
                  >
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <ListFilter className="h-3 w-3 text-muted-foreground" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MCP Registry</h4>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowMCPSelector(false)} className="h-6 w-6">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <ScrollArea className="max-h-[300px] pr-2">
                        <div className="space-y-2">
                          {!mcpServers || mcpServers.length === 0 ? (
                            <div className="text-center py-8 space-y-3">
                              <p className="text-xs text-muted-foreground italic">No enabled MCP servers found.</p>
                              <Button variant="outline" size="sm" onClick={onOpenSettings} className="h-8 px-4 font-bold uppercase tracking-wider text-[10px]">
                                Registry Settings
                              </Button>
                            </div>
                          ) : (
                            mcpServers.map((server: any) => {
                              const isConnected = currentMCPServerIds.includes(server._id);
                              return (
                                <div
                                  key={server._id}
                                  className={cn(
                                    "group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                                    isConnected ? "bg-primary/5 border-primary/20" : "bg-background border-border hover:border-primary/50"
                                  )}
                                  onClick={() => {
                                    if (isConnected) {
                                      setCurrentMCPServerIds(currentMCPServerIds.filter(id => id !== server._id));
                                    } else {
                                      setCurrentMCPServerIds([...currentMCPServerIds, server._id]);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "h-8 w-8 rounded-lg flex items-center justify-center border shadow-sm transition-all",
                                      isConnected ? "bg-primary/10 border-primary/20 brightness-110" : "bg-muted border-border"
                                    )}>
                                      <Settings2 className={cn("h-4 w-4", isConnected ? "text-primary" : "text-muted-foreground")} />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold">{server.label || server.name}</span>
                                      <span className="text-[10px] text-muted-foreground italic truncate max-w-[150px]">{server.endpoint || server.url}</span>
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                                    isConnected ? "bg-primary border-primary" : "bg-background border-border group-hover:border-primary/50"
                                  )}>
                                    {isConnected && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active Tools List */}
              <div className="flex flex-wrap gap-2 pt-2">
                {currentMCPServerIds.length === 0 && !showMCPSelector && (
                  <p className="text-[10px] text-muted-foreground font-medium italic px-1">No tools active. Click + to add.</p>
                )}
                {currentMCPServerIds.map(id => {
                  const server = mcpServers?.find(s => s._id === id);
                  if (!server) return null;
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="flex items-center gap-1.5 py-1 px-2.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-all font-bold tracking-tight text-[10px]"
                    >
                      {server.name}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentMCPServerIds(currentMCPServerIds.filter(sid => sid !== id));
                        }}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Output Format Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Output Format</Label>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-muted/30 border-border/50">
                  {outputFormat}
                </Badge>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-muted/20 border-border/50 h-10 px-4">
                    <span className="text-sm font-medium">{outputFormat}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[300px]" align="start">
                  <DropdownMenuItem onClick={() => setOutputFormat("Text")} className="flex flex-col items-start gap-1 py-2 px-3">
                    <span className="font-semibold text-xs">Text</span>
                    <span className="text-[10px] text-muted-foreground italic">Standard prose response</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="opacity-50" />
                  <DropdownMenuItem onClick={() => setOutputFormat("JSON")} className="flex flex-col items-start gap-1 py-2 px-3">
                    <span className="font-semibold text-xs">JSON</span>
                    <span className="text-[10px] text-muted-foreground italic">Structured data output</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <AnimatePresence>
                {outputFormat === "JSON" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-2"
                  >
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Layers className="h-3 w-3 text-muted-foreground" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">JSON Schema</h4>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = [...schemaFields];
                            updated.push({ name: "", type: "string", required: false });
                            setSchemaFields(updated);
                          }}
                          className="h-7 px-3 font-bold uppercase tracking-wider text-[10px] gap-1.5"
                        >
                          <Plus className="h-3 w-3" /> Add Field
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {schemaFields.map((field, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              placeholder="field_name"
                              value={field.name}
                              onChange={(e) => {
                                const updated = [...schemaFields];
                                updated[index].name = e.target.value;
                                setSchemaFields(updated);
                                updateSchemaFromFields(updated);
                              }}
                              className="bg-background border-border/50 h-8 text-[11px] font-mono px-2 flex-1"
                            />
                            <select
                              value={field.type}
                              onChange={(e) => {
                                const updated = [...schemaFields];
                                updated[index].type = e.target.value;
                                setSchemaFields(updated);
                                updateSchemaFromFields(updated);
                              }}
                              className="h-8 rounded-md border border-border/50 bg-background px-2 text-[11px] font-medium transition-all"
                            >
                              <option value="string">string</option>
                              <option value="number">number</option>
                              <option value="boolean">boolean</option>
                              <option value="array">array</option>
                              <option value="object">object</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updated = schemaFields.filter((_, i) => i !== index);
                                setSchemaFields(updated);
                                updateSchemaFromFields(updated);
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="raw-json" className="border-none">
                          <AccordionTrigger className="py-2 hover:no-underline px-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">View Raw JSON</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Textarea
                              value={jsonOutputSchema}
                              onChange={(e) => setJsonOutputSchema(e.target.value)}
                              className="h-[150px] font-mono text-[10px] bg-zinc-950 text-zinc-50 border-zinc-800 p-3 leading-relaxed"
                              placeholder='{"type": "object", "properties": {...}}'
                            />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator className="opacity-50" />

            {/* Advanced Section */}
            <Accordion type="single" collapsible className="w-full pb-20">
              <AccordionItem value="advanced" className="border-none">
                <AccordionTrigger
                  className="py-3 hover:no-underline rounded-xl hover:bg-muted/30 transition-all px-3 group"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground group-data-[state=open]:text-primary transition-colors" />
                    <span className="text-sm font-bold">Advanced Settings</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 px-3 space-y-4">
                  <div className="p-3 rounded-xl bg-muted/20 border border-dashed border-border flex flex-col items-center justify-center space-y-2 opacity-60">
                    <HelpCircle className="h-6 w-6 text-muted-foreground" />
                    <p className="text-[10px] font-medium text-center italic">Advanced configuration options will appear here in future updates.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
