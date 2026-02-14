import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Workflow CRUD Operations
 */

// Get all workflows (filtered by user if authenticated, excluding trashed)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // If authenticated, only show user's workflows (exclude templates, trashed, and undefined userId)
    if (identity) {
      const workflows = await ctx.db
        .query("workflows")
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), identity.subject),
            q.neq(q.field("isTemplate"), true),
            q.eq(q.field("deletedAt"), undefined) // Exclude trashed workflows
          )
        )
        .order("desc")
        .collect();
      return workflows;
    }

    // If not authenticated, return empty array
    return [];
  },
});

// Alias for backwards compatibility
export const listWorkflows = list;

// Get workflow by Convex ID
export const getWorkflow = query({
  args: { id: v.id("workflows") },
  handler: async ({ db }, { id }) => {
    const workflow = await db.get(id);
    return workflow;
  },
});

// Get workflow by custom ID (like "workflow_123" or "amazon-product-research")
export const getWorkflowByCustomId = query({
  args: { customId: v.string() },
  handler: async ({ db }, { customId }) => {
    const workflow = await db
      .query("workflows")
      .withIndex("by_customId", (q) => q.eq("customId", customId))
      .first();
    return workflow;
  },
});

// Create or update workflow
export const saveWorkflow = mutation({
  args: {
    customId: v.optional(v.string()), // Optional - the workflow's custom ID
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    difficulty: v.optional(v.string()),
    estimatedTime: v.optional(v.string()),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    version: v.optional(v.string()),
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Check if workflow with this customId already exists (if customId provided)
    if (args.customId) {
      const existing = await ctx.db
        .query("workflows")
        .withIndex("by_customId", (q) => q.eq("customId", args.customId))
        .first();

      if (existing) {
        // Check ownership if user is authenticated
        if (identity && existing.userId && existing.userId !== identity.subject) {
          throw new Error("Unauthorized: workflow belongs to another user");
        }

        // Update existing workflow
        await ctx.db.patch(existing._id, {
          ...args,
          updatedAt: new Date().toISOString(),
        });

        // Sync webhooks
        await syncWebhooks(ctx, existing._id, args.nodes);

        // Sync schedules
        await syncSchedules(ctx, existing._id, args.nodes);

        return existing._id;
      }
    }

    // Create new workflow with user ownership
    const newId = await ctx.db.insert("workflows", {
      ...args,
      userId: identity?.subject, // Add user ownership if authenticated
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Sync webhooks
    await syncWebhooks(ctx, newId, args.nodes);

    // Sync schedules
    await syncSchedules(ctx, newId, args.nodes);

    return newId;
  },
});

// Helper to sync webhooks
async function syncWebhooks(ctx: any, workflowId: any, nodes: any[]) {
  // Find all input nodes with webhookId
  const webhookNodes = nodes.filter((n: any) =>
    (n.type === 'input' || n.data?.nodeType === 'input') &&
    n.data?.webhookId
  );

  const targetWebhooks = new Map(webhookNodes.map((n: any) => [n.data.webhookId, n]));

  // Get existing webhooks for this workflow
  const existingWebhooks = await ctx.db
    .query("webhooks")
    .withIndex("by_workflow", (q: any) => q.eq("workflowId", workflowId))
    .collect();

  // Delete removed webhooks
  for (const webhook of existingWebhooks) {
    if (!targetWebhooks.has(webhook.webhookId)) {
      await ctx.db.delete(webhook._id);
    }
  }

  // Insert or Update current webhooks
  for (const [webhookId, node] of Array.from(targetWebhooks.entries())) {
    const existing = existingWebhooks.find((w: any) => w.webhookId === webhookId);

    // Check if secret is configured in data
    const secret = node.data?.webhookSecret;

    if (existing) {
      // Update if needed
      if (existing.nodeId !== node.id || existing.secret !== secret) {
        await ctx.db.patch(existing._id, {
          nodeId: node.id,
          secret,
        });
      }
    } else {
      // Insert new
      await ctx.db.insert("webhooks", {
        webhookId,
        workflowId,
        nodeId: node.id,
        secret,
        isEnabled: true,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

// Helper to sync schedules (cron)
async function syncSchedules(ctx: any, workflowId: any, nodes: any[]) {
  // Find start node with schedule config
  const startNode = nodes.find((n: any) =>
    (n.type === 'start' || n.data?.nodeType === 'start') &&
    n.data?.schedule?.cron
  );

  // Get existing schedule
  const existingSchedule = await ctx.db
    .query("schedules")
    .withIndex("by_workflow", (q: any) => q.eq("workflowId", workflowId))
    .first();

  if (startNode && startNode.data?.schedule?.enabled !== false) {
    const cronExpression = startNode.data.schedule.cron;
    const isEnabled = true;

    if (existingSchedule) {
      // Update if changed
      if (existingSchedule.cronExpression !== cronExpression) {
        await ctx.db.patch(existingSchedule._id, {
          cronExpression,
          isEnabled,
          // Reset nextRunAt so scheduler recalculates
          nextRunAt: undefined
        });
      }
    } else {
      // Insert new
      await ctx.db.insert("schedules", {
        workflowId,
        cronExpression,
        isEnabled,
      });
    }
  } else {
    // If no schedule in nodes, or disabled, remove existing
    if (existingSchedule) {
      await ctx.db.delete(existingSchedule._id);
    }
  }
}

// Update workflow metadata (title, description) without requiring full nodes/edges
export const updateMetadata = mutation({
  args: {
    id: v.id("workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(args.id);

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (identity && workflow.userId && workflow.userId !== identity.subject) {
      throw new Error("Unauthorized: workflow belongs to another user");
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Get trashed workflows
export const listTrashed = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return [];

    const trashed = await ctx.db
      .query("workflows")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), identity.subject),
          q.neq(q.field("deletedAt"), undefined) // Only trashed workflows
        )
      )
      .order("desc")
      .collect();
    return trashed;
  },
});

// Move workflow to trash (soft delete)
export const moveToTrash = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(id);

    // Verify ownership
    if (!workflow || workflow.userId !== identity?.subject) {
      throw new Error("Unauthorized: workflow not found or belongs to another user");
    }

    // Move to trash
    await ctx.db.patch(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Restore workflow from trash
export const restoreFromTrash = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(id);

    // Verify ownership
    if (!workflow || workflow.userId !== identity?.subject) {
      throw new Error("Unauthorized: workflow not found or belongs to another user");
    }

    // Restore from trash
    await ctx.db.patch(id, {
      deletedAt: undefined,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Permanently delete workflow (only if in trash)
export const permanentlyDelete = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(id);

    // Verify ownership and that it's in trash
    if (!workflow || workflow.userId !== identity?.subject) {
      throw new Error("Unauthorized: workflow not found or belongs to another user");
    }

    if (!workflow.deletedAt) {
      throw new Error("Workflow must be in trash before permanent deletion");
    }

    // Permanently delete
    await ctx.db.delete(id);

    return { success: true };
  },
});

// Legacy delete workflow (kept for backward compatibility, now moves to trash)
export const deleteWorkflow = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, { id }) => {
    // Use moveToTrash instead of hard delete
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(id);

    if (!workflow || workflow.userId !== identity?.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Toggle star/bookmark status for a workflow
export const toggleStar = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const workflow = await ctx.db.get(id);

    // Verify ownership
    if (!workflow || workflow.userId !== identity?.subject) {
      throw new Error("Unauthorized: workflow not found or belongs to another user");
    }

    // Toggle starred status
    await ctx.db.patch(id, {
      isStarred: !workflow.isStarred,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, isStarred: !workflow.isStarred };
  },
});

// Get workflows by category
export const getWorkflowsByCategory = query({
  args: { category: v.string() },
  handler: async ({ db }, { category }) => {
    const workflows = await db
      .query("workflows")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
    return workflows;
  },
});

// Get template workflows
export const getTemplates = query({
  args: {},
  handler: async ({ db }) => {
    const templates = await db
      .query("workflows")
      .withIndex("by_template", (q) => q.eq("isTemplate", true))
      .collect();
    return templates;
  },
});

// Seed a single official template
export const seedOfficialTemplate = mutation({
  args: {
    customId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    difficulty: v.optional(v.string()),
    estimatedTime: v.optional(v.string()),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
  },
  handler: async (ctx, template) => {
    // Check if this template already exists
    const existing = await ctx.db
      .query("workflows")
      .withIndex("by_customId", (q) => q.eq("customId", template.customId))
      .first();

    if (existing) {
      // Template already exists, skip
      return { success: false, message: "Template already exists" };
    }

    // Create the template in Convex
    const newId = await ctx.db.insert("workflows", {
      customId: template.customId,
      name: template.name,
      description: template.description,
      category: template.category || "Templates",
      tags: template.tags || [],
      difficulty: template.difficulty,
      estimatedTime: template.estimatedTime,
      nodes: template.nodes,
      edges: template.edges,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: "1.0.0",
      isTemplate: true,
      isPublic: true, // Make templates public by default
    });

    return {
      success: true,
      id: newId.toString(),
      message: `Seeded template: ${template.name}`,
    };
  },
});

// Get all official templates
export const getAllOfficialTemplates = query({
  args: {},
  handler: async ({ db }) => {
    const templates = await db
      .query("workflows")
      .filter((q) =>
        q.and(
          q.eq(q.field("isTemplate"), true),
          q.eq(q.field("isPublic"), true)
        )
      )
      .collect();

    return templates.map(t => ({
      ...t,
      id: t.customId || t._id, // Use customId as the primary identifier
    }));
  },
});

// Get template by custom ID (e.g., 'multi-company-stock-analysis')
export const getTemplateByCustomId = query({
  args: { customId: v.string() },
  handler: async ({ db }, { customId }) => {
    const template = await db
      .query("workflows")
      .withIndex("by_customId", (q) => q.eq("customId", customId))
      .filter((q) => q.eq(q.field("isTemplate"), true))
      .first();

    if (template) {
      return {
        ...template,
        id: template.customId || template._id,
      };
    }
    return null;
  },
});

// Update template structure (nodes and edges)
export const updateTemplateStructure = mutation({
  args: {
    customId: v.string(),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
  },
  handler: async (ctx, { customId, nodes, edges }) => {
    // Find the template
    const template = await ctx.db
      .query("workflows")
      .withIndex("by_customId", (q) => q.eq("customId", customId))
      .filter((q) => q.eq(q.field("isTemplate"), true))
      .first();

    if (!template) {
      throw new Error(`Template ${customId} not found`);
    }

    // Update the template
    await ctx.db.patch(template._id, {
      nodes,
      edges,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, message: `Updated template ${customId}` };
  },
});

// Reset template to original from static file
export const resetTemplateToDefault = mutation({
  args: { customId: v.string() },
  handler: async (ctx, { customId }) => {
    // Get the original template from static file
    const originalTemplate = await import("../lib/workflow/templates").then((mod) =>
      mod.getTemplate(customId)
    );

    if (!originalTemplate) {
      throw new Error(`Original template ${customId} not found`);
    }

    // Find the template in database
    const template = await ctx.db
      .query("workflows")
      .withIndex("by_customId", (q) => q.eq("customId", customId))
      .filter((q) => q.eq(q.field("isTemplate"), true))
      .first();

    if (!template) {
      throw new Error(`Template ${customId} not found in database`);
    }

    // Reset to original
    await ctx.db.patch(template._id, {
      nodes: originalTemplate.nodes,
      edges: originalTemplate.edges,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, message: `Reset template ${customId} to default` };
  },
});

// Clean up workflows without userId (admin/development only)
export const deleteWorkflowsWithoutUserId = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // Only allow if authenticated (add admin check in production)
    if (!identity) {
      throw new Error("Unauthorized: must be authenticated");
    }

    // Find all workflows without userId and not templates
    const workflows = await ctx.db
      .query("workflows")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), undefined),
          q.neq(q.field("isTemplate"), true)
        )
      )
      .collect();

    // Delete them
    const deletePromises = workflows.map((w) => ctx.db.delete(w._id));
    await Promise.all(deletePromises);

    return {
      success: true,
      count: workflows.length,
      message: `Deleted ${workflows.length} workflows without userId`,
    };
  },
});
