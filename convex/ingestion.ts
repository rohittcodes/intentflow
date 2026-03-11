"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

/**
 * Recursive Character Text Splitter Implementation
 * (Ported from LangChain to minimize dependencies in Convex)
 */
class RecursiveCharacterTextSplitter {
  private separators: string[];
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(chunkSize = 1000, chunkOverlap = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.separators = ["\n\n", "\n", " ", ""];
  }

  splitText(text: string): string[] {
    if (!text) return [];

    // 1. Get all base splits recursively
    const getSplits = (txt: string, separators: string[]): string[] => {
      const separator = separators[0] !== undefined ? separators[0] : "";
      const remainingSeparators = separators.slice(1);
      const internalSplits = separator === "" ? txt.split("") : txt.split(separator);

      const result: string[] = [];
      for (const s of internalSplits) {
        if (s.length <= this.chunkSize) {
          result.push(s);
        } else if (remainingSeparators.length > 0) {
          result.push(...getSplits(s, remainingSeparators));
        } else {
          result.push(s);
        }
      }
      return result;
    };

    const allSplits = getSplits(text, this.separators);

    // 2. Merge splits into chunks with overlap
    const chunks: string[] = [];
    let currentSplits: string[] = [];
    let currentTotalLength = 0;

    for (const split of allSplits) {
      if (currentTotalLength + split.length > this.chunkSize && currentSplits.length > 0) {
        chunks.push(currentSplits.join(" "));

        // Handle overlap: Keep removing from the start until we are under the overlap limit
        while (currentTotalLength > this.chunkOverlap && currentSplits.length > 1) {
          const removed = currentSplits.shift()!;
          currentTotalLength -= (removed.length + 1); // +1 for the space
        }
      }

      currentSplits.push(split);
      currentTotalLength += split.length + (currentSplits.length > 1 ? 1 : 0);
    }

    if (currentSplits.length > 0) {
      chunks.push(currentSplits.join(" "));
    }

    return chunks;
  }
}

/**
 * Ingest document content into a knowledge namespace
 */
export const ingestDocument = action({
  args: {
    namespaceId: v.id("namespaces"),
    content: v.string(), // Raw text OR base64 PDF
    fileName: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; count: number; pineconeSuccess?: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log(`📄 Starting ingestion for ${args.fileName || "unnamed document"}...`);

    let textToProcess = args.content;

    // Support PDF ingestion
    if (args.fileName?.toLowerCase().endsWith(".pdf") || args.content.startsWith("data:application/pdf;base64,")) {
      try {
        console.log(`📂 Extracting text from PDF (using pdfreader)...`);
        const base64Data = args.content.includes("base64,")
          ? args.content.split("base64,")[1]
          : args.content;

        const buffer = Buffer.from(base64Data, "base64");

        // pdfreader is callback-based, wrap it in a Promise
        const extractedText = await new Promise<string>((resolve, reject) => {
          let fullText = "";
          // @ts-ignore
          const { PdfReader } = require("pdfreader");
          new PdfReader().parseBuffer(buffer, (err: any, item: any) => {
            if (err) reject(err);
            else if (!item) resolve(fullText);
            else if (item.text) fullText += item.text + " ";
          });
        });

        textToProcess = extractedText;

        if (!textToProcess || textToProcess.trim().length === 0) {
          console.warn("⚠️ PDF extraction returned empty text. PDF might be image-based or protected.");
        } else {
          console.log(`✅ Extracted ${textToProcess.length} characters from PDF`);
        }
      } catch (error) {
        console.error("❌ Failed to parse PDF:", error);
        throw new Error("Failed to parse PDF document. Please ensure it is a valid PDF.");
      }
    }

    // 1. Chunking
    const splitter = new RecursiveCharacterTextSplitter(1000, 200);
    const chunks = splitter.splitText(textToProcess);
    console.log(`✂️ Split into ${chunks.length} chunks`);

    // 2. Batch Embedding (OpenAI supports up to 2048 inputs per request)
    // We'll process in batches of 100 to be safe
    const documentsToStore: {
      content: string;
      embedding: number[];
      metadata: any;
    }[] = [];
    const batchSize = 100;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batch,
        encoding_format: "float",
      });

      batch.forEach((content: string, index: number) => {
        documentsToStore.push({
          content,
          embedding: response.data[index].embedding,
          metadata: {
            ...args.metadata,
            fileName: args.fileName,
            chunkIndex: i + index,
          },
        });
      });
    }

    let pineconeSuccess = false;

    // 3. Try Storing in Pinecone First (If Configured)
    try {
      const pineconeConfig = await ctx.runQuery(internal.pineconeConnectors.getInternalPineconeConfig, {
        userId: identity.subject
      });

      if (pineconeConfig?.apiKey && pineconeConfig?.indexName) {
        console.log(`🌲 Pushing ${documentsToStore.length} chunks to Pinecone Index: ${pineconeConfig.indexName}`);

        const pc = new Pinecone({ apiKey: pineconeConfig.apiKey });
        const index = pc.index(pineconeConfig.indexName);

        // Map to Pinecone vector format
        const vectors = documentsToStore.map((doc, idx) => ({
          id: `chunk_${Date.now()}_${idx}`,
          values: doc.embedding,
          metadata: {
            text: doc.content, // Pinecone convention for RAG is storing content in metadata.text
            ...doc.metadata
          }
        }));
        await index.upsert({ records: vectors as any });
        console.log(`✅ Successfully upserted chunks to Pinecone!`);
        pineconeSuccess = true;
      }
    } catch (pcError) {
      console.error("❌ Failed to push to Pinecone, falling back to Convex:", pcError);
    }

    // 4. Always Store in Convex (Backup / Native Option)
    const result: { count: number } = await ctx.runMutation(api.knowledge.storeDocuments, {
      namespaceId: args.namespaceId,
      documents: documentsToStore,
    });

    console.log(`✅ Successfully stored ${result.count} document chunks natively`);
    return { success: true, count: result.count, pineconeSuccess };
  },
});
