"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";

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
    <div className="p-20 space-y-20">
      {/* Header info banner */}
      <div className="p-12 bg-amber-50 rounded-10 border border-amber-200 flex gap-12 items-start">
        <CheckCircle className="w-16 h-16 text-amber-600 mt-2 shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          Execution pauses here and waits for a human to approve before continuing. The approver
          sees the message below in the preview panel.
        </p>
      </div>

      {/* Approval Message */}
      <div className="space-y-8">
        <label className="block text-sm font-medium text-accent-black">
          Approval Message
        </label>
        <p className="text-xs text-black-alpha-48">
          This message is shown to the person who must approve this step.
        </p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="Describe what the approver should review…"
          className="w-full px-12 py-10 bg-background-base border border-border-faint rounded-10 text-sm text-accent-black placeholder-black-alpha-32 focus:outline-none focus:border-amber-400 transition-colors resize-none"
        />
      </div>

      {/* Timeout */}
      <div className="space-y-8">
        <label className="block text-sm font-medium text-accent-black flex items-center gap-8">
          <Clock className="w-14 h-14" />
          Timeout (minutes)
        </label>
        <p className="text-xs text-black-alpha-48">
          Auto-deny if not approved within this time. Set to 0 for no timeout.
        </p>
        <input
          type="number"
          value={timeoutMinutes}
          onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
          min={0}
          step={5}
          className="w-full px-12 py-10 bg-background-base border border-border-faint rounded-10 text-sm text-accent-black focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {/* Action on Deny */}
      <div className="space-y-8">
        <label className="block text-sm font-medium text-accent-black">
          Action on Deny / Timeout
        </label>
        <div className="grid grid-cols-2 gap-8">
          <button
            onClick={() => setActionOnDeny("stop")}
            className={`p-12 rounded-10 border text-left transition-all ${actionOnDeny === "stop"
                ? "border-amber-400 bg-amber-50"
                : "border-border-faint hover:border-black-alpha-20"
              }`}
          >
            <div className="flex items-center gap-8 mb-4">
              <XCircle
                className={`w-16 h-16 ${actionOnDeny === "stop" ? "text-amber-600" : "text-black-alpha-48"}`}
              />
              <span
                className={`text-sm font-medium ${actionOnDeny === "stop" ? "text-amber-700" : "text-accent-black"}`}
              >
                Stop
              </span>
            </div>
            <p className="text-xs text-black-alpha-48">Halt the workflow and mark as failed.</p>
          </button>

          <button
            onClick={() => setActionOnDeny("skip")}
            className={`p-12 rounded-10 border text-left transition-all ${actionOnDeny === "skip"
                ? "border-amber-400 bg-amber-50"
                : "border-border-faint hover:border-black-alpha-20"
              }`}
          >
            <div className="flex items-center gap-8 mb-4">
              <AlertTriangle
                className={`w-16 h-16 ${actionOnDeny === "skip" ? "text-amber-600" : "text-black-alpha-48"}`}
              />
              <span
                className={`text-sm font-medium ${actionOnDeny === "skip" ? "text-amber-700" : "text-accent-black"}`}
              >
                Skip
              </span>
            </div>
            <p className="text-xs text-black-alpha-48">Continue workflow with denied status.</p>
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div className="pt-16 border-t border-border-faint space-y-8">
        <p className="text-xs font-medium text-black-alpha-48 uppercase tracking-wider">Preview</p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-16 rounded-12 border-2 border-amber-300 bg-amber-50"
        >
          <div className="flex items-center gap-10 mb-10">
            <div className="w-8 h-8 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-semibold text-amber-800">Waiting for Approval</span>
          </div>
          <p className="text-sm text-amber-700 leading-relaxed">
            {instructions || "No message set."}
          </p>
          {timeoutMinutes > 0 && (
            <p className="text-xs text-amber-600 mt-8 flex items-center gap-4">
              <Clock className="w-12 h-12" />
              Auto-{actionOnDeny === "stop" ? "denied" : "skipped"} after {timeoutMinutes}m
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
