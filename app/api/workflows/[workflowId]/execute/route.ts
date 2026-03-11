import { NextRequest, NextResponse } from 'next/server';
import { LangGraphExecutor } from '@/lib/workflow/langgraph';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/api/auth';
import { validateWorkflow } from '@/lib/workflow/validation';
import { getAuthenticatedConvexClient, api } from '@/lib/convex/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  // Validate API key
  const authResult = await validateApiKey(request);
  if (!authResult.authenticated) {
    return createUnauthorizedResponse(authResult.error || 'Authentication required');
  }

  try {
    const { workflowId } = await params;
    const body = await request.json();
    const { input, workflow } = body;

    console.log('API: Executing workflow', workflowId, 'with input:', input);

    if (!workflow || !workflow.nodes) {
      return NextResponse.json(
        { error: 'Workflow data is required in request body' },
        { status: 400 }
      );
    }

    console.log('API: Loaded workflow:', workflow.name);

    const { getAllCombinedApiKeys } = await import('@/lib/api/llm-keys');
    const apiKeys = await getAllCombinedApiKeys(authResult.userId || undefined);

    // 3. Validate workflow
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

    // 4. Check usage limits
    if (authResult.userId) {
      const convex = await getAuthenticatedConvexClient();
      const usage = await convex.query(api.usage.checkUsageLimit, { userId: authResult.userId });

      if (!usage.allowed) {
        return NextResponse.json(
          {
            error: 'Usage limit exceeded',
            message: `You have reached your limit of ${usage.limit} executions for the current period. Please upgrade to a higher tier to continue.`,
            usage
          },
          { status: 429 }
        );
      }

      // 5. Increment usage
      await convex.mutation(api.usage.incrementUsage, { userId: authResult.userId });
    }

    // 6. Create execution record
    // Execute workflow using LangGraph
    const executor = new LangGraphExecutor(workflow, undefined, apiKeys);
    const execution = await executor.execute(input || '');

    console.log('API: Execution complete:', execution.status);

    return NextResponse.json({
      success: execution.status === 'completed',
      execution,
      input,
      workflowName: workflow.name,
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      {
        error: 'Workflow execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
