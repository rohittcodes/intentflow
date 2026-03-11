import { Workflow } from '../../types';

/**
 * Example 3: Scrape, Summarize, and Post to Google Docs (MCP + Arcade)
 *
 * This workflow demonstrates a practical multi-step workflow:
 * 1. Scrape content from a URL using Rube MCP
 * 2. Summarize the content with an AI agent
 * 3. Create a Google Doc with the summary using Arcade
 *
 * Flow: Start -> Scrape Agent (MCP) -> Summarize Agent -> Create Doc (Arcade) -> End
 *
 * Use case: Research automation, content curation, report generation
 *
 * REQUIREMENTS:
 * - FIRECRAWL_API_KEY environment variable (for MCP)
 * - ARCADE_API_KEY environment variable (for Google Docs integration)
 * - User authorization for Google Docs access
 * - Workflow executor must support MCP via @langchain/mcp-adapters
 *
 * TESTING:
 * - MCP integration: Verified working with OpenAI, Groq, and Anthropic ✅
 * - Arcade integration: Requires user authorization flow
 */
export const rubeScrapeSummarizeDocs: Workflow = {
  id: 'example-03-rube-summarize-docs',
  name: 'Example 3: Rube Scrape, Summarize & Post to Docs',
  description: 'Scrape a website with Rube, summarize content, and create a Google Doc',
  category: 'examples',
  tags: ['example', 'intermediate', 'rube', 'arcade', 'google-docs'],
  estimatedTime: '3-5 minutes',
  difficulty: 'intermediate',
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
            name: 'url',
            type: 'string',
            required: true,
            description: 'URL to scrape',
            defaultValue: 'https://www.anthropic.com/news',
          },
          {
            name: 'doc_title',
            type: 'string',
            required: true,
            description: 'Title for the Google Doc',
            defaultValue: 'AI News Summary',
          },
          {
            name: 'user_id',
            type: 'string',
            required: true,
            description: 'User ID for authorization',
            defaultValue: 'user_123',
          },
        ],
      },
    },
    {
      id: 'scrape-agent',
      type: 'agent',
      position: { x: 350, y: 200 },
      data: {
        label: 'Scrape Website',
        nodeType: 'agent',
        nodeName: 'Scrape Website',
        instructions: `Use Rube MCP tools to scrape the content from this URL: {{input.url}}

Use the scrape tool to get the markdown content.

Extract the main content, focusing on:
- Article titles
- Key points
- Important information

Return the scraped content in a clean, organized format.`,
        model: 'anthropic/claude-sonnet-4-20250514',
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
      id: 'summarize-agent',
      type: 'agent',
      position: { x: 600, y: 200 },
      data: {
        label: 'Summarize Content',
        nodeType: 'agent',
        nodeName: 'Summarize Content',
        instructions: `Analyze the following scraped content and create a professional summary:

{{lastOutput}}

Create a well-structured summary with:
1. Executive Summary (2-3 sentences)
2. Key Points (bullet points)
3. Detailed Findings (organized by topic)
4. Conclusion

Format it in a way that's suitable for a Google Doc.`,
        model: 'anthropic/claude-sonnet-4-20250514',
        outputFormat: 'Text',
      },
    },
    {
      id: 'create-doc',
      type: 'arcade',
      position: { x: 850, y: 200 },
      data: {
        label: 'Create Google Doc',
        nodeType: 'arcade',
        nodeName: 'Create Google Doc',
        arcadeTool: 'Google.CreateDocument',
        arcadeInput: {
          title: '{{input.doc_title}}',
          text: '{{lastOutput}}',
        },
        arcadeUserId: '{{input.user_id}}',
      },
    },
    {
      id: 'end',
      type: 'end',
      position: { x: 1100, y: 200 },
      data: {
        label: 'End',
        nodeType: 'end',
        nodeName: 'End',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'scrape-agent' },
    { id: 'e2', source: 'scrape-agent', target: 'summarize-agent' },
    { id: 'e3', source: 'summarize-agent', target: 'create-doc' },
    { id: 'e4', source: 'create-doc', target: 'end' },
  ],
};
