"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Database, 
  Code2, 
  Globe, 
  Terminal, 
  Settings2, 
  ArrowRight, 
  Variable, 
  Zap, 
  Info,
  Layers,
  Sparkles,
  Search,
  Check,
  Plus,
  Box,
  Cpu,
  AlertCircle
} from "lucide-react";
import VariableReferencePicker from "./VariableReferencePicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DataNodePanelProps {
  node: Node | null;
  nodes: Node[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
}

export default function DataNodePanel({
  node,
  nodes,
  onClose,
  onDelete,
  onUpdate,
}: DataNodePanelProps) {
  const nodeData = node?.data as any;
  const nodeType = nodeData?.nodeType?.toLowerCase() || "";

  // Transform state
  const [transformScript, setTransformScript] = useState(
    nodeData?.transformScript ||
    `// Transform the input data using TypeScript
// Available variables: input, lastOutput, state

// Example: Extract and transform data
const result = {
    processed: true,
    timestamp: input.timestamp || "",
    data: input
};

return result;`,
  );

  // Set State variables
  const [stateKey, setStateKey] = useState(nodeData?.stateKey || "myVariable");
  const [stateValue, setStateValue] = useState(nodeData?.stateValue || "value");
  const [valueType, setValueType] = useState<
    "string" | "number" | "boolean" | "json" | "expression"
  >(nodeData?.valueType || "string");

  // Database Query state
  const [sqlQuery, setSqlQuery] = useState(nodeData?.sqlQuery || "SELECT * FROM table LIMIT 10;");
  const [selectedConnectorId, setSelectedConnectorId] = useState(nodeData?.connectorId || "");
  const connectors = useQuery(api.knowledgeConnectors.listConnectors);

  // Auto-save changes with change check
  useEffect(() => {
    if (!node?.id) return;

    const timeoutId = setTimeout(() => {
      const hasChanged =
        transformScript !== node.data?.transformScript ||
        stateKey !== node.data?.stateKey ||
        stateValue !== node.data?.stateValue ||
        valueType !== node.data?.valueType ||
        sqlQuery !== node.data?.sqlQuery ||
        selectedConnectorId !== node.data?.connectorId;

      if (hasChanged) {
        onUpdate(node.id, {
          transformScript,
          stateKey,
          stateValue,
          valueType,
          sqlQuery,
          connectorId: selectedConnectorId,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    transformScript,
    stateKey,
    stateValue,
    valueType,
    sqlQuery,
    selectedConnectorId,
    node?.id,
    node?.data,
    onUpdate
  ]);


  const renderValueInput = () => {
    switch (valueType) {
      case "boolean":
        return (
          <Select value={stateValue} onValueChange={setStateValue}>
            <SelectTrigger className="h-8 bg-muted/20 border-border/50 font-bold focus:ring-primary/20 rounded-md text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true" className="text-[10px] font-bold text-green-600 uppercase tracking-widest">true</SelectItem>
              <SelectItem value="false" className="text-[10px] font-bold text-red-600 uppercase tracking-widest">false</SelectItem>
            </SelectContent>
          </Select>
        );
      case "number":
        return (
          <Input
            type="text"
            value={stateValue}
            onChange={(e) => setStateValue(e.target.value)}
            placeholder="42 or {{lastOutput.count}}"
            className="h-8 bg-muted/20 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 transition-all rounded-md"
          />
        );
      case "json":
        return (
          <Textarea
            value={stateValue}
            onChange={(e) => setStateValue(e.target.value)}
            rows={4}
            placeholder='{"key": "value"} or {{lastOutput}}'
            className="min-h-[100px] bg-slate-950 text-sky-400 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 transition-all resize-none leading-relaxed shadow-inner rounded-md p-4"
          />
        );
      case "expression":
        return (
          <Textarea
            value={stateValue}
            onChange={(e) => setStateValue(e.target.value)}
            rows={4}
            placeholder="input.price * 1.1"
            className="min-h-[100px] bg-muted/20 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 transition-all resize-none rounded-md p-4"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={stateValue}
            onChange={(e) => setStateValue(e.target.value)}
            placeholder="Hello {{input.name}}"
            className="h-8 bg-muted/20 border-border/50 text-[11px] focus-visible:ring-primary/20 transition-all rounded-md"
          />
        );
    }
  };

  if (!node) return null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 w-full pb-10">
      {/* Transform Node - Code Editor */}
      {nodeType.includes("transform") && (
        <div className="space-y-4 max-w-[320px] mx-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary/60" />
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transform Code</Label>
              </div>
              <Badge variant="outline" className="text-[9px] font-mono bg-background border-border/50 text-muted-foreground lowercase">
                typescript
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Script Editor</Label>
                <VariableReferencePicker
                  nodes={nodes}
                  currentNodeId={node?.id || ''}
                  onSelect={(varPath) => {
                    setTransformScript(prev => prev + `\n// Access: ${varPath}\n`);
                  }}
                />
              </div>
              <div className="relative group">
                <Textarea
                  value={transformScript}
                  onChange={(e) => setTransformScript(e.target.value)}
                  className="min-h-[250px] bg-[#1e1e1e] text-[#d4d4d4] border-border/30 font-mono text-[11px] focus-visible:ring-primary/20 transition-all resize-none leading-relaxed shadow-2xl custom-scrollbar rounded-md p-4"
                  placeholder="// Transform the input data using TypeScript"
                  spellCheck={false}
                />
              </div>
            </div>

            <Card className="bg-primary/5 border-primary/10 shadow-none rounded-lg overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'input', label: 'In' },
                    { key: 'lastOutput', label: 'Prev' },
                    { key: 'state', label: 'Global' }
                  ].map((item) => (
                    <div key={item.key} className="flex flex-col items-center">
                      <code className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{item.key}</code>
                      <p className="text-[8px] text-muted-foreground font-medium opacity-60 uppercase tracking-tighter mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Set State Node */}
      {nodeType.includes("state") && !nodeType.includes("transform") && (
        <div className="space-y-4 max-w-[320px] mx-auto">
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <Variable className="h-4 w-4 text-primary/60" />
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Global State Registry</Label>
            </div>

            <Card className="bg-muted/10 border-border/50 shadow-none rounded-lg group hover:border-primary/20 transition-all overflow-hidden">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Key identifier</Label>
                  <Input
                    type="text"
                    value={stateKey}
                    onChange={(e) => setStateKey(e.target.value)}
                    placeholder="e.g., userProfile"
                    className="h-8 bg-background border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 rounded-md"
                  />
                  <div className="flex items-center gap-2 opacity-60">
                    <p className="text-[10px] text-muted-foreground font-bold italic truncate">
                      Access: <span className="text-primary font-mono">{`{{state.${stateKey || '...'}}}`}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Value representation</Label>
                  <Select value={valueType} onValueChange={(v: any) => setValueType(v)}>
                    <SelectTrigger className="h-8 bg-background border-border/50 font-bold text-[11px] rounded-md">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string" className="text-[10px] font-bold uppercase tracking-widest">Plain String</SelectItem>
                      <SelectItem value="number" className="text-[10px] font-bold uppercase tracking-widest">Numeric Value</SelectItem>
                      <SelectItem value="boolean" className="text-[10px] font-bold uppercase tracking-widest">Boolean Toggle</SelectItem>
                      <SelectItem value="json" className="text-[10px] font-bold uppercase tracking-widest">JSON Structure</SelectItem>
                      <SelectItem value="expression" className="text-[10px] font-bold uppercase tracking-widest">JS Expression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Content payload</Label>
                    <VariableReferencePicker
                      nodes={nodes}
                      currentNodeId={node?.id || ''}
                      onSelect={(varPath) => setStateValue(prev => prev + `{{${varPath}}}`)}
                    />
                  </div>
                  {renderValueInput()}
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.info('Sequence logic preserved.', {
                  description: 'Add consecutive state nodes to build complex global contexts.'
                });
              }}
              className="w-full h-8 border-dashed border-border/50 bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all font-bold uppercase tracking-widest text-[10px] gap-2 rounded-md"
            >
              <Plus className="h-3 w-3" />
              Build batch state
            </Button>
          </div>
        </div>
      )}

      {/* Database Query Node */}
      {nodeType.includes("query") && (
        <div className="space-y-4 max-w-[320px] mx-auto">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-amber-500/80" />
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Database Engine</Label>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Source connector</Label>
                <Select value={selectedConnectorId} onValueChange={setSelectedConnectorId}>
                  <SelectTrigger className="h-8 bg-muted/20 border-border/50 font-bold text-[11px] rounded-md">
                    <SelectValue placeholder="Select an active source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {connectors?.map((c) => (
                      <SelectItem key={c._id} value={c._id} className="text-[10px] font-bold uppercase tracking-widest">
                        {c.name} <span className="opacity-50 text-[10px]">({c.type})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Query script</Label>
                  <VariableReferencePicker
                    nodes={nodes}
                    currentNodeId={node?.id || ''}
                    onSelect={(varPath) => {
                      setSqlQuery(prev => prev + `{{${varPath}}}`);
                    }}
                  />
                </div>
                <div className="relative group">
                  <Textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="min-h-[160px] bg-slate-900 text-amber-500 border-border/30 font-mono text-[11px] focus-visible:ring-amber-500/20 transition-all resize-none leading-relaxed shadow-lg p-3 rounded-md"
                    placeholder="SELECT * FROM table_name WHERE id = {{state.user_id}}"
                    spellCheck={false}
                  />
                </div>
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-start gap-3">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 mt-0.5" />
                  <p className="text-[10px] text-amber-700/80 italic leading-tight font-medium">
                    Use <strong className="text-amber-800 font-bold">{"{{variable}}"}</strong> to inject dynamic values safely into the SQL engine.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box for overall node */}
      <Card className="bg-secondary/40 border-border/30 shadow-none rounded-lg max-w-[320px] mx-auto">
        <CardContent className="p-4 flex gap-3">
          <Layers className="h-4 w-4 text-primary shrink-0 opacity-60" />
          <p className="text-[11px] text-muted-foreground leading-relaxed italic font-medium">
            <strong className="text-foreground font-bold">Data Management:</strong> Process, store, and retrieve data across the workflow lifecycle using enterprise data sources.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
