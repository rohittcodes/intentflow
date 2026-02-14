import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Manage User Secrets (API Keys)
 */

// Get all secrets for a user (internal use mostly, or carefully exposed)
export const list = query({
  args: {
    userId: v.string(),
  },
  handler: async ({ db }, { userId }) => {
    // Return keys and values. In a real app, values should be decrypted.
    // For this implementation, we assume stored values are usable.
    const secrets = await db
      .query("secrets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Convert to map for easy lookup
    return secrets.reduce((acc, secret) => {
      acc[secret.key] = secret.value;
      return acc;
    }, {} as Record<string, string>);
  },
});

// Set a secret
export const set = mutation({
  args: {
    userId: v.string(),
    key: v.string(),
    value: v.string(),
  },
  handler: async ({ db }, { userId, key, value }) => {
    // Check if exists
    const existing = await db
      .query("secrets")
      .withIndex("by_key", (q) => q.eq("userId", userId).eq("key", key))
      .first();

    if (existing) {
      await db.patch(existing._id, { value, updatedAt: new Date().toISOString() });
    } else {
      await db.insert("secrets", {
        userId,
        key,
        value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  },
});
