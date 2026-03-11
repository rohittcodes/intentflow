"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronDown, Check, AlertTriangle, XCircle } from "lucide-react";

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

  // Sync changes to parent - stop infinite loop by checking for actual changes
  useEffect(() => {
    if (!node?.id) return;

    // Deep compare config with current node data to prevent recursion
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

    const configStr = JSON.stringify(config);
    const dataStr = JSON.stringify(currentData);

    if (configStr !== dataStr) {
      updateNodeData(node.id, {
        ...node.data,
        ...config,
        label: "Guardrails",
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
    <div className="p-2 space-y-2">
      {/* Header Description */}
      <div className="p-3 bg-secondary rounded-lg border border-heat-12 flex gap-3 items-start">
        <Shield className="w-4 h-4 text-primary mt-1 shrink-0" />
        <p className="text-xs text-primary leading-relaxed">
          Guardrails inspect content for safety violations before passing it to the next node.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("checks")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === "checks" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Safety Checks
          {activeTab === "checks" && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("actions")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === "actions" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Actions
          {activeTab === "actions" && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "checks" ? (
          <motion.div
            key="checks"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-2"
          >
            {/* Main Toggles */}
            <div className="space-y-3">
              {[
                { id: 'moderation', label: 'Moderation', desc: 'Hate speech, violence, harassment' },
                { id: 'jailbreak', label: 'Jailbreak Detection', desc: 'Attempts to bypass AI safety' },
                { id: 'pii', label: 'PII Detection', desc: 'Email, phone, addresses, SSN' },
                { id: 'hallucination', label: 'Hallucination Check', desc: 'Verify against retrieved context' },
              ].map((item) => (
                <div key={item.id} className="flex items-start justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground block">{item.label}</label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={config.checks[item.id as keyof typeof config.checks]}
                    onCheckedChange={() => toggleCheck(item.id as keyof typeof config.checks)}
                    className="scale-75 origin-right"
                  />
                </div>
              ))}
            </div>

            {/* Custom Rules */}
            <div className="pt-4 border-t border-border">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Custom Rules
              </label>
              <div className="flex gap-2 mb-8">
                <input
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRule()}
                  placeholder="e.g. No mention of competitors"
                  className="flex-1 px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
                <button
                  onClick={addRule}
                  className="px-3 py-1.5 bg-secondary text-primary rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="space-y-4">
                {config.customRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between p-8 bg-background rounded-md group">
                    <span className="text-sm text-foreground">{rule}</span>
                    <button onClick={() => removeRule(idx)} className="text-black-alpha-32 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {config.customRules.length === 0 && (
                  <p className="text-xs text-black-alpha-32 italic">No custom rules added.</p>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            {/* Action on Violation */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Action on Violation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfig(prev => ({ ...prev, actionOnViolation: 'block' }))}
                  className={`p-2 rounded-lg border text-left transition-all ${config.actionOnViolation === 'block'
                    ? 'border-primary bg-secondary'
                    : 'border-border hover:border-black-alpha-20'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle className={`w-4 h-4 ${config.actionOnViolation === 'block' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${config.actionOnViolation === 'block' ? 'text-primary' : 'text-foreground'}`}>Block</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Stop execution and throw error.</p>
                </button>

                <button
                  onClick={() => setConfig(prev => ({ ...prev, actionOnViolation: 'fallback' }))}
                  className={`p-3 rounded-lg border text-left transition-all ${config.actionOnViolation === 'fallback'
                    ? 'border-primary bg-secondary'
                    : 'border-border hover:border-black-alpha-20'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className={`w-4 h-4 ${config.actionOnViolation === 'fallback' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${config.actionOnViolation === 'fallback' ? 'text-primary' : 'text-foreground'}`}>Fallback</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Return static response.</p>
                </button>
              </div>
            </div>

            {/* Fallback Response */}
            {config.actionOnViolation === 'fallback' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="overflow-hidden"
              >
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Fallback Response
                </label>
                <textarea
                  value={config.fallbackResponse}
                  onChange={(e) => setConfig(prev => ({ ...prev, fallbackResponse: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm h-20 focus:outline-none focus:border-primary resize-none"
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
