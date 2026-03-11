import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to check if a user is an admin or owner of a workspace
async function checkIsAdmin(ctx: any, workspaceId: Id<"workspaces">, userId: string) {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) throw new Error("Workspace not found");

  if (workspace.userId === userId) return true;

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q: any) => 
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .first();

  if (!membership) return false;
  return membership.role === "owner" || membership.role === "admin";
}

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Join with users table to get name, email, avatar
    const membersWithDetails = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", m.userId))
          .first();

        return {
          ...m,
          user: user || {
            name: "Unknown User",
            email: "unknown",
            imageUrl: "",
          },
        };
      })
    );

    return membersWithDetails;
  },
});

export const updateRole = mutation({
  args: {
    membershipId: v.id("workspaceMembers"),
    role: v.string(), // "owner" | "admin" | "editor" | "viewer"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Membership not found");

    const isAdmin = await checkIsAdmin(ctx, membership.workspaceId, identity.subject);
    if (!isAdmin) throw new Error("Unauthorized: Only admins can update roles");

    // Prevent changing the last owner's role
    if (membership.role === "owner" && args.role !== "owner") {
      const owners = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", membership.workspaceId))
        .filter((q) => q.eq(q.field("role"), "owner"))
        .collect();
      
      if (owners.length <= 1) {
        throw new Error("Cannot change role of the last owner");
      }
    }

    await ctx.db.patch(args.membershipId, { role: args.role });
    return { success: true };
  },
});

export const remove = mutation({
  args: {
    membershipId: v.id("workspaceMembers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Membership not found");

    const isAdmin = await checkIsAdmin(ctx, membership.workspaceId, identity.subject);
    
    // Users can remove themselves, but only admins can remove others
    if (!isAdmin && membership.userId !== identity.subject) {
      throw new Error("Unauthorized: Only admins can remove other members");
    }

    // Prevent removing the last owner
    if (membership.role === "owner") {
      const owners = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", membership.workspaceId))
        .filter((q) => q.eq(q.field("role"), "owner"))
        .collect();
      
      if (owners.length <= 1) {
        throw new Error("Cannot remove the last owner");
      }
    }

    await ctx.db.delete(args.membershipId);
    return { success: true };
  },
});
