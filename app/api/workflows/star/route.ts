import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedConvexClient, api, isConvexConfigured } from '@/lib/convex/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/star - Toggle star/bookmark status for a workflow
 */
export async function POST(request: NextRequest) {
  try {
    const { workflowId } = await request.json();

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    if (!isConvexConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Convex not configured',
      }, { status: 500 });
    }

    const convex = await getAuthenticatedConvexClient();

    // Toggle star status
    const result = await convex.mutation(api.workflows.toggleStar, {
      id: workflowId,
    });

    return NextResponse.json({
      success: true,
      isStarred: result.isStarred,
      message: result.isStarred ? 'Workflow starred' : 'Workflow unstarred',
    });
  } catch (error) {
    console.error('Error toggling star:', error);
    return NextResponse.json(
      {
        error: 'Failed to update workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
