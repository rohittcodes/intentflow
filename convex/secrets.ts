import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { encrypt, decrypt } from "./utils/crypto";

/**
 * Manage User Secrets (API Keys)
 */

// Get all secrets for the authenticated user
export const list = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId = args.userId;

    if (!userId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Unauthorized");
      userId = identity.subject;
    } else {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity || identity.subject !== userId) {
        throw new Error("Unauthorized");
      }
    }

    const secretsResult = await ctx.db
      .query("secrets")
      .withIndex("by_userId", (q) => q.eq("userId", userId!))
      .collect();

    // Convert to map for easy lookup with decryption
    const decryptedSecrets: Record<string, string> = {};
    for (const secret of secretsResult) {
      try {
        decryptedSecrets[secret.key] = await decrypt(secret.value, userId!);
      } catch (error) {
        console.error(`Failed to decrypt secret ${secret.key}:`, error);
      }
    }
    return decryptedSecrets;
  },
});

// Set a secret
export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, { key, value }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;
    // Assuming userId is used as the salt for encryption
    const encryptedValue = await encrypt(value, userId);

    // Check if exists
    const existing = await ctx.db
      .query("secrets")
      .withIndex("by_key", (q) => q.eq("userId", userId).eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: encryptedValue,
        updatedAt: new Date().toISOString()
      });
    } else {
      await ctx.db.insert("secrets", {
        userId,
        key,
        value: encryptedValue,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  },
});
