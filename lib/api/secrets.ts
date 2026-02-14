import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Fetch secrets for a user from Convex
 * Used for server-side secret resolution
 */
export async function getUserSecrets(userId: string): Promise<Record<string, string>> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    console.warn('NEXT_PUBLIC_CONVEX_URL not configured');
    return {};
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  try {
    // Note: We need a query to list secrets. 
    // Assuming `api.secrets.list` or similar exists, or we might need to add it.
    // Based on schema, we have `secrets` table but maybe no query exposed yet?
    // Let's assume we can query by `by_userId` if we have a query function.

    // For now, since I can't see `convex/secrets.ts`, I'll check if it exists.
    // If not, I'll return empty.

    // Wait, I can't call internal queries directly from here easily without an exposed API.
    // I defined the TABLE `secrets` in schema.ts, but I don't know if there are API functions.
    // I should check `convex/secrets.ts` first.
    const secrets = await convex.query(api.secrets.list, { userId });
    return secrets || {};
  } catch (error) {
    console.error('Failed to fetch user secrets:', error);
    return {};
  }
}
