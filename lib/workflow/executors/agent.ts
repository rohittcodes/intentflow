import { WorkflowNode, WorkflowState, ApiKeys } from '../types';
import { substituteVariables } from '../variable-substitution';
import { resolveMCPServers, migrateMCPData } from '@/lib/mcp/resolver';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GenericMCPClient } from '@/lib/mcp/client';

/**
 * Execute Agent Node - Calls LLM with instructions and tools
 * Server-side only - called from API routes
 */
export async function executeAgentNode(
  node: WorkflowNode,
  state: WorkflowState,
  apiKeys?: ApiKeys
): Promise<any> {
  const { data } = node;
  const logs: any[] = [];

  const addLog = (message: string, level: 'info' | 'warn' | 'error' = 'info', data?: any) => {
    logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    });
  };

  try {
    // Substitute variables in instructions
    const originalInstructions = data.instructions || 'Process the input';
    const instructions = substituteVariables(originalInstructions, state);
    addLog(`Prepared instructions for model ${data.model || 'default'}`);

    // Build context from previous node output
    const lastOutput = state.variables?.lastOutput;

    // INJECT MEMORY CONTEXT
    let memoryContextString = '';
    if (state.memory && Object.keys(state.memory).length > 0) {
      memoryContextString = '\n\nCORE MEMORY CONTEXT:\n' +
        Object.entries(state.memory)
          .map(([key, value]) => `- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
          .join('\n');
    }

    // Migrate data if using old format
    const migratedData = migrateMCPData(data);

    // Resolve MCP server IDs to full configurations
    let mcpTools = migratedData.mcpTools || [];
    if (migratedData.mcpServerIds && migratedData.mcpServerIds.length > 0) {
      // Fetch MCP configurations from registry
      mcpTools = await resolveMCPServers(migratedData.mcpServerIds);
    }

    // Validate API keys are provided
    if (!apiKeys) {
      throw new Error('API keys are required for server-side execution');
    }

    // Server-side execution only
    if (process.env.MOCK_AGENT_RESPONSE) {
      type MockConfig = string | Record<string, unknown>;
      let mockConfig: MockConfig = process.env.MOCK_AGENT_RESPONSE;
      try {
        mockConfig = JSON.parse(process.env.MOCK_AGENT_RESPONSE);
      } catch (e) {
        // Keep raw string if parsing fails
      }

      let mockOutput: unknown = mockConfig;
      if (mockConfig && typeof mockConfig === 'object') {
        const nodeKey = node.id;
        const nodeName = node.data.nodeName as string | undefined;
        mockOutput = mockConfig[nodeKey] ?? (nodeName ? mockConfig[nodeName] : undefined) ?? mockConfig.default ?? mockOutput;
      }

      if (mockOutput !== undefined) {
        const mockChatUpdates = data.includeChatHistory
          ? [
            { role: 'user', content: data.instructions || '' },
            { role: 'assistant', content: typeof mockOutput === 'string' ? mockOutput : JSON.stringify(mockOutput) },
          ]
          : [];

        return {
          __agentValue: mockOutput,
          __agentToolCalls: [],
          __chatHistoryUpdates: mockChatUpdates,
          __variableUpdates: { lastOutput: mockOutput },
        };
      }
    }

    // ── Context Quarantine (Worker Pattern) ────────────────────────────────
    // If lastOutput is very large (>4000 chars) it may overwhelm the main agent
    // context window and create an extended attack surface for prompt injection.
    // The "Worker Pattern" quarantines the large payload by summarizing it with a
    // lightweight secondary LLM call before passing it forward, ensuring the
    // main prompt only receives a concise, safe digest.
    const CONTEXT_QUARANTINE_THRESHOLD = 4000; // chars
    let quarantinedLastOutput = lastOutput;
    if (
      lastOutput !== undefined &&
      lastOutput !== null &&
      typeof lastOutput === 'string' &&
      lastOutput.length > CONTEXT_QUARANTINE_THRESHOLD &&
      apiKeys
    ) {
      try {
        addLog(
          `Context quarantine: lastOutput is ${lastOutput.length} chars, summarizing with worker LLM`,
          'info'
        );
        // Use the same provider/model as the node for summarization
        const modelString2 = data.model || 'anthropic/claude-sonnet-4-5-20250929';
        const summary = await summarizeWithWorker(lastOutput, modelString2, apiKeys, addLog);
        quarantinedLastOutput = summary || lastOutput; // fall back to original if summarization returns empty
        addLog(`Context quarantine: summary produced (${quarantinedLastOutput.length} chars)`, 'info');
      } catch (err) {
        // Non-fatal: fall back to full output (still protected by delimiter defense below)
        addLog(`Context quarantine: summarization failed, using full output`, 'warn', { err });
      }
    }

    // ── Delimiter-Based Prompt Injection Defense ────────────────────────────
    // Wrap dynamic (untrusted) content in XML delimiters so the model can
    // clearly distinguish the developer's trusted instructions from user- or
    // pipeline-supplied data. This mitigates prompt-injection attacks where
    // a malicious payload in `lastOutput` tries to override system instructions.
    let sanitizedContextSection = '';
    if (quarantinedLastOutput !== undefined && quarantinedLastOutput !== null && quarantinedLastOutput !== '') {
      const dynamicContent =
        typeof quarantinedLastOutput === 'string' ? quarantinedLastOutput : JSON.stringify(quarantinedLastOutput, null, 2);
      sanitizedContextSection =
        `\n\n<dynamic_data>\n${dynamicContent}\n</dynamic_data>`;
    }

    // ── Context Window Management (Sliding Window + Compression) ────────────
    const MAX_SHALLOW_HISTORY = 10; // last 10 messages kept as-is
    let processedMessages = [...state.chatHistory];
    let historicalSummary = '';

    if (data.includeChatHistory && processedMessages.length > MAX_SHALLOW_HISTORY) {
      addLog(`Chat history is long (${processedMessages.length} messages). Compressing older turns.`);
      
      const toCompress = processedMessages.slice(0, processedMessages.length - MAX_SHALLOW_HISTORY);
      const slidingWindow = processedMessages.slice(processedMessages.length - MAX_SHALLOW_HISTORY);
      
      try {
        const historyText = toCompress.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const summary = await summarizeWithWorker(
          historyText, 
          data.model || 'openai/gpt-4o-mini', 
          apiKeys, 
          addLog,
          'You are a conversation summarizer. Provide a concise summary of the key decisions, accomplishments, and data points discussed in this conversation history. This summary will be used by an agent to maintain context.'
        );
        
        if (summary) {
          historicalSummary = `RECAP OF PREVIOUS CONVERSATION TURNS:\n${summary}\n\n`;
          processedMessages = slidingWindow;
          addLog(`Compression complete. Truncated ${toCompress.length} messages.`);
        }
      } catch (err) {
        addLog('History compression failed, falling back to full history', 'warn', { err });
      }
    }

    // Compose the full safe prompt:
    // [Intro recap] + [Trusted instructions] + [Memory context] + <dynamic_data>…</dynamic_data>
    const contextualPrompt = historicalSummary + instructions + memoryContextString + sanitizedContextSection;
    addLog('Prompt built with context compression and delimiter-based injection defense');

    // Prepare messages
    const messages = data.includeChatHistory && processedMessages.length > 0
      ? [
        ...processedMessages,
        { role: 'user' as const, content: contextualPrompt },
      ]
      : [{ role: 'user' as const, content: contextualPrompt }];

    // Parse model string (handle models with slashes like groq/openai/gpt-oss-120b)
    const modelString = data.model || 'anthropic/claude-sonnet-4-5-20250929';
    let provider: string;
    let modelName: string;

    if (modelString.includes('/')) {
      const firstSlashIndex = modelString.indexOf('/');
      provider = modelString.substring(0, firstSlashIndex);
      modelName = modelString.substring(firstSlashIndex + 1);
    } else {
      provider = 'openai';
      modelName = modelString;
    }

    addLog(`Calling provider ${provider} for model ${modelName}`, 'info', { provider, model: modelName });

    // Use native SDKs for better MCP support
    let responseText = '';
    interface LLMUsage {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
      prompt_tokens?: number;
      completion_tokens?: number;
      [key: string]: unknown;
    }
    let usage: LLMUsage = {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
    };
    let toolCalls: any[] = [];

    // Discovery Mode Setup
    const discoveryMode = data.discoveryMode || 'static';
    const isDynamic = discoveryMode === 'dynamic' || discoveryMode === 'optimized';

    // Check if MCP tools are configured
    // mcpTools already resolved above from mcpServerIds or mcpTools
    let currentMcpTools = [...mcpTools];
    let discoveredTools: any[] = [];

    // Internal Tools for Discovery
    // Internal Tools for Discovery - Use Record<string, any> to avoid union inference
    const discoveryTools: Array<Record<string, any>> = [
      {
        name: 'search_mcp_tools',
        description: 'Search for available MCP tools by keywords or functionality. Returns names and descriptions.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search keywords (e.g. "search google", "send email")' },
          },
          required: ['query'],
        },
      },
      {
        name: 'load_mcp_tool',
        description: 'Loads the full schema and activates a tool for use in the next step.',
        parameters: {
          type: 'object',
          properties: {
            toolName: { type: 'string', description: 'Exact name of the tool to load' },
          },
          required: ['toolName'],
        },
      }
    ];

    if (discoveryMode === 'optimized') {
      discoveryTools.push({
        name: 'run_code',
        description: 'Execute JavaScript or Python code to process data or call multiple tools at once (High performance).',
        parameters: {
          type: 'object',
          properties: {
            language: { type: 'string', enum: ['javascript', 'python'] },
            code: { type: 'string', description: 'The code to execute' },
          },
          required: ['language', 'code'],
        },
      });
    }

    const hasMcpTools = currentMcpTools.length > 0;

    // Separate Arcade from real MCP tools
    const arcadeTools = currentMcpTools.filter((mcp: any) => mcp.name?.toLowerCase().includes('arcade'));
    const realMcpTools = currentMcpTools.filter((mcp: any) => !mcp.name?.toLowerCase().includes('arcade'));

    if (arcadeTools.length > 0) {
      console.warn('⚠️ Arcade tools detected in MCP config - these will be skipped');
    }

    if (provider === 'anthropic' && apiKeys?.anthropic) {
      // Use native Anthropic SDK for MCP support
      const client = new Anthropic({ apiKey: apiKeys.anthropic });

      if (hasMcpTools || isDynamic) {
        // Build initial MCP servers and tools
        const mcpServers = realMcpTools.map((mcp: any) => ({
          type: 'url' as const,
          url: mcp.url.includes('{FIRECRAWL_API_KEY}')
            ? mcp.url.replace('{FIRECRAWL_API_KEY}', apiKeys.firecrawl || '')
            : mcp.url,
          name: mcp.name,
          authorization_token: mcp.accessToken,
        }));

        // MAX 5 discovery turns to avoid infinite loops
        let turns = 0;
        const maxTurns = 5;
        let currentMessages = [...messages];

        while (turns < maxTurns) {
          turns++;
          addLog(`Starting discovery turn ${turns}/${maxTurns}`);

          // In dynamic mode, add discovery tools
          const currentTools = isDynamic ? [...discoveryTools] : [];

          const response = await client.beta.messages.create({
            model: modelName,
            max_tokens: 4096,
            messages: currentMessages as any,
            mcp_servers: mcpServers as any,
            tools: isDynamic ? discoveryTools as any : undefined,
            betas: ['mcp-client-2025-04-04'],
          } as any);

          const toolUses = response.content.filter((item: any) =>
            item.type === 'tool_use' || item.type === 'mcp_tool_use'
          );
          const toolResults = response.content.filter((item: any) =>
            item.type === 'tool_result' || item.type === 'mcp_tool_result'
          );
          const textBlocks = response.content.filter((item: any) => item.type === 'text');

          responseText = textBlocks.map((item: any) => item.text).join('\n');
          usage = {
            input_tokens: (usage.input_tokens || 0) + (response.usage?.input_tokens || 0),
            output_tokens: (usage.output_tokens || 0) + (response.usage?.output_tokens || 0),
          };

          // Handle Discovery Tools
          const discoveryCalls = toolUses.filter((item: any) =>
            ['search_mcp_tools', 'load_mcp_tool', 'run_code'].includes(item.name)
          );

          if (discoveryCalls.length === 0) {
            // No discovery tools called, process results normally and break
            toolCalls = [...toolCalls, ...toolUses.map((item: any, idx: number) => {
              const res = toolResults[idx] as any;
              return {
                type: item.type,
                name: item.name,
                server_name: item.server_name || 'MCP',
                arguments: item.input,
                tool_use_id: item.id,
                output: res?.content
              };
            })];
            break;
          }

          // Execute Discovery Tools and continue loop
          let discoveryResults: any[] = [];
          for (const call of discoveryCalls) {
            const toolCall = call as any;
            const args = toolCall.input as any;
            let result: any = null;

            if (toolCall.name === 'search_mcp_tools') {
              // Semantic Search via Convex registry
              const convex = await import('@/lib/mcp/resolver').then(async (m) => {
                // Initialize Convex client
                const { ConvexHttpClient } = require('convex/browser');
                return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
              });

              const { api } = await import('@/convex/_generated/api') as any;
              const tools = await (convex as any).query(api.mcpTools.search, {
                userId: state.variables?.userId as string || "default_user",
                query: args.query,
                limit: 10
              });

              result = (tools || []).map((t: any) => ({
                name: t.name,
                description: t.description,
                server: t.serverId
              }));
            } else if (toolCall.name === 'load_mcp_tool') {
              // Hydrate full schema for next turn
              const convex = new (require('convex/browser').ConvexHttpClient)(process.env.NEXT_PUBLIC_CONVEX_URL!);
              const { api } = await import('@/convex/_generated/api') as any;

              // Find the tool and its server info
              const tool = await (convex as any).query(api.mcpTools.search, {
                userId: state.variables?.userId as string || "default_user",
                query: args.toolName,
                limit: 1
              }).then((res: any) => res?.[0]);

              if (tool) {
                // Fetch the server info to get the URL
                const server = await (convex as any).query(api.mcpServers.getMCPServer, {
                  id: tool.serverId
                });

                if (server) {
                  // Add to active mcpServers if not already there
                  const alreadyActive = mcpServers.some(s => s.name === server.name);
                  if (!alreadyActive) {
                    mcpServers.push({
                      type: 'url' as const,
                      url: server.url.includes('{FIRECRAWL_API_KEY}')
                        ? server.url.replace('{FIRECRAWL_API_KEY}', apiKeys.firecrawl || '')
                        : server.url,
                      name: server.name,
                      authorization_token: server.accessToken,
                    });
                  }

                  result = { status: "loaded", tool: tool.name, server: server.name };
                } else {
                  result = { status: "error", message: "Server not found" };
                }
              } else {
                result = { status: "error", message: "Tool not found" };
              }
            } else if (toolCall.name === 'run_code') {
              // Built-in Code Interpreter
              const { executeCodeNode } = await import('./code');
              const codeResult = await executeCodeNode({
                ...node,
                data: { ...node.data, language: args.language, code: args.code }
              }, state, apiKeys);
              result = codeResult;
            }

            discoveryResults.push({
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          }

          // Update messages for next turn
          currentMessages = [
            ...currentMessages,
            { role: 'assistant' as const, content: response.content as any },
            ...discoveryResults as any
          ];
          addLog(`Discovery turn ${turns} complete: ${toolUses.length} tools used, ${discoveryCalls.length} discovery actions`);
          continue;
        }
      } else {
        // Regular Anthropic call without MCP
        const response = await client.messages.create({
          model: modelName,
          max_tokens: 4096,
          messages: messages as any,
        });

        responseText = response.content[0].type === 'text' ? response.content[0].text : '';
        usage = (response.usage as any) || {};
      }
    } else if (provider === 'openai' && apiKeys?.openai) {
      const hasMcpTools = mcpTools && mcpTools.length > 0;

      if (hasMcpTools) {
        // Use native OpenAI SDK for function calling
        const client = new OpenAI({ apiKey: apiKeys.openai });

        // Convert MCP tools to OpenAI function format
        const tools = mcpTools.map((mcp: any) => ({
          type: "function" as const,
          function: {
            name: mcp.name || mcp.toolName || 'unknown_tool',
            description: mcp.description || 'No description',
            parameters: {
              type: "object",
              properties: mcp.schema?.properties || {},
              required: mcp.schema?.required || []
            }
          }
        }));

        // First call with tools
        const response = await client.chat.completions.create({
          model: modelName,
          messages: messages as any,
          tools,
          tool_choice: "auto"
        });

        const message = response.choices[0].message;
        usage = (response.usage as unknown as LLMUsage) || ({} as LLMUsage);

        // Handle tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          // Execute MCP tools
          const toolResults = await Promise.all(
            message.tool_calls.map(async (call: any) => {
              try {
                // Find the MCP server for this tool
                const mcpServer = mcpTools.find((m: any) =>
                  (m.name || m.toolName) === call.function.name
                );

                if (!mcpServer) {
                  throw new Error(`MCP server not found for tool: ${call.function.name}`);
                }

                // Parse arguments
                const args = JSON.parse(call.function.arguments);

                // Instantiate MCP client
                let serverUrl = mcpServer.url;

                // Generic Environment Variable Substitution
                const envVarMatch = serverUrl.match(/\{([A-Z0-9_]+)\}/g);
                if (envVarMatch) {
                  envVarMatch.forEach((match: string) => {
                    const envVar = match.slice(1, -1);
                    const envValue = process.env[envVar];
                    if (envValue) {
                      serverUrl = serverUrl.replace(match, envValue);
                    }
                  });
                }

                console.log(`🔌 Agent connecting to MCP server for tool ${call.function.name}: ${serverUrl}`);

                const headers = mcpServer.headers || {};
                if (mcpServer.accessToken) {
                  headers['Authorization'] = `Bearer ${mcpServer.accessToken}`;
                }

                const client = new GenericMCPClient(serverUrl, headers);
                await client.connect();

                // Call the tool
                try {
                  const result = await client.callTool(call.function.name, args);
                  await client.close();

                  // Extract content
                  let content = '';
                  if (result && result.content && Array.isArray(result.content)) {
                    // Combine text content
                    content = result.content
                      .filter((c: any) => c.type === 'text')
                      .map((c: any) => c.text)
                      .join('\n');

                    // If no text, try to stringify everything
                    if (!content) {
                      content = JSON.stringify(result.content);
                    }
                  } else {
                    content = JSON.stringify(result);
                  }

                  return {
                    tool_call_id: call.id,
                    role: "tool" as const,
                    content: content || "Success"
                  };
                } catch (error) {
                  await client.close();
                  throw error;
                }
              } catch (error) {
                return {
                  tool_call_id: call.id,
                  role: "tool" as const,
                  content: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
                };
              }
            })
          );

          // Second call with tool results
          const finalResponse = await client.chat.completions.create({
            model: modelName,
            messages: [
              ...messages as any,
              message,
              ...toolResults
            ]
          });

          responseText = finalResponse.choices[0].message.content || '';
          usage = {
            ...usage,
            prompt_tokens: (usage.prompt_tokens || 0) + (finalResponse.usage?.prompt_tokens || 0),
            completion_tokens: (usage.completion_tokens || 0) + (finalResponse.usage?.completion_tokens || 0),
            total_tokens: (usage.total_tokens || 0) + (finalResponse.usage?.total_tokens || 0),
          };

          // Track tool calls
          toolCalls = message.tool_calls.map((call: any, idx) => ({
            id: call.id,
            name: call.function.name,
            arguments: JSON.parse(call.function.arguments),
            output: toolResults[idx] ? JSON.parse(toolResults[idx].content) : null
          }));
        } else {
          responseText = message.content || '';
        }
      } else {
        // Regular OpenAI call without MCP tools
        const model = new ChatOpenAI({
          apiKey: apiKeys.openai,
          model: modelName,
        });

        const response = await model.invoke(messages);
        responseText = response.content as string;
        usage = (response as any).response_metadata?.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
      }
    } else if (provider === 'groq' && apiKeys?.groq) {
      const hasMcpTools = mcpTools && mcpTools.length > 0;

      if (hasMcpTools) {
        // Use Groq Responses API for MCP support
        const client = new OpenAI({
          apiKey: apiKeys.groq,
          baseURL: 'https://api.groq.com/openai/v1',
        });

        // Convert MCP tools to Groq Responses API format
        const tools = mcpTools.map((mcp: any) => ({
          type: "mcp" as const,
          server_label: mcp.name || mcp.toolName || 'unknown_tool',
          server_url: mcp.url,
        }));

        // Use Responses API endpoint for MCP support
        const response = await client.responses.create({
          model: modelName,
          input: messages[messages.length - 1].content as string,
          tools,
        } as any);

        responseText = (response as any).output_text || '';
        usage = (response as any).usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

        // Track tool calls if available
        const outputs = (response as any).output || [];
        toolCalls = outputs
          .filter((o: any) => o.type === 'tool_use')
          .map((o: any) => ({
            id: o.id,
            name: o.name,
            arguments: o.input,
            output: null,
          }));
      } else {
        // Regular Groq chat completions for non-MCP calls
        const model = new ChatOpenAI({
          apiKey: apiKeys.groq,
          model: modelName,
          configuration: {
            baseURL: 'https://api.groq.com/openai/v1',
          },
        });

        const response = await model.invoke(messages);
        responseText = response.content as string;
        usage = (response as any).response_metadata?.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
      }
    } else if (provider === 'google' && apiKeys?.google) {
      const hasMcpTools = mcpTools && mcpTools.length > 0;
      const model = new ChatGoogleGenerativeAI({
        apiKey: apiKeys.google,
        model: modelName,
      });

      if (hasMcpTools) {
        // Convert MCP tools format for Google SDK binding
        const tools = mcpTools.map((mcp: any) => ({
          name: mcp.name || mcp.toolName || 'unknown_tool',
          description: mcp.description || 'No description',
          schema: mcp.schema || { type: 'object', properties: {} },
        }));

        const modelWithTools = model.bindTools(tools);
        const response = await modelWithTools.invoke(messages);

        responseText = (response.content as string) || '';
        usage = (response as any).response_metadata?.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

        if (response.tool_calls && response.tool_calls.length > 0) {
          toolCalls = response.tool_calls.map((call: any) => ({
            id: call.id || Math.random().toString(36).substring(7),
            name: call.name,
            arguments: call.args,
            output: null,
          }));
        }
      } else {
        const response = await model.invoke(messages);
        responseText = response.content as string;
        usage = (response as any).response_metadata?.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
      }
    } else {
      throw new Error(`No API key available for provider: ${provider}`);
    }

    // Prepare chat history updates (IMMUTABLE - don't mutate state)
    const serverChatUpdates = data.includeChatHistory
      ? [
        { role: 'user', content: data.instructions || '' },
        { role: 'assistant', content: responseText },
      ]
      : [];

    let output: unknown = responseText;
    if (data.outputFormat === 'JSON') {
      try {
        output = JSON.parse(responseText);
      } catch (e) {
        console.warn('Could not parse JSON output, using raw text');
      }
    }

    // Return immutable updates (don't mutate state)
    return {
      __agentValue: output,
      __agentToolCalls: toolCalls,
      __chatHistoryUpdates: serverChatUpdates,
      __variableUpdates: { lastOutput: output },
      __logs: logs,
      __usage: usage,
    };
  } catch (error) {
    console.error('Agent execution error:', error);

    // User-friendly error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('API key') || errorMessage.includes('api_key')) {
      throw new Error('Missing API key. Please add your LLM provider key in Settings.');
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      throw new Error('Rate limited. Please wait a moment and try again.');
    }

    if (errorMessage.includes('No API key available')) {
      throw new Error('No API key configured. Please add an Anthropic, OpenAI, or Groq API key in your .env.local file.');
    }

    throw new Error(`Agent execution failed: ${errorMessage}`);
  }
}

/**
 * Context Quarantine Worker (Worker Pattern)
 *
 * Summarizes a large upstream output using a lightweight LLM call before it
 * is injected into the main agent prompt. An isolated, constrained LLM
 * processes untrusted data and returns only a safe, structured digest to the
 * main orchestrator — significantly reducing the prompt-injection attack surface.
 */
async function summarizeWithWorker(
  content: string,
  modelStr: string,
  apiKeys: ApiKeys,
  addLog: (msg: string, level?: 'info' | 'warn' | 'error', data?: any) => void,
  systemPrompt?: string
): Promise<string | null> {
  const defaultPrompt = [
    'You are a data summarization assistant. Produce a concise, factual summary of the content below.',
    'Preserve key facts, numbers, and identifiers. Output ONLY the summary — no preamble, no commentary.',
    '',
    '<content_to_summarize>',
    content.slice(0, 20000), // Hard cap to prevent summarizer overload
    '</content_to_summarize>',
  ].join('\n');

  const finalPrompt = systemPrompt 
    ? [systemPrompt, '', '<content>', content.slice(0, 20000), '</content>'].join('\n')
    : defaultPrompt;

  const firstSlash = modelStr.indexOf('/');
  const provider = firstSlash === -1 ? 'openai' : modelStr.substring(0, firstSlash);
  const modelName = firstSlash === -1 ? modelStr : modelStr.substring(firstSlash + 1);

  try {
    if (provider === 'anthropic' && apiKeys.anthropic) {
      const client = new Anthropic({ apiKey: apiKeys.anthropic });
      const response = await client.messages.create({
        model: modelName,
        max_tokens: 512,
        messages: [{ role: 'user', content: finalPrompt }],
      });
      const block = response.content[0];
      return block.type === 'text' ? (block as { type: 'text'; text: string }).text : null;
    }

    if (apiKeys.openai) {
      const client = new OpenAI({ apiKey: apiKeys.openai });
      const response = await client.chat.completions.create({
        model: provider === 'openai' ? modelName : 'gpt-4o-mini',
        max_tokens: 512,
        messages: [{ role: 'user', content: finalPrompt }],
      });
      return response.choices[0]?.message?.content ?? null;
    }

    if (provider === 'google' && apiKeys.google) {
      const client = new ChatGoogleGenerativeAI({
        apiKey: apiKeys.google,
        model: 'gemini-2.0-flash', // Updated to current stable
        maxOutputTokens: 512,
      });
      const response = await client.invoke(finalPrompt);
      return response.content as string;
    }

    addLog('summarizeWithWorker: no supported API key — skipping summarization', 'warn');
    return null;
  } catch (err) {
    addLog('summarizeWithWorker: LLM call failed', 'warn', { err });
    return null;
  }
}
