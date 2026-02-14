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
    createdAt: v.string(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  // Workflows table - stores complete workflow definitions
  workflows: defineTable({
    // User ownership
    userId: v.optional(v.string()), // Clerk user ID - optional for backward compat

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

    // Optional metadata
    version: v.optional(v.string()),
    isTemplate: v.optional(v.boolean()),
    isPublic: v.optional(v.boolean()), // For shared templates
    isStarred: v.optional(v.boolean()), // For bookmarking/favoriting workflows
  })
    .index("by_userId", ["userId"])
    .index("by_customId", ["customId"])
    .index("by_creation", ["createdAt"])
    .index("by_category", ["category"])
    .index("by_template", ["isTemplate"])
    .index("by_deleted", ["deletedAt"]) // Index for filtering trashed workflows
    .index("by_starred", ["userId", "isStarred"]), // Index for filtering starred workflows

  // Workflow executions - track execution state
  executions: defineTable({
    workflowId: v.id("workflows"),
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
  })
    .index("by_workflow", ["workflowId"])
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

  // Scheduled Triggers (Cron)
  schedules: defineTable({
    workflowId: v.id("workflows"),
    cronExpression: v.string(), // e.g. "0 9 * * 1" (Every Monday at 9am)
    lastRunAt: v.optional(v.string()),
    nextRunAt: v.optional(v.string()), // Calculated next run time
    isEnabled: v.boolean(),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_enabled", ["isEnabled"]),

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
    namespaceId: v.id("namespaces"),
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
});
