import "server-only";

import { Form, Submission, User, type UserDoc } from "./models";
import { isStripeConfigured, stripe } from "./stripe";

/**
 * Free-plan submission cap and Pro subscription state (issue #28). The cap is
 * enforced server-side per account across all of that account's forms;
 * counting is a plain query against the submissions collection. Stripe state
 * is verified synchronously on dashboard reads — no webhooks.
 */
export const FREE_SUBMISSIONS_PER_MONTH = 250;
export const PRO_MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";

export function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function utcMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Pro = Stripe snapshot says active/trialing and the paid period is current. */
export function isPro(user: Pick<UserDoc, "subscriptionStatus" | "proUntil">): boolean {
  if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "trialing") return false;
  if (user.proUntil && user.proUntil.getTime() < Date.now()) return false;
  return true;
}

export interface SubmissionUsage {
  used: number;
  cap: number | null;
  remaining: number | null;
  pro: boolean;
}

export async function monthlySubmissionUsage(ownerId: string): Promise<SubmissionUsage> {
  const user = await User.findOne({ _id: ownerId }).lean();
  if (user && isPro(user)) {
    const pro = await countMonthlySubmissions(ownerId);
    return { used: pro, cap: null, remaining: null, pro: true };
  }
  const used = await countMonthlySubmissions(ownerId);
  return { used, cap: FREE_SUBMISSIONS_PER_MONTH, remaining: Math.max(0, FREE_SUBMISSIONS_PER_MONTH - used), pro: false };
}

async function countMonthlySubmissions(ownerId: string): Promise<number> {
  const forms = await Form.find({ ownerId }, { formId: 1 }).lean();
  if (forms.length === 0) return 0;
  return Submission.countDocuments({
    formId: { $in: forms.map((f) => f.formId) },
    submittedAt: { $gte: monthStart() },
  });
}

/** Server-side gate for the submission endpoint. */
export async function checkSubmissionAllowance(ownerId: string): Promise<{ allowed: boolean; pro: boolean }> {
  const user = await User.findOne({ _id: ownerId }, { subscriptionStatus: 1, proUntil: 1 }).lean();
  if (user && isPro(user)) return { allowed: true, pro: true };
  const used = await countMonthlySubmissions(ownerId);
  return { allowed: used < FREE_SUBMISSIONS_PER_MONTH, pro: false };
}

/** Records a rejected over-cap submission for the owner's dashboard. */
export async function recordQuotaRejection(ownerId: string): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);
  await User.updateOne(
    { _id: ownerId, quotaRejectedMonth: { $ne: month } },
    { quotaRejectedMonth: month, quotaRejectedCount: 0 },
  );
  await User.updateOne({ _id: ownerId, quotaRejectedMonth: month }, { $inc: { quotaRejectedCount: 1 } });
}

/**
 * Re-reads the subscription from Stripe and persists the snapshot. Called on
 * dashboard/settings reads so cancel-at-period-end and renewals stay honest
 * without webhooks. No-op when Stripe is not configured.
 */
export async function refreshProStatus(user: UserDoc): Promise<UserDoc> {
  if (!user.stripeSubscriptionId || !isStripeConfigured()) return user;
  try {
    const sub = await stripe().subscriptions.retrieve(user.stripeSubscriptionId);
    const update: Record<string, unknown> = {
      subscriptionStatus: sub.status,
      proUntil: sub.items.data[0]?.current_period_end
        ? new Date(sub.items.data[0].current_period_end * 1000)
        : null,
      proCancelAtPeriodEnd: sub.cancel_at_period_end === true,
    };
    if (sub.status === "active" || sub.status === "trialing") {
      update.proSince = user.proSince ?? new Date();
    } else {
      update.proSince = null;
    }
    await User.updateOne({ _id: user._id }, update);
    return { ...user, ...update } as UserDoc;
  } catch (err) {
    console.error("stripe subscription refresh failed:", err instanceof Error ? err.message : err);
    return user;
  }
}
