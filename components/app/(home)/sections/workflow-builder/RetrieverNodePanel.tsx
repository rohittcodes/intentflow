"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Database, 
  Search, 
  ChevronDown, 
  Loader2, 
  Target, 
  Zap, 
  Info, 
  BookOpen,
  Layers,
  Sparkles,
  Settings2,
  FileText,
  SearchCode
} from "lucide-react";
import VariableReferencePicker from "./VariableReferencePicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RetrieverNodePanelProps {
  node: any;
  nodes?: any[];
  updateNodeData: (nodeId: string, data: any) => void;
}

export default function RetrieverNodePanel({
  node,
  nodes,
  updateNodeData,
}: RetrieverNodePanelProps) {
  const data = node.data || {};
  const namespaces = useQuery(api.knowledge.listNamespaces, {});

  const [name, setName] = useState(data.nodeName || data.label || "Retriever");
  const [namespaceId, setNamespaceId] = useState<string>(data.namespaceId || "");
  const [query, setQuery] = useState(data.query || "");
  const [limit, setLimit] = useState(data.limit || 5);
  const [reRank, setReRank] = useState(data.reRank || false);

  // Auto-save with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateNodeData(node.id, {
        name,
        nodeName: name,
        namespaceId,
        query,
        limit: Number(limit),
        reRank,
        nodeType: "retriever",
      });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [name, namespaceId, query, limit, reRank, node.id, updateNodeData]);

  const selectedNamespace = namespaces?.find((n) => n._id === namespaceId);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 w-full pb-10">
      {/* Node Identity */}
      <div className="space-y-3 pt-1 max-w-[320px] mx-auto">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Node Identity</Label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Retriever"
          className="h-8 bg-muted/20 border-border/50 text-[11px] focus-visible:ring-primary/20 transition-all font-medium rounded-md"
        />
      </div>

      {/* Namespace Selection */}
      <div className="space-y-3 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary/60" />
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Knowledge Base</Label>
          </div>
        </div>
        
        <Select value={namespaceId} onValueChange={setNamespaceId}>
          <SelectTrigger className="h-8 bg-muted/20 border-border/50 font-medium text-[10px] rounded-md">
            <SelectValue placeholder="Select a namespace..." />
          </SelectTrigger>
          <SelectContent>
            {namespaces?.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-muted-foreground italic">
                No namespaces discovered.
              </div>
            ) : (
              <SelectGroup>
                <SelectLabel className="text-[9px] font-bold uppercase tracking-widest px-2 py-1.5 opacity-50">Active Namespaces</SelectLabel>
                {namespaces?.map((ns) => (
                  <SelectItem key={ns._id} value={ns._id} className="text-[10px]">
                    <div className="flex flex-col">
                      <span className="font-bold">{ns.name}</span>
                      <span className="text-[9px] opacity-50">{ns.documentCount} document chunks</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Search Query */}
      <div className="space-y-3 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SearchCode className="h-4 w-4 text-primary/60" />
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Search Intent</Label>
          </div>
          {nodes && (
            <VariableReferencePicker
              nodes={nodes}
              currentNodeId={node.id}
              onSelect={(ref) => setQuery(query + ` {{${ref}}}`)}
            />
          )}
        </div>
        <div className="relative group">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search text or {{variable}}..."
            className="min-h-[100px] bg-muted/20 border-border/50 text-[11px] font-semibold focus-visible:ring-primary/20 transition-all leading-relaxed shadow-inner rounded-md p-4"
          />
        </div>
      </div>

      {/* Limit */}
      <div className="space-y-3 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary/60" />
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chunk Limit</Label>
          </div>
          <code className="text-[10px] font-mono text-primary">k={limit}</code>
        </div>
        <Slider
          min={1}
          max={20}
          step={1}
          value={[limit]}
          onValueChange={([val]) => setLimit(val)}
          className="py-1"
        />
      </div>

      {/* Re-Ranking Toggle */}
      <div className="border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between gap-4 bg-muted/10 p-3 rounded-md border border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <Label className="text-[10px] font-bold uppercase tracking-widest">Reranking</Label>
          </div>
          <Switch
            checked={reRank}
            onCheckedChange={setReRank}
            className="data-[state=checked]:bg-amber-500"
          />
        </div>
      </div>

      {/* Output Info */}
      <Card className="bg-secondary/40 border-border/30 shadow-none rounded-lg max-w-[320px] mx-auto">
        <CardContent className="p-4 flex gap-3">
          <FileText className="h-4 w-4 text-primary shrink-0 opacity-60" />
          <p className="text-[11px] text-muted-foreground leading-relaxed italic font-medium">
            <strong className="text-foreground font-bold">Node Output:</strong> This node produces an array of document fragments from the <code className="bg-primary/5 px-1 rounded-sm text-primary font-bold">{selectedNamespace?.name || 'Knowledge Base'}</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
