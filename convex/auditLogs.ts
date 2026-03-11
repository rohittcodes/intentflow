import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

export const listLogs = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const { workspaceId, limit = 50 } = args;

    const logs = workspaceId
      ? await ctx.db
          .query("auditLogs")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("auditLogs")
          .order("desc")
          .take(limit);

    return logs;
  },
});

export const logAction = internalMutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    userId: v.optional(v.string()),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});
