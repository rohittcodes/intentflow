import { Workflow, WorkflowNode, ApiKeys } from './types';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationError {
  nodeId?: string;
  field?: string;
  message: string;
  description?: string;
  severity: ValidationSeverity;
  type: 'structural' | 'configuration' | 'auth' | 'other';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a workflow for structural and configuration errors.
 * 
 * @param workflow The workflow to validate
 * @param apiKeys Currently available API keys for auth validation
 * @returns ValidationResult containing errors and warnings
 */
export function validateWorkflow(workflow: Workflow, apiKeys: ApiKeys = {}): ValidationResult {
  const errors: ValidationError[] = [];
  const { nodes, edges } = workflow;

  // 1. Basic checks
  if (nodes.length === 0) {
    errors.push({
      message: 'Workflow has no nodes.',
      description: 'Drag and drop components from the sidebar to start building your workflow.',
      severity: 'error',
      type: 'structural'
    });
    return { isValid: false, errors };
  }

  // 2. Connectivity Checks
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  if (nodes.length > 1) {
    nodes.forEach(node => {
      // Notes and standalone memory nodes might not need connections
      if (node.type === 'note') return;

      const hasOutgoing = edges.some(e => e.source === node.id);
      const hasIncoming = edges.some(e => e.target === node.id);

      if (!hasIncoming && node.type !== 'start' && node.type !== 'data-query') {
        errors.push({
          nodeId: node.id,
          message: `Node "${node.data.label || node.id}" has no incoming connections.`,
          description: 'This node will never be executed because it has no path from a trigger.',
          severity: 'warning',
          type: 'structural'
        });
      }

      if (!hasOutgoing && node.type !== 'end' && node.type !== 'set-state') {
        errors.push({
          nodeId: node.id,
          message: `Node "${node.data.label || node.id}" has no outgoing connections.`,
          description: 'The results from this node are not being used. Connect it to another component or an "End" node.',
          severity: 'warning',
          type: 'structural'
        });
      }
    });
  }

  // 3. Node-specific checks
  nodes.forEach(node => {
    const nodeErrors = validateNode(node, apiKeys);
    errors.push(...nodeErrors);
  });

  const isValid = !errors.some(e => e.severity === 'error');
  return { isValid, errors };
}

export function validateNode(node: WorkflowNode, apiKeys: ApiKeys = {}): ValidationError[] {
  const errors: ValidationError[] = [];
  const data = node.data;

  switch (node.type) {
    case 'agent':
      validateAgentNode(node, apiKeys, errors);
      break;

    case 'mcp':
      if (!data.mcpTool) {
        errors.push({
          nodeId: node.id,
          field: 'mcpTool',
          message: 'No MCP tool selected.',
          description: 'Open the inspector panel and select a tool from your connected MCP servers.',
          severity: 'error',
          type: 'configuration'
        });
      }
      break;

    case 'if-else':
      if (!data.condition?.trim()) {
        errors.push({
          nodeId: node.id,
          field: 'condition',
          message: 'If/Else must have a condition.',
          description: 'Define a logic rule (e.g., {{variable}} > 10) to determine which branch to follow.',
          severity: 'error',
          type: 'configuration'
        });
      }
      break;

    case 'while':
      if (!data.whileCondition?.trim()) {
        errors.push({
          nodeId: node.id,
          field: 'whileCondition',
          message: 'While loop must have a condition.',
          description: 'Specify when the loop should terminate to prevent infinite execution.',
          severity: 'error',
          type: 'configuration'
        });
      }
      break;

    case 'transform':
      if (!data.transformScript?.trim()) {
        errors.push({
          nodeId: node.id,
          field: 'transformScript',
          message: 'Transform must have a script.',
          description: 'Write a JavaScript snippet to process or reformat your data.',
          severity: 'error',
          type: 'configuration'
        });
      }
      break;

    case 'arcade':
      if (!data.arcadeTool) {
        errors.push({
          nodeId: node.id,
          field: 'arcadeTool',
          message: 'No Arcade tool selected.',
          description: 'Select an integration action from the Arcade tool library.',
          severity: 'error',
          type: 'configuration'
        });
      }
      if (!apiKeys.arcade) {
        errors.push({
          nodeId: node.id,
          message: 'Arcade API key is missing.',
          description: 'Add your Arcade API key in the project settings or user profile.',
          severity: 'error',
          type: 'auth'
        });
      }
      break;

    case 'data-query':
      if (!data.scrapeUrl?.trim() && !data.searchQuery?.trim()) {
        errors.push({
          nodeId: node.id,
          message: 'Data Query node has no URL or search query.',
          description: 'Provide a URL to scrape or a query to search the web.',
          severity: 'error',
          type: 'configuration'
        });
      }
      if (!apiKeys.firecrawl && data.scrapeUrl) {
        errors.push({
          nodeId: node.id,
          message: 'Firecrawl API key is missing.',
          description: 'A Firecrawl API key is required for web scraping. Add it in settings.',
          severity: 'error',
          type: 'auth'
        });
      }
      break;
  }

  return errors;
}

function validateAgentNode(node: WorkflowNode, apiKeys: ApiKeys, errors: ValidationError[]) {
  const { data } = node;
  const provider = (data.model || '').split('/')[0]?.toLowerCase();

  // Check Provider key
  if (provider === 'openai' && !apiKeys.openai) {
    errors.push({
      nodeId: node.id,
      field: 'model',
      message: 'OpenAI API key is missing.',
      description: 'An OpenAI API key is required for GPT models. Configure it in settings.',
      severity: 'error',
      type: 'auth'
    });
  } else if (provider === 'anthropic' && !apiKeys.anthropic) {
    errors.push({
      nodeId: node.id,
      field: 'model',
      message: 'Anthropic API key is missing.',
      description: 'An Anthropic API key is required for Claude models. Configure it in settings.',
      severity: 'error',
      type: 'auth'
    });
  } else if ((provider === 'groq' || provider === 'llama' || provider === 'mixtral') && !apiKeys.groq) {
    errors.push({
      nodeId: node.id,
      field: 'model',
      message: 'Groq API key is missing.',
      description: 'A Groq API key is required for Llama/Mixtral models. Configure it in settings.',
      severity: 'error',
      type: 'auth'
    });
  }

  // Check Prompt (Warning)
  if (!data.instructions?.trim() && !data.systemPrompt?.trim()) {
    errors.push({
      nodeId: node.id,
      field: 'instructions',
      message: 'Agent has no instructions.',
      description: 'Provide a clear prompt describing the task this agent should perform.',
      severity: 'warning',
      type: 'configuration'
    });
  }
}

export function getNodeValidationStatus(node: WorkflowNode, apiKeys: ApiKeys = {}): 'valid' | 'warning' | 'error' {
  const errors = validateNode(node, apiKeys);
  if (errors.length === 0) return 'valid';
  return errors.some(e => e.severity === 'error') ? 'error' : 'warning';
}
