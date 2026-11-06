"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  publishFormAction,
  closeFormAction,
  reopenFormAction,
  archiveFormAction,
  unarchiveFormAction,
  deleteFormAction,
  type LifecycleResult,
} from "./lifecycle-actions";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-amber-200 bg-amber-50 text-amber-800",
  archived: "border-slate-200 bg-slate-100 text-slate-600",
};

interface LifecycleBarProps {
  formId: string;
  title: string;
  status: string;
  latestVersionNumber: number | null;
  publicUrl: string | null;
}

export function LifecycleBar({ formId, title, status, latestVersionNumber, publicUrl }: LifecycleBarProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<LifecycleResult | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");

  function run(action: () => Promise<LifecycleResult>): void {
    startTransition(async () => {
      setResult(await action());
    });
  }

  function remove(): void {
    startTransition(async () => {
      await deleteFormAction(formId, confirmTitle);
    });
  }

  const publishLabel = latestVersionNumber ? `Publish update (v${latestVersionNumber + 1})` : "Publish";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span data-testid="form-status" className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}>
          {status}
        </span>
        {status === "published" && latestVersionNumber !== null && (
          <span className="text-xs text-[var(--text-muted)]">v{latestVersionNumber} live</span>
        )}
        {status === "published" && publicUrl && (
          <Link href={publicUrl} target="_blank" data-testid="public-link" className="text-xs text-[var(--accent)] hover:underline">
            {publicUrl.replace(/^https?:\/\//, "")} ↗
          </Link>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {status !== "archived" && (
            <button
              type="button"
              data-testid="publish-button"
              disabled={pending}
              onClick={() => run(() => publishFormAction(formId))}
              className="h-8 rounded-lg bg-[var(--accent)] px-3 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {publishLabel}
            </button>
          )}
          {status === "published" && (
            <button
              type="button"
              data-testid="close-button"
              disabled={pending}
              onClick={() => run(() => closeFormAction(formId))}
              className="h-8 rounded-lg border border-amber-300 px-3 text-xs text-amber-800 hover:bg-amber-50 disabled:opacity-50"
            >
              Close
            </button>
          )}
          {status === "closed" && (
            <button
              type="button"
              data-testid="reopen-button"
              disabled={pending}
              onClick={() => run(() => reopenFormAction(formId))}
              className="h-8 rounded-lg border border-emerald-300 px-3 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              Reopen
            </button>
          )}
          {status !== "archived" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => archiveFormAction(formId))}
              className="h-8 rounded-lg border border-[var(--border)] px-3 text-xs text-[var(--text-muted)] hover:bg-[var(--surface)] disabled:opacity-50"
            >
              Archive
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => unarchiveFormAction(formId))}
              className="h-8 rounded-lg border border-[var(--border)] px-3 text-xs text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-50"
            >
              Unarchive
            </button>
          )}
          <Link
            href={`/dashboard/forms/${formId}/submissions`}
            data-testid="submissions-link"
            className="h-8 rounded-lg border border-[var(--border)] px-3 text-xs leading-8 text-[var(--text)] hover:bg-[var(--surface)]"
          >
            Submissions
          </Link>
          <button
            type="button"
            data-testid="delete-button"
            disabled={pending}
            onClick={() => setConfirmingDelete((v) => !v)}
            className="h-8 rounded-lg border border-red-200 px-3 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
      {result && !result.ok && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {result.error ?? "Action failed"}
        </p>
      )}
      {result?.ok && result.versionNumber !== undefined && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
          Version {result.versionNumber} published — the public link serves it now.
        </p>
      )}
      {confirmingDelete && (
        <div data-testid="delete-confirm" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          <p className="text-red-700">
            This permanently deletes <strong>{title}</strong> and all its submissions. Type the form title to confirm.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              data-testid="delete-confirm-input"
              value={confirmTitle}
              onChange={(e) => setConfirmTitle(e.target.value)}
              placeholder={title}
              className="flex-1 rounded-lg border border-red-200 px-2 py-1 text-sm"
            />
            <button
              type="button"
              data-testid="confirm-delete-form"
              disabled={pending || confirmTitle !== title}
              onClick={remove}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              Delete permanently
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
