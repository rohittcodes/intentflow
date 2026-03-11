import { NextRequest } from 'next/server';
import { getConvexClient, getAuthenticatedConvexClient, api, isConvexConfigured } from '@/lib/convex/client';
import { LangGraphExecutor } from '@/lib/workflow/langgraph';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/api/auth';

export const dynamic = 'force-dynamic';

/**
 * Streaming workflow execution with real-time updates
 * Uses Server-Sent Events (SSE) to stream node execution progress
 *
 * Uses LangGraph executor for state management with Convex storage
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  // Validate API key
  const authResult = await validateApiKey(request);
  // We do not reject immediately if unauthenticated because embeddable workflows allow anonymous execution.
  // Validation will be checked once we load the workflow document.

  const { workflowId } = await params;

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

      let workflow: any;
      let threadId: string = '';
      let initialInput: any = '';
      let executionId: string = '';
      let executor: LangGraphExecutor;
      const nodeResults: Record<string, any> = {};

      try {
        // Get inputs from request body
        const body = await request.json();
        const inputs = body || {};

        // Get workflow from Convex
        if (!isConvexConfigured()) {
          sendEvent('error', {
            error: 'Convex not configured',
            workflowId,
          });
          controller.close();
          return;
        }

        let convex;
        if (authResult.authenticated) {
          convex = await getAuthenticatedConvexClient();
        } else {
          convex = getConvexClient();
        }

        // Look up workflow - try customId first, then try as Convex ID
        let workflowDoc = await convex.query(api.workflows.getWorkflowByCustomId, {
          customId: workflowId,
        });

        // If not found by customId and looks like Convex ID, try direct lookup
        if (!workflowDoc && workflowId.startsWith('j')) {
          try {
            workflowDoc = await convex.query(api.workflows.getWorkflow, {
              id: workflowId as any,
            });
          } catch (e) {
            // Not a valid Convex ID
          }
        }

        if (!workflowDoc) {
          sendEvent('error', {
            error: authResult.authenticated ? `Workflow ${workflowId} not found` : 'Authentication required',
            workflowId,
          });
          controller.close();
          return;
        }

        const isEmbeddable = (workflowDoc.settings as any)?.isEmbeddable === true;
        if (!authResult.authenticated) {
          sendEvent('error', {
            error: authResult.error || 'Authentication required to execute this workflow',
            workflowId,
          });
          controller.close();
          return;
        }

        // Convert Convex document to workflow format
        const workflowData = {
          ...workflowDoc,
          id: workflowDoc.customId || workflowDoc._id, // Use customId if exists, otherwise Convex ID
        };

        workflow = workflowData as any;

        // Get API keys - check user keys first, then fall back to environment
        const { getAllCombinedApiKeys } = await import('@/lib/api/llm-keys');
        const apiKeys = await getAllCombinedApiKeys(authResult.userId || undefined);

        // Usage checks
        if (authResult.userId) {
          const usage = await convex.query(api.usage.checkUsageLimit, { userId: authResult.userId });
          if (!usage.allowed) {
            sendEvent('error', {
              error: 'Usage limit exceeded',
              message: `You have reached your limit of ${usage.limit} executions for the current period.`,
              usage
            });
            controller.close();
            return;
          }
          await convex.mutation(api.usage.incrementUsage, { userId: authResult.userId });
        }

        // Validate workflow
        const { validateWorkflow } = await import('@/lib/workflow/validation');
        const validation = validateWorkflow(workflow, apiKeys);
        if (!validation.isValid) {
          sendEvent('error', {
            error: 'Invalid workflow configuration',
            details: validation.errors.filter(e => e.severity === 'error'),
          });
          controller.close();
          return;
        }

        // Check if we are resuming from a checkpoint
        const isResuming = inputs.resumeFromCheckpoint === true;

        // Prepare initial input - pass as object if it's an object, otherwise as string
        if (isResuming) {
          initialInput = null; // null triggers checkpoint resume in LangGraphExecutor
        } else if (typeof inputs === 'object' && Object.keys(inputs).length > 0) {
          initialInput = inputs.input || inputs;
        } else {
          initialInput = inputs.url || inputs.input || '';
        }

        // LangGraph Execution Path
        if (isResuming && inputs.threadId) {
          threadId = inputs.threadId;
          if (inputs.executionId) {
            executionId = inputs.executionId;
            try {
              await convex.mutation(api.executions.resumeExecution, { id: executionId as any });
            } catch (err) {
              console.warn("Failed to resume execution row in convex:", err);
            }
          }
        } else {
          threadId = inputs.threadId || `thread_${workflowId}_${Date.now()}`;
          try {
            executionId = await convex.mutation(api.executions.createExecution, {
              workflowId: workflow.id as any,
              input: initialInput,
              threadId,
              maxTokens: (workflow.settings as any)?.maxTokens,
              maxRuntimeSeconds: (workflow.settings as any)?.maxRuntimeSeconds,
            });
          } catch (err) {
            console.error("Failed to create execution row in convex:", err);
            executionId = `exec_${Date.now()}`; // fallback
          }
        }

        // Fetch all connectors for the user
        const connectors = await convex.query(api.knowledgeConnectors.listConnectors);

        executor = new LangGraphExecutor(
          workflow,
          (nodeId, result) => {
            nodeResults[nodeId] = result;

            if (result.status === 'running') {
              const node = workflow.nodes.find((n: any) => n.id === nodeId);
              sendEvent('node_started', {
                nodeId,
                nodeName: node?.data?.nodeName || node?.data?.label || nodeId,
                nodeType: node?.type || 'unknown',
                timestamp: new Date().toISOString(),
              });
            } else if (result.status === 'completed') {
              const node = workflow.nodes.find((n: any) => n.id === nodeId);
              sendEvent('node_completed', {
                nodeId,
                nodeName: node?.data?.nodeName || node?.data?.label || nodeId,
                result,
                timestamp: new Date().toISOString(),
              });
            } else if (result.status === 'failed') {
              const node = workflow.nodes.find((n: any) => n.id === nodeId);
              sendEvent('node_failed', {
                nodeId,
                nodeName: node?.data?.nodeName || node?.data?.label || nodeId,
                error: result.error,
                timestamp: new Date().toISOString(),
              });
            } else if (result.status === 'pending-authorization' || result.status === 'pending-approval') {
              const node = workflow.nodes.find((n: any) => n.id === nodeId);
              sendEvent('node_paused', {
                nodeId,
                nodeName: node?.data?.nodeName || node?.data?.label || nodeId,
                status: result.status,
                timestamp: new Date().toISOString(),
              });
            }
          },
          apiKeys,
          convex, // Pass convex client for persistence
          connectors || [], // Pass connectors for dynamic resolution
          authResult.userId // Pass userId for memory node scoping
        );

        // Send start event with threadId
        sendEvent('workflow_started', {
          workflowId,
          workflowName: workflow.name,
          threadId, // Return threadId to client
          totalNodes: workflow.nodes.length,
          timestamp: new Date().toISOString(),
        });

        // ── Wall-Clock Runtime Cap ───────────────────────────────────────────
        // Read maxRuntimeSeconds from workflow settings (set via WorkflowSettingsPanel).
        // If set to a positive value, we use an AbortController to abort the
        // execution stream and close the SSE connection when the cap is reached.
        const maxRuntimeSec: number = Number((workflow.settings as any)?.maxRuntimeSeconds ?? 0);
        const abortController = new AbortController();
        let runtimeCapTimer: ReturnType<typeof setTimeout> | null = null;
        if (maxRuntimeSec > 0) {
          runtimeCapTimer = setTimeout(() => {
            abortController.abort();
            sendEvent('workflow_timeout', {
              workflowId,
              executionId,
              maxRuntimeSeconds: maxRuntimeSec,
              message: `Workflow exceeded the ${maxRuntimeSec}s runtime limit and was aborted.`,
              timestamp: new Date().toISOString(),
            });
            controller.close();
          }, maxRuntimeSec * 1000);
        }

        // Execute with streaming
        const executionStream = await executor.executeStream(initialInput, {
          threadId,
          executionId,
        });

        let finalState: any = null;

        // CRITICAL FIX: Proper async iteration with error handling
        try {
          for await (const stateUpdate of executionStream) {
            const mergedState = {
              ...stateUpdate,
              nodeResults: {
                ...stateUpdate.nodeResults,
                ...nodeResults,
              },
            };

            finalState = mergedState;

            sendEvent('state_update', {
              nodeResults: mergedState.nodeResults,
              currentNodeId: mergedState.currentNodeId,
              pendingAuth: mergedState.pendingAuth,
              timestamp: new Date().toISOString(),
            });

            // Check for pending auth/approval
            if (mergedState.pendingAuth) {
              sendEvent('workflow_paused', {
                reason: 'pending_authorization',
                pendingAuth: mergedState.pendingAuth,
                executionId,
                threadId,
                timestamp: new Date().toISOString(),
              });

              controller.close();
              return;
            }
          }
        } catch (streamError) {
          console.error('Stream iteration error:', streamError);
          sendEvent('error', {
            error: streamError instanceof Error ? streamError.message : 'Stream error',
            timestamp: new Date().toISOString(),
          });
          controller.close();
          return;
        }

        // Send completion event
        const status = finalState?.pendingAuth ? 'waiting-auth' : 'completed';

        // Clear the runtime cap timer — execution finished before the wall-clock limit
        if (runtimeCapTimer) clearTimeout(runtimeCapTimer);

        // Save execution state in Convex
        try {
          if (executionId && !executionId.startsWith('exec_')) {
            await convex.mutation(api.executions.updateExecution, {
              id: executionId as any,
              nodeResults: finalState?.nodeResults || {},
              cumulativeUsage: finalState?.cumulativeUsage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
            });

            if (status === 'completed') {
              await convex.mutation(api.executions.completeExecution, {
                id: executionId as any,
                output: finalState?.nodeResults || {},
              });
            } else if (status === 'waiting-auth') {
              await convex.mutation(api.executions.updateExecution, {
                id: executionId as any,
                status: 'suspended',
                isSuspended: true,
                suspendedAt: new Date().toISOString()
              });
            }
          }
        } catch (dbErr) {
          console.error("Failed to commit execution result to Convex:", dbErr);
        }

        sendEvent('workflow_completed', {
          workflowId,
          executionId,
          results: finalState?.nodeResults || {},
          status,
          timestamp: new Date().toISOString(),
        });

        // ── Webhook Out ───────────────────────────────────────────
        if (status === 'completed' && workflow?.settings?.webhookOnSuccessUrl) {
          fetch(workflow.settings.webhookOnSuccessUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workflowId,
              executionId,
              status: 'success',
              results: finalState?.nodeResults || {},
              timestamp: new Date().toISOString()
            })
          }).catch(err => console.error("Failed to fire success webhook", err));
        }

        controller.close();
      } catch (error) {
        console.error('Workflow execution error:', error);

        // Save failed state to Convex
        if (executionId && !executionId.startsWith('exec_')) {
          try {
            // To be completely safe and avoid missing the ID if convex was uninitialized, check string
            const { getAuthenticatedConvexClient } = await import('@/lib/convex/client');
            const convexFallback = await getAuthenticatedConvexClient();
            await convexFallback.mutation(api.executions.completeExecution, {
              id: executionId as any,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          } catch (ign) { }
        }

        sendEvent('error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        // ── Webhook Out (Failure) ───────────────────────────────────────────
        if (workflow?.settings?.webhookOnFailureUrl) {
          fetch(workflow.settings.webhookOnFailureUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workflowId,
              executionId,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            })
          }).catch(err => console.error("Failed to fire failure webhook", err));
        }

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
