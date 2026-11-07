import { z } from "zod";
import { FIELD_TYPES } from "@/lib/form-schema";

/**
 * Structured-output schema for the text-drafting call (GPT-5.4 Mini via
 * OpenRouter). IMPORTANT: this schema must stay strict-mode clean — Azure
 * (a common OpenRouter upstream for OpenAI models) rejects response_format
 * schemas that contain anyOf/nullable/optional properties. Every property is
 * required and primitive-typed; "empty" values travel as "" or 0 and are
 * normalized server-side in lib/ai/generate.ts.
 */

export const draftedFieldSchema = z.object({
  /** Echo an existing fieldId to preserve identity; "" for new fields. */
  fieldId: z.string().max(80),
  type: z.enum(FIELD_TYPES),
  label: z.string().min(1).max(500),
  /** "" when the field needs no description. */
  description: z.string().max(2000),
  required: z.boolean(),
  /** [] unless the field is single_choice / multiple_choice. */
  options: z
    .array(
      z.object({
        /** Echo an existing optionId to preserve identity; "" for new options. */
        optionId: z.string().max(80),
        label: z.string().min(1).max(500),
      }),
    )
    .max(20),
  /** 0 unless type is rating (then 2–10; default 5). */
  ratingMax: z.number().int().min(0).max(10),
  /** Index (0-based) of the field this one depends on; -1 = always visible. */
  conditionalSourceIndex: z.number().int().min(-1).max(29),
  operator: z.enum(["eq", "neq", "lt", "lte", "gt", "gte", "includes", "not_includes"]),
  /** Rule value as a string; numeric sources are converted server-side. */
  conditionalValue: z.string().max(200),
});

export const draftOutputSchema = z.object({
  kind: z.enum(["form", "unsupported"]),
  title: z.string().max(300),
  /** "" when the form needs no description. */
  description: z.string().max(5000),
  fields: z.array(draftedFieldSchema).max(30),
  /** Required when kind is "unsupported" (else ""). */
  explanation: z.string().max(1000),
});

export type DraftOutput = z.infer<typeof draftOutputSchema>;
