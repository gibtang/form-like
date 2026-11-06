import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * Error notifications: Sentry capture + Telegram alert (hotel-like pattern).
 * - Sentry is the primary sink; Telegram is the pager.
 * - Never throws, never blocks (callers fire-and-forget with `void` / after()).
 * - 4xx alerts cool down 10 min per key; 5xx always pages.
 * - Alert budget: max 20 Telegram messages per rolling 5 minutes.
 * - Enabled when TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID exist; TELEGRAM_ALERTS=off mutes.
 */

const SEND_TIMEOUT_MS = 2_500;
const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000;
const ALERT_BUDGET = { max: 20, windowMs: 5 * 60 * 1000 };

const cooldowns = new Map<string, number>();
let budgetWindowStart = 0;
let budgetUsed = 0;

function withinBudget(now: number): boolean {
  if (now - budgetWindowStart > ALERT_BUDGET.windowMs) {
    budgetWindowStart = now;
    budgetUsed = 0;
  }
  if (budgetUsed >= ALERT_BUDGET.max) return false;
  budgetUsed += 1;
  return true;
}

function onCooldown(key: string, now: number): boolean {
  const until = cooldowns.get(key);
  if (until && now < until) return true;
  cooldowns.set(key, now + DEFAULT_COOLDOWN_MS);
  if (cooldowns.size > 500) {
    for (const [k, t] of cooldowns) {
      if (now >= t) cooldowns.delete(k);
    }
  }
  return false;
}

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || process.env.TELEGRAM_ALERTS === "off") return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
}

export interface NotifyErrorInput {
  error: unknown;
  /** Machine-readable origin, e.g. "api/f/submit". */
  source: string;
  /** HTTP status the caller is about to return (4xx → warning, 5xx → error). */
  status: number;
  /** Stable dedup key, e.g. ip + route. Defaults to source. */
  cooldownKey?: string;
  details?: Record<string, string | number | boolean | null | undefined>;
}

export async function notifyError(input: NotifyErrorInput): Promise<void> {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  try {
    Sentry.captureException(input.error, {
      tags: { source: input.source, status: String(input.status) },
      extra: input.details ?? {},
    });
  } catch {
    // Sentry must never break the request path.
  }

  if (process.env.TELEGRAM_ALERTS === "off") return;
  const now = Date.now();
  const key = input.cooldownKey ?? input.source;
  const is5xx = input.status >= 500;
  if (!is5xx && onCooldown(key, now)) return;
  if (!withinBudget(now)) return;

  const detail = Object.entries(input.details ?? {})
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" ");
  const text = `<b>Form-like ${input.status}</b> @ ${input.source}\n${message.slice(0, 300)}${detail ? `\n${detail.slice(0, 200)}` : ""}`;
  try {
    await sendTelegram(text);
  } catch {
    // Never surface pager failures into the response path.
  }
}
