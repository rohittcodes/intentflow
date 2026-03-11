import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Helper to check admin status
async function checkIsAdmin(ctx: any, workspaceId: Id<"workspaces">, userId: string) {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) return false;
  
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

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    role: v.string(),
    email: v.optional(v.string()), // Optional targeted email
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const isAdmin = await checkIsAdmin(ctx, args.workspaceId, identity.subject);
    if (!isAdmin) throw new Error("Unauthorized: Only admins can invite members");

    // Generate a secure random token
    const token = crypto.randomUUID().replace(/-/g, "");

    const inviteId = await ctx.db.insert("workspaceInvites", {
      workspaceId: args.workspaceId,
      inviterId: identity.subject,
      email: args.email,
      role: args.role,
      token,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Send email using Resend action if email target provided
    if (args.email) {
      const workspace = await ctx.db.get(args.workspaceId);
      
      let inviterName = identity.name || "A team member";
      // We could try looking up the user to get their name from `users` table instead
      const userDoc = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
      if (userDoc?.name) inviterName = userDoc.name;
        
      try {
        // Construct the invite URL based on the current origin or a default
        // For local dev we use localhost, in prod you'd want this from an ENV var
        const hostUrl = process.env.HOST_URL || "http://localhost:3000";
        const inviteUrl = `${hostUrl}/invite/${token}`;

        await ctx.scheduler.runAfter(0, api.emails.sendWorkspaceInvite, {
          workspaceName: workspace?.name || "a workspace",
          inviterName,
          inviteUrl,
          toEmail: args.email,
        });
      } catch (err) {
        console.error("Failed to schedule invite email", err);
      }
    }

    return { token, inviteId };
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // This can be called anonymously since they might not be logged in yet
    const invite = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) return null;

    const workspace = await ctx.db.get(invite.workspaceId);
    if (!workspace) return null;

    return {
      invite,
      workspace: {
        name: workspace.name,
        icon: workspace.icon,
      },
    };
  },
});

export const accept = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const invite = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") throw new Error(`Invite is already ${invite.status}`);

    // Check if user is already a member
    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", invite.workspaceId).eq("userId", identity.subject)
      )
      .first();

    if (existing) throw new Error("You are already a member of this workspace");

    // Add to workspaceMembers
    await ctx.db.insert("workspaceMembers", {
      workspaceId: invite.workspaceId,
      userId: identity.subject,
      role: invite.role,
      joinedAt: new Date().toISOString(),
    });

    // Mark invite as accepted
    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedBy: identity.subject,
      acceptedAt: new Date().toISOString(),
    });

    return { workspaceId: invite.workspaceId };
  },
});

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const isAdmin = await checkIsAdmin(ctx, args.workspaceId, identity.subject);
    if (!isAdmin) throw new Error("Unauthorized");

    const invites = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return invites;
  },
});

export const revoke = mutation({
  args: { inviteId: v.id("workspaceInvites") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    const isAdmin = await checkIsAdmin(ctx, invite.workspaceId, identity.subject);
    if (!isAdmin) throw new Error("Unauthorized");

    await ctx.db.patch(args.inviteId, { status: "revoked" });
    return { success: true };
  },
});
