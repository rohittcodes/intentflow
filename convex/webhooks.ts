import { v } from "convex/values";
import { query } from "./_generated/server";

export const getWorkflowByWebhookId = query({
  args: { webhookId: v.string() },
  handler: async (ctx, { webhookId }) => {
    // 1. Find the webhook record
    const webhook = await ctx.db
      .query("webhooks")
      .withIndex("by_webhookId", (q) => q.eq("webhookId", webhookId))
      .first();

    if (!webhook) {
      return null;
    }

    if (!webhook.isEnabled) {
      throw new Error("Webhook is disabled");
    }

    // 2. Fetch the workflow
    const workflow = await ctx.db.get(webhook.workflowId);

    if (!workflow) {
      // Inconsistent state, maybe clean up webhook?
      return null;
    }

    return {
      workflow,
      webhook,
    };
  },
});
