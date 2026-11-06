import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Model access via OpenRouter (ADR 0006). All calls go through the Vercel
 * AI SDK with Zod structured output — no raw fetch (workspace rule).
 * Self-hosters supply their own OPENROUTER_API_KEY; model slugs configurable
 * via env (BUILD-BRIEF generation architecture).
 */
export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

const provider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  appName: "form-like",
});

export function textModel() {
  return provider.chat(process.env.OPENROUTER_TEXT_MODEL ?? "openai/gpt-5.4-mini");
}

export function jevModel() {
  return provider.chat(process.env.OPENROUTER_JEV_MODEL ?? "typesafe/jev-1.14");
}
