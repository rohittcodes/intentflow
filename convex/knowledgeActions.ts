"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

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
    
    let documentsWithScore: any[] = [];

    // 2a. Try Pinecone Search
    try {
      const pineconeConfig = await ctx.runQuery(internal.pineconeConnectors.getInternalPineconeConfig, { 
        userId: identity.subject 
      });

      if (pineconeConfig?.apiKey && pineconeConfig?.indexName) {
        console.log(`🌲 Searching Pinecone Index: ${pineconeConfig.indexName}`);
        const pc = new Pinecone({ apiKey: pineconeConfig.apiKey });
        const index = pc.index(pineconeConfig.indexName);
        
        const queryResponse = await index.query({
          vector: embedding,
          topK: fetchLimit,
          includeMetadata: true,
        });

        documentsWithScore = queryResponse.matches.map(match => ({
          _id: match.id,
          content: match.metadata?.text || "No content",
          fileName: match.metadata?.fileName || "Pinecone Result",
          _score: match.score || 0,
        }));
      }
    } catch (pcError) {
      console.error("❌ Pinecone Search Failed:", pcError);
    }

    // 2b. Fallback to Native Convex Search
    if (documentsWithScore.length === 0) {
      console.log(`🔍 Falling back to native Convex vector search...`);
      const results = await ctx.vectorSearch("documents", "by_embedding", {
        vector: embedding,
        limit: fetchLimit,
        filter: (q: any) => q.eq("namespaceId", args.namespaceId) && q.eq("userId", identity.subject),
      });

      documentsWithScore = await Promise.all(
        results.map(async (result: any) => {
          const doc: any = await ctx.runQuery(api.knowledge.getDocumentById, { id: result._id });
          return {
            ...doc,
            _score: result._score,
          };
        })
      );
    }

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
