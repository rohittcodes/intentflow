import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDashboardStats = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let userId = args.userId;
    if (!userId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;
      userId = identity.subject;
    }

    // Fetch the 500 most recent executions for this user to aggregate
    const executions = await ctx.db
      .query("executions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(500);

    let totalRuns = 0;
    let successfulRuns = 0;
    let failedRuns = 0;
    let totalTokens = 0;
    let totalCredits = 0;

    // Generate last 7 days array for the chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const chartData = last7Days.map(date => ({
      date,
      runs: 0,
      success: 0,
      failed: 0,
    }));

    executions.forEach(ex => {
      totalRuns++;
      if (ex.status === "completed") successfulRuns++;
      if (ex.status === "failed") failedRuns++;

      if (ex.cumulativeUsage?.total_tokens) {
        totalTokens += ex.cumulativeUsage.total_tokens;
        // Rough estimate: $0.01 per 1000 tokens
        totalCredits += (ex.cumulativeUsage.total_tokens / 1000) * 0.01;
      }

      const runDate = new Date(ex.startedAt).toISOString().split('T')[0];
      const chartDay = chartData.find(d => d.date === runDate);
      if (chartDay) {
        chartDay.runs++;
        if (ex.status === "completed") chartDay.success++;
        if (ex.status === "failed") chartDay.failed++;
      }
    });

    // Round totalCredits to 4 decimal places for clean display
    totalCredits = Math.round(totalCredits * 10000) / 10000;

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      totalTokens,
      totalCredits,
      successRate: totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0,
      chartData,
      recentExecutions: executions.slice(0, 10).map(e => ({
        id: e._id,
        workflowId: e.workflowId,
        status: e.status,
        startedAt: e.startedAt,
        tokensUsed: e.cumulativeUsage?.total_tokens || 0,
        creditsConsumed: e.cumulativeUsage?.total_tokens ? Number(((e.cumulativeUsage.total_tokens / 1000) * 0.01).toFixed(4)) : 0
      }))
    };
  }
});
