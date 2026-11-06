import { z } from "zod";

/**
 * The one validation contract used by direct edits, previews, publication,
 * and (later) AI proposals and public submission processing (BUILD-BRIEF
 * "Forms and presentation"). Everything validates a full definition against
 * the accepted field catalogue and conditional-rule constraints.
 *
 * MUST stay free of node:* imports: client components (editor, preview,
 * public renderer) import this module.
 */

const idPattern = (prefix: string): RegExp => new RegExp(`^${prefix}[0-9a-f]{32}$`);

export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "number",
  "date",
  "single_choice",
  "multiple_choice",
  "rating",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const MAX_FIELDS_PER_FORM = 30;
export const MAX_OPTIONS_PER_FIELD = 20;

export const CONDITIONAL_OPERATORS = [
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "includes",
  "not_includes",
] as const;

export type ConditionalOperator = (typeof CONDITIONAL_OPERATORS)[number];

/** Operators each field type can serve as a rule source. */
export const OPERATORS_BY_SOURCE_TYPE: Record<FieldType, readonly ConditionalOperator[]> = {
  single_choice: ["eq", "neq"],
  multiple_choice: ["includes", "not_includes"],
  number: ["eq", "neq", "lt", "lte", "gt", "gte"],
  rating: ["eq", "neq", "lt", "lte", "gt", "gte"],
  short_text: ["eq", "neq"],
  long_text: ["eq", "neq"],
  email: ["eq", "neq"],
  date: ["eq", "neq"],
};

const fieldIdSchema = z.string().refine((v) => idPattern("fld_").test(v), "Invalid field id");
const optionIdSchema = z.string().refine((v) => idPattern("opt_").test(v), "Invalid option id");

export const optionSchema = z.object({
  optionId: optionIdSchema,
  label: z.string().trim().min(1).max(500),
});

export const conditionalRuleSchema = z.object({
  /** The field whose answer decides visibility. */
  fieldId: fieldIdSchema,
  operator: z.enum(CONDITIONAL_OPERATORS),
  /** optionId for choice operators; number for numeric; string for eq/neq. */
  value: z.union([z.string(), z.number()]),
});

export const fieldSchema = z.object({
  fieldId: fieldIdSchema,
  type: z.enum(FIELD_TYPES),
  label: z.string().trim().min(1).max(500),
  description: z.string().trim().max(2000).nullable().default(null),
  required: z.boolean().default(false),
  /** single_choice / multiple_choice only. */
  options: z.array(optionSchema).max(MAX_OPTIONS_PER_FIELD).nullable().default(null),
  /** rating only: the top of the 1..N scale (default 5). */
  ratingMax: z.number().int().min(2).max(10).nullable().default(null),
  /** Show this field only when the rule matches the referenced answer. */
  conditionalRule: conditionalRuleSchema.nullable().default(null),
});

export const formDefinitionSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).nullable().default(null),
  fields: z.array(fieldSchema).max(MAX_FIELDS_PER_FORM),
});

export type FormField = z.infer<typeof fieldSchema>;
export type FormOption = z.infer<typeof optionSchema>;
export type ConditionalRule = z.infer<typeof conditionalRuleSchema>;
export type FormDefinition = z.infer<typeof formDefinitionSchema>;

export type DefinitionIssue = { path: string; message: string };

function isOptionIdOfField(field: FormField, value: unknown): boolean {
  return (
    field.type === "single_choice" &&
    typeof value === "string" &&
    (field.options ?? []).some((o) => o.optionId === value)
  );
}

/**
 * Full semantic validation beyond schema conformance: choice options exist,
 * operators match the referenced field's type, rule values are shaped for
 * that operator, and the conditional-visibility graph has no cycles.
 */
export function validateFormDefinition(definition: unknown): {
  ok: boolean;
  issues: DefinitionIssue[];
} {
  const issues: DefinitionIssue[] = [];
  const parsed = formDefinitionSchema.safeParse(definition);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({ path: issue.path.join("."), message: issue.message });
    }
    return { ok: false, issues };
  }

  const def = parsed.data;
  const byId = new Map<string, FormField>();
  for (const field of def.fields) {
    if (byId.has(field.fieldId)) {
      issues.push({ path: `fields.${field.fieldId}`, message: "Duplicate field id" });
      continue;
    }
    byId.set(field.fieldId, field);
  }

  const choiceTypes: FieldType[] = ["single_choice", "multiple_choice"];
  for (const field of def.fields) {
    const path = `fields.${field.fieldId}`;
    if (choiceTypes.includes(field.type)) {
      if (!field.options || field.options.length === 0) {
        issues.push({ path, message: "Choice fields need at least one option" });
      }
      const optionIds = new Set((field.options ?? []).map((o) => o.optionId));
      if (optionIds.size !== (field.options ?? []).length) {
        issues.push({ path, message: "Duplicate option id" });
      }
    } else if (field.options) {
      issues.push({ path, message: `Options are only valid on choice fields (${field.type})` });
    }
    if (field.type !== "rating" && field.ratingMax !== null) {
      issues.push({ path, message: "ratingMax is only valid on rating fields" });
    }

    const rule = field.conditionalRule;
    if (rule) {
      if (rule.fieldId === field.fieldId) {
        issues.push({ path, message: "A field cannot condition on itself" });
        continue;
      }
      const source = byId.get(rule.fieldId);
      if (!source) {
        issues.push({ path, message: `Rule references unknown field ${rule.fieldId}` });
        continue;
      }
      if (!OPERATORS_BY_SOURCE_TYPE[source.type].includes(rule.operator)) {
        issues.push({
          path,
          message: `Operator ${rule.operator} is not valid for a ${source.type} source field`,
        });
        continue;
      }
      const valueOk =
        (rule.operator === "includes" || rule.operator === "not_includes")
          ? isOptionIdOfField(source, rule.value)
          : source.type === "number" || source.type === "rating"
            ? typeof rule.value === "number" &&
              (source.type !== "rating" || (rule.value >= 1 && rule.value <= (source.ratingMax ?? 5)))
            : typeof rule.value === "string" &&
              (source.type !== "single_choice" || (source.options ?? []).some((o) => o.optionId === rule.value));
      if (!valueOk) {
        issues.push({ path, message: "Rule value does not match the source field's accepted answers" });
      }
    }
  }

  // Cycle detection over the conditional-visibility graph.
  const state = new Map<string, "visiting" | "done">();
  const visit = (fieldId: string, stack: Set<string>): void => {
    const nodeState = state.get(fieldId);
    if (nodeState === "done") return;
    if (stack.has(fieldId)) {
      issues.push({ path: `fields.${fieldId}`, message: "Conditional rules form a cycle" });
      return;
    }
    stack.add(fieldId);
    const field = byId.get(fieldId);
    const rule = field?.conditionalRule;
    if (rule && byId.has(rule.fieldId)) visit(rule.fieldId, stack);
    stack.delete(fieldId);
    state.set(fieldId, "done");
  };
  for (const field of def.fields) visit(field.fieldId, new Set());

  return { ok: issues.length === 0, issues };
}
