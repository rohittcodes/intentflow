import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedConvexClient, api, isConvexConfigured } from '@/lib/convex/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/trash - List all trashed workflows
 */
export async function GET(request: NextRequest) {
  try {
    if (!isConvexConfigured()) {
      return NextResponse.json({
        workflows: [],
        total: 0,
        message: 'Convex not configured',
      });
    }

    const convex = await getAuthenticatedConvexClient();
    const trashed = await convex.query(api.workflows.listTrashed, {});

    return NextResponse.json({
      workflows: trashed.map((w: any) => ({
        id: w.customId || w._id,
        _id: w._id, // Include Convex ID for operations
        name: w.name,
        description: w.description,
        deletedAt: w.deletedAt,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        nodeCount: w.nodes?.length || 0,
        edgeCount: w.edges?.length || 0,
      })),
      total: trashed.length,
      source: 'convex',
    });
  } catch (error) {
    console.error('Error fetching trashed workflows:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch trashed workflows',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows/trash - Restore a workflow from trash
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

    // Restore the workflow
    await convex.mutation(api.workflows.restoreFromTrash, {
      id: workflowId,
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow restored successfully',
    });
  } catch (error) {
    console.error('Error restoring workflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to restore workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/trash - Permanently delete a workflow
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('id');

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

    // Permanently delete the workflow
    await convex.mutation(api.workflows.permanentlyDelete, {
      id: workflowId,
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow permanently deleted',
    });
  } catch (error) {
    console.error('Error permanently deleting workflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to permanently delete workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
