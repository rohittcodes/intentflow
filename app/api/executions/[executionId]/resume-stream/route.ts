import { NextRequest } from 'next/server';
import { getAuthenticatedConvexClient, api } from '@/lib/convex/client';
import { LangGraphExecutor } from '@/lib/workflow/langgraph';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/api/auth';

export const dynamic = 'force-dynamic';

/**
 * Streaming workflow resumption from checkpoint
 * Uses Server-Sent Events (SSE) to resume and stream progress
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  // Validate API key
  const authResult = await validateApiKey(request);
  if (!authResult.authenticated) {
    return createUnauthorizedResponse(authResult.error || 'Authentication required');
  }

  const { executionId } = await params;
  const userId = authResult.userId;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Failed to send SSE event:', error);
        }
      };

      const nodeResults: Record<string, any> = {};

      try {
        const convex = await getAuthenticatedConvexClient();

        // 1. Resume the execution in Convex
        console.log(`Resuming execution: ${executionId}`);
        const resumeDetails = await convex.mutation(api.executions.resumeExecution, {
          id: executionId as any,
        });

        const { workflowId, threadId } = resumeDetails;

        // 2. Fetch the workflow definition
        const workflowDoc = await convex.query(api.workflows.getWorkflow, {
          id: workflowId,
        });

        if (!workflowDoc) {
          throw new Error(`Workflow ${workflowId} not found`);
        }

        // 3. Setup Executor
        const { getAllCombinedApiKeys } = await import('@/lib/api/llm-keys');
        const apiKeys = await getAllCombinedApiKeys(userId || undefined);

        const connectors = await convex.query(api.knowledgeConnectors.listConnectors);

        const executor = new LangGraphExecutor(
          workflowDoc as any,
          (nodeId, result) => {
            nodeResults[nodeId] = result;
            if (result.status === 'running') {
              sendEvent('node_started', { nodeId, timestamp: new Date().toISOString() });
            } else if (result.status === 'completed') {
              sendEvent('node_completed', { nodeId, result, timestamp: new Date().toISOString() });
            } else if (result.status === 'failed') {
              sendEvent('node_failed', { nodeId, error: result.error, timestamp: new Date().toISOString() });
            }
          },
          apiKeys,
          convex,
          connectors || []
        );

        sendEvent('workflow_resumed', {
          executionId,
          workflowId,
          threadId,
          timestamp: new Date().toISOString(),
        });

        // 4. Start streaming from checkpoint
        const executionStream = await executor.executeStream(null, {
          threadId,
          executionId,
        });

        let finalState: any = null;

        for await (const stateUpdate of executionStream) {
          finalState = stateUpdate;
          sendEvent('state_update', {
            nodeResults: { ...stateUpdate.nodeResults, ...nodeResults },
            currentNodeId: stateUpdate.currentNodeId,
            pendingAuth: stateUpdate.pendingAuth,
            timestamp: new Date().toISOString(),
          });

          if (stateUpdate.pendingAuth) {
            sendEvent('workflow_paused', {
              reason: 'pending_authorization',
              executionId,
              threadId,
              timestamp: new Date().toISOString(),
            });
            controller.close();
            return;
          }
        }

        sendEvent('workflow_completed', {
          executionId,
          status: finalState?.error ? 'failed' : 'completed',
          timestamp: new Date().toISOString(),
        });

        controller.close();
      } catch (error) {
        console.error('Workflow resume error:', error);
        sendEvent('error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
