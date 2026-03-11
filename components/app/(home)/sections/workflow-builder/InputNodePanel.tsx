"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Globe, Clock, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";

interface InputNodePanelProps {
  node: any;
  updateNodeData: (nodeId: string, data: any) => void;
}

export default function InputNodePanel({
  node,
  updateNodeData,
}: InputNodePanelProps) {
  // Config state
  const [triggerType, setTriggerType] = useState<"manual" | "webhook" | "schedule">(
    node?.data?.triggerType || "manual"
  );
  const [cronExpression, setCronExpression] = useState(
    node?.data?.cronExpression || "0 9 * * *"
  );
  const [copied, setCopied] = useState(false);

  // Use params to get workflow ID for webhook URL
  const params = useParams();
  const workflowId = params?.id as string;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookUrl = `${origin}/api/webhook/${workflowId}`;

  // Sync state with node data - debounced and guarded
  useEffect(() => {
    if (!node?.id) return;

    const timeoutId = setTimeout(() => {
      // Only update if something actually changed to avoid infinite loops
      if (
        triggerType !== node.data?.triggerType ||
        cronExpression !== node.data?.cronExpression
      ) {
        updateNodeData(node.id, {
          triggerType,
          cronExpression,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [triggerType, cronExpression, node?.id, node.data?.triggerType, node.data?.cronExpression, updateNodeData]);

  const handleCopy = () => {
    if (!workflowId) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-20 space-y-20">
      {/* Trigger Type Selection */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-4">
          Trigger Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setTriggerType("manual")}
            className={`flex flex-col items-center justify-center p-4 rounded-md border transition-all ${triggerType === "manual"
              ? "bg-secondary border-primary text-primary"
              : "bg-background border-border text-foreground hover:bg-secondary"
              }`}
          >
            <Zap className="w-6 h-6 mb-2" />
            <span className="text-xs font-medium">Manual</span>
          </button>

          <button
            onClick={() => setTriggerType("webhook")}
            className={`flex flex-col items-center justify-center p-4 rounded-md border transition-all ${triggerType === "webhook"
              ? "bg-secondary border-primary text-primary"
              : "bg-background border-border text-foreground hover:bg-secondary"
              }`}
          >
            <Globe className="w-6 h-6 mb-2" />
            <span className="text-xs font-medium">Webhook</span>
          </button>

          <button
            onClick={() => setTriggerType("schedule")}
            className={`flex flex-col items-center justify-center p-4 rounded-md border transition-all ${triggerType === "schedule"
              ? "bg-secondary border-primary text-primary"
              : "bg-background border-border text-foreground hover:bg-secondary"
              }`}
          >
            <Clock className="w-6 h-6 mb-2" />
            <span className="text-xs font-medium">Schedule</span>
          </button>
        </div>
      </div>

      {/* Webhook Configuration */}
      <AnimatePresence mode="wait">
        {triggerType === "webhook" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="p-4 bg-background rounded-md border border-border">
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Webhook URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary p-2 rounded text-foreground break-all">
                  {webhookUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-2 hover:bg-secondary/80 rounded-6 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-black-alpha-32 mt-2">
                Send a POST request with JSON body to trigger this workflow.
              </p>
            </div>
          </motion.div>
        )}

        {/* Schedule Configuration */}
        {triggerType === "schedule" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                CRON Expression
              </label>
              <input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 9 * * *"
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Need help? <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Cron Guru</a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Schema / Variables Note */}
      <div>
        <div className="p-4 bg-secondary border border-heat-10 rounded-md">
          <h4 className="text-xs font-medium text-primary mb-1">Input Variables</h4>
          <p className="text-xs text-primary opacity-80">
            Inputs sent via Webhook body or Schedule payload will be available as <code>{`{{input.variableName}}`}</code> in your workflow.
          </p>
        </div>
      </div>
    </div>
  );
}
