import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertResourceLimit } from "./usage";

export const getProjects = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const createProject = mutation({
  args: {
    name: v.string(),
    workspaceId: v.id("workspaces"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Check resource limits and verify ownership
    await assertResourceLimit(ctx, args.workspaceId, "projects", identity.subject);

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      workspaceId: args.workspaceId,
      userId: identity.subject,
      description: args.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return projectId;
  },
});

export const deleteProject = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Note: In a production app, we'd also delete/archive 
    // all workflows and namespaces linked to this project.
    await ctx.db.delete(args.id);
  },
});
