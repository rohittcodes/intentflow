/**
 * Convex functions for managing user LLM API keys
 * Keys are encrypted and stored per-user
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

import { encrypt, decrypt } from "./utils/crypto";

const maskKey = (key: string): string => {
  if (key.length < 8) return '••••••••';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
};

/**
 * Get all LLM keys for the authenticated user
 */
export const getUserLLMKeys = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const keys = await ctx.db
      .query("userLLMKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Don't return the actual encrypted keys, just metadata
    return keys.map(key => ({
      _id: key._id,
      provider: key.provider,
      keyPrefix: key.keyPrefix,
      label: key.label,
      isActive: key.isActive,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
    }));
  },
});

/**
 * Get active key for a specific provider for the authenticated user
 */
export const getActiveKey = query({
  args: {
    provider: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId = args.userId;
    if (!userId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;
      userId = identity.subject;
    }

    const key = await ctx.db
      .query("userLLMKeys")
      .withIndex("by_userProvider", (q) =>
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!key) return null;

    // Decrypt key with per-user salt
    let decryptedKey: string;
    try {
      decryptedKey = await decrypt(key.encryptedKey, userId);
    } catch (error) {
      console.error(`Failed to decrypt key for provider ${args.provider}:`, error);
      // If decryption fails, the key might be in an old format or used a different salt
      return null;
    }

    // Return decrypted key for use
    return {
      _id: key._id,
      provider: key.provider,
      apiKey: decryptedKey,
      label: key.label,
    };
  },
});

/**
 * Add or update a user's LLM API key
 */
export const upsertLLMKey = mutation({
  args: {
    provider: v.string(),
    apiKey: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Encrypt the key with user-specific salt
    const encryptedKey = await encrypt(args.apiKey, userId);
    const keyPrefix = maskKey(args.apiKey);
    const now = new Date().toISOString();

    // Check if user already has a key for this provider
    const existingKey = await ctx.db
      .query("userLLMKeys")
      .withIndex("by_userProvider", (q) =>
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .first();

    if (existingKey) {
      // Update existing key
      await ctx.db.patch(existingKey._id, {
        encryptedKey,
        keyPrefix,
        label: args.label || existingKey.label,
        isActive: true,
        updatedAt: now,
      });

      // Deactivate other keys for this provider
      const otherKeys = await ctx.db
        .query("userLLMKeys")
        .withIndex("by_userProvider", (q) =>
          q.eq("userId", userId!).eq("provider", args.provider)
        )
        .collect();

      for (const k of otherKeys) {
        if (k._id !== existingKey._id && k.isActive) {
          await ctx.db.patch(k._id, { isActive: false });
        }
      }

      await ctx.db.insert("auditLogs", {
        userId: userId!,
        action: "key.updated",
        resourceType: "userLLMKey",
        resourceId: existingKey._id,
        metadata: { provider: args.provider },
        createdAt: now,
      });

      return existingKey._id;
    } else {
      // Create new key
      const id = await ctx.db.insert("userLLMKeys", {
        userId: userId!,
        provider: args.provider,
        encryptedKey,
        keyPrefix,
        label: args.label,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
      });

      await ctx.db.insert("auditLogs", {
        userId: userId!,
        action: "key.created",
        resourceType: "userLLMKey",
        resourceId: id,
        metadata: { provider: args.provider },
        createdAt: now,
      });

      return id;
    }
  },
});

export const deleteLLMKey = mutation({
  args: {
    id: v.id("userLLMKeys"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const key = await ctx.db.get(args.id);
    if (!key || key.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("auditLogs", {
      userId,
      action: "key.deleted",
      resourceType: "userLLMKey",
      resourceId: args.id,
      metadata: { provider: key.provider },
      createdAt: new Date().toISOString(),
    });
  },
});

/**
 * Toggle active state of a key with ownership check
 */
export const toggleKeyActive = mutation({
  args: {
    id: v.id("userLLMKeys"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const key = await ctx.db.get(args.id);
    if (!key || key.userId !== userId) throw new Error("Unauthorized");

    const now = new Date().toISOString();

    // If activating this key, deactivate others for same provider
    if (!key.isActive) {
      const otherKeys = await ctx.db
        .query("userLLMKeys")
        .withIndex("by_userProvider", (q) =>
          q.eq("userId", userId).eq("provider", key.provider)
        )
        .collect();

      for (const otherKey of otherKeys) {
        if (otherKey._id !== args.id && otherKey.isActive) {
          await ctx.db.patch(otherKey._id, {
            isActive: false,
            updatedAt: now,
          });
        }
      }
    }

    await ctx.db.patch(args.id, {
      isActive: !key.isActive,
      updatedAt: now,
    });
  },
});

export const updateKeyUsage = mutation({
  args: {
    provider: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId = args.userId;
    if (!userId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return;
      userId = identity.subject;
    }

    const key = await ctx.db
      .query("userLLMKeys")
      .withIndex("by_userProvider", (q) =>
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (key) {
      const now = new Date().toISOString();
      await ctx.db.patch(key._id, {
        lastUsedAt: now,
        usageCount: (key.usageCount || 0) + 1,
      });
    }
  },
});
