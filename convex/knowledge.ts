import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";

/**
 * Knowledge Base Management (RAG)
 */

// --- Namespaces ---

export const listNamespaces = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("namespaces")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const getNamespace = query({
  args: { id: v.id("namespaces") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const createNamespace = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const now = new Date().toISOString();

    return await ctx.db.insert("namespaces", {
      ...args,
      userId: identity.subject,
      documentCount: 0,
      createdAt: now,
      updatedAt: now,
    });
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
    return await ctx.db.get(id);
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

export const searchKnowledge = action({
  args: {
    queryText: v.string(),
    namespaceId: v.id("namespaces"),
    limit: v.optional(v.number()),
    reRank: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 1. Generate embedding for query text
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: args.queryText,
      encoding_format: "float",
    });

    const embedding = response.data[0].embedding;

    // 2. Perform vector search (fetch a larger set if re-ranking is enabled)
    const initialLimit = args.limit || 5;
    const fetchLimit = args.reRank ? initialLimit * 3 : initialLimit;

    const results = await ctx.vectorSearch("documents", "by_embedding", {
      vector: embedding,
      limit: fetchLimit,
      filter: (q: any) => q.eq("namespaceId", args.namespaceId) && q.eq("userId", identity.subject),
    });

    // 3. Fetch the full documents
    let documentsWithScore = await Promise.all(
      results.map(async (result: any) => {
        const doc: any = await ctx.runQuery(api.knowledge.getDocumentById, { id: result._id });
        return {
          ...doc,
          _score: result._score,
        };
      })
    );

    // 4. Optional Re-Ranking step
    if (args.reRank && documentsWithScore.length > 0) {
      console.log(`🤖 Re-ranking ${documentsWithScore.length} results...`);

      const prompt = `You are a relevance scoring assistant. Given a search query and a list of document chunks, rate how relevant each chunk is to answering the query on a scale of 0 to 10.
      
Query: "${args.queryText}"

Documents:
${documentsWithScore.map((doc, i) => `ID ${i}: ${doc.content}`).join("\n\n")}

Return ONLY a JSON object where keys are the IDs and values are the numerical scores. Example: {"0": 9.5, "1": 4.2}`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0,
        });

        const scores = JSON.parse(completion.choices[0].message.content || "{}");

        // Update scores and sort
        documentsWithScore = documentsWithScore
          .map((doc, i) => ({
            ...doc,
            _reRankScore: scores[i.toString()] || 0,
          }))
          .sort((a, b) => (b._reRankScore || 0) - (a._reRankScore || 0))
          .slice(0, initialLimit);

        console.log(`✅ Re-ranked results. Top score: ${documentsWithScore[0]?._reRankScore}`);
      } catch (error) {
        console.error("❌ Re-ranking failed, falling back to vector scores:", error);
        documentsWithScore = documentsWithScore.slice(0, initialLimit);
      }
    }

    return documentsWithScore;
  },
});
