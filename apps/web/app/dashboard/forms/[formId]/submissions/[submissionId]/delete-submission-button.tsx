"use client";

import { useState, useTransition } from "react";
import { deleteSubmissionAction } from "./actions";

export function DeleteSubmissionButton({ formId, submissionId }: { formId: string; submissionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return confirming ? (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <span className="text-sm text-red-700">Delete this submission permanently?</span>
      <button
        type="button"
        data-testid="confirm-delete-submission"
        disabled={pending}
        onClick={() => startTransition(() => deleteSubmissionAction(formId, submissionId))}
        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs"
      >
        Cancel
      </button>
    </div>
  ) : (
    <button
      type="button"
      data-testid="delete-submission"
      onClick={() => setConfirming(true)}
      className="h-9 rounded-lg border border-red-200 px-4 text-sm text-red-600 hover:bg-red-50"
    >
      Delete submission
    </button>
  );
}
