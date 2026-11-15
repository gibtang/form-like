"use client";

import { useState, useTransition } from "react";
import {
  generateEndpointKeyAction,
  revokeEndpointAction,
  saveEndpointWhitelistAction,
  type EndpointActionResult,
} from "./endpoint-actions";

interface EndpointSettingsProps {
  formId: string;
  origin: string;
  initial: { enabled: boolean; hasKey: boolean; whitelist: string[] };
}

export function EndpointSettings({ formId, origin, initial }: EndpointSettingsProps) {
  const [state, setState] = useState<EndpointActionResult>({ ok: true, ...initial });
  const [whitelistInput, setWhitelistInput] = useState(initial.whitelist.join(", "));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const actionUrl = `${origin}/api/endpoint/${formId}`;
  const snippet = `<form action="${actionUrl}" method="POST">
  <input type="hidden" name="formlike_key" value="${state.key ?? "YOUR_ACCESS_KEY"}">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <button type="submit">Send</button>
</form>`;

  function run(action: () => Promise<EndpointActionResult>, done: string): void {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setMessage(result.error ?? "Could not save.");
        return;
      }
      setState(result);
      setMessage(done);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-white p-4" data-testid="endpoint-settings">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Endpoint mode</p>
          <p className="text-xs text-[var(--text-muted)]">
            Collect submissions from any static HTML form — paste the snippet, no backend needed.
          </p>
        </div>
      </div>

      {!state.enabled ? (
        <button
          type="button"
          data-testid="endpoint-generate"
          disabled={pending}
          onClick={() => run(() => generateEndpointKeyAction(formId), "Endpoint enabled. Copy the access key now — it is shown only once.")}
          className="h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Enable endpoint &amp; generate key
        </button>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Action URL</p>
            <div className="flex gap-2">
              <code className="flex-1 truncate rounded-lg border border-[var(--border)] px-3 py-2 text-xs" data-testid="endpoint-url">
                {actionUrl}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(actionUrl)}
                className="h-9 rounded-lg border border-[var(--border)] px-3 text-xs hover:bg-[var(--surface)]"
              >
                Copy URL
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Snippet</p>
            <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs" data-testid="endpoint-snippet">{snippet}</pre>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(snippet)}
              className="h-9 rounded-lg border border-[var(--border)] px-3 text-xs hover:bg-[var(--surface)]"
            >
              Copy snippet
            </button>
            {state.key && (
              <p className="text-xs text-emerald-700" data-testid="endpoint-key-once">
                Access key (shown only once): <code>{state.key}</code>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Origin whitelist (comma-separated; empty = any origin)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={whitelistInput}
                onChange={(e) => setWhitelistInput(e.target.value)}
                placeholder="mysite.com, blog.mysite.com"
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    () => saveEndpointWhitelistAction(formId, whitelistInput.split(",")),
                    "Whitelist saved.",
                  )
                }
                className="h-9 rounded-lg border border-[var(--border)] px-3 text-xs hover:bg-[var(--surface)] disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>

          <button
            type="button"
            data-testid="endpoint-revoke"
            disabled={pending}
            onClick={() => run(() => revokeEndpointAction(formId), "Endpoint disabled and key revoked.")}
            className="h-9 rounded-lg border border-[var(--border)] px-3 text-xs text-[var(--text-muted)] hover:bg-[var(--surface)] disabled:opacity-50"
          >
            Disable endpoint &amp; revoke key
          </button>
        </>
      )}
      {message && <p className="text-xs text-[var(--text-muted)]">{message}</p>}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
