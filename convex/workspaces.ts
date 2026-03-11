import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get all workspaces owned by the user
    const ownedWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    // Get all workspaces where the user is a member
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // Fetch the actual workspace records for those memberships
    const memberWorkspacePromises = memberships.map(m => ctx.db.get(m.workspaceId));
    const memberWorkspaces = (await Promise.all(memberWorkspacePromises)).filter(w => w !== null);

    // Merge and deduplicate by workspace ID
    const allWorkspaces = [...ownedWorkspaces];
    for (const w of memberWorkspaces) {
      if (!allWorkspaces.find(ow => ow?._id === w?._id)) {
        allWorkspaces.push(w!);
      }
    }

    return allWorkspaces;
  },
});

export const initializeDefaultWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const existingWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    // Only configure the default if none exist
    if (existingWorkspaces.length === 0) {
      const workspaceId = await ctx.db.insert("workspaces", {
        name: "Personal Workspace",
        userId: identity.subject,
        type: "personal",
        pricingTier: "free",
        description: "Your default, private workspace.",
        members: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await ctx.db.insert("workspaceMembers", {
        workspaceId,
        userId: identity.subject,
        role: "owner",
        joinedAt: new Date().toISOString(),
      });

      return workspaceId;
    }

    // Default to resolving the specific Personal explicitly if needed later
    const personal = existingWorkspaces.find(w => w.type === "personal");
    return personal?._id || existingWorkspaces[0]._id;
  },
});

export const createWorkspace = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      userId: identity.subject,
      type: "shared", // All manually created workspaces are team workspaces implicitly
      pricingTier: "free",
      description: args.description,
      members: [],
      icon: args.icon,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: identity.subject,
      role: "owner",
      joinedAt: new Date().toISOString(),
    });

    return workspaceId;
  },
});


export const updatePricingTier = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    tier: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    if (workspace.userId !== identity.subject) {
      throw new Error("Only the owner can manage the billing.");
    }

    await ctx.db.patch(args.workspaceId, {
      pricingTier: args.tier,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, tier: args.tier };
  },
});
