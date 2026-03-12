"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Globe, Clock, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="flex-1 overflow-y-auto p-2 space-y-5 w-full">
      {/* Trigger Type Selection */}
      <div className="space-y-3 px-1 max-w-[320px] mx-auto">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Trigger Type
        </Label>
        <Tabs
          value={triggerType}
          onValueChange={(val) => setTriggerType(val as any)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full h-8 p-1 bg-muted/50 border border-border rounded-md">
            <TabsTrigger
              value="manual"
              className="text-[11px] font-medium gap-1.5 h-7 data-[state=active]:bg-background data-[state=active]:text-primary"
            >
              <Zap className="w-3.5 h-3.5" />
              Manual
            </TabsTrigger>
            <TabsTrigger
              value="webhook"
              className="text-[11px] font-medium gap-1.5 h-7 data-[state=active]:bg-background data-[state=active]:text-primary"
            >
              <Globe className="w-3.5 h-3.5" />
              Webhook
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="text-[11px] font-medium gap-1.5 h-7 data-[state=active]:bg-background data-[state=active]:text-primary"
            >
              <Clock className="w-3.5 h-3.5" />
              Schedule
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Webhook Configuration */}
      <AnimatePresence mode="wait">
        {triggerType === "webhook" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 px-1 max-w-[320px] mx-auto"
          >
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50 space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Webhook URL
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] bg-muted/50 p-2 rounded-md border border-border/50 text-foreground break-all font-mono">
                  {webhookUrl}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-7 w-7 shrink-0 hover:bg-muted/50 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic px-0.5 font-medium">
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
            className="space-y-4 px-1 max-w-[320px] mx-auto"
          >
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                CRON Expression
              </Label>
              <Input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 9 * * *"
                className="h-8 bg-muted/20 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 rounded-md"
              />
              <div className="flex items-center justify-between px-0.5">
                <p className="text-[10px] text-muted-foreground italic font-medium">
                  Run recurring jobs automatically.
                </p>
                <a
                  href="https://crontab.guru/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline font-bold uppercase tracking-wider"
                >
                  Cron Guru →
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Schema / Variables Note */}
      <div className="px-1 pt-2 max-w-[320px] mx-auto">
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1">
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Input Variables</h4>
          </div>
          <p className="text-[10px] text-primary/80 leading-relaxed italic font-medium">
            Payload inputs are available as <code className="bg-primary/10 px-1 rounded font-mono text-primary">{`{{input.var}}`}</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
