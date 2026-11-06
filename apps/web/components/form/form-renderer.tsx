"use client";

import type { FormDefinition } from "@/lib/form-schema";
import { type AnswerMap, isFieldVisible, validationIssues } from "@/lib/form-eval";
import { FieldInput } from "./field-input";

interface FormRendererProps {
  definition: FormDefinition;
  answers: AnswerMap;
  /** Only fields with an entry here show their validation error. */
  touched?: Record<string, boolean>;
  onChange: (fieldId: string, value: AnswerMap[string]) => void;
}

/**
 * Renders a full definition as respondents will see it: only fields whose
 * conditional rules match the current answers, with per-field validation.
 * The editor preview passes live local state; the public renderer will pass
 * the published version with the identical contract.
 */
export function FormRenderer({ definition, answers, touched = {}, onChange }: FormRendererProps) {
  const issues = validationIssues(definition, answers);
  const issueByField = new Map(issues.map((i) => [i.fieldId, i.message]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">{definition.title}</h2>
        {definition.description && <p className="mt-1 text-sm text-[var(--text-muted)]">{definition.description}</p>}
      </div>
      {definition.fields.filter((field) => isFieldVisible(field, answers)).length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">This form has no visible fields.</p>
      )}
      {definition.fields
        .filter((field) => isFieldVisible(field, answers))
        .map((field) => (
          <FieldInput
            key={field.fieldId}
            field={field}
            value={answers[field.fieldId] ?? null}
            error={touched[field.fieldId] ? issueByField.get(field.fieldId) : undefined}
            onChange={onChange}
          />
        ))}
    </div>
  );
}
