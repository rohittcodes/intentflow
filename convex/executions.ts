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
  },
  handler: async ({ db }, { workflowId, input, threadId }) => {
    const executionId = await db.insert("executions", {
      workflowId,
      status: "running",
      input,
      threadId,
      nodeResults: {},
      variables: {},
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
    output: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async ({ db }, { id, ...updates }) => {
    await db.patch(id, updates);
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
  handler: async ({ db }, { id, output, error }) => {
    await db.patch(id, {
      status: error ? "failed" : "completed",
      output,
      error,
      completedAt: new Date().toISOString(),
    });
    return id;
  },
});

// Get execution by ID
export const getExecution = query({
  args: { id: v.id("executions") },
  handler: async ({ db }, { id }) => {
    const execution = await db.get(id);
    return execution;
  },
});

// Get executions for a workflow
export const getWorkflowExecutions = query({
  args: { workflowId: v.id("workflows") },
  handler: async ({ db }, { workflowId }) => {
    const executions = await db
      .query("executions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", workflowId))
      .order("desc")
      .collect();
    return executions;
  },
});

/**
 * Watch execution in real-time
 * This query is reactive and will automatically update when the execution changes
 */
export const watchExecution = query({
  args: { executionId: v.id("executions") },
  handler: async ({ db }, { executionId }) => {
    const execution = await db.get(executionId);

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

/**
 * Watch latest execution for a workflow
 */
export const watchLatestExecution = query({
  args: { workflowId: v.id("workflows") },
  handler: async ({ db }, { workflowId }) => {
    const execution = await db
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

