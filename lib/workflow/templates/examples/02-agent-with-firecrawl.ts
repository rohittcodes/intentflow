import { Workflow } from '../../types';

/**
 * Example 2: Agent with Rube Tool (MCP Integration)
 *
 * This workflow demonstrates how to give an agent access to Firecrawl MCP tools
 * for web scraping and searching.
 *
 * Flow: Start -> Agent (with Firecrawl MCP) -> End
 *
 * Use case: Web research, data gathering, content extraction from URLs
 *
 * REQUIREMENTS:
 * - FIRECRAWL_API_KEY environment variable
 * - AI provider with MCP/function calling support
 *
 * MCP TOOL SUPPORT BY PROVIDER:
 * - Anthropic (Claude): ✅ Native MCP support via beta API
 * - OpenAI (GPT-4o): ✅ Function calling support (converted from MCP)
 * - Groq (gpt-oss-20b/120b): ✅ Native MCP via Responses API
 *
 * All three providers support MCP tools! Choose based on speed, cost, and model preference.
 */
export const agentWithRube: Workflow = {
  id: 'example-02-agent-with-rube',
  name: 'Example 2: Agent with Rube MCP',
  description: 'An agent that can search and scrape the web using Rube MCP',
  category: 'examples',
  tags: ['example', 'beginner', 'rube', 'tools'],
  estimatedTime: '2-3 minutes',
  difficulty: 'beginner',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: [
    {
      id: 'start',
      type: 'start',
      position: { x: 100, y: 200 },
      data: {
        label: 'Start',
        nodeType: 'start',
        nodeName: 'Start',
        inputVariables: [
          {
            name: 'search_query',
            type: 'string',
            required: true,
            description: 'What would you like to research on the web?',
            defaultValue: 'latest AI developments in 2025',
          },
        ],
      },
    },
    {
      id: 'research-agent',
      type: 'agent',
      position: { x: 350, y: 200 },
      data: {
        label: 'Web Research Agent',
        nodeType: 'agent',
        nodeName: 'Web Research Agent',
        instructions: `You are a web research assistant with access to Rube MCP tools. Your task:

1. Use the search tool to search for: {{input.search_query}}
2. Review the search results and identify the most relevant sources
3. If needed, use scrape to get detailed content from specific URLs
4. Synthesize the information into a clear, well-organized summary

Provide a comprehensive summary with key findings, organized by topic or source.`,
        model: 'anthropic/claude-sonnet-4-20250514', // Also: openai/gpt-4o or groq/gpt-oss-20b
        outputFormat: 'Text',
        mcpTools: [
          {
            name: 'Rube MCP',
            url: 'https://rube.app/mcp',
          },
        ],
      },
    },
    {
      id: 'end',
      type: 'end',
      position: { x: 600, y: 200 },
      data: {
        label: 'End',
        nodeType: 'end',
        nodeName: 'End',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'research-agent' },
    { id: 'e2', source: 'research-agent', target: 'end' },
  ],
};
