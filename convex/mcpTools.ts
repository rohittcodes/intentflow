import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * MCP Tools Management
 * Handles granular tool storage, search, and lazy-loading
 */

// List tools for a specific server with ownership check
export const listByServer = query({
  args: {
    serverId: v.id("mcpServers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const server = await ctx.db.get(args.serverId);

    if (!server || (server.userId && identity?.subject !== server.userId)) {
      return [];
    }

    return await ctx.db
      .query("mcpTools")
      .withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
      .collect();
  },
});

// Search tools using vector index (Semantic Discovery)
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("mcpTools")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("isSearchable"), true))
      .take(args.limit || 10);
  },
});

// Semantic Search Action (Placeholder for Embedding Generation)
export const semanticSearch = action({
  args: {
    queryText: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args: { queryText: string; limit?: number }): Promise<any[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.runQuery(api.mcpTools.search, {
      query: args.queryText,
      limit: args.limit,
    });
  },
});

// Update or Insert a tool (Upsert) with server ownership check
export const upsertTool = mutation({
  args: {
    serverId: v.id("mcpServers"),
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    schema: v.any(),
    category: v.optional(v.string()),
    isSearchable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const server = await ctx.db.get(args.serverId);

    // Verify server ownership
    if (!server || (server.userId && identity?.subject !== server.userId)) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("mcpTools")
      .withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    const toolData = {
      ...args,
      lastSynced: new Date().toISOString(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, toolData);
      return existing._id;
    } else {
      return await ctx.db.insert("mcpTools", toolData);
    }
  },
});

// Clear tools for a server (before re-sync) with server ownership check
export const clearServerTools = mutation({
  args: {
    serverId: v.id("mcpServers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const server = await ctx.db.get(args.serverId);

    if (!server || (server.userId && identity?.subject !== server.userId)) {
      throw new Error("Unauthorized");
    }

    const tools = await ctx.db
      .query("mcpTools")
      .withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
      .collect();

    for (const tool of tools) {
      await ctx.db.delete(tool._id);
    }
  },
});
