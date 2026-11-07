import "server-only";
import mongoose from "mongoose";
import { connectDb } from "./db";

/**
 * Hosted AI usage controls (BUILD-BRIEF "Hosted usage", ADR 0003):
 * - 20 successful operations per verified account per UTC day, enforced with
 *   an atomic guarded increment so concurrent requests cannot bypass it.
 * - One concurrent AI operation per account, via an atomic lock document
 *   with stale-lock reclaim.
 * - Failed operations (no valid proposal) and unsupported requests release
 *   the reservation without consuming the daily allowance.
 * - Global daily spend cutoff (USD estimate from token usage) checked before
 *   every reservation.
 * Self-hosters override limits via env; the spend cutoff requires an
 * explicit value in production (GLOBAL_DAILY_AI_SPEND_CUTOFF_USD).
 */

export const AI_OPS_PER_DAY = Number(process.env.AI_OPS_PER_ACCOUNT_PER_DAY ?? 20);
const LOCK_STALE_MS = 90_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.AI_REQUESTS_PER_MINUTE ?? 10);

const inputPricePerMTok = Number(process.env.AI_INPUT_PRICE_PER_MTOK ?? 0.25);
const outputPricePerMTok = Number(process.env.AI_OUTPUT_PRICE_PER_MTOK ?? 2);

export interface AiReservation {
  accountId: string;
  day: string;
  lockId: string;
}

export type AiOpDenyReason = "quota_exhausted" | "concurrency_limit" | "spend_cutoff" | "rate_limited";

