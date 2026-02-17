"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle2, XCircle, Clock, AlertCircle, ShieldCheck, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Button from "@/components/shared/button/Button";
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
      <div className="min-h-screen flex items-center justify-center bg-background-base">
        <div className="flex flex-col items-center gap-16">
          <div className="w-48 h-48 border-4 border-heat-100 border-t-transparent rounded-full animate-spin" />
          <p className="text-body-medium text-black-alpha-48 font-medium">Loading approval details...</p>
        </div>
      </div>
    );
  }

  if (approvalData.status === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-base p-20">
        <div className="max-w-400 w-full bg-accent-white border border-border-faint rounded-24 p-40 text-center shadow-xl">
          <div className="w-64 h-64 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-24">
            <AlertCircle className="w-32 h-32" />
          </div>
          <h1 className="text-display-small text-accent-black mb-12">Approval Not Found</h1>
          <p className="text-body-medium text-black-alpha-48 mb-32">
            This approval request may have expired or been deleted. Please check the workflow status.
          </p>
          <Link href="/app">
            <Button variant="primary" className="w-full">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { approval } = approvalData;

  return (
    <div className="min-h-screen bg-background-base flex items-center justify-center p-20 font-sans selection:bg-heat-100/30">
      <div className="max-w-500 w-full relative">
        {/* Background Gradients */}
        <div className="absolute -top-100 -left-100 w-300 h-300 bg-heat-100/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-100 -right-100 w-300 h-300 bg-blue-500/10 blur-[100px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-accent-white/80 backdrop-blur-2xl border border-border-faint rounded-32 p-40 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] overflow-hidden"
        >
          {/* Status Badge */}
          <div className="flex justify-center mb-32">
            {resolvedStatus === 'approved' ? (
              <div className="flex items-center gap-8 px-16 py-8 rounded-full bg-green-50 text-green-600 border border-green-100">
                <CheckCircle2 className="w-16 h-16" />
                <span className="text-xs font-bold uppercase tracking-wider">Approved</span>
              </div>
            ) : resolvedStatus === 'rejected' ? (
              <div className="flex items-center gap-8 px-16 py-8 rounded-full bg-red-50 text-red-600 border border-red-100">
                <XCircle className="w-16 h-16" />
                <span className="text-xs font-bold uppercase tracking-wider">Rejected</span>
              </div>
            ) : (
              <div className="flex items-center gap-8 px-16 py-8 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                <Clock className="w-16 h-16" />
                <span className="text-xs font-bold uppercase tracking-wider">Action Required</span>
              </div>
            )}
          </div>

          <div className="text-center mb-40">
            <h1 className="text-display-small text-accent-black mb-12 tracking-tight">Workflow Approval</h1>
            <p className="text-body-medium text-black-alpha-48 max-w-320 mx-auto">
              A human decision is needed to continue the execution of this workflow.
            </p>
          </div>

          {/* Context Card */}
          <div className="bg-background-base rounded-24 p-24 mb-40 border border-border-faint shadow-inner">
            <div className="flex items-center gap-12 mb-16">
              <div className="w-32 h-32 rounded-10 bg-accent-black flex items-center justify-center">
                <ShieldCheck className="w-18 h-18 text-white" />
              </div>
              <div className="text-left">
                <span className="text-[10px] uppercase tracking-widest text-black-alpha-40 font-bold">Request Message</span>
                <p className="text-label-medium text-accent-black line-clamp-1">Context from Node {approval?.nodeId}</p>
              </div>
            </div>
            <div className="p-20 bg-accent-white border border-border-faint rounded-16">
              <p className="text-body-medium text-accent-black italic leading-relaxed">
                "{approval?.message}"
              </p>
            </div>
            <div className="mt-20 flex items-center gap-8 text-[11px] text-black-alpha-40 font-medium">
              <Clock className="w-12 h-12" />
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
                className="grid grid-cols-2 gap-16"
              >
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="group relative h-56 rounded-20 bg-background-base border border-border-faint text-accent-black text-label-medium font-bold hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className="relative z-10">Reject</span>
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="group relative h-56 rounded-20 bg-heat-100 text-white text-label-medium font-bold hover:bg-heat-200 shadow-[0_8px_24px_rgba(250,93,25,0.25)] hover:shadow-[0_12px_32px_rgba(250,93,25,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-8">
                    {isProcessing ? "Processing..." : "Approve & Resume"}
                    <ChevronRight className="w-16 h-16 group-hover:translate-x-4 transition-transform" />
                  </span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className={`p-24 rounded-24 border ${resolvedStatus === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                  <p className={`text-label-medium font-bold ${resolvedStatus === 'approved' ? 'text-green-700' : 'text-red-700'
                    }`}>
                    This request has been {resolvedStatus}.
                  </p>
                  <p className="text-body-small text-black-alpha-48 mt-8">
                    You can close this window now. The workflow has been notified.
                  </p>
                </div>
                <Link href="/app">
                  <Button variant="secondary" className="mt-24 w-full">Back to App</Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Brand Footer */}
        <div className="mt-32 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-black-alpha-32 font-black">
            Powered by Intentflow Agentic Engine
          </p>
        </div>
      </div>
    </div>
  );
}
