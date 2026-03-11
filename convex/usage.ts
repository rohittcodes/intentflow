import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const TIER_LIMITS = {
  free: 50,
  pro: 1000,
  enterprise: 999999,
};

export const TIER_RESOURCE_LIMITS = {
  free: { projects: 3, workflows: 5, knowledgeBases: 2 },
  pro: { projects: 20, workflows: 50, knowledgeBases: 10 },
  enterprise: { projects: 999, workflows: 999, knowledgeBases: 999 },
};

/**
 * Get or create usage stats for a user
 */
export const getOrCreateUsage = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userUsage")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Check if period needs reset (e.g. > 30 days)
      const periodStart = new Date(existing.periodStart);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (periodStart < thirtyDaysAgo) {
        const id = existing._id;
        await ctx.db.patch(id, {
          executionsCount: 0,
          periodStart: new Date().toISOString(),
        });
        const updated = await ctx.db.get(id);
        return updated;
      }
      return existing;
    }

    const usageId = await ctx.db.insert("userUsage", {
      userId: args.userId,
      executionsCount: 0,
      totalExecutions: 0,
      totalRuntimeSeconds: 0,
      tier: "free",
      periodStart: new Date().toISOString(),
      lastExecutionAt: new Date().toISOString(),
    });

    const created = await ctx.db.get(usageId);
    return created;
  },
});

/**
 * Check if a workspace has reached its resource limits
 */
export const checkWorkspaceLimit = query({
  args: {
    workspaceId: v.id("workspaces"),
    resourceType: v.union(v.literal("projects"), v.literal("workflows"), v.literal("knowledgeBases")),
    projectId: v.optional(v.id("projects"))
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return { allowed: false, current: 0, limit: 0 };

    const tier = workspace.pricingTier || "free";
    const limits = TIER_RESOURCE_LIMITS[tier as keyof typeof TIER_RESOURCE_LIMITS] || TIER_RESOURCE_LIMITS.free;

    let current = 0;
    let limit = 0;

    if (args.resourceType === "projects") {
      const count = (await ctx.db
        .query("projects")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect()).length;
      current = count;
      limit = limits.projects;
    } else if (args.resourceType === "workflows" && args.projectId) {
      const count = (await ctx.db
        .query("workflows")
        .filter((q) => q.eq(q.field("projectId"), args.projectId))
        .collect()).length;
      current = count;
      limit = limits.workflows;
    } else if (args.resourceType === "knowledgeBases" && args.projectId) {
      const count = (await ctx.db
        .query("namespaces")
        .filter((q) => q.eq(q.field("projectId"), args.projectId))
        .collect()).length;
      current = count;
      limit = limits.knowledgeBases;
    } else {
      return { allowed: true, current: 0, limit: 999 };
    }

    return {
      allowed: current < limit,
      current,
      limit,
      tier
    };
  },
});

/**
 * Check if a user has reached their execution limit
 */
export const checkUsageLimit = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!usage) {
      return {
        allowed: true,
        current: 0,
        limit: TIER_LIMITS.free,
        tier: "free"
      };
    }

    const limit = TIER_LIMITS[usage.tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

    return {
      allowed: usage.executionsCount < limit,
      current: usage.executionsCount,
      limit,
      tier: usage.tier,
      totalExecutions: usage.totalExecutions,
      totalRuntimeSeconds: usage.totalRuntimeSeconds,
    };
  },
});

/**
 * Increment execution count
 */
export const incrementUsage = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!usage) {
      // If none exists, create it and increment
      const id = await ctx.db.insert("userUsage", {
        userId: args.userId,
        executionsCount: 1,
        totalExecutions: 1,
        totalRuntimeSeconds: 0,
        tier: "free",
        periodStart: new Date().toISOString(),
        lastExecutionAt: new Date().toISOString(),
      });
      return id;
    }

    await ctx.db.patch(usage._id, {
      executionsCount: usage.executionsCount + 1,
      totalExecutions: usage.totalExecutions + 1,
      lastExecutionAt: new Date().toISOString(),
    });

    return usage._id;
  },
});

/**
 * Update runtime statistics
 */
export const updateRuntime = mutation({
  args: {
    userId: v.string(),
    runtimeSeconds: v.number()
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!usage) return;

    await ctx.db.patch(usage._id, {
      totalRuntimeSeconds: usage.totalRuntimeSeconds + args.runtimeSeconds,
    });
  },
});

/**
 * Helper for mutations to enforce resource limits and verify ownership
 */
export async function assertResourceLimit(
  ctx: any,
  workspaceId: Id<"workspaces">,
  resourceType: "projects" | "workflows" | "knowledgeBases",
  userId: string,
  projectId?: Id<"projects">
) {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) throw new Error("Workspace not found");

  // SECURITY: Verify workspace ownership
  if (workspace.userId !== userId) {
    throw new Error("Unauthorized: You do not own this workspace");
  }

  const tier = workspace.pricingTier || "free";
  const limits = TIER_RESOURCE_LIMITS[tier as keyof typeof TIER_RESOURCE_LIMITS] || TIER_RESOURCE_LIMITS.free;

  if (resourceType === "projects") {
    const count = (await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", workspaceId))
      .collect()).length;
    if (count >= limits.projects) {
      throw new Error(`Project limit reached for ${tier} tier (${limits.projects}). Upgrade for more.`);
    }
  } else if (resourceType === "workflows" && projectId) {
    // SECURITY: Verify project ownership/workspace association
    const project = await ctx.db.get(projectId);
    if (!project || project.workspaceId !== workspaceId) {
      throw new Error("Unauthorized: Project does not belong to this workspace");
    }

    const count = (await ctx.db
      .query("workflows")
      .filter((q: any) => q.eq(q.field("projectId"), projectId))
      .collect()).length;
    if (count >= limits.workflows) {
      throw new Error(`Workflow limit reached for ${tier} tier (${limits.workflows}). Upgrade for more.`);
    }
  } else if (resourceType === "knowledgeBases" && projectId) {
    // SECURITY: Verify project ownership/workspace association
    const project = await ctx.db.get(projectId);
    if (!project || project.workspaceId !== workspaceId) {
      throw new Error("Unauthorized: Project does not belong to this workspace");
    }

    const count = (await ctx.db
      .query("namespaces")
      .filter((q: any) => q.eq(q.field("projectId"), projectId))
      .collect()).length;
    if (count >= limits.knowledgeBases) {
      throw new Error(`Knowledge Base limit reached for ${tier} tier (${limits.knowledgeBases}). Upgrade for more.`);
    }
  }
}
