import { NextRequest, NextResponse } from 'next/server';
import { LangGraphExecutor } from '@/lib/workflow/langgraph';
import { ApiKeys } from '@/lib/workflow/types';
import { getWorkflow } from '@/lib/workflow/storage';
import { getServerAPIKeys } from '@/lib/api/config';
import { validateApiKey } from '@/lib/api/auth';
import { getAuthenticatedConvexClient, api } from '@/lib/convex/client';

export const dynamic = 'force-dynamic';

/**
 * Execute workflow using LangGraph
 * POST /api/workflows/:workflowId/execute-langgraph
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { workflowId } = await params;
    const body = await request.json();
    const { input, threadId } = body;

    // Load workflow
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const { getAllCombinedApiKeys } = await import('@/lib/api/llm-keys');
    const apiKeys = await getAllCombinedApiKeys(authResult.userId || undefined);

    // Usage checks
    if (authResult.userId) {
      const convex = await getAuthenticatedConvexClient();
      const usage = await convex.query(api.usage.checkUsageLimit, { userId: authResult.userId });

      if (!usage.allowed) {
        return NextResponse.json(
          {
            error: 'Usage limit exceeded',
            message: `You have reached your limit of ${usage.limit} executions for the current period.`,
            usage
          },
          { status: 429 }
        );
      }

      await convex.mutation(api.usage.incrementUsage, { userId: authResult.userId });
    }

    // Validate workflow
    const { validateWorkflow } = await import('@/lib/workflow/validation');
    const validation = validateWorkflow(workflow as any, apiKeys);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid workflow configuration',
          details: validation.errors.filter(e => e.severity === 'error')
        },
        { status: 400 }
      );
    }

    // Create LangGraph executor
    const executor = new LangGraphExecutor(workflow, undefined, apiKeys || undefined);

    // Execute workflow
    const result = await executor.execute(input, { threadId });

    return NextResponse.json({
      success: true,
      executionId: result.id,
      status: result.status,
      nodeResults: result.nodeResults,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    });
  } catch (error) {
    console.error('LangGraph execution error:', error);
    return NextResponse.json(
      {
        error: 'Workflow execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
