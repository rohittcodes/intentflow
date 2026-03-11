import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Schema for Intentflow
 *
 * Replaces Upstash Redis for workflow storage
 */

export default defineSchema({
  // Users table - synced from Clerk
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    activeWorkspaceId: v.optional(v.id("workspaces")),
    activeProjectId: v.optional(v.id("projects")),
    createdAt: v.string(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  // Workspaces - Team/Project organization
  workspaces: defineTable({
    name: v.string(),
    userId: v.string(), // Owner Clerk ID
    type: v.union(v.literal("personal"), v.literal("shared")),
    description: v.optional(v.string()),
    members: v.optional(v.array(v.string())), // Deprecated in favor of workspaceMembers table
    icon: v.optional(v.string()),
    pricingTier: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise"))),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"]),

  // Workspace Members - Role-Based Access Control
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(), // Clerk user ID
    role: v.string(), // "owner" | "admin" | "editor" | "viewer"
    joinedAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  // Workspace Invites - URL-based role invitations
  workspaceInvites: defineTable({
    workspaceId: v.id("workspaces"),
    inviterId: v.string(), // Clerk user ID
    email: v.optional(v.string()), // Target email, optional
    role: v.string(), // "admin" | "editor" | "viewer"
    token: v.string(), // Secure random code
    status: v.string(), // "pending" | "accepted" | "expired" | "revoked"
    createdAt: v.string(),
    expiresAt: v.optional(v.string()),
    acceptedBy: v.optional(v.string()), // Clerk user ID who accepted
    acceptedAt: v.optional(v.string()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"]),

  // Projects - Scoping resources within a workspace
  projects: defineTable({
    name: v.string(),
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    description: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_userId", ["userId"]),

  // Workflows table - stores complete workflow definitions
  workflows: defineTable({
    // User ownership
    userId: v.optional(v.string()), // Clerk user ID - optional for backward compat
    workspaceId: v.optional(v.id("workspaces")), // Link to project/workspace
    projectId: v.optional(v.id("projects")), // Link to specific project

    // Workflow identification
    customId: v.optional(v.string()), // Original workflow ID (like "workflow_123" or "amazon-product-research")
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    difficulty: v.optional(v.string()),
    estimatedTime: v.optional(v.string()),

    // Workflow structure
    nodes: v.array(v.any()), // Workflow nodes with flexible structure
    edges: v.array(v.any()), // Workflow edges

    // Timestamps
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()), // ISO timestamp when moved to trash

    // Deployment status
    isDeployed: v.optional(v.boolean()),
    deployedAt: v.optional(v.string()),

    // Optional metadata
    version: v.optional(v.string()),
    isTemplate: v.optional(v.boolean()),
    isPublic: v.optional(v.boolean()), // For shared templates
    isStarred: v.optional(v.boolean()), // For bookmarking/favoriting workflows

    // Workflow-specific settings
    settings: v.optional(v.object({
      snapToGrid: v.optional(v.boolean()),
      gridStyle: v.optional(v.string()), // "dots", "lines", "none"
      edgeStyle: v.optional(v.string()), // "default", "straight", "step", "smoothstep"
      maxIterations: v.optional(v.number()),
      timeout: v.optional(v.number()),
      // Financial Guardrails
      maxTokens: v.optional(v.number()),         // Max total tokens across entire execution
      maxRuntimeSeconds: v.optional(v.number()), // Max wall-clock seconds for the execution

      // Webhooks Out
      webhookOnSuccessUrl: v.optional(v.string()),
      webhookOnFailureUrl: v.optional(v.string()),

      // Embeddable UI
      isEmbeddable: v.optional(v.boolean()),
    })),
  })
    .index("by_userId", ["userId"])
    .index("by_customId", ["customId"])
    .index("by_creation", ["createdAt"])
    .index("by_category", ["category"])
    .index("by_template", ["isTemplate"])
    .index("by_deleted", ["deletedAt"]) // Index for filtering trashed workflows
    .index("by_starred", ["userId", "isStarred"]) // Index for filtering starred workflows
    .index("by_deployed", ["isDeployed"])
    .index("by_published", ["isPublic"]),

  // Schedules for workflows
  schedules: defineTable({
    workflowId: v.id("workflows"),
    cronExpression: v.string(), // e.g. "0 * * * *"
    timezone: v.optional(v.string()), // e.g. "UTC"
    lastRunAt: v.optional(v.string()), // ISO string
    nextRunAt: v.optional(v.string()), // ISO string
    isEnabled: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_enabled", ["isEnabled"]),

  // Workflow executions - track execution state
  executions: defineTable({
    workflowId: v.id("workflows"),
    workspaceId: v.optional(v.id("workspaces")), // Added for workspace analytics
    userId: v.optional(v.string()), // Added for data isolation
    status: v.string(), // "running" | "completed" | "failed"

    // Execution state
    currentNodeId: v.optional(v.string()),
    nodeResults: v.any(), // Flexible execution results
    variables: v.any(), // State variables

    // Event-Driven / Async State
    isSuspended: v.optional(v.boolean()),
    suspendedAt: v.optional(v.string()),
    waitingOn: v.optional(v.object({
      type: v.string(), // "webhook", "approval", "time", "event"
      id: v.optional(v.string()), // ID of the specific event/approval waiting for
      timeoutAt: v.optional(v.string()),
    })),

    // Input/Output
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    error: v.optional(v.string()),

    // Timestamps
    startedAt: v.string(),
    completedAt: v.optional(v.string()),

    // Execution metadata
    threadId: v.optional(v.string()),

    // Guardrails
    maxTokens: v.optional(v.number()),
    maxRuntimeSeconds: v.optional(v.number()),
    cumulativeUsage: v.optional(v.object({
      input_tokens: v.number(),
      output_tokens: v.number(),
      total_tokens: v.number(),
    })),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"])
    .index("by_suspended", ["isSuspended"]),

  // Secrets - Encrypted storage for sensitive keys
  secrets: defineTable({
    userId: v.string(),
    key: v.string(), // e.g. "OPENAI_API_KEY", "STRIPE_KEY"
    value: v.string(), // Encrypted value

    // Metadata
    description: v.optional(v.string()),
    lastUsedAt: v.optional(v.string()),

    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_key", ["userId", "key"]),

  // MCP servers registry - Centralized configuration
  mcpServers: defineTable({
    // Ownership
    userId: v.string(), // Clerk user ID who owns this MCP

    // Basic info
    name: v.string(),
    url: v.string(),
    description: v.optional(v.string()),
    category: v.string(), // "web" | "ai" | "data" | "custom"

    // Authentication
    authType: v.string(), // "none" | "api-key" | "bearer" | "oauth-coming-soon"
    accessToken: v.optional(v.string()), // Encrypted token

    // Tools & Status
    tools: v.optional(v.array(v.string())), // List of available tool names
    connectionStatus: v.string(), // "connected" | "error" | "untested"
    lastTested: v.optional(v.string()),
    lastError: v.optional(v.string()),

    // Configuration
    enabled: v.boolean(),
    isOfficial: v.boolean(), // Built-in MCPs from registry

    // Headers for custom config
    headers: v.optional(v.any()),

    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_name", ["name"])
    .index("by_enabled", ["enabled"])
    .index("by_category", ["category"])
    .index("by_official", ["isOfficial"]),

  // Granular MCP Tools - Individual tool metadata for discovery
  mcpTools: defineTable({
    serverId: v.id("mcpServers"),
    userId: v.string(), // For quick filtering
    name: v.string(), // Tool name
    description: v.string(),
    schema: v.any(), // Full JSON schema

    // Discovery optimization
    isSearchable: v.boolean(),
    embedding: v.optional(v.array(v.float64())), // for semantic search
    usageCount: v.optional(v.number()), // For "Hot Context" prioritization caching

    // Metadata
    category: v.optional(v.string()),
    lastSynced: v.string(),
  })
    .index("by_serverId", ["serverId"])
    .index("by_userId", ["userId"])
    .index("by_name", ["name"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536, // Standard OpenAI/DeepSeek/Voyage dims
      filterFields: ["userId", "isSearchable"],
    }),

  // Arcade auth records
  arcadeAuth: defineTable({
    authId: v.string(),
    toolName: v.string(),
    authUrl: v.optional(v.string()),
    userId: v.optional(v.string()),
    status: v.string(), // "pending" | "completed" | "failed"

    createdAt: v.string(),
    completedAt: v.optional(v.string()),
  })
    .index("by_authId", ["authId"])
    .index("by_status", ["status"]),

  // User MCP Servers - Cursor-style configuration
  userMCPs: defineTable({
    userId: v.string(),
    name: v.string(),
    url: v.string(),
    headers: v.optional(v.any()),
    env: v.optional(v.any()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_name", ["name"]),

  // API Keys - User-generated keys for API access
  apiKeys: defineTable({
    key: v.string(), // Hashed key
    keyPrefix: v.string(), // "sk_live_abc..." for display
    userId: v.string(), // Clerk user ID who owns this key
    name: v.string(), // User-given name

    usageCount: v.number(),
    lastUsedAt: v.optional(v.string()),

    createdAt: v.string(),
    expiresAt: v.optional(v.string()),
    revokedAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_key", ["key"])
    .index("by_keyPrefix", ["keyPrefix"]),

  // User LLM API Keys - Store user's own LLM provider keys
  userLLMKeys: defineTable({
    userId: v.string(), // Clerk user ID
    provider: v.string(), // "anthropic" | "openai" | "groq"
    encryptedKey: v.string(), // Encrypted API key
    keyPrefix: v.string(), // First/last few chars for display (e.g. "sk-ant...abc")

    // Metadata
    label: v.optional(v.string()), // User-friendly label
    isActive: v.boolean(), // Whether this key is currently active

    // Timestamps
    createdAt: v.string(),
    updatedAt: v.string(),
    lastUsedAt: v.optional(v.string()),

    // Usage tracking (optional)
    usageCount: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_provider", ["provider"])
    .index("by_userProvider", ["userId", "provider"])
    .index("by_active", ["isActive"]),

  // Approval records - Human-in-the-loop workflow pauses
  approvals: defineTable({
    approvalId: v.string(),
    workflowId: v.id("workflows"),
    executionId: v.optional(v.string()), // Which execution is waiting
    nodeId: v.optional(v.string()), // Which node is waiting for approval
    message: v.string(),
    status: v.string(), // "pending" | "approved" | "rejected"
    userId: v.optional(v.string()), // Who needs to approve (Clerk user ID)
    createdBy: v.optional(v.string()), // Who created the approval request

    createdAt: v.string(),
    respondedAt: v.optional(v.string()),
    respondedBy: v.optional(v.string()), // Who responded (Clerk user ID)
  })
    .index("by_approvalId", ["approvalId"])
    .index("by_status", ["status"])
    .index("by_userId", ["userId"])
    .index("by_workflow", ["workflowId"])
    .index("by_execution", ["executionId"]),

  // RAG Documents - Vector Search enabled
  documents: defineTable({
    content: v.string(),
    embedding: v.array(v.float64()),
    namespaceId: v.id("namespaces"), // Reference to the namespace
    metadata: v.optional(v.any()), // e.g. { fileName: "manual.pdf", page: 12 }
    userId: v.string(),
    createdAt: v.string(),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536, // OpenAI default
      filterFields: ["namespaceId", "userId"],
    })
    .index("by_namespace", ["namespaceId"])
    .index("by_user", ["userId"]),

  // Knowledge Namespaces - Containers for documents
  namespaces: defineTable({
    name: v.string(), // "Legal", "Marketing", "HR"
    description: v.optional(v.string()),
    userId: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
    projectId: v.optional(v.id("projects")),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    documentCount: v.number(),
    lastIngestedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_name", ["userId", "name"]),

  // Webhook Triggers - Map external URLs to workflows
  webhooks: defineTable({
    webhookId: v.string(), // The unique path param
    workflowId: v.id("workflows"),
    nodeId: v.string(), // Which node triggered this
    secret: v.optional(v.string()), // Optional auth secret
    isEnabled: v.boolean(),

    createdAt: v.string(),
    lastTriggeredAt: v.optional(v.string()),
  })
    .index("by_webhookId", ["webhookId"])
    .index("by_workflow", ["workflowId"]),



  // Threads - Conversation history metadata
  threads: defineTable({
    userId: v.string(), // Clerk user ID
    workflowId: v.optional(v.id("workflows")), // If linked to a specific workflow
    extThreadId: v.optional(v.string()), // External thread ID (e.g. from LangGraph)
    title: v.optional(v.string()), // "Chat with Helper Agent"

    // Metadata
    lastMessageAt: v.string(), // For sorting
    status: v.string(), // "active", "archived"

    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_workflow", ["workflowId"])
    .index("by_extThreadId", ["extThreadId"])
    .index("by_updated", ["updatedAt"]),

  // LangGraph Checkpoints - Persistence for long-running workflows/chats
  checkpoints: defineTable({
    threadId: v.string(),
    checkpoint_id: v.string(), // LangGraph uses string/uuid
    checkpoint: v.any(), // Serialized state
    metadata: v.optional(v.any()), // Source/Config metadata
    parent_checkpoint_id: v.optional(v.string()),

    // Indexing
    createdAt: v.string(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_checkpoint_id", ["checkpoint_id"])
    .index("by_thread_and_checkpoint", ["threadId", "checkpoint_id"]),
  // Knowledge Connectors - Dynamic data sources
  connectors: defineTable({
    userId: v.string(),
    namespaceId: v.optional(v.id("namespaces")),
    name: v.string(), // "My SQL DB", "Docs Website"
    type: v.string(), // "database", "url", "notion"
    config: v.any(), // Connection strings, URLs, API keys
    status: v.string(), // "idle", "syncing", "error"
    lastSyncAt: v.optional(v.string()),
    lastError: v.optional(v.string()),

    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_namespace", ["namespaceId"])
    .index("by_type", ["type"]),

  // User Usage - Track execution counts and cost-related metrics
  userUsage: defineTable({
    userId: v.string(), // Clerk user ID
    executionsCount: v.number(), // Current period execution count
    totalExecutions: v.number(), // All-time execution count
    totalRuntimeSeconds: v.number(), // Total runtime in seconds
    lastExecutionAt: v.optional(v.string()),
    tier: v.string(), // "free", "pro", "enterprise"
    periodStart: v.string(), // ISO timestamp for the start of the current usage period
  })
    .index("by_userId", ["userId"])
    .index("by_tier", ["tier"]),

  // Memories — Mem0-style intelligent memory layer
  // Each row is a single atomic fact extracted from workflow outputs.
  memories: defineTable({
    // Data isolation
    userId: v.string(), // Clerk user ID — always required for RLS

    // Content
    content: v.string(), // Atomic memory text, e.g. "User prefers Python over JS"
    embedding: v.array(v.float64()), // 1536-dim OpenAI embedding for semantic search

    // Scoping (multi-tenant memory namespacing)
    scope: v.string(),   // "thread" | "workflow" | "user"
    scopeId: v.string(), // The ID for the scope: threadId / workflowId / userId

    // Attribution
    agentId: v.optional(v.string()), // nodeId or nodeName that created this memory
    sourceNodeId: v.optional(v.string()), // specific node ID in the workflow

    // Metadata
    metadata: v.optional(v.any()), // Flexible: { confidence, tags, rawSource }

    // Timestamps
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_scope", ["userId", "scope", "scopeId"])
    .index("by_agent", ["userId", "agentId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "scope"],
    }),

  // Agent Swarm / Multi-Agent Framework
  agents: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.string(),
    createdAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"]),

  skills: defineTable({
    agentId: v.id("agents"),
    name: v.string(),
    description: v.optional(v.string()),
    fileContent: v.optional(v.string()),
  })
    .index("by_agent", ["agentId"]),

  agentTasks: defineTable({
    creatorAgentId: v.id("agents"),
    assignedAgentId: v.id("agents"),
    instruction: v.string(),
    status: v.string(), // pending, in_progress, completed, failed
    result: v.optional(v.any()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_creator", ["creatorAgentId"])
    .index("by_assignee", ["assignedAgentId"])
    .index("by_status", ["status"]),

  // AI Evaluation & Testing
  feedback: defineTable({
    executionId: v.id("executions"),
    userId: v.optional(v.string()),
    score: v.optional(v.number()),
    comment: v.optional(v.string()),
    source: v.string(), // human, ai
    createdAt: v.string(),
  })
    .index("by_execution", ["executionId"]),

  evaluations: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    criteria: v.any(),
    createdAt: v.string(),
  }),

  evaluationResults: defineTable({
    evaluationId: v.id("evaluations"),
    executionId: v.id("executions"),
    passed: v.boolean(),
    details: v.optional(v.any()),
    createdAt: v.string(),
  })
    .index("by_evaluation", ["evaluationId"])
    .index("by_execution", ["executionId"]),

  // Audit Logs - Tracking user activity and changes
  auditLogs: defineTable({
    workspaceId: v.optional(v.id("workspaces")), // Which workspace this applies to
    userId: v.optional(v.string()), // The Clerk ID of the actor
    action: v.string(), // e.g. "workflow.created", "settings.updated", "key.deleted"
    resourceType: v.string(), // "workflow", "mcpServer", "workspace"
    resourceId: v.string(), // The ID of the affected resource
    metadata: v.optional(v.any()), // Previous state vs New state payload
    createdAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_resource", ["resourceType", "resourceId"])
    .index("by_action", ["action"]),

  // Notifications - Smart in-app alerts with email fallback
  notifications: defineTable({
    userId: v.string(), // Clerk user ID (recipient)
    title: v.string(),
    message: v.string(),
    type: v.string(), // "error" | "approval" | "info" | "team"
    link: v.optional(v.string()), // Navigation link on click
    read: v.boolean(),
    // Deduplication: If a notification with the same dedupeKey and userId already exists (unread),
    // we skip creating a new one. e.g. "workflow-failed:{workflowId}"
    dedupeKey: v.optional(v.string()),
    // Tracks when the email fallback was sent so we don't resend
    emailSentAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "read"])
    .index("by_dedupe_key", ["dedupeKey"]),
});
