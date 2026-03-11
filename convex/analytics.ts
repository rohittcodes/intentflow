import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDashboardStats = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Fetch the 500 most recent executions for this workspace to aggregate
    const executions = await ctx.db
      .query("executions")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
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

    const workflowStats: Record<string, { name: string; runs: number; tokens: number }> = {};

    executions.forEach(ex => {
      totalRuns++;
      if (ex.status === "completed") successfulRuns++;
      if (ex.status === "failed") failedRuns++;

      const tokens = ex.cumulativeUsage?.total_tokens || 0;
      if (tokens) {
        totalTokens += tokens;
        // Rough estimate: $0.01 per 1000 tokens
        totalCredits += (tokens / 1000) * 0.01;
      }

      // Group by workflow for "Top Workflows"
      const workflowKey = ex.workflowId.toString();
      if (!workflowStats[workflowKey]) {
        workflowStats[workflowKey] = { name: "Unknown Workflow", runs: 0, tokens: 0 };
      }
      workflowStats[workflowKey].runs++;
      workflowStats[workflowKey].tokens += tokens;

      const runDate = new Date(ex.startedAt).toISOString().split('T')[0];
      const chartDay = chartData.find(d => d.date === runDate);
      if (chartDay) {
        chartDay.runs++;
        if (ex.status === "completed") chartDay.success++;
        if (ex.status === "failed") chartDay.failed++;
      }
    });

    // Resolve workflow names for the stats
    const workflowIds = Object.keys(workflowStats);
    for (const wId of workflowIds) {
      const workflow = await ctx.db.get(wId as any);
      if (workflow) {
        workflowStats[wId].name = (workflow as any).name;
      }
    }

    const topWorkflows = Object.entries(workflowStats)
      .map(([id, stat]) => ({ id, ...stat }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 5);

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
      topWorkflows,
      recentExecutions: executions.slice(0, 10).map(e => ({
        id: e._id,
        workflowId: e.workflowId,
        status: e.status,
        startedAt: e.startedAt,
        tokensUsed: e.cumulativeUsage?.total_tokens || 0,
        creditsConsumed: e.cumulativeUsage?.total_tokens ? Number(((e.cumulativeUsage.total_tokens / 1000) * 0.001).toFixed(4)) : 0
      }))
    };
  }
});
