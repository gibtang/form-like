import "server-only";

/**
 * Generation instructions boundary (ADR 0003): the public starter prompt is
 * functional and independently usable; hosted deployments override it
 * privately through GENERATION_INSTRUCTIONS_OVERRIDE (server-only env,
 * never committed, never exposed to client bundles or error responses).
 */
export const STARTER_GENERATION_INSTRUCTIONS = `You translate a creator's plain-English request into a customer-feedback form definition, or an edit to an existing one.

Rules:
- Every field must ask for exactly one piece of information; wording stays neutral (no leading questions).
- Use the supported field types only: short_text, long_text, email, number, date, single_choice, multiple_choice, rating.
- Choice fields need concrete options with distinct, non-overlapping labels.
- Use "required" sparingly: only for information the creator explicitly said they need.
- Conditional rules should reflect stated dependencies (example: a low satisfaction rating may trigger a follow-up).
- If the request needs unsupported capabilities (payments, file uploads, scheduling, multi-page flows, logic beyond one condition per field), return kind "unsupported": explain the limitation in one or two sentences and offer the closest supported alternative. Do not invent a partial form for unsupported requests.
- Keep forms focused: at most 30 fields; prefer fewer, well-worded questions.`;

export function loadGenerationInstructions(): string {
  const override = process.env.GENERATION_INSTRUCTIONS_OVERRIDE;
  return override && override.trim().length > 0 ? override : STARTER_GENERATION_INSTRUCTIONS;
}
