"use client";

import { useState } from "react";
import type { FormDefinition } from "@/lib/form-schema";
import { FormRenderer } from "@/components/form/form-renderer";

interface PublicFormProps {
  formId: string;
  /** The version this page loaded — the respondent finishes this version even
   * if the creator publishes an update meanwhile (BUILD-BRIEF publishing). */
  versionId: string;
  definition: FormDefinition;
}

type SubmitState = "idle" | "submitting" | "success" | "closed" | "error";

export function PublicForm({ formId, versionId, definition }: PublicFormProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<SubmitState>("idle");
  const [generalError, setGeneralError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    if (state === "submitting") return;
    setGeneralError(null);
    try {
      const res = await fetch(`/api/f/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, answers }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && body.ok) {
        setState("success");
        return;
      }
      if (body.error === "closed") {
        setState("closed");
        return;
      }
      if (res.status === 400) {
        // Field-level issues from the server's contract — reveal them all.
        setTouched(Object.fromEntries(definition.fields.map((f) => [f.fieldId, true])));
        setGeneralError("Some answers need attention before submitting.");
        setState("error");
        return;
      }
      setGeneralError(body.error ?? "Submission failed. Try again.");
      setState("error");
    } catch {
      setGeneralError("Network error. Try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div data-testid="submit-success" className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-800">Thanks — your response was recorded.</h2>
        <p className="mt-1 text-sm text-emerald-700">You can safely close this page.</p>
      </div>
    );
  }

  if (state === "closed") {
    return (
      <div data-testid="submit-closed" className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-800">{definition.title} is closed</h2>
        <p className="mt-1 text-sm text-amber-700">This form stopped accepting submissions while you were answering. Your response was not recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormRenderer
        definition={definition}
        answers={answers as never}
        touched={touched}
        onChange={(fieldId, value) => {
          setAnswers((a) => ({ ...a, [fieldId]: value }));
          setTouched((t) => ({ ...t, [fieldId]: true }));
        }}
      />
      {generalError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {generalError}
        </p>
      )}
      <button
        type="button"
        data-testid="submit-response"
        onClick={submit}
        disabled={state === "submitting"}
        className="h-10 w-full rounded-lg bg-[var(--accent)] text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {state === "submitting" ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
