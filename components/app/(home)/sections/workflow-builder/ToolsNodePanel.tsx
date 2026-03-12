"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  Search, 
  FileCode, 
  Hash, 
  ShieldCheck, 
  Settings2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Ban, 
  Eye, 
  Info,
  Trash2,
  Lock,
  MessageSquareWarning,
  Flame,
  Lightbulb,
  Check
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Node } from "@xyflow/react";
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
  SelectGroup,
  SelectLabel
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ToolsNodePanelProps {
  node: Node | null;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
}

export default function ToolsNodePanel({ node, onClose, onDelete, onUpdate }: ToolsNodePanelProps) {
  const nodeData = node?.data as any;
  const nodeType = nodeData?.nodeType?.toLowerCase() || '';
  const [name, setName] = useState(nodeData?.name || nodeData?.nodeName || "Tool");

  // File Search state
  const [searchQuery, setSearchQuery] = useState(nodeData?.searchQuery || "");
  const [filePattern, setFilePattern] = useState(nodeData?.filePattern || "*.ts,*.tsx,*.js,*.jsx");
  const [maxResults, setMaxResults] = useState(nodeData?.maxResults || "10");
  const [includeContent, setIncludeContent] = useState(nodeData?.includeContent ?? true);

  // Guardrails state
  const [inputAsText, setInputAsText] = useState(nodeData?.inputAsText || "input_as_text");
  const [piiEnabled, setPiiEnabled] = useState(nodeData?.piiEnabled ?? true);
  const [moderationEnabled, setModerationEnabled] = useState(nodeData?.moderationEnabled ?? false);
  const [jailbreakEnabled, setJailbreakEnabled] = useState(nodeData?.jailbreakEnabled ?? false);
  const [hallucinationEnabled, setHallucinationEnabled] = useState(nodeData?.hallucinationEnabled ?? false);
  const [guardrailModel, setGuardrailModel] = useState(nodeData?.guardrailModel || 'openai/gpt-5-mini');
  const [actionOnViolation, setActionOnViolation] = useState(nodeData?.actionOnViolation || 'block');
  const [customRules, setCustomRules] = useState<string>(nodeData?.customRules?.join('\n') || '');

  // PII entities
  const [piiEntities, setPiiEntities] = useState<string[]>(nodeData?.piiEntities || ['CREDIT_CARD_NUMBER']);
  const [showPIIModal, setShowPIIModal] = useState(false);

  const allPIIEntities = [
    { id: 'PERSON_NAME', label: 'Person name' },
    { id: 'EMAIL_ADDRESS', label: 'Email address' },
    { id: 'PHONE_NUMBER', label: 'Phone number' },
    { id: 'LOCATION', label: 'Location' },
    { id: 'DATE_TIME', label: 'Date or time' },
    { id: 'URL', label: 'URL' },
    { id: 'CREDIT_CARD_NUMBER', label: 'Credit card number' },
    { id: 'IBAN', label: 'IBAN' },
    { id: 'CRYPTO_WALLET', label: 'Crypto wallet' },
    { id: 'MEDICAL_LICENSE', label: 'Medical license' },
    { id: 'IP_ADDRESS', label: 'IP address' },
    { id: 'US_DRIVERS_LICENSE', label: "US driver's license" },
    { id: 'US_BANK_ACCOUNT', label: 'US bank account' },
    { id: 'NATIONALITY_RELIGION_POLITICAL', label: 'Nationality/Religion' },
  ];

  // Auto-save changes
  useEffect(() => {
    if (!node) return;

    const timeoutId = setTimeout(() => {
      onUpdate(node.id, {
        name,
        nodeName: name,
        searchQuery,
        filePattern,
        maxResults,
        includeContent,
        inputAsText,
        piiEnabled,
        moderationEnabled,
        jailbreakEnabled,
        hallucinationEnabled,
        piiEntities,
        guardrailModel,
        actionOnViolation,
        customRules: customRules.split('\n').filter(r => r.trim()),
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [name, searchQuery, filePattern, maxResults, includeContent, inputAsText, piiEnabled, moderationEnabled, jailbreakEnabled, hallucinationEnabled, piiEntities, guardrailModel, actionOnViolation, customRules, node, onUpdate]);

  if (!node) return null;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-2 space-y-6 w-full pb-10">
        {/* File Search Configuration */}
        {nodeType.includes('file') && (
          <div className="space-y-5 px-1">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Search className="h-3 w-3" />
                Search Query
              </Label>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Functions, classes, text..."
                className="h-8 bg-muted/20 border-border/50 focus-visible:ring-primary/20 transition-all font-medium rounded-md"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileCode className="h-3 w-3" />
                File Pattern
              </Label>
              <Input
                type="text"
                value={filePattern}
                onChange={(e) => setFilePattern(e.target.value)}
                placeholder="*.ts, *.tsx, *.js"
                className="h-8 bg-muted/20 border-border/50 font-mono text-xs focus-visible:ring-primary/20 transition-all rounded-md"
              />
              <p className="text-[10px] text-muted-foreground italic px-1">
                Comma-separated glob patterns (e.g., **/*.ts)
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Hash className="h-3 w-3" />
                  Max Results
                </Label>
                <Input
                  type="number"
                  value={maxResults}
                  onChange={(e) => setMaxResults(e.target.value)}
                  className="h-8 bg-muted/20 border-border/50 font-mono focus-visible:ring-primary/20 transition-all rounded-md w-24"
                />
              </div>
              <div className="flex flex-col items-end gap-3 pt-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                  Include Content
                </Label>
                <Switch
                  checked={includeContent}
                  onCheckedChange={setIncludeContent}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
            
            <div className="px-1 pt-2">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex gap-2.5">
                <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-primary/70 leading-relaxed italic">
                  Search through the codebase. Results are injected into the context.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Guardrails Configuration */}
        {nodeType.includes('guardrail') && (
          <div className="space-y-5 px-1">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Input Variable Reference
              </Label>
              <div className="flex items-center gap-3 p-3 bg-muted/20 border border-border/50 rounded-lg group hover:border-primary/20 transition-all">
                <div className="h-8 w-8 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0">
                  <Badge variant="outline" className="h-4 w-4 p-0 bg-primary/10 border-primary/30 flex items-center justify-center rounded-sm">
                    <Check className="h-2 w-2 text-primary" />
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <code className="text-xs font-bold font-mono text-primary flex items-center gap-1.5">
                    {`{{${inputAsText}}}`}
                  </code>
                  <p className="text-[10px] text-muted-foreground italic font-medium">Content to analyze for violations</p>
                </div>
                <Badge variant="secondary" className="bg-muted/50 border-border/50 text-[9px] font-bold uppercase tracking-widest h-5">
                  STRING
                </Badge>
              </div>
            </div>

            {/* Guardrail Toggles */}
            <div className="space-y-4 pt-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Protection Layers</Label>
              
              {/* PII Detection */}
              <Card className={cn(
                "bg-muted/10 border-border/50 shadow-none rounded-lg overflow-hidden transition-all duration-300",
                piiEnabled ? "bg-muted/20 border-primary/20" : "opacity-70"
              )}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                        piiEnabled ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground grayscale"
                      )}>
                        <Lock className="h-4 w-4" />
                      </div>
                      <div className="space-y-0">
                        <Label className="text-xs font-bold leading-none">PII Detection</Label>
                        <p className="text-[9px] text-muted-foreground italic font-medium">Prevent data leaks</p>
                      </div>
                    </div>
                    <Switch
                      checked={piiEnabled}
                      onCheckedChange={setPiiEnabled}
                      className="h-5 w-9 data-[state=checked]:bg-primary"
                    />
                  </div>

                  <AnimatePresence>
                    {piiEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pt-1"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPIIModal(true)}
                          className="w-full h-7 text-[10px] font-bold uppercase tracking-wider border-primary/20 hover:bg-primary/5 hover:text-primary transition-all gap-1.5"
                        >
                          <Settings2 className="h-3 w-3" />
                          Configure ({piiEntities.length})
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Moderation */}
              <Card className={cn(
                "bg-muted/10 border-border/50 shadow-none rounded-lg overflow-hidden transition-all duration-300",
                moderationEnabled ? "bg-muted/20 border-primary/20" : "opacity-70"
              )}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                        moderationEnabled ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground grayscale"
                      )}>
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div className="space-y-0">
                        <Label className="text-xs font-bold leading-none">Content Moderation</Label>
                        <p className="text-[9px] text-muted-foreground italic font-medium">Hate, violence, NSFW</p>
                      </div>
                    </div>
                    <Switch
                      checked={moderationEnabled}
                      onCheckedChange={setModerationEnabled}
                      className="h-5 w-9 data-[state=checked]:bg-primary"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Jailbreak */}
              <Card className={cn(
                "bg-muted/10 border-border/50 shadow-none rounded-lg overflow-hidden transition-all duration-300",
                jailbreakEnabled ? "bg-muted/20 border-primary/20" : "opacity-70"
              )}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                        jailbreakEnabled ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground grayscale"
                      )}>
                        <Flame className="h-4 w-4" />
                      </div>
                      <div className="space-y-0">
                        <Label className="text-xs font-bold leading-none">Jailbreak Detection</Label>
                        <p className="text-[9px] text-muted-foreground italic font-medium">Prompt injection protection</p>
                      </div>
                    </div>
                    <Switch
                      checked={jailbreakEnabled}
                      onCheckedChange={setJailbreakEnabled}
                      className="h-5 w-9 data-[state=checked]:bg-primary"
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Hallucination */}
              <Card className={cn(
                "bg-muted/10 border-border/50 shadow-none rounded-lg overflow-hidden transition-all duration-300",
                hallucinationEnabled ? "bg-muted/20 border-primary/20" : "opacity-70"
              )}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                        hallucinationEnabled ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground grayscale"
                      )}>
                        <Eye className="h-4 w-4" />
                      </div>
                      <div className="space-y-0">
                        <Label className="text-xs font-bold leading-none">Fact Checking</Label>
                        <p className="text-[9px] text-muted-foreground italic font-medium">Hallucination detection</p>
                      </div>
                    </div>
                    <Switch
                      checked={hallucinationEnabled}
                      onCheckedChange={setHallucinationEnabled}
                      className="h-5 w-9 data-[state=checked]:bg-primary"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Settings */}
              <div className="space-y-4 pt-6 border-t border-border/50">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" />
                    Analysis Model
                  </Label>
                  <Select value={guardrailModel} onValueChange={setGuardrailModel}>
                    <SelectTrigger className="h-8 bg-muted/20 border-border/50 font-medium rounded-md">
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold uppercase">OpenAI (Pro)</SelectLabel>
                        <SelectItem value="openai/gpt-5-mini" className="text-xs">GPT-5 Mini (Fastest)</SelectItem>
                        <SelectItem value="openai/gpt-5" className="text-xs">GPT-5 (Deep Analysis)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold uppercase">Groq (OSS)</SelectLabel>
                        <SelectItem value="groq/llama-3.3-70b" className="text-xs">Llama 3.3 70B</SelectItem>
                        <SelectItem value="groq/gpt-oss-120b" className="text-xs">GPT OSS 120B</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Ban className="h-3 w-3" />
                    Action on Violation
                  </Label>
                  <Select value={actionOnViolation} onValueChange={setActionOnViolation}>
                    <SelectTrigger className="h-8 bg-muted/20 border-border/50 font-medium rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="block" className="text-xs">🛑 Block & Stop Flow</SelectItem>
                      <SelectItem value="warn" className="text-xs">⚠️ Warn & Continue</SelectItem>
                      <SelectItem value="flag" className="text-xs">🏴 Flag & Continue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MessageSquareWarning className="h-3 w-3" />
                    Custom Rules
                  </Label>
                  <Textarea
                    value={customRules}
                    onChange={(e) => setCustomRules(e.target.value)}
                    placeholder="e.g., Block messages about billing..."
                    rows={3}
                    className="min-h-[80px] bg-muted/20 border-border/50 text-xs italic focus-visible:ring-primary/20 font-medium leading-relaxed rounded-md"
                  />
                  <p className="text-[10px] text-muted-foreground italic px-1">
                    One rule per line. LLM will enforce these specifically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PII Modal */}
        <Dialog open={showPIIModal} onOpenChange={setShowPIIModal}>
          <DialogContent className="max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-lg">
            <DialogHeader className="p-6 bg-muted/20 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">PII Configuration</DialogTitle>
                  <DialogDescription className="text-xs font-medium italic text-muted-foreground">
                    Select sensitive data types to detect and redact.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entity Types</span>
                <div className="flex gap-4">
                  <Button variant="link" size="sm" onClick={() => setPiiEntities(allPIIEntities.map(e => e.id))} className="h-auto p-0 text-[10px] uppercase font-bold text-primary">All</Button>
                  <Button variant="link" size="sm" onClick={() => setPiiEntities([])} className="h-auto p-0 text-[10px] uppercase font-bold text-muted-foreground">None</Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {allPIIEntities.map((entity) => (
                  <div key={entity.id} className="flex items-center space-x-3 group">
                    <Checkbox
                      id={entity.id}
                      checked={piiEntities.includes(entity.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPiiEntities([...piiEntities, entity.id]);
                        } else {
                          setPiiEntities(piiEntities.filter(id => id !== entity.id));
                        }
                      }}
                      className="h-4.5 w-4.5 border-border/50 data-[state=checked]:bg-primary"
                    />
                    <Label
                      htmlFor={entity.id}
                      className="text-xs font-medium cursor-pointer group-hover:text-primary transition-colors select-none"
                    >
                      {entity.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="p-4 bg-muted/10 border-t border-border/50 flex items-center justify-between sm:justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic pl-2">
                {piiEntities.length} Selected
              </span>
              <Button 
                onClick={() => {
                  onUpdate(node?.id || '', { piiEntities });
                  setShowPIIModal(false);
                  toast.success("PII settings updated successfully");
                }}
                className="font-bold h-9 px-6 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              >
                Apply Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};
