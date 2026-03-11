import { v } from "convex/values";
import { mutation, query, internalAction, internalQuery, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";

// ---------------------------------------------------------------------------
// Public Mutations
// ---------------------------------------------------------------------------

/**
 * Create a notification, with built-in deduplication.
 * If a notification with the same dedupeKey already exists for this user (unread),
 * we skip insertion to avoid spamming the user (e.g. the same workflow failing many times).
 */
export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.string(), // "error" | "approval" | "info" | "team"
    link: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Deduplication check: skip if an unread notification with this key already exists
    if (args.dedupeKey) {
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey!))
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .filter((q) => q.eq(q.field("read"), false))
        .first();
      if (existing) {
        // Already has an unread notification for this event — skip
        return { skipped: true, id: existing._id };
      }
    }

    const id = await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: args.type,
      link: args.link,
      read: false,
      dedupeKey: args.dedupeKey,
      createdAt: new Date().toISOString(),
    });

    return { skipped: false, id };
  },
});

/**
 * List all notifications for the current user, most recent first.
 */
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(50);

    return notifications;
  },
});

/**
 * Returns the count of unread notifications for the badge indicator.
 */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", identity.subject).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

/**
 * Mark all notifications as read for the current user.
 * Called when the user opens the notification dropdown.
 */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", identity.subject).eq("read", false)
      )
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
    return { updated: unread.length };
  },
});

// ---------------------------------------------------------------------------
// Internal: Email Fallback (triggered by cron)
// ---------------------------------------------------------------------------

/**
 * Internal query to get all unread notifications that haven't had an email sent yet.
 */
export const getUnreadWithoutEmails = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Full table scan is fine here — this runs every 30 min in a background job.
    // The by_user_and_read index requires userId prefix, so we do a table scan
    // and filter in JS for unread + unsent emails.
    const all = await ctx.db.query("notifications").collect();
    return all.filter((n) => !n.read && !n.emailSentAt);
  },
});

/**
 * Internal mutation to mark emailSentAt on a notification.
 */
export const markEmailSent = internalMutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      emailSentAt: new Date().toISOString(),
    });
  },
});

/**
 * Internal action: checks all unread/un-emailed notifications and sends
 * emails based on type-specific time thresholds.
 * - "approval": email after 1 hour
 * - "error" | "team": email after 24 hours
 * - "info": never emails
 */
export const sendEmailFallbacks = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Thresholds (in ms)
    const thresholds: Record<string, number | null> = {
      approval: 1 * 60 * 60 * 1000,        // 1 hour
      error: 24 * 60 * 60 * 1000,           // 24 hours
      team: 24 * 60 * 60 * 1000,            // 24 hours
      info: null,                            // Never email
    };

    const pending = await ctx.runQuery(internal.notifications.getUnreadWithoutEmails, {});

    for (const notification of pending) {
      const threshold = thresholds[notification.type] ?? null;
      if (threshold === null) continue; // "info" type — skip

      const createdMs = new Date(notification.createdAt).getTime();
      const ageMs = now - createdMs;

      if (ageMs < threshold) continue; // Not old enough yet

      // Look up the user's email
      const userRecord = await ctx.runQuery(internal.notifications.getUserById, {
        userId: notification.userId,
      });
      if (!userRecord?.email) continue;

      // Fire the Resend email
      const result = await ctx.runAction(api.emails.sendWorkspaceInvite, {
        workspaceName: "",              // Will be overridden by a dedicated email function
        inviterName: "Intentflow",
        inviteUrl: notification.link ?? "https://intentflow.app/dashboard",
        toEmail: userRecord.email,
      });

      // Mark it as sent regardless to avoid retrying
      await ctx.runMutation(internal.notifications.markEmailSent, {
        notificationId: notification._id,
      });
    }
  },
});

/**
 * Internal helper to look up a user's email by Clerk ID.
 */
export const getUserById = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.userId))
      .first();
  },
});
