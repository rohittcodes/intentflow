import { WorkflowNode, WorkflowState } from '../types';
import { resolveMCPServer } from '@/lib/mcp/resolver';
import { GenericMCPClient } from '@/lib/mcp/client';
import { substituteVariables } from '../variable-substitution';

/**
 * Extract specific field from MCP tool response
 */
function extractField(data: any, field: string, customPath?: string): any {
  if (field === 'full') return data;
  if (field === 'custom' && customPath) {
    return getNestedValue(data, customPath);
  }

  // Common field mappings
  switch (field) {
    case 'markdown':
      // Prefer markdown field, fallback to first text content, fallback to raw data
      return data.markdown || data?.content?.find((c: any) => c.type === 'text')?.text || data;
    case 'html':
      return data.html || data;
    case 'metadata':
      return data.metadata || {};
    case 'results':
      return data.results || data;
    case 'text':
      return typeof data === 'string' ? data : (data?.content?.find((c: any) => c.type === 'text')?.text || JSON.stringify(data));
    case 'json':
      return data.json || data.data || data;
    default:
      return data[field] || data;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    // Handle array indexing
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      current = current[arrayName]?.[parseInt(index)];
    } else {
      current = current?.[part];
    }

    if (current === undefined) break;
  }

  return current;
}

/**
 * Execute MCP Node - Calls generic MCP servers via SSE
 */
export async function executeMCPNode(
  node: WorkflowNode,
  state: WorkflowState,
  apiKey?: string,
  secrets?: Record<string, string>
): Promise<any> {
  const { data } = node;
  const nodeData = data as any;

  // Resolve MCP server configuration
  let mcpServers = nodeData.mcpServers || [];

  // If using new format with server ID, resolve it
  if (nodeData.mcpServerId) {
    const resolvedServer = await resolveMCPServer(nodeData.mcpServerId);
    if (resolvedServer) {
      mcpServers = [resolvedServer];
    } else {
      console.warn(`Could not resolve MCP server ID: ${nodeData.mcpServerId}`);
    }
  }

  if (!mcpServers || mcpServers.length === 0) {
    return {
      error: 'No MCP servers configured or could not resolve server',
    };
  }

  const results: any[] = [];

  for (const serverConfig of mcpServers) {
    let client: GenericMCPClient | null = null;
    try {
      let serverUrl = serverConfig.url;

      // Generic Environment Variable Substitution
      // Replaces {VAR_NAME} with process.env.VAR_NAME or user data
      const envVarMatch = serverUrl.match(/\{([A-Z0-9_]+)\}/g);
      if (envVarMatch) {
        const missingVars: string[] = [];
        envVarMatch.forEach((match: string) => {
          const varName = match.slice(1, -1);
          const value = process.env[varName] || (secrets ? secrets[varName] : undefined);

          if (value) {
            serverUrl = serverUrl.replace(match, value);
          } else {
            missingVars.push(varName);
            console.error(`❌ Variable ${varName} not found for URL replacement in MCP server: ${serverConfig.name}`);
          }
        });

        if (missingVars.length > 0) {
          throw new Error(`Missing configuration for ${serverConfig.name}: ${missingVars.join(', ')}. Please add these variables to your Secrets or Environment.`);
        }
      }

      // Initialize MCP client
      const headers = serverConfig.headers || {};
      if (serverConfig.accessToken) {
        headers['Authorization'] = `Bearer ${serverConfig.accessToken}`;
      }

      console.log(`🔌 Connecting to MCP server: ${serverConfig.name} (${serverUrl})`);
      client = new GenericMCPClient(serverUrl, headers);
      await client.connect();



      // ...

      // Determine tool name and arguments
      const toolName = nodeData.mcpTool;
      let toolArgs = nodeData.mcpParams || {};

      // Substitute variables in arguments
      if (toolArgs && typeof toolArgs === 'object') {
        const substitutedArgs: Record<string, any> = {};
        for (const [key, value] of Object.entries(toolArgs)) {
          if (typeof value === 'string') {
            substitutedArgs[key] = substituteVariables(value, state);
          } else {
            substitutedArgs[key] = value;
          }
        }
        toolArgs = substitutedArgs;
      }

      if (!toolName) {
        throw new Error('No tool selected for MCP execution');
      }

      // Execute tool
      console.log(`🔨 Executing MCP tool ${toolName} on ${serverConfig.name}`);
      const result = await client.callTool(toolName, toolArgs);

      console.log(`✅ MCP tool execution completed: ${toolName}`);

      // Extract content from result
      // MCP callTool returns { content: [...], isError: boolean }
      let outputData: any = result;

      if (result && result.content && Array.isArray(result.content)) {
        // Find first text content
        const textContent = result.content.find((c: any) => c.type === 'text')?.text;

        if (textContent) {
          // Try to parse if it looks like JSON
          try {
            // Only parse if it looks like an object/array, otherwise keep as string (e.g. markdown)
            if (textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
              outputData = JSON.parse(textContent);
            } else {
              outputData = textContent;
            }
          } catch {
            outputData = textContent;
          }
        } else {
          // Return full content if no text found usually
          outputData = result.content;
        }
      }

      // Apply field extraction if configured (legacy feature)
      if (nodeData.outputField && nodeData.outputField !== 'full') {
        outputData = extractField(outputData, nodeData.outputField, nodeData.customOutputPath);
      }

      // Update state
      state.variables.lastOutput = outputData; // Store the result

      results.push({
        server: serverConfig.name,
        tool: toolName,
        success: !result.isError,
        data: result,
        output: outputData
      });

    } catch (error) {
      console.error(`❌ MCP execution failed for ${serverConfig.name}:`, error);
      results.push({
        server: serverConfig.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      });
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  // Return combined results
  if (results.some(r => r.success)) {
    const successfulResult = results.find(r => r.success);
    return {
      ...successfulResult,
      results, // Include full results history
      mcpServers: mcpServers.map((s: any) => s.name),
    };
  }

  return {
    error: results.map(r => r.error).join(', ') || 'MCP execution failed',
    results
  };
}
