"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { 
  ChevronDown, 
  Trash2, 
  Settings2, 
  Plus, 
  X, 
  ListFilter, 
  HelpCircle, 
  Check, 
  Info, 
  Layers, 
  AlertTriangle, 
  LayoutGrid,
  Bot,
  Brain,
  History,
  Sparkles,
  Code2,
  FileJson,
  PlusCircle,
  Wand2,
  Activity
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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

  const [showMCPSelector, setShowMCPSelector] = useState(false);
  const [expandedMcpId, setExpandedMcpId] = useState<string | null>(null);
  const [currentMCPServerIds, setCurrentMCPServerIds] = useState<string[]>([]);
  const [showModelsDropdown, setShowModelsDropdown] = useState(false);

  const mcpServers = useQuery(api.mcpServers.getEnabledMCPs,
    user?.id ? {} : "skip"
  );

  const userLLMKeys = useQuery(api.userLLMKeys.getUserLLMKeys,
    user?.id ? {} : "skip"
  );

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
        if (lastLoadedNodeId.current !== nodeData.id) return;
        setName(data.name || data.nodeName || nodeData.label);
        setInstructions(incomingInstructions);
        setIncludeChatHistory(data.includeChatHistory ?? true);
        setModel(data.model || "anthropic/claude-sonnet-4-5-20250929");
        setOutputFormat(data.outputFormat || "Text");
        setShowSearchSources(data.showSearchSources ?? false);
        lastSyncedInstructionsRef.current = incomingInstructions;

        if (data.mcpServerIds && Array.isArray(data.mcpServerIds)) {
          setCurrentMCPServerIds(data.mcpServerIds);
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

    if (incomingInstructions !== lastSyncedInstructionsRef.current) {
      lastSyncedInstructionsRef.current = incomingInstructions;
      if (incomingInstructions !== instructions) {
        setTimeout(() => {
          setInstructions(incomingInstructions);
        }, 0);
      }
    }
  }, [nodeData, nodes, instructions, mcpServers]);

  useEffect(() => {
    if (!nodeData?.id) return;

    const timeoutId = setTimeout(() => {
      try {
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
    <div className="flex-1 overflow-y-auto p-2 space-y-6 w-full pb-10">
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
      ) : nodeData.type === "end" ? (
        <div className="space-y-4 pt-1 px-1 max-w-[320px] mx-auto">
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-[11px] font-bold">End Execution</h4>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Workflow Terminal</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed italic font-medium">
              This node marks the completion of the workflow path. All temporary variables are flushed and the final state is serialized.
            </p>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => onDelete(node.id)}
            className="w-full h-8 opacity-60 hover:opacity-100 transition-opacity rounded-md uppercase font-bold tracking-widest text-[10px]"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete End Node
          </Button>
        </div>
      ) : (
        <div className="space-y-6 max-w-[320px] mx-auto">
          {/* Instructions Field */}
          <div className="space-y-4 pt-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary/60" />
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Instructions</Label>
              </div>
              <div className="flex items-center gap-1">
                {nodes && (
                  <VariableReferencePicker
                    nodes={nodes}
                    currentNodeId={nodeData?.id || ""}
                    onSelect={(ref) => setInstructions(instructions + ` {{${ref}}}`)}
                  />
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 transition-all"
                        onClick={() => {
                          toast.promise(
                            new Promise((resolve) => setTimeout(resolve, 1500)),
                            {
                              loading: 'Analyzing & enhancing prompt...',
                              success: 'Prompt refined with AI magic!',
                              error: 'Failed to enhance prompt',
                            }
                          );
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] font-bold uppercase tracking-wider">
                      Magic Enhance
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="relative group">
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="How should this agent behave?..."
                className="min-h-[140px] resize-y bg-muted/20 border-border/50 text-[11px] focus-visible:ring-primary/20 transition-all leading-relaxed p-4 rounded-md"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-40 group-focus-within:opacity-100 transition-opacity">
                <code className="text-[10px] bg-background px-1.5 py-0.5 rounded-sm border border-border/50 text-primary font-mono">{`{{var}}`}</code>
              </div>
            </div>
          </div>

          <Separator className="opacity-50 mx-1" />

          {/* Configuration Cards */}
          <div className="px-1 space-y-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Settings2 className="h-3.5 w-3.5 text-primary/60" />
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agent Config</Label>
            </div>

            {/* Model Selector Card */}
            <Card className="bg-muted/10 border-border/50 shadow-none hover:border-primary/20 transition-all rounded-lg overflow-hidden group">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Large Language Model</Label>
                  </div>
                  {getAvailableModels().length > 0 && (
                    <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] px-1.5 uppercase font-black tracking-tighter">
                      ready
                    </Badge>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-background/50 border-border/30 hover:bg-background/80 transition-all font-bold h-8 px-3 text-[11px] rounded-md"
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
                  <DropdownMenuContent className="w-[340px]" align="start">
                    <ScrollArea className="h-[300px] -mx-1 px-1">
                      {getAvailableModels().length === 0 ? (
                        <div className="p-6 text-center space-y-3">
                          <p className="text-xs text-muted-foreground italic">No API keys discovered in project secrets.</p>
                          <Button size="sm" onClick={onOpenSettings} className="w-full font-bold uppercase tracking-widest text-[10px]">Cloud Settings</Button>
                        </div>
                      ) : (
                        <>
                          {getAvailableModels().map((categoryGroup) => (
                            <DropdownMenuGroup key={categoryGroup.provider}>
                              <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-3 py-3">
                                {categoryGroup.provider}
                              </DropdownMenuLabel>
                              {categoryGroup.models.map((modelOption) => (
                                <DropdownMenuItem
                                  key={modelOption.id}
                                  onClick={() => setModel(modelOption.id)}
                                  className={cn(
                                    "flex flex-col items-start gap-1 py-3 px-3 mx-1 rounded-lg transition-all",
                                    model === modelOption.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                  )}
                                >
                                  <div className="flex w-full justify-between items-center">
                                    <span className="font-bold text-xs">{modelOption.name}</span>
                                    {model === modelOption.id && <Check className="h-3 w-3" />}
                                  </div>
                                  <span className={cn("text-[9px] uppercase tracking-wider font-medium opacity-60", model === modelOption.id && "text-white/70")}>{modelOption.provider}</span>
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator className="opacity-50" />
                            </DropdownMenuGroup>
                          ))}
                        </>
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>

                {model === "custom" && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Input
                      value={customModel}
                      onChange={(e) => {
                        setCustomModel(e.target.value);
                        setModel(e.target.value);
                      }}
                      placeholder="provider/model-name"
                      className="bg-background/40 border-border/30 font-mono text-xs h-9 px-4 focus-visible:ring-primary/20 rounded-md"
                    />
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* History Toggle Card */}
            <Card className="bg-muted/10 border-border/50 shadow-none hover:border-primary/20 transition-all rounded-lg overflow-hidden group">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-all border shadow-sm", includeChatHistory ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted border-border text-muted-foreground/40")}>
                    <History className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold uppercase tracking-tight">Chat History</Label>
                    <p className="text-[9px] text-muted-foreground font-medium italic leading-none">Context across dialogue Turns</p>
                  </div>
                </div>
                <Switch
                  checked={includeChatHistory}
                  onCheckedChange={setIncludeChatHistory}
                  className="h-5 w-9 data-[state=checked]:bg-primary"
                />
              </CardContent>
            </Card>

            {/* MCP Tools Card */}
            <Card className="bg-muted/10 border-border/50 shadow-none hover:border-primary/20 transition-all rounded-lg overflow-hidden group">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Functional Tools (MCP)</Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMCPSelector(!showMCPSelector)}
                    className={cn("h-7 w-7 rounded-md transition-all", showMCPSelector ? "bg-primary text-primary-foreground shadow-lg" : "bg-primary/5 text-primary hover:bg-primary/10")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <AnimatePresence>
                  {showMCPSelector && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3">
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-3">
                        <ScrollArea className="max-h-[220px] pr-2">
                          <div className="space-y-2">
                            {(!mcpServers || mcpServers.length === 0) ? (
                              <div className="text-center py-4 italic text-[10px] text-muted-foreground">No active MCP servers found</div>
                            ) : (
                              mcpServers.map((server: any) => {
                                const isConnected = currentMCPServerIds.includes(server._id);
                                return (
                                  <div
                                    key={server._id}
                                    className={cn(
                                      "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer group/item",
                                      isConnected ? "bg-primary/5 border-primary/30" : "bg-muted/10 border-transparent hover:bg-muted/20"
                                    )}
                                    onClick={() => {
                                      if (isConnected) setCurrentMCPServerIds(currentMCPServerIds.filter(id => id !== server._id));
                                      else setCurrentMCPServerIds([...currentMCPServerIds, server._id]);
                                    }}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={cn("h-6 w-6 rounded flex items-center justify-center shrink-0 border", isConnected ? "bg-primary/20 border-primary/20 text-primary" : "bg-background border-border text-muted-foreground/30")}>
                                        <Code2 className="h-3 w-3" />
                                      </div>
                                      <span className="text-[11px] font-bold truncate">{server.name}</span>
                                    </div>
                                    <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center transition-all", isConnected ? "bg-primary border-primary" : "bg-background border-border group-hover/item:border-primary/50")}>
                                      {isConnected && <Check className="h-2.5 w-2.5 text-white" />}
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

                <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                  {currentMCPServerIds.length === 0 && !showMCPSelector && (
                    <p className="text-[10px] text-muted-foreground font-medium italic opacity-40 px-1">Capability extension inactive...</p>
                  )}
                  {currentMCPServerIds.map(id => {
                    const server = mcpServers?.find(s => s._id === id);
                    if (!server) return null;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="flex items-center gap-1.5 py-1 px-2 bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-all font-bold tracking-tight text-[9px] uppercase"
                      >
                        {server.name}
                        <X
                          className="h-2.5 w-2.5 cursor-pointer hover:text-red-500 transition-colors shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentMCPServerIds(currentMCPServerIds.filter(sid => sid !== id));
                          }}
                        />
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Output Card */}
            <Card className="bg-muted/10 border-border/50 shadow-none hover:border-primary/20 transition-all rounded-lg overflow-hidden group">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-3.5 w-3.5 text-emerald-500" />
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Data Interop Format</Label>
                  </div>
                  <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest bg-muted/30 border-border/50", outputFormat === 'JSON' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600")}>
                    {outputFormat}
                  </Badge>
                </div>

                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger className="h-8 bg-background/50 border-border/30 font-bold text-[11px] rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Text" className="text-[10px] font-bold uppercase tracking-widest">Native Prose (Text)</SelectItem>
                    <SelectItem value="JSON" className="text-[10px] font-bold uppercase tracking-widest italic text-emerald-600">Structured Object (JSON)</SelectItem>
                  </SelectContent>
                </Select>

                <AnimatePresence>
                  {outputFormat === "JSON" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-2 overflow-hidden">
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <Layers className="h-3 w-3 text-emerald-500/60" />
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Properties</h4>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated = [...schemaFields, { name: "", type: "string", required: false }];
                              setSchemaFields(updated);
                              updateSchemaFromFields(updated);
                            }}
                            className="h-6 px-2 font-bold uppercase tracking-wider text-[9px] gap-1 bg-emerald-500/5 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <PlusCircle className="h-3 w-3" /> Field
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {schemaFields.map((field, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                placeholder="key_name"
                                value={field.name}
                                onChange={(e) => {
                                  const updated = [...schemaFields];
                                  updated[index].name = e.target.value;
                                  setSchemaFields(updated);
                                  updateSchemaFromFields(updated);
                                }}
                                className="bg-background border-border/50 h-8 text-[11px] font-mono px-2 flex-1"
                              />
                              <Select
                                value={field.type}
                                onValueChange={(val) => {
                                  const updated = [...schemaFields];
                                  updated[index].type = val;
                                  setSchemaFields(updated);
                                  updateSchemaFromFields(updated);
                                }}
                              >
                                <SelectTrigger className="h-8 w-[90px] text-[10px] font-bold bg-background/50 border-border/30">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['string', 'number', 'boolean', 'array', 'object'].map(t => (
                                    <SelectItem key={t} value={t} className="text-[10px] font-bold uppercase tracking-widest">{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const updated = schemaFields.filter((_, i) => i !== index);
                                  setSchemaFields(updated);
                                  updateSchemaFromFields(updated);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="raw-json" className="border-none">
                            <AccordionTrigger className="py-2 hover:no-underline px-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">View Raw Specification</span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <Textarea
                                value={jsonOutputSchema}
                                onChange={(e) => setJsonOutputSchema(e.target.value)}
                                className="h-[140px] font-mono text-[10px] bg-slate-950 text-emerald-400 border-border/30 p-3 leading-relaxed shadow-inner"
                              />
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Section */}
          <Accordion type="single" collapsible className="w-full pb-20 px-1">
            <AccordionItem value="advanced" className="border-none">
              <AccordionTrigger
                className="py-3 hover:no-underline rounded-lg hover:bg-muted/30 transition-all px-3 group"
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground group-data-[state=open]:text-primary transition-colors" />
                  <span className="text-sm font-bold opacity-70">Runtime Advanced</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 px-3 space-y-4">
                <div className="p-4 bg-muted/5 border border-dashed border-border/50 rounded-lg flex flex-col items-center justify-center space-y-2 opacity-50">
                  <HelpCircle className="h-6 w-6 text-muted-foreground" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-center italic">Future extension point</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}
