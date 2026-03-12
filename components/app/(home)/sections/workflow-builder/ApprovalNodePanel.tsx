"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  MessageSquare, 
  Timer, 
  Ban, 
  SkipForward,
  Eye,
  Info,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ApprovalNodePanelProps {
  node: any;
  updateNodeData: (id: string, data: any) => void;
}

export default function ApprovalNodePanel({ node, updateNodeData }: ApprovalNodePanelProps) {
  const [instructions, setInstructions] = useState(
    node?.data?.approvalMessage || "Please review and approve this step before the workflow continues."
  );
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(
    node?.data?.timeoutMinutes ?? 0
  );
  const [actionOnDeny, setActionOnDeny] = useState<"stop" | "skip">(
    node?.data?.actionOnDeny || "stop"
  );

  // Sync from node props when node changes
  useEffect(() => {
    if (!node?.id) return;
    setInstructions(node.data?.approvalMessage || "Please review and approve this step before the workflow continues.");
    setTimeoutMinutes(node.data?.timeoutMinutes ?? 0);
    setActionOnDeny(node.data?.actionOnDeny || "stop");
  }, [node?.id]);

  // Sync changes back to parent
  useEffect(() => {
    if (!node?.id) return;
    const currentData = {
      approvalMessage: node.data?.approvalMessage || "",
      timeoutMinutes: node.data?.timeoutMinutes ?? 0,
      actionOnDeny: node.data?.actionOnDeny || "stop",
    };
    const newData = { approvalMessage: instructions, timeoutMinutes, actionOnDeny };
    if (JSON.stringify(currentData) !== JSON.stringify(newData)) {
      updateNodeData(node.id, {
        ...node.data,
        ...newData,
        label: "Approval",
      });
    }
  }, [instructions, timeoutMinutes, actionOnDeny, node?.id, node?.data, updateNodeData]);

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-6 w-full pb-10">
      {/* Header info banner omitted */}

      {/* Approval Message */}
      <div className="space-y-3 px-1 max-w-[320px] mx-auto">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Approval Message</Label>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="Describe what the approver should review…"
          className="min-h-[100px] bg-muted/20 border-border/50 text-sm focus-visible:ring-primary/20 transition-all leading-relaxed rounded-md p-4"
        />
      </div>

      {/* Timeout */}
      <div className="space-y-3 px-1 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Timeout (Min)</Label>
          <code className="text-[10px] font-mono text-primary">min</code>
        </div>
        <Input
          type="number"
          value={timeoutMinutes}
          onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
          min={0}
          step={5}
          className="h-8 bg-muted/20 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 transition-all rounded-md"
        />
      </div>

      {/* Action on Deny */}
      <div className="space-y-3 px-1 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">On Deny</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={actionOnDeny === "stop" ? "default" : "outline"}
            onClick={() => setActionOnDeny("stop")}
            className={cn(
              "h-auto flex-col items-start gap-1 p-2.5 transition-all rounded-md",
              actionOnDeny === "stop" ? "bg-primary text-primary-foreground" : "bg-muted/10 border-border/50 hover:bg-muted/20"
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest">Stop</span>
            <span className="text-[9px] opacity-70 italic font-medium leading-tight text-left">Halt workflow</span>
          </Button>

          <Button
            variant={actionOnDeny === "skip" ? "default" : "outline"}
            onClick={() => setActionOnDeny("skip")}
            className={cn(
              "h-auto flex-col items-start gap-1 p-2.5 transition-all rounded-md",
              actionOnDeny === "skip" ? "bg-primary text-primary-foreground" : "bg-muted/10 border-border/50 hover:bg-muted/20"
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest">Skip</span>
            <span className="text-[9px] opacity-70 italic font-medium leading-tight text-left">Continue runs</span>
          </Button>
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-4 px-1 border-t border-border/50 pt-6 max-w-[320px] mx-auto">
        <div className="flex items-center gap-2 pb-1">
          <Eye className="h-3.5 w-3.5 text-primary/60" />
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preview</Label>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-2 border-amber-500/40 bg-amber-500/5 shadow-xl shadow-amber-500/5 rounded-lg overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center justify-center animate-pulse">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 tracking-tight">Manual Review Req.</h4>
                  <p className="text-[10px] text-amber-700/70 font-bold uppercase tracking-widest">Human in the loop</p>
                </div>
              </div>
              <div className="p-3 bg-white/40 border border-amber-500/20 rounded-md">
                <p className="text-xs text-amber-800 leading-relaxed font-medium italic">
                  {instructions || "No message set."}
                </p>
              </div>
              {timeoutMinutes > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="bg-amber-100/50 border-amber-500/20 text-amber-700 text-[10px] font-bold uppercase h-6 px-2 gap-2">
                    <Timer className="h-3 w-3" />
                    Auto-{actionOnDeny === "stop" ? "Stop" : "Skip"} in {timeoutMinutes}m
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
