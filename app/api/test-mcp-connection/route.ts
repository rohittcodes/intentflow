import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GenericMCPClient } from '@/lib/mcp/client';

export const dynamic = 'force-dynamic';

/**
 * Test MCP Server Connection
 * Uses GenericMCPClient to connect and list tools
 */
export async function POST(request: NextRequest) {
  let client: GenericMCPClient | null = null;

  try {
    const body = await request.json();
    const { url, authToken, headers: customHeaders } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const { userId } = await auth();
    let secrets: Record<string, string> = {};

    if (userId) {
      const { getUserSecrets } = await import('@/lib/api/secrets');
      secrets = await getUserSecrets(userId);
    }

    console.log('Testing MCP connection to:', url);

    // Substitute environment variables in URL
    let resolvedUrl = url;
    const envVarMatch = url.match(/\{([A-Z0-9_]+)\}/g);
    if (envVarMatch) {
      const missingVars: string[] = [];
      envVarMatch.forEach((match: string) => {
        const envVar = match.slice(1, -1); // Remove { and }
        const envValue = process.env[envVar] || secrets[envVar];
        if (envValue) {
          resolvedUrl = resolvedUrl.replace(match, envValue);
        } else {
          missingVars.push(envVar);
        }
      });

      if (missingVars.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Missing configuration',
          details: `Missing environment variables: ${missingVars.join(', ')}. Please add them to your .env.local file or User Secrets.`
        }, { status: 200 }); // Return 200 to show error in UI nicely
      }
    }

    // Build headers
    const headers: Record<string, string> = {};

    // Add custom headers if provided
    if (customHeaders) {
      Object.keys(customHeaders).forEach((key) => {
        // Resolve environment variables in header values
        let headerValue = customHeaders[key];
        if (typeof headerValue === 'string') {
          // Check for ${VAR} format
          const dollarMatch = headerValue.match(/\$\{([A-Z0-9_]+)\}/);
          if (dollarMatch) {
            const envVar = dollarMatch[1];
            headerValue = headerValue.replace(dollarMatch[0], process.env[envVar] || secrets[envVar] || '');
          }

          // Check for {VAR} format
          const curlyMatch = headerValue.match(/\{([A-Z0-9_]+)\}/);
          if (curlyMatch) {
            const envVar = curlyMatch[1];
            headerValue = headerValue.replace(curlyMatch[0], process.env[envVar] || secrets[envVar] || '');
          }
        }
        headers[key] = headerValue;
      });
    }

    // Add Bearer token if provided
    if (authToken) {
      // Handle environment variable substitution for access tokens
      let resolvedToken = authToken;
      if (typeof authToken === 'string' && authToken.startsWith('${') && authToken.endsWith('}')) {
        const envVar = authToken.slice(2, -1);
        resolvedToken = process.env[envVar] || authToken;
      }
      headers['Authorization'] = `Bearer ${resolvedToken}`;
    }

    // Initialize MCP client
    client = new GenericMCPClient(resolvedUrl, headers);

    // Connect with timeout
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out after 10s')), 10000)
    );

    await Promise.race([connectPromise, timeoutPromise]);

    // List tools
    const tools = await client.listTools();

    // Extract tool names for simple list
    const toolNames = tools.map((t: any) => t.name);

    return NextResponse.json({
      success: true,
      tools: toolNames,
      toolsDetailed: tools,
      serverInfo: {
        name: 'MCP Server', // SDK might not expose server info easily yet without handshake inspection
        version: '1.0.0',
      },
    });

  } catch (error) {
    console.error('MCP connection test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 200 });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
