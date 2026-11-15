import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { listApiTokens, createApiToken, revokeApiToken } from "@/lib/api-token";
import { FREE_SUBMISSIONS_PER_MONTH, isPro, monthlySubmissionUsage, refreshProStatus } from "@/lib/billing";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { cancelProAction, completeCheckoutAction, resumeProAction, startCheckoutAction } from "./billing-actions";
import { CopyTokenButton } from "./copy-token-button";

export const metadata = { title: "Settings" };

interface SettingsSearchParams {
  created?: string;
  prefix?: string;
  error?: string;
  checkout?: string;
  session_id?: string;
  cancelled?: string;
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<SettingsSearchParams> }) {
  const { created, prefix, error, checkout, session_id, cancelled } = await searchParams;
  const session = await auth();
  const user = await requireUser();
  if (!user) redirect("/login");
  await connectDb();

  // Synchronous Stripe verification: the checkout redirect hands us the
  // session id, we read it back and persist the subscription snapshot.
  let checkoutError: string | null = null;
  if (checkout === "success" && session_id) {
    const result = await completeCheckoutAction(session_id);
    if (!result.ok) checkoutError = result.error ?? "unavailable";
  }

  // Keep cancel-at-period-end and renewals honest without webhooks.
  const fresh = await refreshProStatus(user);
  const pro = isPro(fresh);
  const configured = isStripeConfigured();
  const usage = await monthlySubmissionUsage(String(user._id));

  let invoices: { id: string; amount: number | null; status: string | null; date: Date | null; url: string | null }[] = [];
  if (pro && fresh.stripeCustomerId && configured) {
    try {
      const list = await stripe().invoices.list({ customer: fresh.stripeCustomerId, limit: 3 });
      invoices = list.data.map((inv) => ({
        id: inv.id,
        amount: inv.amount_paid,
        status: inv.status,
        date: inv.created ? new Date(inv.created * 1000) : null,
        url: inv.hosted_invoice_url ?? null,
      }));
    } catch (err) {
      console.error("stripe invoice list failed:", err instanceof Error ? err.message : err);
    }
  }

  const tokens = await listApiTokens(String(user._id));
  const proCancelled = pro && fresh.proCancelAtPeriodEnd === true;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Settings</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="h-9 rounded-lg border border-[var(--border)] px-4 text-sm leading-9 hover:bg-[var(--surface)]"
          >
            Dashboard
          </Link>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/login?signedout=1" });
          }}>
            <button type="submit" className="h-9 rounded-lg border border-[var(--border)] px-4 text-sm hover:bg-[var(--surface)]">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <p className="text-sm text-[var(--text-muted)]">{session?.user?.email}</p>

      {checkout === "success" && !checkoutError && (
        <div data-testid="checkout-success" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Pro is active — thanks for upgrading.
        </div>
      )}
      {(checkoutError || checkout === "unavailable" || checkout === "cancelled") && (
        <div data-testid="checkout-issue" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {checkoutError === "unavailable"
            ? "Payments are temporarily unavailable. Try again shortly."
            : checkout === "cancelled"
              ? "Checkout was cancelled — no charge was made."
              : "We could not confirm that checkout completed. If you were charged, contact support."}
        </div>
      )}
      {cancelled === "1" && (
        <div data-testid="cancel-success" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Subscription cancelled — Pro stays active until the end of the paid period.
        </div>
      )}

      <section className="space-y-3 rounded-lg border border-[var(--border)] bg-white p-6" data-testid="plan-card">
        <h2 className="text-lg font-semibold">Plan</h2>
        {pro ? (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">Pro</span> — unlimited submissions.{" "}
              {proCancelled && fresh.proUntil
                ? `Cancels at period end (${fresh.proUntil.toLocaleDateString()}); re-enable any time before then.`
                : fresh.proUntil
                  ? `Renews ${fresh.proUntil.toLocaleDateString()}.`
                  : ""}
            </p>
            {proCancelled ? (
              <form action={resumeProAction}>
                <button type="submit" data-testid="resume-button" className="h-10 rounded-lg border border-[var(--border)] px-4 text-sm hover:bg-[var(--surface)]">
                  Keep Pro (undo cancellation)
                </button>
              </form>
            ) : (
              <form action={cancelProAction}>
                <button type="submit" data-testid="cancel-button" className="h-10 rounded-lg border border-[var(--border)] px-4 text-sm text-[var(--text-muted)] hover:bg-[var(--surface)]">
                  Cancel subscription
                </button>
              </form>
            )}
            {invoices.length > 0 && (
              <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] text-sm">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between px-4 py-2">
                    <span className="text-[var(--text-muted)]">
                      {inv.date?.toLocaleDateString() ?? "—"} · ${((inv.amount ?? 0) / 100).toFixed(2)} · {inv.status}
                    </span>
                    {inv.url && (
                      <a href={inv.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">
                        Invoice
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">Free</span> — {usage.used}/{FREE_SUBMISSIONS_PER_MONTH} submissions this month.
              {fresh.quotaRejectedMonth === new Date().toISOString().slice(0, 7) && fresh.quotaRejectedCount > 0 && (
                <> {fresh.quotaRejectedCount} submission{fresh.quotaRejectedCount === 1 ? "" : "s"} rejected after the cap was reached.</>
              )}
            </p>
            <form action={startCheckoutAction}>
              <button
                type="submit"
                data-testid="upgrade-button"
                disabled={!configured}
                className="h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Upgrade to Pro — $9.99/month
              </button>
            </form>
            {!configured && (
              <p className="text-xs text-[var(--text-muted)]">Payments are not configured on this deployment.</p>
            )}
          </>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-[var(--border)] bg-white p-6">
        <h2 className="text-lg font-semibold">API access (MCP)</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Agents connect to <code className="rounded bg-[var(--surface)] px-1">/api/mcp</code> with{" "}
          <code className="rounded bg-[var(--surface)] px-1">Authorization: Bearer fl_live_…</code>. Tools:{" "}
          <code className="rounded bg-[var(--surface)] px-1">create_form</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">update_draft</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">propose_form</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">propose_edit</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">publish_form</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">close_form</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">reopen_form</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">archive_form</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">unarchive_form</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">list_forms</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">get_form_submissions</code>. AI proposals are unsaved —
          persist them with <code className="rounded bg-[var(--surface)] px-1">create_form</code> /{" "}
          <code className="rounded bg-[var(--surface)] px-1">update_draft</code> — and they consume your daily AI
          operation quota. Form results include <code className="rounded bg-[var(--surface)] px-1">editorUrl</code> and{" "}
          <code className="rounded bg-[var(--surface)] px-1">publicUrl</code> links. Tokens are scoped to your account
          only.
        </p>
        {created && prefix && (
          <div data-testid="token-created" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Token created (prefix <code>{prefix}…</code>). Copy it now — it is shown only once:
            <br />
            <code className="mt-1 block break-all rounded bg-white p-2">{created}</code>
            <CopyTokenButton token={created} />
          </div>
        )}
        {error === "name_required" && (
          <p data-testid="token-name-error" className="text-sm text-red-600">
            Token name is required.
          </p>
        )}
        <form
          action={async (formData: FormData) => {
            "use server";
            const name = String(formData.get("name") ?? "").trim().slice(0, 100);
            if (!name) redirect("/dashboard/settings?error=name_required");
            const { token, keyPrefix } = await createApiToken(String(user._id), name);
            redirect(`/dashboard/settings?created=${encodeURIComponent(token)}&prefix=${encodeURIComponent(keyPrefix)}`);
          }}
          className="flex gap-2"
        >
          <input
            name="name"
            required
            aria-label="Token name"
            placeholder="Token name (e.g. my agent)"
            maxLength={100}
            className="h-10 flex-1 rounded-lg border border-[var(--border)] px-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
          <button type="submit" className="h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:opacity-90">
            Create token
          </button>
        </form>
        {tokens.length > 0 ? (
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {tokens.map((t) => (
              <li key={t.tokenId} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {t.name}{" "}
                  <span className="text-xs text-[var(--text-muted)]">
                    ({t.keyPrefix}… · created {new Date(t.createdAt).toLocaleDateString()}
                    {t.lastUsedAt ? ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : " · never used"})
                  </span>
                </span>
                <form action={async () => {
                  "use server";
                  await revokeApiToken(String(user._id), t.tokenId);
                  redirect("/dashboard/settings");
                }}>
                  <button type="submit" className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No API tokens yet.</p>
        )}
      </section>
    </main>
  );
}
