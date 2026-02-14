import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * List all connectors for a user
 */
export const listConnectors = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db
      .query("connectors")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * List connectors for a specific namespace
 */
export const listConnectorsByNamespace = query({
  args: {
    namespaceId: v.id("namespaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db
      .query("connectors")
      .withIndex("by_namespace", (q) => q.eq("namespaceId", args.namespaceId))
      .collect();
  },
});

/**
 * Create a new connector
 */
export const createConnector = mutation({
  args: {
    namespaceId: v.id("namespaces"),
    name: v.string(),
    type: v.string(),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const connectorId = await ctx.db.insert("connectors", {
      userId: identity.subject,
      namespaceId: args.namespaceId,
      name: args.name,
      type: args.type,
      config: args.config,
      status: "idle",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return connectorId;
  },
});

/**
 * Update a connector
 */
export const updateConnector = mutation({
  args: {
    id: v.id("connectors"),
    updates: v.object({
      name: v.optional(v.string()),
      config: v.optional(v.any()),
      status: v.optional(v.string()),
      lastSyncAt: v.optional(v.string()),
      lastError: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Connector not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: new Date().toISOString(),
    });

    return args.id;
  },
});

/**
 * Delete a connector
 */
export const deleteConnector = mutation({
  args: {
    id: v.id("connectors"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Connector not found or unauthorized");
    }

    await ctx.db.delete(args.id);
    return true;
  },
});
