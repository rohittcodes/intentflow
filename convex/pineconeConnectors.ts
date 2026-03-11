import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { encrypt, decrypt } from "./utils/crypto";

/**
 * Get the user's Pinecone connector configuration
 */
export const getPineconeConfig = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const connector = await ctx.db
      .query("connectors")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("type"), "pinecone"))
      .first();

    if (!connector) return null;

    // Do NOT return the decrypted API key to the client for security,
    // just let the client know it's configured and what the prefix/index name is.
    return {
      _id: connector._id,
      name: connector.name,
      indexName: connector.config.indexName,
      keyPrefix: connector.config.keyPrefix,
      status: connector.status,
      updatedAt: connector.updatedAt,
    };
  },
});

/**
 * INTERNAL USE ONLY: Get the user's Pinecone config WITH decrypted API key
 * This should NEVER be exposed to the client.
 */
export const getInternalPineconeConfig = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const connector = await ctx.db
      .query("connectors")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "pinecone"))
      .first();

    if (!connector || !connector.config.encryptedKey || !connector.config.indexName) {
      return null;
    }

    const decryptedKey = await decrypt(connector.config.encryptedKey, args.userId);

    return {
      apiKey: decryptedKey,
      indexName: connector.config.indexName,
    };
  },
});

/**
 * Upsert the user's Pinecone connector configuration
 */
export const upsertPineconeConfig = mutation({
  args: {
    apiKey: v.string(),
    indexName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const encryptedKey = await encrypt(args.apiKey.trim(), identity.subject);
    const keyPrefix = args.apiKey.trim().slice(0, 8) + '...';

    const existing = await ctx.db
      .query("connectors")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("type"), "pinecone"))
      .first();

    const configPayload = {
      encryptedKey,
      keyPrefix,
      indexName: args.indexName.trim(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        config: configPayload,
        status: "active",
        updatedAt: new Date().toISOString(),
      });
      return existing._id;
    } else {
      const connectorId = await ctx.db.insert("connectors", {
        userId: identity.subject,
        name: "Pinecone Vector DB",
        type: "pinecone",
        config: configPayload,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return connectorId;
    }
  },
});

/**
 * Delete the Pinecone connector
 */
export const deletePineconeConfig = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("connectors")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("type"), "pinecone"))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    
    return true;
  },
});
