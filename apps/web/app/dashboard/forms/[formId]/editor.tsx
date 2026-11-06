"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MAX_FIELDS_PER_FORM, OPERATORS_BY_SOURCE_TYPE, FIELD_TYPES, type ConditionalOperator, type FieldType, type FormDefinition, type FormField } from "@/lib/form-schema";
import { newIdClient } from "@/lib/client-ids";
import { FormRenderer } from "@/components/form/form-renderer";
import { updateDraftAction, proposeAction, type DraftSaveResult } from "../../actions";
import type { ProposalResult } from "@/lib/ai/generate";
import { LifecycleBar } from "./lifecycle-bar";
import { NotifySettings } from "./notify-settings";
import { cn } from "@/lib/cn";

const TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  email: "Email",
  number: "Number",
  date: "Date",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  rating: "Rating",
};

function isChoice(type: FieldType): boolean {
  return type === "single_choice" || type === "multiple_choice";
}

interface DraftEditorProps {
  formId: string;
  initialDefinition: FormDefinition;
  notifyEmail: string | null;
  lifecycle: {
    status: string;
    latestVersionNumber: number | null;
    publicUrl: string | null;
    title: string;
  };
}

export function DraftEditor({ formId, initialDefinition, notifyEmail, lifecycle }: DraftEditorProps) {
  const [def, setDef] = useState<FormDefinition>(initialDefinition);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<DraftSaveResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [proposing, setProposing] = useState(false);
  const [proposal, setProposal] = useState<ProposalResult | null>(null);
  const [proposalAnswers, setProposalAnswers] = useState<Record<string, unknown>>({});
  const [undoSnapshot, setUndoSnapshot] = useState<FormDefinition | null>(null);

  const atCap = def.fields.length >= MAX_FIELDS_PER_FORM;
  const fieldsById = new Map(def.fields.map((f) => [f.fieldId, f]));

  function generate(): void {
    if (prompt.trim().length === 0 || proposing) return;
    setProposing(true);
    setSaveState(null);
    startTransition(async () => {
      try {
        const result = await proposeAction(formId, prompt);
        setProposal(result);
        setProposalAnswers({});
        if (result.supported) setUndoSnapshot(null);
      } finally {
        setProposing(false);
      }
    });
  }

  function applyProposal(): void {
    if (!proposal?.supported) return;
    setUndoSnapshot(def);
    setDef(proposal.definition);
    setProposal(null);
    setAnswers({});
    setTouched({});
  }

  function discardProposal(): void {
    setProposal(null);
    setProposalAnswers({});
  }

  function undoApply(): void {
    if (!undoSnapshot) return;
    setDef(undoSnapshot);
    setUndoSnapshot(null);
    setAnswers({});
    setTouched({});
  }

  function patchField(fieldId: string, patch: Partial<FormField>): void {
    setDef((d) => ({ ...d, fields: d.fields.map((f) => (f.fieldId === fieldId ? { ...f, ...patch } : f)) }));
  }

  function changeType(fieldId: string, type: FieldType): void {
    patchField(fieldId, {
      type,
      options: isChoice(type) ? [{ optionId: newIdClient("opt_"), label: "Option 1" }] : null,
      ratingMax: type === "rating" ? 5 : null,
      placeholder: null,
    });
  }

  function addField(type: FieldType): void {
    if (atCap) return;
    setDef((d) => ({
      ...d,
      fields: [
        ...d.fields,
        {
          fieldId: newIdClient("fld_"),
          type,
          label: `${TYPE_LABELS[type]} question`,
          description: null,
          required: false,
          options: isChoice(type) ? [{ optionId: newIdClient("opt_"), label: "Option 1" }] : null,
          ratingMax: type === "rating" ? 5 : null,
          placeholder: null,
          conditionalRule: null,
        },
      ],
    }));
  }

  function removeField(fieldId: string): void {
    setDef((d) => ({
      ...d,
      // clear rules referencing the removed field so the draft stays valid
      fields: d.fields
        .filter((f) => f.fieldId !== fieldId)
        .map((f) => (f.conditionalRule?.fieldId === fieldId ? { ...f, conditionalRule: null } : f)),
    }));
  }

  function setRule(fieldId: string, rule: FormField["conditionalRule"]): void {
    patchField(fieldId, { conditionalRule: rule });
  }

  function save(): void {
    startTransition(async () => {
      const result = await updateDraftAction(formId, def);
      setSaveState(result);
    });
  }

  const issuePaths = new Set((saveState?.issues ?? []).map((i) => i.path));

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 p-6 lg:grid-cols-2">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-[var(--text-muted)] hover:underline">
            ← All forms
          </Link>
        </div>
        <LifecycleBar
          formId={formId}
          title={def.title}
          status={lifecycle.status}
          latestVersionNumber={lifecycle.latestVersionNumber}
          publicUrl={lifecycle.publicUrl}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            {def.fields.length}/{MAX_FIELDS_PER_FORM} fields
          </span>
          <button
            type="button"
            onClick={save}
            data-testid="save-draft"
            disabled={pending}
            className="h-9 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save draft"}
          </button>
        </div>
        {saveState && (
          <p
            role={saveState.ok ? "status" : "alert"}
            className={cn(
              "rounded-lg border p-3 text-sm",
              saveState.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            {saveState.ok
              ? "Draft saved."
              : saveState.error ?? `Cannot save: ${saveState.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`}
          </p>
        )}
        {saveState && !saveState.ok && saveState.issues.length > 0 && (
          <div data-testid="validation-issues" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">Fix these before saving:</p>
            <ul className="mt-1 list-disc pl-5">
              {saveState.issues.map((i) => (
                <li key={`${i.path}-${i.message}`}>
                  {i.path}: {i.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-white p-4">
          <label htmlFor="ai-prompt" className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Describe the form or change
          </label>
          <textarea
            id="ai-prompt"
            data-testid="ai-prompt"
            className="min-h-16 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            placeholder='e.g. "Create a customer feedback form asking about satisfaction, missing features, and permission to follow up"'
            value={prompt}
            maxLength={4000}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="generate-proposal"
              onClick={generate}
              disabled={proposing || prompt.trim().length === 0}
              className="h-9 rounded-lg border border-[var(--accent)] px-4 text-sm font-medium text-[var(--accent)] hover:bg-[var(--surface)] disabled:opacity-40"
            >
              {proposing ? "Generating proposal…" : "Generate proposal"}
            </button>
            {undoSnapshot && (
              <button
                type="button"
                data-testid="undo-apply"
                onClick={undoApply}
                className="h-9 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text)] hover:bg-[var(--surface)]"
              >
                Undo last apply
              </button>
            )}
          </div>
        </div>

        <NotifySettings formId={formId} initialEmail={notifyEmail} />

        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-white p-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Title</label>
          <input
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            value={def.title}
            maxLength={300}
            onChange={(e) => setDef((d) => ({ ...d, title: e.target.value }))}
          />
          <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Description</label>
          <textarea
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            value={def.description ?? ""}
            maxLength={5000}
            onChange={(e) => setDef((d) => ({ ...d, description: e.target.value || null }))}
          />
        </div>

        {def.fields.map((field, index) => (
          <div key={field.fieldId} data-testid={`field-card-${index}`} className="space-y-3 rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Field {index + 1} · {TYPE_LABELS[field.type]}
              </span>
              <button
                type="button"
                onClick={() => removeField(field.fieldId)}
                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
            <input
              aria-label="Question wording"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
              value={field.label}
              maxLength={500}
              onChange={(e) => patchField(field.fieldId, { label: e.target.value })}
            />
            <input
              aria-label="Question description"
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
              value={field.description ?? ""}
              maxLength={2000}
              onChange={(e) => patchField(field.fieldId, { description: e.target.value || null })}
            />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                Type
                <select
                  value={field.type}
                  onChange={(e) => changeType(field.fieldId, e.target.value as FieldType)}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => patchField(field.fieldId, { required: e.target.checked })}
                  className="accent-[var(--accent)]"
                />
                Required
              </label>
              {field.type === "rating" && (
                <label className="flex items-center gap-1.5">
                  Scale
                  <select
                    value={field.ratingMax ?? 5}
                    onChange={(e) => patchField(field.fieldId, { ratingMax: Number(e.target.value) })}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        1–{n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {isChoice(field.type) && (
              <div className="space-y-2">
                {(field.options ?? []).map((option, oi) => (
                  <div key={option.optionId} className="flex items-center gap-2">
                    <input
                      aria-label={`Option ${oi + 1}`}
                      className="flex-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:outline-none"
                      value={option.label}
                      maxLength={500}
                      onChange={(e) =>
                        patchField(field.fieldId, {
                          options: (field.options ?? []).map((o) =>
                            o.optionId === option.optionId ? { ...o, label: e.target.value } : o,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label={`Remove option ${oi + 1}`}
                      onClick={() =>
                        patchField(field.fieldId, {
                          options: (field.options ?? []).filter((o) => o.optionId !== option.optionId),
                        })
                      }
                      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    patchField(field.fieldId, {
                      options: [...(field.options ?? []), { optionId: newIdClient("opt_"), label: `Option ${(field.options ?? []).length + 1}` }],
                    })
                  }
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text)] hover:bg-[var(--surface)]"
                >
                  + Add option
                </button>
              </div>
            )}

            <ConditionalRuleEditor field={field} fieldsById={fieldsById} onSet={(rule) => setRule(field.fieldId, rule)} />
          </div>
        ))}

        <div className="rounded-lg border border-[var(--border)] bg-white p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Add field</p>
          <div className="flex flex-wrap gap-2">
            {FIELD_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                disabled={atCap}
                onClick={() => addField(t)}
                data-testid={`add-field-${t}`}
                className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-40"
              >
                + {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="lg:sticky lg:top-6 lg:h-fit">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {proposal ? "Proposed result — apply or discard" : "Live preview — answer fields to test conditional visibility and validation"}
        </p>
        {proposal && !proposal.supported && (
          <div
            data-testid="proposal-error"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            {"explanation" in proposal ? proposal.explanation : proposal.message}
          </div>
        )}
        {proposal?.supported && (
          <div data-testid="proposal-panel" className="mb-4 space-y-3 rounded-lg border border-[var(--accent)] bg-white p-4">
            <p className="text-sm text-[var(--text)]">
              <span className="font-medium">Change summary:</span> {proposal.changeSummary}
            </p>
            <div className="rounded-lg border border-[var(--border)] p-4">
              <FormRenderer
                definition={proposal.definition}
                answers={proposalAnswers as never}
                onChange={(fieldId, value) => setProposalAnswers((a) => ({ ...a, [fieldId]: value }))}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="apply-proposal"
                onClick={applyProposal}
                className="h-9 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:opacity-90"
              >
                Apply
              </button>
              <button
                type="button"
                data-testid="discard-proposal"
                onClick={discardProposal}
                className="h-9 rounded-lg border border-[var(--border)] px-4 text-sm text-[var(--text)] hover:bg-[var(--surface)]"
              >
                Discard
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Applying changes your local draft only — select Save draft to keep it.
            </p>
          </div>
        )}
        <div className="rounded-lg border border-[var(--border)] bg-white p-6">
          <FormRenderer
            definition={def}
            answers={answers as never}
            touched={touched}
            onChange={(fieldId, value) => {
              setAnswers((a) => ({ ...a, [fieldId]: value }));
              setTouched((t) => ({ ...t, [fieldId]: true }));
            }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Required fields marked * must be answered when visible. Preview validation is identical to the public
          form&rsquo;s contract.
        </p>
      </section>
    </main>
  );
}

function ConditionalRuleEditor({
  field,
  fieldsById,
  onSet,
}: {
  field: FormField;
  fieldsById: Map<string, FormField>;
  onSet: (rule: FormField["conditionalRule"]) => void;
}) {
  const rule = field.conditionalRule;
  const source = rule ? fieldsById.get(rule.fieldId) : undefined;
  const sourceType = source?.type;
  const allowed: readonly ConditionalOperator[] = sourceType ? OPERATORS_BY_SOURCE_TYPE[sourceType] : [];
  const operatorOk = rule ? allowed.includes(rule.operator) : true;

  function startRule(): void {
    // default to the first other field that can serve as a source
    for (const f of Array.from(fieldsById.values())) {
      if (f.fieldId !== field.fieldId) {
        onSet({ fieldId: f.fieldId, operator: OPERATORS_BY_SOURCE_TYPE[f.type][0] ?? "eq", value: "" });
        return;
      }
    }
  }

  return (
    <div className="space-y-2 border-t border-[var(--border)] pt-3">
      {rule ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)]">Show only when</span>
          <select
            aria-label="Rule source field"
            value={rule.fieldId}
            onChange={(e) => {
              const next = fieldsById.get(e.target.value);
              onSet({
                fieldId: e.target.value,
                operator: next ? (OPERATORS_BY_SOURCE_TYPE[next.type][0] ?? "eq") : "eq",
                value: "",
              });
            }}
            className="rounded-md border border-[var(--border)] px-2 py-1"
          >
            {Array.from(fieldsById.values())
              .filter((f) => f.fieldId !== field.fieldId)
              .map((f) => (
                <option key={f.fieldId} value={f.fieldId}>
                  {f.label || "Untitled field"}
                </option>
              ))}
          </select>
          <select
            aria-label="Rule operator"
            value={rule.operator}
            onChange={(e) => onSet({ ...rule, operator: e.target.value as ConditionalOperator })}
            className="rounded-md border border-[var(--border)] px-2 py-1"
          >
            {allowed.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          {sourceType === "single_choice" || sourceType === "multiple_choice" ? (
            <select
              aria-label="Rule value"
              value={typeof rule.value === "string" ? rule.value : ""}
              onChange={(e) => onSet({ ...rule, value: e.target.value })}
              className="rounded-md border border-[var(--border)] px-2 py-1"
            >
              <option value="">Choose…</option>
              {(source?.options ?? []).map((o) => (
                <option key={o.optionId} value={o.optionId}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : sourceType === "number" || sourceType === "rating" ? (
            <input
              aria-label="Rule value"
              type="number"
              value={typeof rule.value === "number" ? rule.value : ""}
              onChange={(e) => onSet({ ...rule, value: e.target.value === "" ? "" : Number(e.target.value) })}
              className="w-20 rounded-md border border-[var(--border)] px-2 py-1"
            />
          ) : (
            <input
              aria-label="Rule value"
              type="text"
              value={typeof rule.value === "string" ? rule.value : ""}
              onChange={(e) => onSet({ ...rule, value: e.target.value })}
              className="w-32 rounded-md border border-[var(--border)] px-2 py-1"
            />
          )}
          {!operatorOk && <span className="text-red-600">Operator invalid for this source field</span>}
          <button
            type="button"
            onClick={() => onSet(null)}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-[var(--text-muted)] hover:bg-[var(--surface)]"
          >
            Remove rule
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startRule}
          disabled={fieldsById.size < 2}
          className="text-xs text-[var(--accent)] hover:underline disabled:opacity-40"
        >
          + Show conditionally (depends on another answer)
        </button>
      )}
    </div>
  );
}
