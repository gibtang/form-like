import type { FormField, FormDefinition } from "./form-schema";

/**
 * The single answer-shape + visibility + validation contract shared by the
 * editor preview, the public renderer, and (later) server-side submission
 * processing (BUILD-BRIEF: "Use one validation contract ... Conditional
 * rules ... must behave consistently in preview and the published form").
 */

/** Respondent answers keyed by fieldId. Choice answers use optionIds. */
export type AnswerValue = string | number | string[] | null;
export type AnswerMap = Record<string, AnswerValue | undefined>;

function toComparableNumber(value: AnswerValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function ruleMatches(field: FormField, rule: NonNullable<FormField["conditionalRule"]>, answers: AnswerMap): boolean {
  const source = answers[rule.fieldId];
  if (source === undefined || source === null) return false;

  switch (rule.operator) {
    case "eq":
      return String(source) === String(rule.value);
    case "neq":
      return String(source) !== String(rule.value);
    case "includes":
      return Array.isArray(source) && source.includes(String(rule.value));
    case "not_includes":
      return Array.isArray(source) && !source.includes(String(rule.value));
    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      const n = toComparableNumber(source);
      const threshold = toComparableNumber(rule.value);
      if (n === null || threshold === null) return false;
      if (rule.operator === "lt") return n < threshold;
      if (rule.operator === "lte") return n <= threshold;
      if (rule.operator === "gt") return n > threshold;
      return n >= threshold;
    }
    default:
      return false;
  }
}

/** Visibility = every conditional rule of the field matches (no rule → visible). */
export function isFieldVisible(field: FormField, answers: AnswerMap): boolean {
  if (!field.conditionalRule) return true;
  return ruleMatches(field, field.conditionalRule, answers);
}

export type AnswerIssue = { fieldId: string; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function answerIssueForField(field: FormField, value: AnswerValue): string | null {
  const empty =
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
  if (field.required) {
    if (empty) return "This field is required.";
  } else if (empty) {
    return null;
  }

  switch (field.type) {
    case "email":
      if (!EMAIL_PATTERN.test(String(value))) return "Enter a valid email address.";
      break;
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) return "Enter a number.";
      break;
    }
    case "date":
      if (!DATE_PATTERN.test(String(value))) return "Enter a valid date.";
      break;
    case "rating": {
      const n = Number(value);
      const max = field.ratingMax ?? 5;
      if (!Number.isInteger(n) || n < 1 || n > max) return `Rating must be 1–${max}.`;
      break;
    }
    case "single_choice": {
      const optionIds = (field.options ?? []).map((o) => o.optionId);
      if (!optionIds.includes(String(value))) return "Choose one of the listed options.";
      break;
    }
    case "multiple_choice": {
      const optionIds = new Set((field.options ?? []).map((o) => o.optionId));
      if (!Array.isArray(value) || value.some((v) => !optionIds.has(v))) {
        return "Choose only from the listed options.";
      }
      break;
    }
    default:
      break;
  }
  return null;
}

/**
 * Validates answers against a definition: type shape, option membership,
 * and requiredness. Hidden required fields do not prevent submission
 * (BUILD-BRIEF) — visibility is evaluated per answer set.
 */
export function validationIssues(definition: FormDefinition, answers: AnswerMap): AnswerIssue[] {
  const issues: AnswerIssue[] = [];
  for (const field of definition.fields) {
    if (!isFieldVisible(field, answers)) continue;
    const message = answerIssueForField(field, answers[field.fieldId] ?? null);
    if (message) issues.push({ fieldId: field.fieldId, message });
  }
  return issues;
}
