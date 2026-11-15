import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { User } from "./models";

/**
 * GA4 funnel events (issue #29) via Measurement Protocol. Server-only events
 * (signup, publish, submission, upgrade) fire from server actions and routes.
 * The email is used ONLY for the exclusion check — no PII enters params.
 * No-ops when GA4 is not configured, so local/dev stays silent.
 */
const GA_ID = process.env.GA_MEASUREMENT_ID ?? "";
const GA_API_SECRET = process.env.GA4_API_SECRET ?? "";

function excludedEmails(): Set<string> {
  return new Set(
    (process.env.ANALYTICS_EXCLUDED_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Resolves the account email, applies the exclusion list, then sends. */
export async function gaEventForUser(userId: string, name: string, params: Record<string, string | number> = {}): Promise<void> {
  if (!GA_ID || !GA_API_SECRET) return;
  const user = await User.findOne({ _id: userId }, { email: 1 }).lean();
  const email = user?.email ?? null;
  if (email && excludedEmails().has(email.toLowerCase())) return;
  await gaSend(name, email, params);
}

/** Event for the signed-in creator when the email is already at hand. */
export async function gaEvent(name: string, email: string | null, params: Record<string, string | number> = {}): Promise<void> {
  if (!GA_ID || !GA_API_SECRET) return;
  if (email && excludedEmails().has(email.toLowerCase())) return;
  await gaSend(name, email, params);
}

async function gaSend(name: string, email: string | null, params: Record<string, string | number>): Promise<void> {
  // Deterministic client id per account so GA4 can join events per user;
  // anonymous events get a random id (counted, not joined).
  const clientId = email
    ? createHash("sha256").update(`${email}:${GA_ID}`).digest("hex").slice(0, 32)
    : randomUUID();
  try {
    await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA_ID}&api_secret=${GA_API_SECRET}`, {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name, params: { ...params, engagement_time_msec: 1 } }],
      }),
    });
  } catch (err) {
    console.error("ga event failed:", err instanceof Error ? err.message : err);
  }
}
