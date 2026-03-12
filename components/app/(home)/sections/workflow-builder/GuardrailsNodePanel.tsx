"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  ChevronDown, 
  Check, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  Siren, 
  Lock, 
  Eraser, 
  Sparkles, 
  Settings2, 
  Plus, 
  Trash2, 
  Info,
  Ban,
  Undo2,
  ShieldCheck,
  Eye,
  Terminal
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface GuardrailsNodePanelProps {
  node: any;
  updateNodeData: (id: string, data: any) => void;
}

export default function GuardrailsNodePanel({
  node,
  updateNodeData,
}: GuardrailsNodePanelProps) {
  // Initialize state from node or defaults
  const [config, setConfig] = useState({
    checks: {
      pii: node?.data?.checks?.pii ?? false,
      moderation: node?.data?.checks?.moderation ?? true,
      jailbreak: node?.data?.checks?.jailbreak ?? true,
      hallucination: node?.data?.checks?.hallucination ?? false,
    },
    piiEntities: node?.data?.piiEntities || [],
    customRules: node?.data?.customRules || [],
    actionOnViolation: node?.data?.actionOnViolation || "block",
    fallbackResponse: node?.data?.fallbackResponse || "I cannot fulfill this request due to safety checks.",
  });

  const [activeTab, setActiveTab] = useState<"checks" | "actions">("checks");
  const [newRule, setNewRule] = useState("");

  // Sync state from node props when node changes
  useEffect(() => {
    if (!node?.id) return;

    const nodeData = node.data || {};
    setConfig({
      checks: {
        pii: nodeData.checks?.pii ?? false,
        moderation: nodeData.checks?.moderation ?? true,
        jailbreak: nodeData.checks?.jailbreak ?? true,
        hallucination: nodeData.checks?.hallucination ?? false,
      },
      piiEntities: nodeData.piiEntities || [],
      customRules: nodeData.customRules || [],
      actionOnViolation: nodeData.actionOnViolation || "block",
      fallbackResponse: nodeData.fallbackResponse || "I cannot fulfill this request due to safety checks.",
    });
  }, [node?.id]);

  // Sync changes to parent
  useEffect(() => {
    if (!node?.id) return;

    const currentData = {
      checks: {
        pii: node.data?.checks?.pii ?? false,
        moderation: node.data?.checks?.moderation ?? true,
        jailbreak: node.data?.checks?.jailbreak ?? true,
        hallucination: node.data?.checks?.hallucination ?? false,
      },
      piiEntities: node.data?.piiEntities || [],
      customRules: node.data?.customRules || [],
      actionOnViolation: node.data?.actionOnViolation || "block",
      fallbackResponse: node.data?.fallbackResponse || "I cannot fulfill this request due to safety checks.",
    };

    if (JSON.stringify(config) !== JSON.stringify(currentData)) {
      updateNodeData(node.id, {
        ...node.data,
        ...config,
        label: "Guardrails",
        nodeType: 'guardrails'
      });
    }
  }, [config, node?.id, node?.data, updateNodeData]);

  const toggleCheck = (key: keyof typeof config.checks) => {
    setConfig(prev => ({
      ...prev,
      checks: { ...prev.checks, [key]: !prev.checks[key] }
    }));
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    setConfig(prev => ({
      ...prev,
      customRules: [...prev.customRules, newRule.trim()]
    }));
    setNewRule("");
  };

  const removeRule = (index: number) => {
    setConfig(prev => ({
      ...prev,
      customRules: prev.customRules.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 w-full pb-10">
      {/* Header banner omitted */}

      <Tabs defaultValue="checks" className="w-full">
        <div className="max-w-[320px] mx-auto space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted/20 border border-border/50 h-9 rounded-md">
            <TabsTrigger value="checks" className="text-[10px] font-bold uppercase tracking-widest rounded-sm">Safety Ops</TabsTrigger>
            <TabsTrigger value="actions" className="text-[10px] font-bold uppercase tracking-widest rounded-sm">Violation Logic</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="checks" className="space-y-4 pt-3 outline-none max-w-[320px] mx-auto">
          {/* Main Toggles */}
          <div className="space-y-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Scrutiny</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'moderation', label: 'Moderation', desc: 'Hate speech, violence, harassment', icon: ShieldAlert },
                { id: 'jailbreak', label: 'Jailbreak', desc: 'Attempts to bypass AI safety', icon: Lock },
                { id: 'pii', label: 'PII Detection', desc: 'Email, phone, addresses, SSN', icon: Eraser },
                { id: 'hallucination', label: 'Accuracy', desc: 'Verify against retrieved context', icon: Sparkles },
              ].map((item) => {
                const Icon = item.icon;
                const active = config.checks[item.id as keyof typeof config.checks];
                return (
                  <Card key={item.id} className={cn("bg-muted/10 border-border/50 shadow-none transition-all rounded-md hover:bg-muted/20", active && "border-primary/20 bg-primary/5")}>
                    <CardContent className="p-1.5 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground/40")} />
                        <span className="text-[10px] font-bold text-foreground">{item.label}</span>
                      </div>
                      <Switch
                        checked={active}
                        onCheckedChange={() => toggleCheck(item.id as keyof typeof config.checks)}
                        className="scale-75"
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Custom Rules */}
          <div className="space-y-2.5 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary/60" />
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Heuristic Rules</Label>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono bg-background border-border/50 text-muted-foreground lowercase">
                {config.customRules.length} rules
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRule()}
                placeholder="New rule..."
                className="h-8 bg-muted/10 border-border/50 text-[10px] focus-visible:ring-primary/20 shadow-inner rounded-md"
              />
              <Button onClick={addRule} size="sm" className="h-8 font-bold uppercase tracking-widest text-[10px] px-3 rounded-md">
                Add
              </Button>
            </div>

            <AnimatePresence mode="popLayout">
              {config.customRules.length > 0 ? (
                <div className="space-y-2">
                  {config.customRules.map((rule, idx) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      key={idx}
                    >
                      <Card className="bg-muted/5 border-border/50 shadow-none rounded-lg group hover:border-primary/20 transition-all">
                        <CardContent className="p-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <Terminal className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                            <span className="text-[11px] font-medium text-foreground truncate">{rule}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeRule(idx)} 
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-muted/5 border-dashed border-border/50 rounded-lg flex flex-col items-center justify-center text-center opacity-40">
                  <p className="text-[10px] font-bold uppercase tracking-widest">No custom heuristics</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-5 pt-4 outline-none max-w-[320px] mx-auto">
          {/* Action on Violation */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500/60" />
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Breach Protocol</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={config.actionOnViolation === "block" ? "default" : "outline"}
                onClick={() => setConfig(prev => ({ ...prev, actionOnViolation: 'block' }))}
                className={cn(
                  "h-auto flex-col items-start gap-1 p-2.5 rounded-md transition-all",
                  config.actionOnViolation === "block" ? "bg-primary text-primary-foreground" : "bg-muted/10 border-border/50 hover:bg-muted/20"
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest block">Block</span>
                <p className="text-[9px] opacity-70 italic font-medium leading-tight">Abort execution</p>
              </Button>

              <Button
                variant={config.actionOnViolation === "fallback" ? "default" : "outline"}
                onClick={() => setConfig(prev => ({ ...prev, actionOnViolation: 'fallback' }))}
                className={cn(
                  "h-auto flex-col items-start gap-1 p-2.5 rounded-md transition-all",
                  config.actionOnViolation === "fallback" ? "bg-primary text-primary-foreground" : "bg-muted/10 border-border/50 hover:bg-muted/20"
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest block">Fallback</span>
                <p className="text-[9px] opacity-70 italic font-medium leading-tight">Static response</p>
              </Button>
            </div>
          </div>

          {/* Fallback Response */}
          <AnimatePresence>
            {config.actionOnViolation === 'fallback' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 border-t border-border/50 pt-5 overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-primary/60" />
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fallback Script</Label>
                </div>
                <Textarea
                  value={config.fallbackResponse}
                  onChange={(e) => setConfig(prev => ({ ...prev, fallbackResponse: e.target.value }))}
                  className="min-h-[80px] bg-muted/20 border-border/50 text-sm focus-visible:ring-primary/20 shadow-inner leading-relaxed rounded-md"
                  placeholder="The default message when blocked..."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Info Box */}
      <Card className="bg-secondary/40 border-border/30 shadow-none rounded-lg max-w-[320px] mx-auto">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-4 w-4 text-primary shrink-0 opacity-60" />
          <p className="text-[11px] text-muted-foreground leading-relaxed italic font-medium">
            <strong className="text-foreground font-bold">Safety Engine:</strong> Guardrails utilize LLM-based classifiers to detect toxic sentiment or sensitive data leaks. Fallback mode is recommended for user-facing bots.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
