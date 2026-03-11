import { v } from "convex/values";
import { action, internalQuery, internalMutation } from "./_generated/server";
import { Resend } from "resend";
import { internal } from "./_generated/api";

export const sendWorkspaceInvite = action({
  args: {
    workspaceName: v.string(),
    inviterName: v.string(),
    inviteUrl: v.string(),
    toEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Only send if we actually have an API key configured
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set. Skipping email send for:", args.toEmail);
      return { success: false, message: "Email system not configured." };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      const { data, error } = await resend.emails.send({
        from: "Intentflow <onboarding@resend.dev>", // TODO: Replace with verified domain when going to production
        to: args.toEmail,
        subject: `You've been invited to join ${args.workspaceName} on Intentflow`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Join ${args.workspaceName} on Intentflow</h2>
            <p><strong>${args.inviterName}</strong> has invited you to collaborate in their workspace.</p>
            <p>Intentflow helps teams build, deploy, and manage AI workflows visually.</p>
            <br/>
            <a href="${args.inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accept Invitation
            </a>
            <p style="margin-top: 24px; font-size: 14px; color: #666;">
              Or copy and paste this link into your browser:<br/>
              <a href="${args.inviteUrl}">${args.inviteUrl}</a>
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend API Error:", error);
        return { success: false, error: error.message };
      }

      console.log("Email sent successfully:", data?.id);
      return { success: true, id: data?.id };
    } catch (error: any) {
      console.error("Failed to send email:", error);
      return { success: false, error: error.message };
    }
  },
});
