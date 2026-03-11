import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";
import { assertResourceLimit } from "./usage";
/**
 * Knowledge Base Management (RAG)
 */

// --- Namespaces ---

export const listNamespaces = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    if (args.workspaceId) {
      const workspace = await ctx.db.get(args.workspaceId);
      if (!workspace || workspace.userId !== identity.subject) {
        throw new Error("Unauthorized");
      }
    }

    let q = ctx.db.query("namespaces");
    
    // Ownership check
    q = q.filter((q) => q.eq(q.field("userId"), identity.subject));

    if (args.workspaceId) {
      q = q.filter((q) => q.eq(q.field("workspaceId"), args.workspaceId));
    }

    if (args.projectId) {
      q = q.filter((q) => q.eq(q.field("projectId"), args.projectId));
    }

    return await q.order("desc").collect();
  },
});

export const getNamespace = query({
  args: { id: v.id("namespaces") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const namespace = await ctx.db.get(id);

    if (!namespace || (namespace.userId && identity?.subject !== namespace.userId)) {
      return null;
    }

    return namespace;
  },
});

export const createNamespace = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    if (args.workspaceId) {
      // Check resource limits and verify ownership
      await assertResourceLimit(ctx, args.workspaceId, "knowledgeBases", identity.subject, args.projectId);
    }

    const namespaceId = await ctx.db.insert("namespaces", {
      name: args.name,
      description: args.description,
      userId: identity.subject,
      workspaceId: args.workspaceId,
      projectId: args.projectId,
      documentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return namespaceId;
  },
});

export const updateNamespace = mutation({
  args: {
    id: v.id("namespaces"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Namespace not found");
    }

    await ctx.db.patch(id, {
      ...args,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const deleteNamespace = mutation({
  args: { id: v.id("namespaces") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Namespace not found");
    }

    // Delete all associated documents first
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_namespace", (q) => q.eq("namespaceId", id))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    await ctx.db.delete(id);
  },
});

// --- Documents ---

export const getDocumentById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const doc = await ctx.db.get(id);

    if (!doc || (doc.userId && identity?.subject !== doc.userId)) {
      return null;
    }

    return doc;
  },
});

export const listDocuments = query({
  args: { namespaceId: v.id("namespaces") },
  handler: async (ctx, { namespaceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const namespace = await ctx.db.get(namespaceId);
    if (!namespace || namespace.userId !== identity.subject) {
      return [];
    }

    return await ctx.db
      .query("documents")
      .withIndex("by_namespace", (q) => q.eq("namespaceId", namespaceId))
      .order("desc")
      .collect();
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== identity.subject) {
      throw new Error("Document not found");
    }

    await ctx.db.delete(id);

    // Update document count in namespace
    const namespace = await ctx.db.get(doc.namespaceId);
    if (namespace) {
      await ctx.db.patch(doc.namespaceId, {
        documentCount: Math.max(0, namespace.documentCount - 1),
        updatedAt: new Date().toISOString(),
      });
    }
  },
});

export const storeDocuments = mutation({
  args: {
    namespaceId: v.id("namespaces"),
    documents: v.array(
      v.object({
        content: v.string(),
        embedding: v.array(v.float64()),
        metadata: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, { namespaceId, documents }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const namespace = await ctx.db.get(namespaceId);
    if (!namespace || namespace.userId !== identity.subject) {
      throw new Error("Namespace not found");
    }

    const now = new Date().toISOString();

    for (const doc of documents) {
      await ctx.db.insert("documents", {
        ...doc,
        namespaceId,
        userId: identity.subject,
        createdAt: now,
      });
    }

    // Update namespace metadata
    await ctx.db.patch(namespaceId, {
      documentCount: (namespace.documentCount || 0) + documents.length,
      lastIngestedAt: now,
      updatedAt: now,
    });

    return { count: documents.length };
  },
});

// --- Vector Search ---

export const vectorSearch = action({
  args: {
    query: v.array(v.float64()),
    namespaceId: v.id("namespaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const results = await ctx.vectorSearch("documents", "by_embedding", {
      vector: args.query,
      limit: args.limit || 5,
      filter: (q: any) => q.eq("namespaceId", args.namespaceId) && q.eq("userId", identity.subject),
    });

    // Fetch the full documents
    const documentsWithScore = await Promise.all(
      results.map(async (result: any) => {
        const doc: any = await ctx.runQuery(api.knowledge.getDocumentById, { id: result._id });
        return {
          ...doc,
          _score: result._score,
        };
      })
    );

    return documentsWithScore;
  },
});

