import { WorkflowNode, WorkflowState } from '../types';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Execute Retriever Node - Perform semantic search on documents
 */
export async function executeRetrieverNode(
  node: WorkflowNode,
  state: WorkflowState
): Promise<any> {
  const { data } = node;
  const { namespaceId, query: queryTemplate, limit = 5 } = data;

  if (!namespaceId) {
    throw new Error('Namespace ID is required for Retriever node');
  }

  // 1. Prepare clinical context and substitute variables in query
  const { substituteVariables } = await import('../variable-substitution');
  const queryText = substituteVariables(queryTemplate || '{{lastOutput}}', state);

  console.log(`🔍 Retriever Node: Searching in namespace ${namespaceId} for query: "${queryText}"`);

  // 2. Initialize Convex client
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured');
  }
  const convex = new ConvexHttpClient(convexUrl);

  try {
    // 3. Perform semantic search using the unified searchKnowledge action
    // This action handles embedding the query and searching the vector index

    const results = await convex.action(api.knowledge.searchKnowledge, {
      queryText,
      namespaceId,
      limit,
      reRank: !!data.reRank,
    });

    console.log(`✅ Retriever found ${results.length} relevant chunks`);

    // 4. Format results as a consolidated context string and raw JSON
    const context = results
      .map((r: any, i: number) => `[Source ${i + 1}]: ${r.content}`)
      .join('\n\n');

    return {
      results,
      context,
      summary: `Found ${results.length} matches for "${queryText}"`,
    };
  } catch (error) {
    console.error('❌ Retriever node execution failed:', error);
    throw error;
  }
}
