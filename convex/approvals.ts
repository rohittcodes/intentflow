import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Convex Approvals - Human-in-the-loop workflow approvals
 *
 * Features:
 * - Real-time subscriptions (no polling needed!)
 * - Automatic reactivity when approval status changes
 * - Perfect for pausing workflows waiting for human input
 */

// Create a new approval request with ownership check
export const create = mutation({
  args: {
    approvalId: v.string(),
    workflowId: v.id("workflows"),
    nodeId: v.optional(v.string()),
    executionId: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(args.workflowId);

    if (!workflow || (workflow.userId && identity?.subject !== workflow.userId)) {
      throw new Error("Unauthorized");
    }

    const now = new Date().toISOString();

    const approvalDoc = await ctx.db.insert("approvals", {
      approvalId: args.approvalId,
      workflowId: args.workflowId,
      executionId: args.executionId,
      nodeId: args.nodeId,
      message: args.message,
      status: "pending",
      userId: identity?.subject,
      createdAt: now,
    });

    return approvalDoc;
  },
});

// Get approval by approvalId with ownership check
export const getByApprovalId = query({
  args: { approvalId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const approval = await ctx.db
      .query("approvals")
      .withIndex("by_approvalId", (q) => q.eq("approvalId", args.approvalId))
      .first();

    if (!approval || (approval.userId && identity?.subject !== approval.userId)) {
      return null;
    }

    return approval;
  },
});

// Watch approval status - REAL-TIME SUBSCRIPTION with ownership check
export const watchStatus = query({
  args: { approvalId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const approval = await ctx.db
      .query("approvals")
      .withIndex("by_approvalId", (q) => q.eq("approvalId", args.approvalId))
      .first();

    if (!approval || (approval.userId && identity?.subject !== approval.userId)) {
      return { status: "not_found", approval: null };
    }

    return {
      status: approval.status,
      approval,
    };
  },
});

// Approve an approval request with ownership check
export const approve = mutation({
  args: {
    approvalId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const approval = await ctx.db
      .query("approvals")
      .withIndex("by_approvalId", (q) => q.eq("approvalId", args.approvalId))
      .first();

    if (!approval || (approval.userId && identity?.subject !== approval.userId)) {
      throw new Error("Unauthorized");
    }

    if (approval.status !== "pending") {
      throw new Error(`Approval ${args.approvalId} already ${approval.status}`);
    }

    const now = new Date().toISOString();

    await ctx.db.patch(approval._id, {
      status: "approved",
      respondedAt: now,
      respondedBy: identity?.subject,
    });

    return { success: true, status: "approved" };
  },
});

// Reject an approval request with ownership check
export const reject = mutation({
  args: {
    approvalId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const approval = await ctx.db
      .query("approvals")
      .withIndex("by_approvalId", (q) => q.eq("approvalId", args.approvalId))
      .first();

    if (!approval || (approval.userId && identity?.subject !== approval.userId)) {
      throw new Error("Unauthorized");
    }

    if (approval.status !== "pending") {
      throw new Error(`Approval ${args.approvalId} already ${approval.status}`);
    }

    const now = new Date().toISOString();

    await ctx.db.patch(approval._id, {
      status: "rejected",
      respondedAt: now,
      respondedBy: identity?.subject,
    });

    return { success: true, status: "rejected", reason: args.reason };
  },
});

// List pending approvals for a workflow with ownership check
export const listPending = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(args.workflowId);

    if (!workflow || (workflow.userId && identity?.subject !== workflow.userId)) {
      return [];
    }

    const approvals = await ctx.db
      .query("approvals")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return approvals;
  },
});

// List all approvals for a workflow with ownership check
export const listByWorkflow = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(args.workflowId);

    if (!workflow || (workflow.userId && identity?.subject !== workflow.userId)) {
      return [];
    }

    const approvals = await ctx.db
      .query("approvals")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .order("desc")
      .collect();

    return approvals;
  },
});

// Get approvals for a specific execution with ownership check
export const getByExecution = query({
  args: { executionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // We could check the execution first, or filter approvals by userId
    const approvals = await ctx.db
      .query("approvals")
      .withIndex("by_execution", (q) => q.eq("executionId", args.executionId))
      .filter((q) => q.eq(q.field("userId"), identity?.subject))
      .order("desc")
      .collect();

    return approvals;
  },
});

// Clean up old approvals (approved/rejected older than 24 hours)
export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const oldApprovals = await ctx.db
      .query("approvals")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "pending"),
          q.lt(q.field("createdAt"), oneDayAgo)
        )
      )
      .collect();

    for (const approval of oldApprovals) {
      await ctx.db.delete(approval._id);
    }

    return { deleted: oldApprovals.length };
  },
});
