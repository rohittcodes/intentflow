"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  FileJson, 
  MessageSquare, 
  Cpu, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Info,
  Layers,
  Sparkles,
  Search,
  Settings2,
  Terminal,
  CheckCircle2,
  XCircle
} from "lucide-react";

import type { Node } from "@xyflow/react";
import { llmProviders } from "@/lib/config/llm-config";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExtractNodePanelProps {
  node: Node | null;
  nodes: Node[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
  onAddMCP: () => void;
}

export default function ExtractNodePanel({
  node,
  nodes,
  onClose,
  onDelete,
  onUpdate,
  onAddMCP,
}: ExtractNodePanelProps) {
  const nodeData = node?.data as any;
  const [name, setName] = useState(nodeData?.name || 'Extractor');
  const [instructions, setInstructions] = useState(nodeData?.instructions || 'Extract information from the input');
  const [model, setModel] = useState(nodeData?.model || 'gpt-4o');
  const [jsonSchema, setJsonSchema] = useState(
    nodeData?.jsonSchema || JSON.stringify({
      type: "object",
      properties: {
        title: { type: "string", description: "The title" },
        summary: { type: "string", description: "A brief summary" },
      },
      required: ["title"]
    }, null, 2)
  );
  const [schemaError, setSchemaError] = useState('');

  // Validate JSON schema
  useEffect(() => {
    try {
      if (jsonSchema.trim()) {
        JSON.parse(jsonSchema);
        setSchemaError('');
      } else {
        setSchemaError('Schema cannot be empty');
      }
    } catch (e) {
      setSchemaError('Invalid JSON format');
    }
  }, [jsonSchema]);

  // Sync state with node data
  useEffect(() => {
    if (!node?.id) return;

    const timeoutId = setTimeout(() => {
      const hasChanged =
        name !== node.data?.name ||
        instructions !== node.data?.instructions ||
        model !== node.data?.model ||
        jsonSchema !== node.data?.jsonSchema;

      if (hasChanged) {
        onUpdate(node.id, {
          name,
          instructions,
          model,
          jsonSchema,
          nodeType: 'extract',
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [name, instructions, model, jsonSchema, node?.id, node?.data, onUpdate]);

  if (!node) return null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 w-full pb-10">
      {/* Node Identity */}
      <div className="space-y-3 pt-1 max-w-[320px] mx-auto">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Node Identity</Label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Extractor"
          className="h-8 bg-muted/20 border-border/50 text-[11px] focus-visible:ring-primary/20 transition-all font-medium rounded-md"
        />
      </div>

      {/* Instructions */}
      <div className="space-y-3 max-w-[320px] mx-auto">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary/60" />
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Extraction Logic</Label>
        </div>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="What information should be extracted?"
          className="min-h-[100px] bg-muted/20 border-border/50 text-sm focus-visible:ring-primary/20 transition-all leading-relaxed rounded-md p-4"
        />
      </div>

      {/* Model Selection */}
      <div className="space-y-3 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <div className="flex items-center gap-2 pb-1">
          <Cpu className="h-4 w-4 text-primary/60" />
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Intelligence Model</Label>
        </div>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="h-8 bg-muted/20 border-border/50 font-medium text-[10px] rounded-md">
            <SelectValue placeholder="Select model..." />
          </SelectTrigger>
          <SelectContent>
            {llmProviders.map(provider => (
              <SelectGroup key={provider.id}>
                <SelectLabel className="text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 opacity-50">{provider.name}</SelectLabel>
                {provider.models.map(m => (
                  <SelectItem 
                    key={`${m.provider}/${m.id}`} 
                    value={`${m.provider}/${m.id}`}
                    className="text-[10px]"
                  >
                    {m.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* JSON Schema */}
      <div className="space-y-3 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-primary/60" />
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Output Schema</Label>
          </div>
          {schemaError ? (
            <Badge variant="destructive" className="h-5 px-1.5 gap-1 animate-pulse rounded-sm">
              <span className="text-[9px] uppercase font-bold tracking-tighter">Error</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="h-5 px-1.5 gap-1 bg-green-500/10 text-green-600 border-green-500/20 rounded-sm">
              <span className="text-[9px] uppercase font-bold tracking-tighter">Valid</span>
            </Badge>
          )}
        </div>
        <div className="relative group">
          <Textarea
            value={jsonSchema}
            onChange={(e) => setJsonSchema(e.target.value)}
            className={cn(
              "min-h-[220px] bg-slate-950 text-emerald-400 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 transition-all leading-relaxed shadow-inner custom-scrollbar resize-none rounded-md p-4",
              schemaError && "border-red-500/50 focus-visible:ring-red-500/20"
            )}
          />
        </div>
      </div>

      {/* MCP Tools */}
      <div className="space-y-3 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary/60" />
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">External Context</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddMCP}
            className="h-7 px-2.5 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-all gap-1.5 rounded-md"
          >
            <Plus className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Add MCP</span>
          </Button>
        </div>

        <AnimatePresence mode="popLayout">
          {nodeData?.mcpTools && nodeData.mcpTools.length > 0 ? (
            <div className="space-y-3">
              {nodeData.mcpTools.map((mcp: any, index: number) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={index}
                >
                  <Card className="bg-muted/10 border-border/50 shadow-none hover:border-primary/20 transition-all group overflow-hidden rounded-lg">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="h-7 w-7 rounded-md bg-primary/5 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                          <Terminal className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{mcp.name}</p>
                          <p className="text-[9px] text-muted-foreground font-mono truncate max-w-[180px]">
                            {mcp.url}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newTools = nodeData.mcpTools.filter((_: any, i: number) => i !== index);
                            onUpdate(node?.id || '', { mcpTools: newTools });
                          }}
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/5 border-dashed border-border/50 shadow-none rounded-lg">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                <Search className="h-8 w-8 text-muted-foreground/30" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest">No Sources Linked</p>
                  <p className="text-[10px] italic font-medium">The agent will only use provided context.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </AnimatePresence>
      </div>

      {/* Info Box */}
      <Card className="bg-secondary/40 border-border/30 shadow-none rounded-lg max-w-[320px] mx-auto">
        <CardContent className="p-4 flex gap-3">
          <Settings2 className="h-4 w-4 text-primary shrink-0 opacity-60" />
          <p className="text-[11px] text-muted-foreground leading-relaxed italic font-medium">
            <strong className="text-foreground font-bold">Protocol Agent:</strong> The LLM processes the flow input and extracts structured data matching your JSON schema. MCP tools provide real-time search capabilities.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
