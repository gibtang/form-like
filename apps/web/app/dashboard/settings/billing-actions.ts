"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { gaEvent } from "@/lib/analytics";

/**
 * Subscription lifecycle, all synchronous Stripe calls (no webhooks):
 * checkout returns a hosted-session URL; state is verified when Stripe
 * redirects back and refreshed on dashboard reads (lib/billing.ts).
 */
export async function startCheckoutAction(): Promise<void> {
  const user = await requireUser();
  if (!user || !isStripeConfigured()) redirect("/dashboard/settings?checkout=unavailable");
  await connectDb();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: String(user._id) },
    });
    customerId = customer.id;
    await User.updateOne({ _id: user._id }, { stripeCustomerId: customerId });
  }

  const base = process.env.BASE_URL ?? "http://localhost:3000";
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${base}/dashboard/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/dashboard/settings?checkout=cancelled`,
  });
  await gaEvent("upgrade_started", user.email);
  if (!session.url) redirect("/dashboard/settings?checkout=unavailable");
  redirect(session.url);
}

/** Sync-verify the checkout session that redirected back to settings. */
export async function completeCheckoutAction(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!user || !isStripeConfigured()) return { ok: false, error: "unavailable" };
  await connectDb();
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    if (session.mode !== "subscription" || typeof session.subscription !== "object" || !session.subscription) {
      return { ok: false, error: "not_completed" };
    }
    const sub = session.subscription;
    if (sub.status !== "active" && sub.status !== "trialing") {
      return { ok: false, error: "not_completed" };
    }
    await User.updateOne(
      { _id: user._id },
      {
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        stripeSubscriptionId: sub.id,
        subscriptionStatus: sub.status,
        proSince: new Date(),
        proUntil: sub.items.data[0]?.current_period_end
          ? new Date(sub.items.data[0].current_period_end * 1000)
          : null,
      },
    );
    await gaEvent("upgrade_completed", user.email);
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (err) {
    console.error("stripe checkout completion failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "unavailable" };
  }
}

/** Cancel at period end; the subscription stays active until then. */
export async function cancelProAction(): Promise<void> {
  const user = await requireUser();
  if (!user?.stripeSubscriptionId || !isStripeConfigured()) redirect("/dashboard/settings");
  await stripe().subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true });
  await stripe().subscriptions.retrieve(user.stripeSubscriptionId).then(async (sub) => {
    await connectDb();
    await User.updateOne(
      { _id: user._id },
      {
        subscriptionStatus: sub.status,
        proCancelAtPeriodEnd: sub.cancel_at_period_end === true,
        proUntil: sub.items.data[0]?.current_period_end
          ? new Date(sub.items.data[0].current_period_end * 1000)
          : null,
      },
    );
  });
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?cancelled=1");
}

export async function resumeProAction(): Promise<void> {
  const user = await requireUser();
  if (!user?.stripeSubscriptionId || !isStripeConfigured()) redirect("/dashboard/settings");
  await stripe().subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: false });
  await stripe().subscriptions.retrieve(user.stripeSubscriptionId).then(async (sub) => {
    await connectDb();
    await User.updateOne(
      { _id: user._id },
      { subscriptionStatus: sub.status, proCancelAtPeriodEnd: sub.cancel_at_period_end === true },
    );
  });
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings");
}
