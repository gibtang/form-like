import "server-only";
import { z } from "zod";

/**
 * Typed client for OpenRouter's alpha Decisions API (the only surface the
 * Jev decision model exposes — chat/completions and generateObject are not
 * valid for it). The Vercel AI SDK does not cover this alpha endpoint, so
 * this is a deliberate, documented deviation from the no-raw-fetch rule:
 * the request is a fixed envelope and the response is Zod-validated here,
 * keeping the structured-output guarantee the rule exists for.
 */

const DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";

const answerSchema = z.object({
  type: z.string(),
  choice: z.string().optional(),
  confidence: z.number().optional(),
  probabilities: z.record(z.string(), z.number()).optional(),
});

const decisionsResponseSchema = z.object({
  answers: z.record(z.string(), answerSchema),
  usage: z
    .object({
      cost: z.number().optional(),
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    })
    .optional(),
});

export type DecisionsResponse = z.infer<typeof decisionsResponseSchema>;

export interface JevQuestion {
  key: string;
  type: "choice";
  instructions: string;
  /** criteria key -> description; Jev picks one key. */
  criteria: Record<string, string>;
}

/**
 * One batched Decisions call: every question is answered with probabilities
 * in a single request. Throws with the upstream message on non-200.
 */
export async function submitDecisions(input: {
  model: string;
  state: Record<string, string>;
  questions: JevQuestion[];
}): Promise<DecisionsResponse & { costUsd: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const questions = Object.fromEntries(
    input.questions.map((q) => [
      q.key,
      { type: q.type, instructions: q.instructions, criteria: q.criteria },
    ]),
  );

  const res = await fetch(DECISIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      state: input.state,
      questions,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: { message?: string } }).error?.message ?? res.statusText)
        : res.statusText;
    throw new Error(`Decisions API ${res.status}: ${message}`);
  }

  const parsed = decisionsResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Decisions API returned an unexpected response shape (${parsed.error.issues[0]?.message ?? "invalid"})`);
  }
  return { ...parsed.data, costUsd: parsed.data.usage?.cost ?? 0 };
}
