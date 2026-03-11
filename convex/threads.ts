import { query } from "./_generated/server";
import { v } from "convex/values";

export const listThreads = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let userId = args.userId;
    if (!userId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return [];
      userId = identity.subject;
    }

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Map threads and resolve workflow names
    const result = [];
    for (const thread of threads) {
      let workflowName = "Standard Chat";
      if (thread.workflowId) {
        const workflow = await ctx.db.get(thread.workflowId);
        if (workflow) workflowName = workflow.name;
      }

      result.push({
        ...thread,
        workflowName
      });
    }

    return result;
  },
});

export const getThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    // In a real app, we'd check authorization here
    
    return thread;
  }
});
