import "server-only";

import Stripe from "stripe";

let cached: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

/** Lazy singleton; env may be absent during build of unrelated pages. */
export function stripe(): Stripe {
  cached ??= new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { typescript: true });
  return cached;
}
