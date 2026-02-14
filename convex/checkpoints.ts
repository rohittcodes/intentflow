import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getCheckpoint = query({
  args: {
    threadId: v.string(),
    checkpointId: v.optional(v.string()),
  },
  handler: async (ctx, { threadId, checkpointId }) => {
    if (checkpointId) {
      return await ctx.db
        .query("checkpoints")
        .withIndex("by_thread_and_checkpoint", (q) =>
          q.eq("threadId", threadId).eq("checkpoint_id", checkpointId)
        )
        .first();
    }

    // Get latest
    return await ctx.db
      .query("checkpoints")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .order("desc")
      .first();
  },
});

export const listCheckpoints = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
    beforeId: v.optional(v.string()),
  },
  handler: async (ctx, { threadId, limit, beforeId }) => {
    // TODO: support pagination with beforeId using cursor if needed
    // For now simple list
    return await ctx.db
      .query("checkpoints")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .order("desc")
      .take(limit || 10);
  },
});

export const saveCheckpoint = mutation({
  args: {
    threadId: v.string(),
    checkpointId: v.string(),
    checkpoint: v.any(),
    metadata: v.optional(v.any()),
    parentCheckpointId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { threadId, checkpointId, checkpoint, metadata, parentCheckpointId } = args;

    // 1. Save Checkpoint
    await ctx.db.insert("checkpoints", {
      threadId,
      checkpoint_id: checkpointId,
      checkpoint,
      metadata,
      parent_checkpoint_id: parentCheckpointId,
      createdAt: new Date().toISOString(),
    });

    // 2. Sync Thread Metadata (Upsert)
    // We assume the caller (LangGraph) might have some user context, 
    // but here we might not know userId if it's a backend run.
    // However, usually threadId is associated with a user or session.
    // If thread exists, update it. If not, we might need userId to create it.
    // For now, only update if exists. Creating threads should be done explicitly or via a separate flow.
    // BUT: If a thread starts via Webhook, it might not have an entry in `threads` table yet.
    // We should allow implicit creation? But we don't have userId.
    // So we'll update if found.

    // Check if thread exists in `threads` table (created by UI or API)
    // Since `threads.threadId` is not defined in schema (we use `_id` usually), 
    // we should have an index on `threadId`? 
    // Wait, `threads` table definition in schema:
    // userId, workflowId, title...
    // It doesn't have a custom `threadId` field?
    // Convex ID is the threadId?
    // LangGraph uses generic string threadId.
    // If LangGraph uses Convex ID as threadId, fine.
    // If not (e.g. UUID), we need to store it.
    // CHECK SCHEMA: `threads` table does NOT have `threadId` field.
    // This suggests we expect `threadId` to BE the `threads._id`.

    // Let's verify if `threadId` is a valid Convex ID.
    // If it is, we patch.

    // 2. Sync Thread Metadata (Upsert)

    // First, try to find thread by ID (if strictly a Convex ID)
    let threadIdToUpdate = ctx.db.normalizeId("threads", threadId);

    // If not a valid Convex ID, try to find by external threadId
    if (!threadIdToUpdate) {
      const existingThread = await ctx.db
        .query("threads")
        .withIndex("by_extThreadId", (q) => q.eq("extThreadId", threadId))
        .first();

      if (existingThread) {
        threadIdToUpdate = existingThread._id;
      }
    }

    if (threadIdToUpdate) {
      await ctx.db.patch(threadIdToUpdate, {
        updatedAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
      });
    }
  },
});
