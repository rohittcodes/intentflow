import type { ReactNode } from 'react';

export interface ApiKeys {
  anthropic?: string;
  groq?: string;
  openai?: string;
  firecrawl?: string;
  arcade?: string;
  e2b?: string;
  google?: string;
}

// Workflow and Node Types

export interface WorkflowNode {
  id: string;
  type: 'agent' | 'mcp' | 'if-else' | 'while' | 'user-approval' | 'transform' | 'set-state' | 'end' | 'start' | 'guardrails' | 'arcade' | 'note' | 'router' | 'data-query' | 'memory';
  position: { x: number; y: number };
  data: NodeData;
}

export interface NodeData {
  label: string | ReactNode;
  nodeType?: string;
  nodeName?: string;
  executionStatus?: NodeExecutionResult['status'];
  executionError?: string;
  isRunning?: boolean;

  // Agent node data
  name?: string;
  instructions?: string;
  model?: string;
  includeChatHistory?: boolean;
  tools?: string[]; // MCP server IDs
  outputFormat?: string;
  reasoningEffort?: string;
  jsonOutputSchema?: string;
  jsonSchema?: any;
  mcpTools?: any[];
  systemPrompt?: string;
  discoveryMode?: 'static' | 'dynamic' | 'optimized';

  // MCP node data
  mcpServers?: MCPServer[];
  mcpAction?: string;
  outputField?: string;

  // Arcade node data
  arcadeTool?: string; // e.g., "GoogleDocs.CreateDocumentFromText@4.3.1"
  arcadeInput?: any; // Input parameters for the tool
  arcadeUserId?: string; // User ID for Arcade authorization

  // Extract node data
  extractConfig?: any;
  extractTool?: string;

  // Start node data
  inputVariables?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    defaultValue?: any;
  }>;

  // Logic node data
  condition?: string;
  truePath?: string;
  falsePath?: string;
  trueLabel?: string;
  falseLabel?: string;

  // Transform node data
  transformScript?: string;

  // State node data
  stateKey?: string;
  stateValue?: string;

  // Note node data
  noteText?: string;

  // Memory node data (Mem0-style)
  memoryMode?: 'smart' | 'retrieve' | 'clear'; // smart = LLM extract+manage, retrieve = semantic search, clear = delete scope
  memoryScope?: 'thread' | 'workflow' | 'user';
  memoryScopeId?: string;      // auto-populated at runtime from threadId/workflowId/userId
  memoryQuery?: string;        // retrieve mode: what to search for (supports {{variable}})
  memoryTopK?: number;         // retrieve mode: how many memories to inject (default 5)
  memoryAgentId?: string;      // label / tag for attribution (e.g. node name)

  // Additional node data properties
  transformType?: string;
  mcpTool?: string;
  piiEnabled?: boolean;
  searchQuery?: string;
  mapUrl?: string;
  batchUrls?: string;
  guardrailType?: string;
  scrapeUrl?: string;
  whileCondition?: string;
  approvalMessage?: string;
  outputMapping?: string | any;
  scrapeFormats?: string[];
  mcpParams?: any;
  moderationEnabled?: boolean;
  jailbreakEnabled?: boolean;
  hallucinationEnabled?: boolean;
  searchLimit?: number;
  mapLimit?: number;
  actionOnViolation?: string;
  maxIterations?: number | string;
  timeoutMinutes?: number | string;

  // Guardrails config
  checks?: {
    pii: boolean;
    moderation: boolean;
    jailbreak: boolean;
    hallucination: boolean;
  };
  piiEntities?: string[];
  customRules?: string[];
  fallbackResponse?: string;

  // Trigger config (Start Node)
  triggerType?: 'manual' | 'webhook' | 'schedule';
  cronExpression?: string;
  webhookPath?: string; // Custom path segment for webhook
  webhookSecret?: string; // Optional secret for verification

  // Router Node
  routes?: Array<{
    id: string;
    label: string;
    condition: string;
  }>;
  [key: string]: any;
}

export interface MCPServer {
  id: string;
  name: string;
  label: string;
  url: string;
  description?: string;
  authType: string;
  accessToken?: string;
  tools?: any[];
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string; // For conditional edges like "true"/"false"
  sourceHandle?: string; // For conditional edges like "if"/"else"
}

export interface Workflow {
  id: string;
  _id?: string;
  _convexId?: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  estimatedTime?: string;
  difficulty?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
  isDeployed?: boolean;
  deployedAt?: string;
  settings?: {
    snapToGrid?: boolean;
    gridStyle?: 'dots' | 'lines' | 'none';
    edgeStyle?: 'default' | 'straight' | 'step' | 'smoothstep';
    maxIterations?: number;
    timeout?: number;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'waiting-auth';
  currentNodeId?: string;
  nodeResults: Record<string, NodeExecutionResult>;
  startedAt: string;
  completedAt?: string;
  error?: string;
  pendingAuth?: WorkflowPendingAuth;
  threadId?: string;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'pending-authorization' | 'pending-approval';
  input?: any;
  output?: any;
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  toolCalls?: Array<{
    name?: string;
    arguments?: any;
    output?: any;
  }>;
  logs?: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }>;
  pendingAuth?: WorkflowPendingAuth;
}


export interface ApprovalNodeData {
  instructions: string;
  autoApproveOnTimeout?: boolean;
  timeoutSeconds?: number;
}

export interface WorkflowState {
  variables: Record<string, any>;
  chatHistory: Array<{ role: string; content: string }>;
  memory?: Record<string, any>;
  currentNodeId?: string;
  nodeResults: Record<string, NodeExecutionResult>;
  pendingAuth: any;
  loopResults: Array<any>;
  // Advanced Guardrails
  cumulativeUsage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface WorkflowPendingAuth {
  authId: string;
  nodeId: string;
  toolName: string;
  authUrl?: string | null;
  status: 'pending' | 'completed' | 'failed';
  userId?: string;
  message?: string;
  threadId?: string;
  executionId?: string;
}