export class AiOpDeniedError extends Error {
  constructor(
    public reason: AiOpDenyReason,
    message: string,
  ) {
    super(message);
  }
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

interface UsageDoc extends mongoose.Document {
  accountId: string;
  day: string;
  count: number;
}

interface LockDoc extends mongoose.Document {
  accountId: string;
  lockedAt: Date;
  releasedAt: Date | null;
}

interface SpendDoc extends mongoose.Document {
  day: string;
  inputTokens: number;
  outputTokens: number;
  usd: number;
}

const UsageModel =
  (mongoose.models.AiUsage as mongoose.Model<UsageDoc>) ??
  mongoose.model<UsageDoc>(
    "AiUsage",
    new mongoose.Schema(
      {
        accountId: { type: String, required: true },
        day: { type: String, required: true },
        count: { type: Number, required: true, default: 0 },
      },
      { collection: "ai_usage", timestamps: false },
    ).index({ accountId: 1, day: 1 }, { unique: true }),
  );

const LockModel =
  (mongoose.models.AiLock as mongoose.Model<LockDoc>) ??
  mongoose.model<LockDoc>(
    "AiLock",
    new mongoose.Schema(
      {
        accountId: { type: String, required: true, unique: true },
        lockedAt: { type: Date, required: true },
        releasedAt: { type: Date, default: null },
      },
      { collection: "ai_locks" },
    ),
  );

const SpendModel =
  (mongoose.models.AiSpend as mongoose.Model<SpendDoc>) ??
  mongoose.model<SpendDoc>(
    "AiSpend",
    new mongoose.Schema(
      {
        day: { type: String, required: true, unique: true },
        inputTokens: { type: Number, required: true, default: 0 },
        outputTokens: { type: Number, required: true, default: 0 },
        usd: { type: Number, required: true, default: 0 },
      },
      { collection: "ai_spend" },
    ),
  );

const recentRequests = new Map<string, number[]>();

function rateLimited(accountId: string): boolean {
  const now = Date.now();
  const hits = (recentRequests.get(accountId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  recentRequests.set(accountId, hits);
  if (recentRequests.size > 10_000) recentRequests.clear();
  return hits.length > RATE_LIMIT_MAX;
}

/** Atomic reservation: rate limit → spend cutoff → daily counter → lock. */
export async function reserveAiOperation(accountId: string): Promise<AiReservation> {
  if (rateLimited(accountId)) {
    throw new AiOpDeniedError("rate_limited", "Too many AI requests in a minute. Try again shortly.");
  }
  await connectDb();
  const day = utcDay();

  const cutoff = process.env.GLOBAL_DAILY_AI_SPEND_CUTOFF_USD;
  if (cutoff) {
    const spend = await SpendModel.findOne({ day });
    if (spend && spend.usd >= Number(cutoff)) {
      throw new AiOpDeniedError("spend_cutoff", "The operator's daily AI spending cutoff is reached. Try again tomorrow.");
    }
  }

  // Ensure the counter doc exists, then guard the increment on the limit.
  await UsageModel.updateOne({ accountId, day }, { $setOnInsert: { count: 0 } }, { upsert: true });
  const reserved = await UsageModel.findOneAndUpdate(
    { accountId, day, count: { $lt: AI_OPS_PER_DAY } },
    { $inc: { count: 1 } },
    { returnDocument: "after" },
  );
  if (!reserved) {
    throw new AiOpDeniedError(
      "quota_exhausted",
      `Daily AI allowance reached (${AI_OPS_PER_DAY} operations). Manual edits and public submissions are unaffected.`,
    );
  }

  // One concurrent op per account: read for a friendly fast-fail, then an
  // atomic claim that only succeeds on released/stale/absent locks. A lost
  // race surfaces as a duplicate-key error on the unique accountId index.
  const now = new Date();
  const active = await LockModel.findOne({
    accountId,
    releasedAt: null,
    lockedAt: { $gt: new Date(now.getTime() - LOCK_STALE_MS) },
  });
  if (active) {
    await UsageModel.updateOne({ accountId, day, count: { $gt: 0 } }, { $inc: { count: -1 } });
    throw new AiOpDeniedError("concurrency_limit", "An AI operation is already running for your account. Wait for it to finish.");
  }
  let claimed;
  try {
    claimed = await LockModel.findOneAndUpdate(
      {
        accountId,
        $or: [{ releasedAt: { $ne: null } }, { lockedAt: { $lte: new Date(now.getTime() - LOCK_STALE_MS) } }],
      },
      { releasedAt: null, lockedAt: now },
      { upsert: true, returnDocument: "after" },
    );
  } catch (err) {
    if ((err as { code?: number } | null)?.code === 11000) {
      await UsageModel.updateOne({ accountId, day, count: { $gt: 0 } }, { $inc: { count: -1 } });
      throw new AiOpDeniedError("concurrency_limit", "An AI operation is already running for your account. Wait for it to finish.");
    }
    throw err;
  }
  if (!claimed) {
    await UsageModel.updateOne({ accountId, day, count: { $gt: 0 } }, { $inc: { count: -1 } });
    throw new AiOpDeniedError("concurrency_limit", "An AI operation is already running for your account. Wait for it to finish.");
  }

  return { accountId, day, lockId: String(claimed._id) };
}

function estimateUsd(usage: TokenUsage | null): number {
  if (!usage) return 0;
  return (usage.inputTokens / 1_000_000) * inputPricePerMTok + (usage.outputTokens / 1_000_000) * outputPricePerMTok;
}

/** Consumes the reservation for a successful proposal and records spend. */
export async function completeAiOperation(
  reservation: AiReservation,
  usage: TokenUsage,
  additionalUsd = 0,
): Promise<void> {
  await connectDb();
  await LockModel.updateOne({ _id: reservation.lockId, accountId: reservation.accountId }, { releasedAt: new Date() });
  await SpendModel.updateOne(
    { day: reservation.day },
    {
      $inc: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        usd: estimateUsd(usage) + additionalUsd,
      },
    },
    { upsert: true },
  );
}

/** Releases the reservation without consuming (failure / unsupported). */
export async function failAiOperation(reservation: AiReservation, usage: TokenUsage | null): Promise<void> {
  await connectDb();
  await LockModel.updateOne({ _id: reservation.lockId, accountId: reservation.accountId }, { releasedAt: new Date() });
  await UsageModel.updateOne(
    { accountId: reservation.accountId, day: reservation.day, count: { $gt: 0 } },
    { $inc: { count: -1 } },
  );
  if (usage) {
    await SpendModel.updateOne(
      { day: reservation.day },
      {
        $inc: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          usd: estimateUsd(usage),
        },
      },
      { upsert: true },
    );
  }
}
