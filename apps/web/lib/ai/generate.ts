import "server-only";
import { generateObject } from "ai";
import { randomBytes } from "node:crypto";
import type { FormDefinition, FormField, FormOption } from "@/lib/form-schema";
import { FIELD_TYPES, validateFormDefinition } from "@/lib/form-schema";
import { textModel } from "./openrouter";
import { loadGenerationInstructions } from "./prompts";
import { draftOutputSchema, type DraftOutput } from "./schemas";
import { submitDecisions } from "./jev";
import { reserveAiOperation, completeAiOperation, failAiOperation, AiOpDeniedError, type TokenUsage } from "@/lib/quota";

export type FormProposal = {
  supported: true;
  /** Proposed draft definition with stable, server-verified identities. */
  definition: FormDefinition;
  changeSummary: string;
  /** Count of fields/options whose ids the model preserved from the current draft. */
  preserved: { fields: number; options: number };
  /** Jev's control-selection confidence, when its batch succeeded. */
  jevConfidence?: number;
};

export type UnsupportedProposal = {
  supported: false;
  explanation: string;
};

export type AiProposalError = {
  supported: false;
  error:
    | "quota_exhausted"
    | "concurrency_limit"
    | "spend_cutoff"
    | "rate_limited"
    | "provider_failure"
    | "ai_not_configured"
    | "invalid_proposal";
  message: string;
};

export type ProposalResult = FormProposal | UnsupportedProposal | AiProposalError;

const cuidLike = (): string => randomBytes(16).toString("hex");

const CONTROL_CRITERIA: Record<string, string> = {
  short_text: "Single-line free text — names, short answers",
  long_text: "Multi-line paragraph — open-ended feedback",
  email: "Email address with validation",
  number: "Numeric input — quantities, amounts",
  date: "Calendar date picker",
  single_choice: "Pick exactly one option from a list",
  multiple_choice: "Pick any number of options from a list",
  rating: "Numeric satisfaction scale (1–N stars/buttons)",
};

const SCALE_CRITERIA: Record<string, string> = {
  "3": "Quick opinion with a 1–3 scale",
  "5": "Standard satisfaction rating with a 1–5 scale",
  "7": "Nuanced rating with a 1–7 scale",
  "10": "Fine-grained rating with a 1–10 scale",
};

function currentDefinitionBlock(current: FormDefinition): string {
  const fields = current.fields
    .map((f, i) => {
      const options = f.options?.length
        ? ` options: ${JSON.stringify(f.options.map((o) => ({ optionId: o.optionId, label: o.label })))}`
        : "";
      const rule = f.conditionalRule ? ` conditionalRule: ${JSON.stringify(f.conditionalRule)}` : "";
      return `${i + 1}. { "fieldId": "${f.fieldId}", type: "${f.type}", label: ${JSON.stringify(f.label)}, required: ${f.required}${options}${rule} }`;
    })
    .join("\n");
  return `Current draft (for every field you keep, echo its exact "fieldId"; use "" for new fields; likewise echo option ids or ""):\n${fields || "(no fields yet)"}`;
}

function normalizeRule(
  field: Omit<FormField, "conditionalRule">,
  draft: DraftOutput["fields"][number],
  resolvedFields: FormField[],
): FormField["conditionalRule"] {
  const idx = draft.conditionalSourceIndex;
  if (idx < 0 || idx >= resolvedFields.length) return null;
  const source = resolvedFields[idx];
  if (!source || source.fieldId === field.fieldId) return null;

  const numeric = source.type === "number" || source.type === "rating";
  const raw = draft.conditionalValue.trim();
  const value = numeric ? Number(raw) : raw;
  if (!Number.isFinite(value)) return null;
  if (numeric && typeof value === "number" && source.type === "rating" && (value < 1 || value > (source.ratingMax ?? 5))) {
    return null;
  }
  return { fieldId: source.fieldId, operator: draft.operator, value };
}

/**
 * Runs draft generation (text model) + Jev control selection inside a quota
 * reservation. Successful proposals consume the reservation even if the
 * creator discards them; provider failures, invalid proposals, and
 * unsupported requests release it without consuming (BUILD-BRIEF hosted
 * usage rules).
 */
