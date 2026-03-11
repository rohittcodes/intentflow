import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run scheduler every minute
crons.interval(
  "scheduler-tick",
  { minutes: 1 },
  internal.scheduler.runDueSchedules,
);

// Check for unread notifications and send email fallbacks every 30 minutes
crons.interval(
  "notification-email-fallback",
  { minutes: 30 },
  internal.notifications.sendEmailFallbacks,
);

export default crons;
