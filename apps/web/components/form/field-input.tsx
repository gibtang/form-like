"use client";

import type { FormField } from "@/lib/form-schema";
import type { AnswerValue } from "@/lib/form-eval";
import { cn } from "@/lib/cn";

/**
 * Renders ONE field exactly as a respondent will see it: label, required
 * mark, description, control, and per-field error. Shared by the editor
 * preview and the future public renderer so behavior cannot diverge.
 */

interface FieldInputProps {
  field: FormField;
  value: AnswerValue;
  error?: string;
  onChange: (fieldId: string, value: AnswerValue) => void;
}

const controlClasses =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] placeholder:text-slate-400 focus:border-[var(--accent)] focus:outline-none";

export function FieldInput({ field, value, error, onChange }: FieldInputProps) {
  const set = (v: AnswerValue) => onChange(field.fieldId, v);
  const inputId = `f-input-${field.fieldId}`;
  const labeled = ["short_text", "long_text", "email", "number", "date"].includes(field.type);

  let control: React.ReactNode;
  switch (field.type) {
    case "short_text":
      control = <input className={controlClasses} type="text" id={inputId} value={typeof value === "string" ? value : ""} onChange={(e) => set(e.target.value)} />;
      break;
    case "long_text":
      control = <textarea className={cn(controlClasses, "min-h-24")} id={inputId} value={typeof value === "string" ? value : ""} onChange={(e) => set(e.target.value)} />;
      break;
    case "email":
      control = <input className={controlClasses} type="email" id={inputId} value={typeof value === "string" ? value : ""} onChange={(e) => set(e.target.value)} />;
      break;
    case "number":
      control = <input className={controlClasses} type="number" id={inputId} step="any" value={typeof value === "string" || typeof value === "number" ? String(value) : ""} onChange={(e) => set(e.target.value === "" ? null : e.target.value)} />;
      break;
    case "date":
      control = <input className={controlClasses} type="date" id={inputId} value={typeof value === "string" ? value : ""} onChange={(e) => set(e.target.value)} />;
      break;
    case "single_choice":
      control = (
        <div className="space-y-2" role="radiogroup" aria-label={field.label}>
          {(field.options ?? []).map((option) => (
            <label key={option.optionId} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.fieldId}
                checked={value === option.optionId}
                onChange={() => set(option.optionId)}
                className="accent-[var(--accent)]"
              />
              {option.label}
            </label>
          ))}
        </div>
      );
      break;
    case "multiple_choice": {
      const selected = Array.isArray(value) ? value : [];
      control = (
        <div className="space-y-2">
          {(field.options ?? []).map((option) => (
            <label key={option.optionId} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(option.optionId)}
                onChange={(e) => set(e.target.checked ? [...selected, option.optionId] : selected.filter((v) => v !== option.optionId))}
                className="accent-[var(--accent)]"
              />
              {option.label}
            </label>
          ))}
        </div>
      );
      break;
    }
    case "rating": {
      const max = field.ratingMax ?? 5;
      const current = typeof value === "number" ? value : null;
      control = (
        <div className="flex gap-1" role="radiogroup" aria-label={`${field.label} rating`}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} of ${max}`}
              onClick={() => set(n)}
              className={cn(
                "h-9 w-9 rounded-lg border text-sm font-medium transition-colors",
                current === n
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--surface)]",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
      break;
    }
    default:
      control = null;
  }

  return (
    <div data-testid={`field-${field.fieldId}`} className="space-y-1.5">
      <label htmlFor={labeled ? inputId : undefined} className="block text-sm font-medium text-[var(--text)]">
        {field.label}
        {field.required && <span aria-hidden className="ml-1 text-red-500">*</span>}
        {field.required && <span className="sr-only">(required)</span>}
      </label>
      {field.description && <p className="text-xs text-[var(--text-muted)]">{field.description}</p>}
      {control}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
