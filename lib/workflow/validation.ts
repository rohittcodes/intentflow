import { Workflow, WorkflowNode, ApiKeys } from './types';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationError {
  nodeId?: string;
  field?: string;
  message: string;
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
          severity: 'warning',
          type: 'structural'
        });
      }

      if (!hasOutgoing && node.type !== 'end' && node.type !== 'set-state') {
        errors.push({
          nodeId: node.id,
          message: `Node "${node.data.label || node.id}" has no outgoing connections.`,
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
          severity: 'error',
          type: 'configuration'
        });
      }
      if (!apiKeys.arcade) {
        errors.push({
          nodeId: node.id,
          message: 'Arcade API key is missing.',
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
          severity: 'error',
          type: 'configuration'
        });
      }
      if (!apiKeys.firecrawl && data.scrapeUrl) {
        errors.push({
          nodeId: node.id,
          message: 'Firecrawl API key is missing (required for scraping).',
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
      severity: 'error',
      type: 'auth'
    });
  } else if (provider === 'anthropic' && !apiKeys.anthropic) {
    errors.push({
      nodeId: node.id,
      field: 'model',
      message: 'Anthropic API key is missing.',
      severity: 'error',
      type: 'auth'
    });
  } else if ((provider === 'groq' || provider === 'llama' || provider === 'mixtral') && !apiKeys.groq) {
    errors.push({
      nodeId: node.id,
      field: 'model',
      message: 'Groq API key is missing.',
      severity: 'error',
      type: 'auth'
    });
  }

  // Check Prompt (Warning)
  if (!data.instructions?.trim() && !data.systemPrompt?.trim()) {
    errors.push({
      nodeId: node.id,
      field: 'instructions',
      message: 'Agent has no instructions or system prompt.',
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
