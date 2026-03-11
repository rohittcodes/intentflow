import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Workflow Execution State Management
 */

// Create execution record
export const createExecution = mutation({
  args: {
    workflowId: v.id("workflows"),
    input: v.optional(v.any()),
    threadId: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    maxRuntimeSeconds: v.optional(v.number()),
  },
  handler: async (ctx, { workflowId, input, threadId, maxTokens, maxRuntimeSeconds }) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(workflowId);

    if (!workflow || (workflow.userId && identity?.subject !== workflow.userId)) {
      throw new Error("Unauthorized");
    }

    const executionId = await ctx.db.insert("executions", {
      workflowId,
      userId: identity?.subject,
      status: "running",
      input,
      threadId,
      nodeResults: {},
      variables: {},
      maxTokens,
      maxRuntimeSeconds,
      cumulativeUsage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      startedAt: new Date().toISOString(),
    });
    return executionId;
  },
});

// Update execution state
export const updateExecution = mutation({
  args: {
    id: v.id("executions"),
    status: v.optional(v.string()),
    currentNodeId: v.optional(v.string()),
    nodeResults: v.optional(v.any()),
    variables: v.optional(v.any()),
    cumulativeUsage: v.optional(v.any()),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    isSuspended: v.optional(v.boolean()),
    suspendedAt: v.optional(v.string()),
    waitingOn: v.optional(v.any()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    const execution = await ctx.db.get(id);

    if (!execution || (execution.userId && identity?.subject !== execution.userId)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

// Complete execution
export const completeExecution = mutation({
  args: {
    id: v.id("executions"),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, output, error }) => {
    const identity = await ctx.auth.getUserIdentity();
    const execution = await ctx.db.get(id);

    if (!execution || (execution.userId && identity?.subject !== execution.userId)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(id, {
      status: error ? "failed" : "completed",
      output,
      error,
      completedAt: new Date().toISOString(),
    });
    return id;
  },
});

// Resume execution (reset failed/suspended to running)
export const resumeExecution = mutation({
  args: { id: v.id("executions") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const execution = await ctx.db.get(id);

    if (!execution || (execution.userId && identity?.subject !== execution.userId)) {
      throw new Error("Unauthorized");
    }

    if (execution.status !== "failed" && execution.status !== "suspended") {
      // If it's already running or completed, don't reset timestamps
      if (execution.status === "completed") {
        throw new Error("Cannot resume a completed execution");
      }
    }

    await ctx.db.patch(id, {
      status: "running",
      error: undefined,
      completedAt: undefined,
    });

    return {
      workflowId: execution.workflowId,
      threadId: execution.threadId,
    };
  },
});

// Get execution by ID with ownership check
export const getExecution = query({
  args: { id: v.id("executions") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const execution = await ctx.db.get(id);

    if (!execution || (execution.userId && identity?.subject !== execution.userId)) {
      return null;
    }

    return execution;
  },
});

// Get executions for a workflow with ownership check
export const getWorkflowExecutions = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, { workflowId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(workflowId);

    if (!workflow || (workflow.userId && identity?.subject !== workflow.userId)) {
      return [];
    }

    const executions = await ctx.db
      .query("executions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", workflowId))
      .order("desc")
      .collect();
    return executions;
  },
});

/**
 * Watch execution in real-time with ownership check
 */
export const watchExecution = query({
  args: { executionId: v.id("executions") },
  handler: async (ctx, { executionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const execution = await ctx.db.get(executionId);

    if (!execution || (execution.userId && identity?.subject !== execution.userId)) {
      return null;
    }

    return {
      id: execution._id,
      workflowId: execution.workflowId,
      status: execution.status,
      currentNodeId: execution.currentNodeId,
      nodeResults: execution.nodeResults || {},
      variables: execution.variables || {},
      input: execution.input,
      output: execution.output,
      error: execution.error,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      threadId: execution.threadId,
    };
  },
});

/**
 * Watch latest execution for a workflow with ownership check
 */
export const watchLatestExecution = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, { workflowId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(workflowId);

    if (!workflow || (workflow.userId && identity?.subject !== workflow.userId)) {
      return null;
    }

    const execution = await ctx.db
      .query("executions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", workflowId))
      .order("desc")
      .first();

    if (!execution) {
      return null;
    }

    return {
      id: execution._id,
      workflowId: execution.workflowId,
      status: execution.status,
      currentNodeId: execution.currentNodeId,
      nodeResults: execution.nodeResults || {},
      variables: execution.variables || {},
      input: execution.input,
      output: execution.output,
      error: execution.error,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      threadId: execution.threadId,
    };
  },
});

