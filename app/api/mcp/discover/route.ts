import { NextResponse } from 'next/server';
import { officialMCPServers } from '@/lib/mcp/mcp-registry';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mcp/discover
 * Get all official curated MCP servers available for simple 1-click installation.
 */
export async function GET() {
  try {
    // Return all official servers (both enabled and not enabled)
    // to allow the user to discover and "install" them.
    return NextResponse.json({
      success: true,
      servers: officialMCPServers,
      source: 'discover',
    });
  } catch (error) {
    console.error('Failed to get MCP discovery catalog:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load MCP discovery catalog' },
      { status: 500 }
    );
  }
}
