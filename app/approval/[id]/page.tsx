"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle2, XCircle, Clock, AlertCircle, ShieldCheck, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Human-in-the-Loop Approval Page
 * Allows external users (or authenticated team members) to approve/reject workflow steps.
 */
export default function ApprovalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const approvalId = params.id as string;
  const token = searchParams.get("token"); // Optional: for future security

  const approvalData = useQuery(api.approvals.watchStatus, { approvalId });
  const approveMutation = useMutation(api.approvals.approve);
  const rejectMutation = useMutation(api.approvals.reject);

  const [isProcessing, setIsProcessing] = useState(false);
  const [resolvedStatus, setResolvedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (approvalData?.status && approvalData.status !== "pending") {
      setResolvedStatus(approvalData.status);
    }
  }, [approvalData]);

  const handleApprove = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await approveMutation({ approvalId });
      setResolvedStatus("approved");
      toast.success("Workflow approved and resumed");
    } catch (error) {
      toast.error("Failed to approve workflow");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await rejectMutation({ approvalId });
      setResolvedStatus("rejected");
      toast.success("Workflow rejected and terminated");
    } catch (error) {
      toast.error("Failed to reject workflow");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!approvalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading approval details...</p>
        </div>
      </div>
    );
  }

  if (approvalData.status === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-5">
        <div className="max-w-md w-full bg-card border rounded-2xl p-10 text-center shadow-xl">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Approval Not Found</h1>
          <p className="text-sm text-muted-foreground mb-8">
            This approval request may have expired or been deleted. Please check the workflow status.
          </p>
          <Link href="/dashboard">
            <Button className="w-full">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { approval } = approvalData;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5 selection:bg-primary/20">
      <div className="max-w-lg w-full relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-card/80 backdrop-blur-xl border rounded-3xl p-10 shadow-2xl overflow-hidden"
        >
          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            {resolvedStatus === 'approved' ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Approved</span>
              </div>
            ) : resolvedStatus === 'rejected' ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                <XCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Rejected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Action Required</span>
              </div>
            )}
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">Workflow Approval</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              A human decision is needed to continue the execution of this workflow.
            </p>
          </div>

          {/* Context Card */}
          <div className="bg-muted/50 rounded-2xl p-6 mb-10 border shadow-inner">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="text-left">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Request Message</span>
                <p className="text-sm font-medium text-foreground line-clamp-1">Context from Node {approval?.nodeId}</p>
              </div>
            </div>
            <div className="p-5 bg-background border rounded-xl">
              <p className="text-sm text-foreground italic leading-relaxed">
                "{approval?.message}"
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
              <Clock className="w-3 h-3" />
              <span>Created at {new Date(approval!.createdAt).toLocaleString()}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!resolvedStatus ? (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-4"
              >
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="h-14 rounded-xl font-bold hover:bg-destructive hover:text-destructive-foreground transition-all active:scale-95 border-border"
                >
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="h-14 rounded-xl font-bold shadow-lg transition-all active:scale-95"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isProcessing ? "Processing..." : "Approve & Resume"}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className={`p-6 rounded-2xl border ${resolvedStatus === 'approved' ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'
                  }`}>
                  <p className={`text-sm font-bold ${resolvedStatus === 'approved' ? 'text-green-700' : 'text-destructive'
                    }`}>
                    This request has been {resolvedStatus}.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    You can close this window now. The workflow has been notified.
                  </p>
                </div>
                <Link href="/dashboard" className="block mt-6">
                  <Button variant="secondary" className="w-full">Back to App</Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Brand Footer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-black">
            Powered by Intentflow Agentic Engine
          </p>
        </div>
      </div>
    </div>
  );
}
