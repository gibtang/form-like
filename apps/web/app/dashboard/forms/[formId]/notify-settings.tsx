"use client";

import { useState, useTransition } from "react";
import { updateNotificationAction } from "./form-settings-actions";

export function NotifySettings({ formId, initialEmail }: { formId: string; initialEmail: string | null }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: string | null): void {
    setMessage(null);
    startTransition(async () => {
      const result = await updateNotificationAction(formId, next);
      setMessage(
        result.ok
          ? next
            ? `Notifications on: new submissions will email ${next}.`
            : "Notifications off."
          : (result.error ?? "Could not save."),
      );
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-white p-4" data-testid="notify-settings">
      <label htmlFor="notify-email" className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Email me on new submissions (optional)
      </label>
      <div className="flex gap-2">
        <input
          id="notify-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
        <button
          type="button"
          data-testid="notify-save"
          disabled={pending}
          onClick={() => save(email)}
          className="h-10 rounded-lg border border-[var(--border)] px-3 text-sm hover:bg-[var(--surface)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {initialEmail && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setEmail("");
              save(null);
            }}
            className="h-10 rounded-lg px-2 text-xs text-[var(--text-muted)] hover:bg-[var(--surface)] disabled:opacity-50"
          >
            Off
          </button>
        )}
      </div>
      {message && <p className="text-xs text-[var(--text-muted)]">{message}</p>}
    </div>
  );
}
