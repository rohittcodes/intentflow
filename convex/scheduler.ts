"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as parser from "cron-parser";
import { LangGraphExecutor } from "../lib/workflow/langgraph";

/**
 * Scheduler Action (Node.js)
 * Imports LangGraphExecutor which requires Node runtime.
 */
export const runDueSchedules = internalAction({
  args: {},
  handler: async (ctx) => {
    // Call queries from the separate file
    const schedules = await ctx.runQuery(internal.scheduler_queries.getEnabledSchedules);
    const now = new Date();

    console.log(`Scheduler: Checking ${schedules.length} enabled schedules at ${now.toISOString()}`);

    for (const schedule of schedules) {
      try {
        const interval = parser.parseExpression(schedule.cronExpression, {
          currentDate: schedule.lastRunAt ? new Date(schedule.lastRunAt) : new Date(0),
          tz: 'UTC'
        });

        let nextRun = schedule.nextRunAt ? new Date(schedule.nextRunAt) : null;

        if (!nextRun) {
          try {
            const p = parser.parseExpression(schedule.cronExpression, {
              currentDate: schedule.lastRunAt ? new Date(schedule.lastRunAt) : new Date(Date.now() - 60000)
            });
            nextRun = p.next().toDate();
          } catch (e) {
            console.error(`Invalid cron expression for schedule ${schedule._id}:`, e);
            continue;
          }
        }

        if (nextRun && nextRun <= now) {
          console.log(`Scheduler: Executing workflow ${schedule.workflowId} (Due: ${nextRun.toISOString()})`);

          // Fetch workflow
          const workflow = await ctx.runQuery(internal.scheduler_queries.getWorkflow, { id: schedule.workflowId });

          if (workflow) {
            // Adapter to make ActionCtx look like ConvexHttpClient for Checkpointer
            const clientAdapter = {
              query: (q: any, args: any) => ctx.runQuery(q, args),
              mutation: (m: any, args: any) => ctx.runMutation(m, args),
              action: (a: any, args: any) => ctx.runAction(a, args),
            };

            const executor = new LangGraphExecutor(workflow, undefined, {}, clientAdapter);
            const threadId = `schedule_${schedule._id}_${now.getTime()}`;

            await executor.execute({
              source: 'schedule',
              scheduleId: schedule._id,
              cron: schedule.cronExpression,
              timestamp: now.toISOString()
            }, { threadId });
          }

          // Update state
          const p = parser.parseExpression(schedule.cronExpression, { currentDate: now });
          const futureRun = p.next().toDate();

          await ctx.runMutation(internal.scheduler_queries.updateSchedule, {
            id: schedule._id,
            lastRunAt: now.toISOString(),
            nextRunAt: futureRun.toISOString()
          });
        }

      } catch (error) {
        console.error(`Scheduler error for schedule ${schedule._id}:`, error);
      }
    }
  },
});
