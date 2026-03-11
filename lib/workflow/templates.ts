import { Workflow } from './types';

/**
 * Modern Intentflow Templates
 * Showcases Memory, Core Routing, and Human-in-the-Loop workflows
 */

const templates: Record<string, Workflow> = {
  // =============================================================================
  // Support Ticket Triage (Router Demo)
  // =============================================================================
  'support-ticket-triage': {
    id: 'support-ticket-triage',
    name: 'Support Ticket Triage (Router)',
    description: 'Use an AI Router to classify support tickets and branch to specific agents based on the topic.',
    category: 'Customer Support',
    tags: ['support', 'router', 'classification', 'branching'],
    difficulty: 'intermediate',
    estimatedTime: '3-4 minutes',
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 300 },
        data: {
          nodeType: 'start',
          label: 'Start (Incoming Ticket)',
          nodeName: 'Start',
          inputVariables: [
            { name: 'ticket_description', type: 'string', required: true, description: 'The customer support ticket', defaultValue: 'I was double charged for my subscription this month.' }
          ]
        }
      },
      {
        id: 'agent-classifier',
        type: 'agent',
        position: { x: 350, y: 300 },
        data: {
          nodeType: 'agent',
          label: 'Classify Ticket',
          nodeName: 'Classify Ticket',
          instructions: 'Classify the following support ticket into one of three categories: billing, technical, or general.\nTicket: {{input.ticket_description}}\n\nRespond with ONLY valid JSON:\n{\n  "category": "billing" | "technical" | "general"\n}',
          model: 'groq/openai/gpt-oss-120b',
          outputFormat: 'JSON',
          jsonOutputSchema: JSON.stringify({
            type: 'object',
            properties: { category: { type: 'string', enum: ['billing', 'technical', 'general'] } },
            required: ['category']
          })
        }
      },
      {
        id: 'router',
        type: 'router',
        position: { x: 600, y: 300 },
        data: {
          nodeType: 'router',
          label: 'Ticket Router',
          nodeName: 'Router',
          routes: [
            { id: 'billing', label: 'Billing Route', condition: 'input.category === "billing"' },
            { id: 'technical', label: 'Technical Route', condition: 'input.category === "technical"' },
            { id: 'general', label: 'General Route', condition: 'input.category === "general"' }
          ]
        }
      },
      {
        id: 'billing-agent',
        type: 'transform',
        position: { x: 850, y: 150 },
        data: {
          nodeType: 'transform',
          label: 'Handle Billing',
          nodeName: 'Billing Agent',
          transformScript: 'return { response: "Billing Team has been notified about the double charge. Support ticket automatically flagged." };'
        }
      },
      {
        id: 'tech-agent',
        type: 'transform',
        position: { x: 850, y: 300 },
        data: {
          nodeType: 'transform',
          label: 'Handle Technical',
          nodeName: 'Tech Agent',
          transformScript: 'return { response: "Technical Support team paged to investigate system issue." };'
        }
      },
      {
        id: 'general-agent',
        type: 'transform',
        position: { x: 850, y: 450 },
        data: {
          nodeType: 'transform',
          label: 'Handle General',
          nodeName: 'General Agent',
          transformScript: 'return { response: "Auto-reply sent for general inquiry." };'
        }
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 1100, y: 300 },
        data: {
          nodeType: 'end',
          label: 'End',
          nodeName: 'End'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'agent-classifier' },
      { id: 'e2', source: 'agent-classifier', target: 'router' },
      { id: 'e3', source: 'router', target: 'billing-agent', sourceHandle: 'billing' },
      { id: 'e4', source: 'router', target: 'tech-agent', sourceHandle: 'technical' },
      { id: 'e5', source: 'router', target: 'general-agent', sourceHandle: 'general' },
      { id: 'e6', source: 'billing-agent', target: 'end' },
      { id: 'e7', source: 'tech-agent', target: 'end' },
      { id: 'e8', source: 'general-agent', target: 'end' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // =============================================================================
  // Memory-Augmented Assistant (Mem0-style Demo)
  // =============================================================================
  'memory-augmented-assistant': {
    id: 'memory-augmented-assistant',
    name: 'Memory-Augmented Assistant',
    description: 'A multi-turn chat assistant that recalls facts about the user using Mem0-style Memory architecture.',
    category: 'Virtual Assistant',
    tags: ['memory', 'assistant', 'chat', 'mem0'],
    difficulty: 'advanced',
    estimatedTime: '5-10 minutes',
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 200 },
        data: {
          nodeType: 'start',
          label: 'User Message',
          nodeName: 'Start',
          inputVariables: [
            { name: 'user_message', type: 'string', required: true, description: 'What the user says to the assistant', defaultValue: 'Hi, I need help planning my trip to Japan next week.' }
          ]
        }
      },
      {
        id: 'memory-retrieve',
        type: 'memory',
        position: { x: 350, y: 200 },
        data: {
          nodeType: 'memory',
          label: 'Retrieve Context',
          nodeName: 'Retrieve Context',
          memoryMode: 'retrieve',
          memoryScope: 'user',
          memoryQuery: '{{input.user_message}}',
          memoryTopK: 5
        }
      },
      {
        id: 'assistant-agent',
        type: 'agent',
        position: { x: 600, y: 200 },
        data: {
          nodeType: 'agent',
          label: 'Generate Response',
          nodeName: 'Generate Response',
          instructions: 'You are a helpful AI assistant with memory.\n\nThe user says: {{input.user_message}}\n\nRelevant past memories retrieved about this user:\n{{lastOutput}}\n\nGenerate a helpful, contextual response.',
          model: 'anthropic/claude-sonnet-4-20250514',
          outputFormat: 'Text',
          includeChatHistory: true
        }
      },
      {
        id: 'memory-save',
        type: 'memory',
        position: { x: 850, y: 200 },
        data: {
          nodeType: 'memory',
          label: 'Smart Save Facts',
          nodeName: 'Smart Save Facts',
          memoryMode: 'smart',
          memoryScope: 'user',
          memoryAgentId: 'assistant-agent'
        }
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 1100, y: 200 },
        data: {
          nodeType: 'end',
          label: 'End',
          nodeName: 'End'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'memory-retrieve' },
      { id: 'e2', source: 'memory-retrieve', target: 'assistant-agent' },
      { id: 'e3', source: 'assistant-agent', target: 'memory-save' },
      { id: 'e4', source: 'memory-save', target: 'end' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // =============================================================================
  // Multi-Agent Content Reviewer
  // =============================================================================
  'multi-agent-content-reviewer': {
    id: 'multi-agent-content-reviewer',
    name: 'Multi-Agent Content Reviewer',
    description: 'Two AI agents work together: one drafts content, the other acts as a critic to review and approve it.',
    category: 'Content Creation',
    tags: ['multi-agent', 'review', 'critic', 'content'],
    difficulty: 'intermediate',
    estimatedTime: '3-5 minutes',
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 300 },
        data: {
          nodeType: 'start',
          label: 'Start (Topic)',
          nodeName: 'Start',
          inputVariables: [
            { name: 'topic', type: 'string', required: true, description: 'The topic to write about', defaultValue: 'The future of remote work and AI.' }
          ]
        }
      },
      {
        id: 'draft-agent',
        type: 'agent',
        position: { x: 350, y: 300 },
        data: {
          nodeType: 'agent',
          label: 'Draft Content',
          nodeName: 'Draft Agent',
          instructions: 'Write a professional, 200-word blog post section about the following topic: {{input.topic}}',
          model: 'anthropic/claude-sonnet-4-20250514',
          outputFormat: 'Text'
        }
      },
      {
        id: 'critic-agent',
        type: 'agent',
        position: { x: 600, y: 300 },
        data: {
          nodeType: 'agent',
          label: 'Critic Review',
          nodeName: 'Critic Agent',
          instructions: 'You are a strict editor. Review the following drafted content.\n\nContent:\n{{lastOutput}}\n\nEvaluate if it is professional, engaging, and directly addresses the topic. Respond with JSON indicating if it is approved, and any feedback.\n\nFormat:\n{\n  "approved": boolean,\n  "feedback": "string"\n}',
          model: 'anthropic/claude-sonnet-4-20250514',
          outputFormat: 'JSON',
          jsonOutputSchema: JSON.stringify({
            type: 'object',
            properties: {
              approved: { type: 'boolean' },
              feedback: { type: 'string' }
            },
            required: ['approved', 'feedback']
          })
        }
      },
      {
        id: 'router',
        type: 'if-else',
        position: { x: 850, y: 300 },
        data: {
          nodeType: 'if-else',
          label: 'Check Approval',
          nodeName: 'Approval Check',
          condition: 'lastOutput.approved === true',
          trueLabel: 'Approved',
          falseLabel: 'Rejected'
        }
      },
      {
        id: 'approved-transform',
        type: 'transform',
        position: { x: 1100, y: 150 },
        data: {
          nodeType: 'transform',
          label: 'Format Approved',
          nodeName: 'Approved Transform',
          transformScript: 'return { status: "Published", content: nodeResults["draft-agent"].output, editorFeedback: lastOutput.feedback };'
        }
      },
      {
        id: 'rejected-transform',
        type: 'transform',
        position: { x: 1100, y: 450 },
        data: {
          nodeType: 'transform',
          label: 'Format Rejected',
          nodeName: 'Rejected Transform',
          transformScript: 'return { status: "Needs Revision", originalDraft: nodeResults["draft-agent"].output, editorFeedback: lastOutput.feedback };'
        }
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 1350, y: 300 },
        data: {
          nodeType: 'end',
          label: 'End',
          nodeName: 'End'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'draft-agent' },
      { id: 'e2', source: 'draft-agent', target: 'critic-agent' },
      { id: 'e3', source: 'critic-agent', target: 'router' },
      { id: 'e4', source: 'router', target: 'approved-transform', sourceHandle: 'true' },
      { id: 'e5', source: 'router', target: 'rejected-transform', sourceHandle: 'false' },
      { id: 'e6', source: 'approved-transform', target: 'end' },
      { id: 'e7', source: 'rejected-transform', target: 'end' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // =============================================================================
  // GitHub PR / Issue Triage (Generic MCP)
  // =============================================================================
  'github-pr-issue-triage': {
    id: 'github-pr-issue-triage',
    name: 'GitHub Issue Triage (Generic MCP)',
    description: 'Evaluates a new GitHub issue, classifies it, and extracts key action items.',
    category: 'Engineering',
    tags: ['github', 'triage', 'classification', 'issue'],
    difficulty: 'intermediate',
    estimatedTime: '2-4 minutes',
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 250 },
        data: {
          nodeType: 'start',
          label: 'Issue Description Input',
          nodeName: 'Start',
          inputVariables: [
            { name: 'issue_text', type: 'string', required: true, description: 'The text of the GitHub issue or PR', defaultValue: 'The login page crashes when I enter a special character in the email field. Please fix this ASAP as it blocks users.' }
          ]
        }
      },
      {
        id: 'triage-agent',
        type: 'agent',
        position: { x: 350, y: 250 },
        data: {
          nodeType: 'agent',
          label: 'Classify & Extract',
          nodeName: 'Triage Agent',
          instructions: 'Analyze the following GitHub issue text:\n\n{{input.issue_text}}\n\n1. Classify its type (bug, feature, enhancement, docs).\n2. Determine severity (low, medium, high, critical).\n3. Extract a list of up to 3 action items.\n\nRespond with JSON.',
          model: 'anthropic/claude-sonnet-4-20250514',
          outputFormat: 'JSON',
          jsonOutputSchema: JSON.stringify({
            type: 'object',
            properties: {
              issueType: { type: 'string', enum: ['bug', 'feature', 'enhancement', 'docs'] },
              severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              actionItems: { type: 'array', items: { type: 'string' } }
            },
            required: ['issueType', 'severity', 'actionItems']
          })
        }
      },
      {
        id: 'human-approval',
        type: 'user-approval',
        position: { x: 600, y: 250 },
        data: {
          nodeType: 'user-approval',
          label: 'Review Triage',
          nodeName: 'Human Review',
          instructions: 'Please review the automated triage for this issue. Approve if the classification and severity look correct.',
        }
      },
      {
        id: 'router',
        type: 'if-else',
        position: { x: 850, y: 250 },
        data: {
          nodeType: 'if-else',
          label: 'Is Approved?',
          nodeName: 'Approval Router',
          condition: 'lastOutput.approved === true',
          trueLabel: 'Approved',
          falseLabel: 'Rejected'
        }
      },
      {
        id: 'success-transform',
        type: 'transform',
        position: { x: 1100, y: 150 },
        data: {
          nodeType: 'transform',
          label: 'Format Triage',
          nodeName: 'Format Final Output',
          transformScript: 'return { status: "Triaged", triageData: nodeResults["triage-agent"].output, message: "Ready to be synced back to GitHub or Jira via MCP or webhook." };'
        }
      },
      {
        id: 'reject-transform',
        type: 'transform',
        position: { x: 1100, y: 350 },
        data: {
          nodeType: 'transform',
          label: 'Abort Sync',
          nodeName: 'Abort Sync',
          transformScript: 'return { status: "Aborted", message: "Human rejected the automated triage. Manual intervention required." };'
        }
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 1350, y: 250 },
        data: {
          nodeType: 'end',
          label: 'End',
          nodeName: 'End'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'triage-agent' },
      { id: 'e2', source: 'triage-agent', target: 'human-approval' },
      { id: 'e3', source: 'human-approval', target: 'router' },
      { id: 'e4', source: 'router', target: 'success-transform', sourceHandle: 'true' },
      { id: 'e5', source: 'router', target: 'reject-transform', sourceHandle: 'false' },
      { id: 'e6', source: 'success-transform', target: 'end' },
      { id: 'e7', source: 'reject-transform', target: 'end' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

export function getTemplate(templateId: string): Workflow | null {
  return templates[templateId] || null;
}

export function listTemplates(): Array<{
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  difficulty?: string;
  estimatedTime?: string;
}> {
  return Object.values(templates).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    tags: t.tags,
    difficulty: t.difficulty,
    estimatedTime: t.estimatedTime,
  }));
}