export async function generateFormProposal(input: {
  accountId: string;
  prompt: string;
  current: FormDefinition | null;
}): Promise<ProposalResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    return { supported: false, error: "ai_not_configured", message: "AI generation is not configured on this instance." };
  }

  let reservation;
  try {
    reservation = await reserveAiOperation(input.accountId);
  } catch (err) {
    if (err instanceof AiOpDeniedError) {
      return { supported: false, error: err.reason, message: err.message };
    }
    throw err;
  }

  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let changeSummaryNote = "";
  try {
    const editing = input.current !== null;
    const system = [
      loadGenerationInstructions(),
      editing
        ? "The creator is editing an existing draft."
        : "The creator is creating a new form.",
      "Schema conventions: echo existing fieldId/optionId values exactly to preserve them, \"\" for new ones. Use \"\" for absent text, [] for absent option lists, and ratingMax 0 for non-rating fields. Set conditionalSourceIndex -1 when the field is always visible; otherwise use the 0-based index of the field it depends on.",
    ].join("\n");

    const user = editing ? `${input.prompt}\n\n${currentDefinitionBlock(input.current!)}` : input.prompt;

    const { object: draft, usage: draftUsage } = await generateObject({
      model: textModel(),
      schema: draftOutputSchema,
      system,
      prompt: user,
    });
    usage = {
      inputTokens: draftUsage.inputTokens ?? 0,
      outputTokens: draftUsage.outputTokens ?? 0,
    };

    if (draft.kind === "unsupported") {
      await failAiOperation(reservation, usage);
      return { supported: false, explanation: draft.explanation.trim() || "This request isn't supported for forms." };
    }

    // Identity resolution: echoed ids survive only if they exist in the
    // current draft; everything else is minted server-side.
    const currentFields = new Map<string, FormField>((input.current?.fields ?? []).map((f) => [f.fieldId, f]));
    let preservedFields = 0;
    let preservedOptions = 0;

    const resolvedBase: FormField[] = draft.fields.map((f) => {
      const prior = f.fieldId ? currentFields.get(f.fieldId) : undefined;
      if (prior) preservedFields += 1;
      const priorOptions = new Map<string, FormOption>((prior?.options ?? []).map((o) => [o.optionId, o]));
      const options =
        f.type === "single_choice" || f.type === "multiple_choice"
          ? f.options.map((o) => {
              const match = o.optionId ? priorOptions.get(o.optionId) : undefined;
              if (match) preservedOptions += 1;
              return { optionId: match?.optionId ?? `opt_${cuidLike()}`, label: o.label };
            })
          : null;
      return {
        fieldId: prior?.fieldId ?? `fld_${cuidLike()}`,
        type: f.type,
        label: f.label,
        description: f.description || null,
        required: f.required,
        options,
        ratingMax: f.type === "rating" ? (f.ratingMax >= 2 ? f.ratingMax : (prior?.ratingMax ?? 5)) : null,
        placeholder: null,
        conditionalRule: null,
      };
    });

    // Attach conditional rules after identities exist (they reference ids).
    const fields = resolvedBase.map((field, i) => {
      const rule = normalizeRule(field, draft.fields[i]!, resolvedBase);
      return { ...field, conditionalRule: rule };
    });

    const candidate: FormDefinition = {
      title: draft.title.trim() || input.current?.title || "Untitled form",
      description: draft.description.trim() ? draft.description : null,
      fields,
    };

    const { ok, issues } = validateFormDefinition(candidate);
    if (!ok) {
      await failAiOperation(reservation, usage);
      return {
        supported: false,
        error: "invalid_proposal",
        message: `The model produced an invalid form (${issues[0]?.message ?? "validation failed"}). Your draft is unchanged — try rephrasing.`,
      };
    }

    // Jev control selection: one batched Decisions request with a Choice
    // question per field (+ rating-scale questions). Non-fatal on failure.
    let jevCost = 0;
    let jevConfidence: number | undefined;
    try {
      const state: Record<string, string> = {
        product: "Form-like: a customer-feedback form builder for small SaaS teams.",
        creatorRequest: input.prompt,
        formTitle: candidate.title,
      };
      const questions = candidate.fields.map((f, i) => {
        state[`field_${i}`] =
          `type=${f.type}; label=${JSON.stringify(f.label)}; description=${JSON.stringify(f.description ?? "")}; required=${f.required}${
            f.options ? `; options=${JSON.stringify(f.options.map((o) => o.label))}` : ""
          }`;
        return {
          key: `control_${i}`,
          type: "choice" as const,
          instructions: `Which control should present field_${i} (index ${i})?`,
          criteria: CONTROL_CRITERIA,
        };
      });
      candidate.fields.forEach((f, i) => {
        if (f.type === "rating") {
          questions.push({
            key: `scale_${i}`,
            type: "choice",
            instructions: `Which rating scale fits field_${i} (index ${i}, "${f.label}")?`,
            criteria: SCALE_CRITERIA,
          });
        }
      });

      const jev = await submitDecisions({
        model: process.env.OPENROUTER_JEV_MODEL ?? "typesafe/jev-1.14",
        state,
        questions,
      });
      jevCost = jev.costUsd;

      candidate.fields = candidate.fields.map((f, i) => {
        const control = jev.answers[`control_${i}`];
        const scale = jev.answers[`scale_${i}`];
        let type = f.type;
        let ratingMax = f.ratingMax;
        let placeholder = f.placeholder;
        if (control?.choice && (FIELD_TYPES as readonly string[]).includes(control.choice)) {
          type = control.choice as FormField["type"];
          if (type !== f.type) {
            // Control change may invalidate list-shaped data the draft had.
            if (type === "single_choice" || type === "multiple_choice") {
              if (!f.options || f.options.length === 0) return { ...f, type };
            } else if (f.type === "single_choice" || f.type === "multiple_choice") {
              return { ...f, type, options: null };
            }
          }
        }
        if (f.type === "rating" || type === "rating") {
          if (scale?.choice) {
            const n = Number(scale.choice.split("–")[1] ?? scale.choice);
            if (Number.isInteger(n) && n >= 2 && n <= 10) ratingMax = n;
          }
        }
        placeholder = null; // Jev cannot produce prose; placeholder stays creator-set.
        const confidence =
          control?.confidence !== undefined && scale?.confidence !== undefined
            ? Math.min(control.confidence, scale.confidence)
            : control?.confidence;
        if (confidence !== undefined) {
          jevConfidence = jevConfidence === undefined ? confidence : Math.min(jevConfidence, confidence);
        }
        return { ...f, type, ratingMax, placeholder };
      });

      const changed = candidate.fields.filter((f, i) => input.current?.fields[i] && input.current.fields[i].type !== f.type).length;
      if (changed > 0) changeSummaryNote = ` Jev adjusted ${changed} control${changed === 1 ? "" : "s"}.`;
    } catch {
      changeSummaryNote = " (Jev control selection unavailable — drafted controls kept.)";
    }

    await completeAiOperation(reservation, usage, jevCost);

    let changeSummary = editing ? "Proposed edits to your draft." : "Proposed a new form from your description.";
    if (editing) {
      const before = input.current!.fields.map((f) => f.label).join(", ");
      const after = candidate.fields.map((f) => f.label).join(", ");
      changeSummary =
        preservedFields > 0
          ? `Edited your draft (kept ${preservedFields} field${preservedFields === 1 ? "" : "s"}${
              preservedOptions > 0 ? `, ${preservedOptions} option${preservedOptions === 1 ? "" : "s"}` : ""
            }): "${before}" → "${after}".`
          : `Replaced the draft fields: "${before}" → "${after}".`;
    }
    changeSummary += changeSummaryNote;

    return {
      supported: true,
      definition: candidate,
      changeSummary,
      preserved: { fields: preservedFields, options: preservedOptions },
      ...(jevConfidence !== undefined ? { jevConfidence } : {}),
    };
  } catch (err) {
    await failAiOperation(reservation, usage.inputTokens || usage.outputTokens ? usage : null);
    return {
      supported: false,
      error: "provider_failure",
      message:
        err instanceof Error && err.message
          ? `Generation failed (${err.message.slice(0, 140)}). Your draft is unchanged — you can retry.`
          : "Generation failed. Your draft is unchanged — you can retry.",
    };
  }
}
