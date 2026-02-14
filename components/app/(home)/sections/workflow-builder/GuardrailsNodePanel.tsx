"use client";

import { useState, useEffect } from "react";
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

  // Sync changes to parent - stop infinite loop by checking for actual changes
  useEffect(() => {
    if (!node?.id) return;

    // Deep compare config with current node data to prevent recursion
    const currentData = {
      checks: node.data?.checks || {},
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
    <div className="p-20 space-y-20">
      {/* Header Description */}
      <div className="p-12 bg-heat-4 rounded-10 border border-heat-12 flex gap-12 items-start">
        <Shield className="w-16 h-16 text-heat-100 mt-2 shrink-0" />
        <p className="text-xs text-heat-100 leading-relaxed">
          Guardrails inspect content for safety violations before passing it to the next node.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-faint">
        <button
          onClick={() => setActiveTab("checks")}
          className={`px-12 py-8 text-sm font-medium transition-colors relative ${activeTab === "checks" ? "text-accent-black" : "text-black-alpha-48 hover:text-accent-black"
            }`}
        >
          Safety Checks
          {activeTab === "checks" && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-2 bg-heat-100" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("actions")}
          className={`px-12 py-8 text-sm font-medium transition-colors relative ${activeTab === "actions" ? "text-accent-black" : "text-black-alpha-48 hover:text-accent-black"
            }`}
        >
          Actions
          {activeTab === "actions" && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-2 bg-heat-100" />
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
            className="space-y-16"
          >
            {/* Main Toggles */}
            <div className="space-y-12">
              {[
                { id: 'moderation', label: 'Moderation', desc: 'Hate speech, violence, harassment' },
                { id: 'jailbreak', label: 'Jailbreak Detection', desc: 'Attempts to bypass AI safety' },
                { id: 'pii', label: 'PII Detection', desc: 'Email, phone, addresses, SSN' },
                { id: 'hallucination', label: 'Hallucination Check', desc: 'Verify against retrieved context' },
              ].map((item) => (
                <div key={item.id} className="flex items-start justify-between">
                  <div>
                    <label className="text-sm font-medium text-accent-black block">{item.label}</label>
                    <p className="text-xs text-black-alpha-48">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => toggleCheck(item.id as keyof typeof config.checks)}
                    className={`w-40 h-24 rounded-full transition-colors relative shrink-0 ${config.checks[item.id as keyof typeof config.checks] ? "bg-heat-100" : "bg-black-alpha-12"
                      }`}
                  >
                    <motion.div
                      className="w-20 h-20 bg-white rounded-full absolute top-2 shadow-sm"
                      animate={{ left: config.checks[item.id as keyof typeof config.checks] ? "18px" : "2px" }}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Custom Rules */}
            <div className="pt-16 border-t border-border-faint">
              <label className="block text-sm font-medium text-black-alpha-48 mb-8">
                Custom Rules
              </label>
              <div className="flex gap-8 mb-8">
                <input
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRule()}
                  placeholder="e.g. No mention of competitors"
                  className="flex-1 px-12 py-8 bg-background-base border border-border-faint rounded-8 text-sm focus:outline-none focus:border-heat-100"
                />
                <button
                  onClick={addRule}
                  className="px-12 py-8 bg-heat-4 text-heat-100 rounded-8 text-sm font-medium hover:bg-heat-8 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="space-y-4">
                {config.customRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between p-8 bg-background-base rounded-8 group">
                    <span className="text-sm text-accent-black">{rule}</span>
                    <button onClick={() => removeRule(idx)} className="text-black-alpha-32 hover:text-heat-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      <XCircle className="w-16 h-16" />
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
            className="space-y-20"
          >
            {/* Action on Violation */}
            <div>
              <label className="block text-sm font-medium text-black-alpha-48 mb-8">
                Action on Violation
              </label>
              <div className="grid grid-cols-2 gap-8">
                <button
                  onClick={() => setConfig(prev => ({ ...prev, actionOnViolation: 'block' }))}
                  className={`p-12 rounded-10 border text-left transition-all ${config.actionOnViolation === 'block'
                    ? 'border-heat-100 bg-heat-4'
                    : 'border-border-faint hover:border-black-alpha-20'
                    }`}
                >
                  <div className="flex items-center gap-8 mb-4">
                    <XCircle className={`w-16 h-16 ${config.actionOnViolation === 'block' ? 'text-heat-100' : 'text-black-alpha-48'}`} />
                    <span className={`text-sm font-medium ${config.actionOnViolation === 'block' ? 'text-heat-100' : 'text-accent-black'}`}>Block</span>
                  </div>
                  <p className="text-xs text-black-alpha-48">Stop execution and throw error.</p>
                </button>

                <button
                  onClick={() => setConfig(prev => ({ ...prev, actionOnViolation: 'fallback' }))}
                  className={`p-12 rounded-10 border text-left transition-all ${config.actionOnViolation === 'fallback'
                    ? 'border-heat-100 bg-heat-4'
                    : 'border-border-faint hover:border-black-alpha-20'
                    }`}
                >
                  <div className="flex items-center gap-8 mb-4">
                    <AlertTriangle className={`w-16 h-16 ${config.actionOnViolation === 'fallback' ? 'text-heat-100' : 'text-black-alpha-48'}`} />
                    <span className={`text-sm font-medium ${config.actionOnViolation === 'fallback' ? 'text-heat-100' : 'text-accent-black'}`}>Fallback</span>
                  </div>
                  <p className="text-xs text-black-alpha-48">Return static response.</p>
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
                <label className="block text-sm font-medium text-black-alpha-48 mb-8">
                  Fallback Response
                </label>
                <textarea
                  value={config.fallbackResponse}
                  onChange={(e) => setConfig(prev => ({ ...prev, fallbackResponse: e.target.value }))}
                  className="w-full px-12 py-8 bg-background-base border border-border-faint rounded-8 text-sm h-80 focus:outline-none focus:border-heat-100 resize-none"
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
