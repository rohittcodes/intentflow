import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run scheduler every minute
crons.interval(
  "scheduler-tick",
  { minutes: 1 },
  internal.scheduler.runDueSchedules,
);

export default crons;
