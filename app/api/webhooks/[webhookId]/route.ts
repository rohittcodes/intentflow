import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { LangGraphExecutor } from '@/lib/workflow/langgraph';
import { ConvexCheckpointer } from '@/lib/workflow/checkpointer';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(
  req: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const { webhookId } = params;

    // 1. Look up the workflow and webhook configuration
    const result = await convex.query(api.webhooks.getWorkflowByWebhookId, { webhookId });

    if (!result) {
      return NextResponse.json({ error: 'Webhook not found or disabled' }, { status: 404 });
    }

    const { workflow, webhook } = result;

    // 2. Validate Secret (if configured)
    if (webhook.secret) {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '') || req.nextUrl.searchParams.get('token');

      if (token !== webhook.secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 3. Prepare Input
    const body = await req.json().catch(() => ({}));
    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const headers = Object.fromEntries(req.headers.entries());

    // Input format passed to the workflow
    const input = {
      body,
      query,
      headers,
      webhookId,
      timestamp: new Date().toISOString()
    };

    // 4. Initialize Executor
    // LangGraphExecutor(workflow, onNodeUpdate?, apiKeys?, client?)
    const executor = new LangGraphExecutor(workflow, undefined, {}, convex);

    // 5. Execute Workflow (Wait for completion or timeout)
    // Note: Vercel serverless has timeout limits (10s-60s). 
    // If the workflow is long-running, we might want to return 202 and run in background.
    // For now, we attempt to wait.

    // We start a new thread for every webhook call
    const threadId = `webhook_${webhookId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const executionResult = await executor.execute(input, { threadId });

    return NextResponse.json(executionResult);

  } catch (error) {
    console.error('Webhook execution failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  return NextResponse.json({ message: `Webhook ${params.webhookId} is active. Use POST to trigger.` });
}
