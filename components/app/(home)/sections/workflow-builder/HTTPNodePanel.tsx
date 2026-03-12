"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import VariableReferencePicker from "./VariableReferencePicker";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Globe, 
  Shield, 
  Zap, 
  Code2, 
  Key, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Send,
  Link2,
  Lock,
  Info,
  ChevronDown,
  Layout
} from "lucide-react";
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
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface HTTPNodePanelProps {
  node: Node | null;
  nodes?: Node[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
}

interface Header {
  key: string;
  value: string;
}

export default function HTTPNodePanel({ node, nodes, onClose, onDelete, onUpdate }: HTTPNodePanelProps) {
  const nodeData = node?.data as any;

  const [url, setUrl] = useState(nodeData?.httpUrl || "https://api.example.com/endpoint");
  const [method, setMethod] = useState(nodeData?.httpMethod || "GET");
  const [headers, setHeaders] = useState<Header[]>(nodeData?.httpHeaders || [
    { key: "Content-Type", value: "application/json" }
  ]);
  const [body, setBody] = useState(nodeData?.httpBody || "");
  const [authType, setAuthType] = useState(nodeData?.httpAuthType || "none");
  const [authToken, setAuthToken] = useState(nodeData?.httpAuthToken || "");
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState(nodeData?.connectorId || "");
  const connectors = useQuery(api.knowledgeConnectors.listConnectors);

  // Auto-save with change check
  useEffect(() => {
    if (!node?.id) return;

    const timeoutId = setTimeout(() => {
      const hasChanged =
        url !== node.data?.httpUrl ||
        method !== node.data?.httpMethod ||
        JSON.stringify(headers) !== JSON.stringify(node.data?.httpHeaders) ||
        body !== node.data?.httpBody ||
        authType !== node.data?.httpAuthType ||
        authToken !== node.data?.httpAuthToken ||
        selectedConnectorId !== node.data?.connectorId;

      if (hasChanged) {
        onUpdate(node.id, {
          httpUrl: url,
          httpMethod: method,
          httpHeaders: headers,
          httpBody: body,
          httpAuthType: authType,
          httpAuthToken: authToken,
          connectorId: selectedConnectorId,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [url, method, headers, body, authType, authToken, selectedConnectorId, node?.id, node?.data, onUpdate]);

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    setHeaders(headers.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const insertQuickHeader = (key: string, value: string) => {
    const existing = headers.findIndex(h => h.key === key);
    if (existing >= 0) {
      updateHeader(existing, 'value', value);
    } else {
      setHeaders([...headers, { key, value }]);
    }
  };

  if (!node) return null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 w-full pb-20">
      {/* Request URL & Method */}
      <div className="space-y-4 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="w-[85px] space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-8 bg-muted/20 border-border/50 font-bold focus:ring-primary/20 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET" className="text-[10px] font-bold text-green-600">GET</SelectItem>
                <SelectItem value="POST" className="text-[10px] font-bold text-blue-600">POST</SelectItem>
                <SelectItem value="PUT" className="text-[10px] font-bold text-orange-600">PUT</SelectItem>
                <SelectItem value="PATCH" className="text-[10px] font-bold text-purple-600">PATCH</SelectItem>
                <SelectItem value="DELETE" className="text-[10px] font-bold text-red-600">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Endpoint</Label>
              {nodes && (
                <VariableReferencePicker
                  nodes={nodes}
                  currentNodeId={node.id}
                  onSelect={(ref) => setUrl(url + `{{${ref}}}`)}
                />
              )}
            </div>
            <div className="relative group">
              <Input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="h-8 bg-muted/20 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 transition-all rounded-md px-3"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Connector (Simplified) */}
      <div className="border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <Select value={selectedConnectorId} onValueChange={setSelectedConnectorId}>
          <SelectTrigger className="h-8 bg-muted/10 border-border/50 text-[10px] font-medium focus:ring-primary/20 rounded-md">
            <SelectValue placeholder="Select Connector (Optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="direct" className="text-[10px] font-medium">Direct Request</SelectItem>
            {connectors?.map((c) => (
              <SelectItem key={c._id} value={c._id} className="text-[10px]">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Authentication */}
      <div className="space-y-3 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Authentication</Label>
        <div className="grid grid-cols-4 gap-2">
          {['none', 'bearer', 'basic', 'api-key'].map((type) => (
            <Button
              key={type}
              variant={authType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAuthType(type)}
              className={cn(
                "h-7 text-[9px] font-bold uppercase tracking-wider transition-all rounded-md px-1",
                authType === type ? "bg-primary text-primary-foreground" : "bg-muted/10 border-border/50"
              )}
            >
              {type === 'api-key' ? 'Key' : type}
            </Button>
          ))}
        </div>

        <AnimatePresence>
          {authType !== 'none' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
             <div className="relative group">
              <Input
                type={showAuthToken ? "text" : "password"}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder={authType === 'bearer' ? 'Bearer token...' : 'API key...'}
                className="h-8 pr-10 bg-muted/20 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 rounded-md"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAuthToken(!showAuthToken)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
              >
                {showAuthToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div></motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Headers */}
      <div className="space-y-3 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Headers</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={addHeader}
            className="h-7 px-2.5 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-all gap-1.5 rounded-md"
          >
            <Plus className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
          </Button>
        </div>

        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
          {headers.map((header, index) => (
            <div key={index} className="flex gap-2 group animate-in fade-in slide-in-from-top-2 duration-300">
              <Input
                type="text"
                value={header.key}
                onChange={(e) => updateHeader(index, 'key', e.target.value)}
                placeholder="Header"
                className="h-8 flex-1 bg-muted/10 border-border/50 font-mono text-[10px] focus-visible:ring-primary/20 font-medium rounded-md"
              />
              <Input
                type="text"
                value={header.value}
                onChange={(e) => updateHeader(index, 'value', e.target.value)}
                placeholder="Value"
                className="h-8 flex-1 bg-muted/10 border-border/50 text-[11px] font-medium focus-visible:ring-primary/20 rounded-md"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeHeader(index)}
                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all rounded-md"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Body (for POST/PUT/PATCH) */}
      <AnimatePresence>
        {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 border-t border-border/50 pt-6 overflow-hidden max-w-[320px] mx-auto"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Request Body</Label>
              </div>
              {nodes && (
                <VariableReferencePicker
                  nodes={nodes}
                  currentNodeId={node.id}
                  onSelect={(ref) => setBody(body + `{{${ref}}}`)}
                />
              )}
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder='{"key": "value"}'
              className="min-h-[120px] bg-slate-950 text-sky-400 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 transition-all resize-none leading-relaxed shadow-inner rounded-md p-4"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBody('{{state.variables.lastOutput}}')}
                className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-background border-border/50 hover:bg-primary/5 hover:text-primary transition-all rounded-md"
              >
                Use Prev Output
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBody(JSON.stringify({ data: "{{state.variables.lastOutput}}" }, null, 2))}
                className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-background border-border/50 hover:bg-primary/5 hover:text-primary transition-all rounded-md"
              >
                Wrap JSON
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Examples */}
      <div className="pt-4 border-t border-border/50 max-w-[320px] mx-auto">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="examples" className="border-none">
            <AccordionTrigger className="py-2 hover:no-underline group">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary transition-colors group-hover:text-primary/70">
                <Send className="h-3.5 w-3.5" />
                API Templates
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 space-y-3">
              {[
                {
                  label: "Slack Message",
                  subtitle: "Post to chat channel",
                  icon: <Info className="h-3 w-3 text-purple-500" />,
                  action: () => {
                    setUrl('https://api.slack.com/api/chat.postMessage');
                    setMethod('POST');
                    insertQuickHeader('Authorization', 'Bearer xoxb-your-token');
                    setBody('{\n  "channel": "C123456",\n  "text": "{{state.variables.lastOutput}}"\n}');
                  }
                },
                {
                  label: "Notion Page",
                  subtitle: "Create new database entry",
                  icon: <Link2 className="h-3 w-3 text-black" />,
                  action: () => {
                    setUrl('https://api.notion.com/v1/pages');
                    setMethod('POST');
                    insertQuickHeader('Authorization', 'Bearer secret_...');
                    insertQuickHeader('Notion-Version', '2022-06-28');
                    setBody('{\n  "parent": { "database_id": "..." },\n  "properties": {}\n}');
                  }
                },
                {
                  label: "Zapier Hook",
                  subtitle: "Trigger automation",
                  icon: <Zap className="h-3 w-3 text-orange-400" />,
                  action: () => {
                    setUrl('https://hooks.zapier.com/hooks/catch/...');
                    setMethod('POST');
                    setBody('{{state.variables.lastOutput}}');
                  }
                }
              ].map((tmpl, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={tmpl.action}
                  className="w-full h-auto p-3 flex-col items-start gap-1.5 bg-muted/10 border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {tmpl.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{tmpl.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground italic font-medium leading-none">{tmpl.subtitle}</span>
                </Button>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
