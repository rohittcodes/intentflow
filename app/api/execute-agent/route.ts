import { NextRequest, NextResponse } from 'next/server';
import { getServerAPIKeys } from '@/lib/api/config';
import { executeAgentNode } from '@/lib/workflow/executors/agent';
import { WorkflowNode, WorkflowState } from '@/lib/workflow/types';
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

export const dynamic = 'force-dynamic';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();
    const { instructions, model, context, jsonSchema, mcpTools = [] } = body;

    // Check usage limits if user is authenticated
    if (userId) {
      const usage = await convex.query(api.usage.checkUsageLimit, { userId });
      if (!usage.allowed) {
        return NextResponse.json(
          { 
            error: 'Usage limit reached', 
            message: `You have reached your monthly execution limit for the ${usage.tier} tier (${usage.limit}). Please upgrade for more.` 
          },
          { status: 429 }
        );
      }
    }

    // Get API keys from server
    const apiKeys = getServerAPIKeys();
    if (!apiKeys) {
      return NextResponse.json(
        { error: 'API keys not configured in .env.local' },
        { status: 500 }
      );
    }

    // Create a minimal workflow state
    const state: WorkflowState = {
      variables: {
        userId: userId || undefined,
        input: context || '',
        lastOutput: context || '',
      },
      chatHistory: [],
      nodeResults: {},
      pendingAuth: {},
      loopResults: [],
    };

    // Create a minimal workflow node
    const node: WorkflowNode = {
      id: 'api-call',
      type: 'agent' as const,
      position: { x: 0, y: 0 },
      data: {
        label: 'Agent',
        instructions: instructions || 'Process the input',
        model: model || 'anthropic/claude-sonnet-4-20250514',
        outputFormat: jsonSchema ? 'JSON' : 'Text',
        jsonOutputSchema: jsonSchema,
        mcpTools: mcpTools,
        includeChatHistory: false,
      },
    };

    // Execute the agent node
    const result = await executeAgentNode(node, state, apiKeys);

    // Increment usage if successful and user is authenticated
    if (userId) {
      // Background execution of counter increment
      convex.mutation(api.usage.incrementUsage, { userId }).catch(console.error);
    }

    // Extract the response data
    const responseText = result.__agentValue;
    const toolCalls = result.__agentToolCalls || [];

    return NextResponse.json({
      success: true,
      text: typeof responseText === 'string' ? responseText : JSON.stringify(responseText),
      mcpToolsUsed: toolCalls,
      // Include any additional metadata if needed
      stopReason: result.stopReason,
    });
  } catch (error) {
    console.error('Agent execution error:', error);
    return NextResponse.json(
      {
        error: 'Agent execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}