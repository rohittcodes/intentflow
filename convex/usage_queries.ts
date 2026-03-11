import { query } from "./_generated/server";
import { v } from "convex/values";
import { TIER_LIMITS, TIER_RESOURCE_LIMITS } from "./usage";

export const getUserUsage = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let userId = args.userId;
    if (!userId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;
      userId = identity.subject;
    }

    // 1. Get usage from userUsage table
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // 2. Count active resources
    const projectsCount = (await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()).length;

    const workflowsCount = (await ctx.db
      .query("workflows")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect()).length;

    const kbCount = (await ctx.db
      .query("namespaces")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()).length;

    const tier = usage?.tier || "free";
    const limits = TIER_RESOURCE_LIMITS[tier as keyof typeof TIER_RESOURCE_LIMITS] || TIER_RESOURCE_LIMITS.free;
    const execLimit = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

    return {
      tier,
      periodStart: usage?.periodStart || new Date().toISOString(),
      executions: {
        current: usage?.executionsCount || 0,
        limit: execLimit,
        percentage: Math.min(100, Math.round(((usage?.executionsCount || 0) / execLimit) * 100))
      },
      resources: [
        {
          name: "Projects",
          current: projectsCount,
          limit: limits.projects,
          percentage: Math.min(100, Math.round((projectsCount / limits.projects) * 100))
        },
        {
          name: "Workflows",
          current: workflowsCount,
          limit: limits.workflows,
          percentage: Math.min(100, Math.round((workflowsCount / limits.workflows) * 100))
        },
        {
          name: "Knowledge Bases",
          current: kbCount,
          limit: limits.knowledgeBases,
          percentage: Math.min(100, Math.round((kbCount / limits.knowledgeBases) * 100))
        }
      ],
      billing: {
        totalRuntime: usage?.totalRuntimeSeconds || 0,
        totalExecutions: usage?.totalExecutions || 0,
      }
    };
  }
});
