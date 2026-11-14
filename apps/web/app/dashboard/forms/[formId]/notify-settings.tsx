"use client";

import { useState, useTransition } from "react";
import {
  reenableNotificationsAction,
  updateEmailNotificationsAction,
  updateNotificationAction,
} from "./form-settings-actions";

export interface NotifySettingsProps {
  formId: string;
  initialEmail: string | null;
  initialEnabled: boolean;
  disabledReason: string | null;
}

export function NotifySettings({ formId, initialEmail, initialEnabled, disabledReason }: NotifySettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [disabled, setDisabled] = useState(disabledReason !== null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setAutoSend(next: boolean): void {
    setMessage(null);
    startTransition(async () => {
      const result = await updateEmailNotificationsAction(formId, next);
      if (result.ok) {
        setEnabled(next);
        setMessage(next ? "Auto-send on: new submissions will email you." : "Auto-send off.");
      } else {
        setMessage(result.error ?? "Could not save.");
      }
    });
  }

  function saveOverride(next: string | null): void {
    setMessage(null);
    startTransition(async () => {
      const result = await updateNotificationAction(formId, next);
      setMessage(
        result.ok
          ? next
            ? `Override saved: notifications will email ${next}.`
            : "Override removed: notifications use your account email."
          : (result.error ?? "Could not save."),
      );
    });
  }

  function reenable(): void {
    setMessage(null);
    startTransition(async () => {
      const result = await reenableNotificationsAction(formId);
      if (result.ok) {
        setDisabled(false);
        setMessage("Notifications re-enabled.");
      } else {
        setMessage(result.error ?? "Could not re-enable.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-white p-4" data-testid="notify-settings">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="notify-auto-send" className="text-sm font-medium">
          Auto-send new submissions to my email
        </label>
        <input
          id="notify-auto-send"
          type="checkbox"
          data-testid="notify-auto-send"
          checked={enabled}
          disabled={pending || disabled}
          onChange={(e) => setAutoSend(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
      </div>
      {disabled ? (
        <div className="rounded-lg border border-[var(--warning, #d97706)] bg-[var(--warning, #d97706)]/10 p-3" data-testid="notify-disabled">
          <p className="text-xs text-[var(--text-muted)]">{disabledReason}</p>
          <button
            type="button"
            data-testid="notify-reenable"
            disabled={pending}
            onClick={reenable}
            className="mt-2 h-8 rounded-lg border border-[var(--border)] px-3 text-xs hover:bg-[var(--surface)] disabled:opacity-50"
          >
            Re-enable notifications
          </button>
        </div>
      ) : (
        enabled && (
          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            <label
              htmlFor="notify-email"
              className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]"
            >
              Override address (optional — default is your account email)
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
                onClick={() => saveOverride(email)}
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
                    saveOverride(null);
                  }}
                  className="h-10 rounded-lg px-2 text-xs text-[var(--text-muted)] hover:bg-[var(--surface)] disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )
      )}
      {message && <p className="text-xs text-[var(--text-muted)]">{message}</p>}
    </div>
  );
}
