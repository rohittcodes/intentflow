import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getEnabledSchedules = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("schedules")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();
  },
});

export const updateSchedule = internalMutation({
  args: {
    id: v.id("schedules"),
    lastRunAt: v.string(),
    nextRunAt: v.string(),
  },
  handler: async (ctx, { id, lastRunAt, nextRunAt }) => {
    await ctx.db.patch(id, { lastRunAt, nextRunAt });
  },
});

export const getWorkflow = internalQuery({
  args: { id: v.id("workflows") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  }
});
