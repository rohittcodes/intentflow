import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * API Key Management for Secure Workflow API Access
 */

// Generate secure random token using Web Crypto API
function generateSecureToken(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, length);
}

// Secure hash function using Web Crypto API (supported by Convex)
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `v2:${hashHex}`;
}

// Legacy hash function for backward compatibility
function legacyHashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(36) + '_' + key.length;
}

// Generate new API key
export const generate = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Generate secure key
    const key = `sk_live_${generateSecureToken(32)}`;
    const keyHash = await hashKey(key);
    const keyPrefix = key.substring(0, 15) + "...";

    const apiKeyId = await ctx.db.insert("apiKeys", {
      key: keyHash,
      keyPrefix,
      userId: identity.subject,
      name: args.name,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    });

    // Return plain key ONCE (never shown again!)
    return {
      id: apiKeyId,
      key, // Only time user sees this!
      keyPrefix,
      name: args.name,
    };
  },
});

// List user's API keys (without actual key values)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("revokedAt"), undefined))
      .order("desc")
      .collect();
  },
});

// Revoke API key
export const revoke = mutation({
  args: { id: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const apiKey = await ctx.db.get(args.id);
    if (!apiKey) {
      throw new Error("API key not found");
    }

    if (apiKey.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      revokedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Verify API key (called by middleware)
export const verify = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    // Try v2 hash first
    const v2Hash = await hashKey(args.key);
    let apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", v2Hash))
      .first();

    // Fallback to legacy hash if not found
    if (!apiKey) {
      const v1Hash = legacyHashKey(args.key);
      apiKey = await ctx.db
        .query("apiKeys")
        .withIndex("by_key", (q) => q.eq("key", v1Hash))
        .first();

      // Auto-migrate to v2 if legacy key is found
      if (apiKey) {
        console.log(`Migrating legacy API key ${apiKey._id} to v2 hash`);
        await ctx.db.patch(apiKey._id, {
          key: v2Hash,
        });
      }
    }

    if (!apiKey) {
      return { valid: false, error: "Invalid API key" };
    }

    if (apiKey.revokedAt) {
      return { valid: false, error: "API key revoked" };
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false, error: "API key expired" };
    }

    // Update usage stats
    await ctx.db.patch(apiKey._id, {
      lastUsedAt: new Date().toISOString(),
      usageCount: apiKey.usageCount + 1,
    });

    return {
      valid: true,
      userId: apiKey.userId,
    };
  },
});
