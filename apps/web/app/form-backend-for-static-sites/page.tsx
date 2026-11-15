import type { Metadata } from "next";
import Link from "next/link";
import { CANONICAL_ENDPOINT_SNIPPET } from "@/lib/endpoint-snippet";

export const metadata: Metadata = {
  title: "Form backend for static sites — Form-like endpoint mode",
  description:
    "A form backend for static sites: paste one HTML snippet, collect submissions in a dashboard, export CSV, get email notifications. Free 250/month, Pro $9.99.",
};

export default function FormBackendForStaticSitesPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-bold">A form backend for static sites</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Static sites cannot process form submissions alone. A hosted form backend receives the POST, stores the
          submission, and notifies you — no server to run. Form-like gives your site a backend in one HTML snippet.
        </p>
      </header>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">The snippet</h2>
        <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">{CANONICAL_ENDPOINT_SNIPPET}</pre>
        <p>
          Get <code>YOUR_FORM_ID</code> and <code>YOUR_ACCESS_KEY</code> by creating a form and enabling Endpoint
          mode — start at{" "}
          <Link href="/create" className="text-[var(--accent)] hover:underline">form-like.com/create</Link> (no account
          needed until you save).
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">Submitting with JavaScript instead</h2>
        <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">{`await fetch("https://form-like.com/api/endpoint/YOUR_FORM_ID", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Formlike-Key": "YOUR_ACCESS_KEY" },
  body: JSON.stringify({ name, email, message }),
});
// -> { ok: true, submissionId: "sub_..." }
// errors: 401 invalid_key · 402 quota_reached · 403 origin_not_allowed
//         409 closed · 429 rate_limited`}</pre>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">What you get</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Dashboard table, per-response detail with the exact fields sent, CSV export</li>
          <li>Optional email notification per form on every submission</li>
          <li>Spam basics: honeypot field, optional origin whitelist, per-form rate limit</li>
          <li>Free: 250 submissions/month per account. Pro $9.99/month: unlimited + file uploads</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">Need full forms, not just a backend?</h2>
        <p>
          Form-like also builds the form itself: describe it in plain English, review an AI-generated proposal, refine
          it, and publish at a stable link like <code>form-like.com/f/&lt;formId&gt;</code>. The{" "}
          <Link href="/pricing" className="text-[var(--accent)] hover:underline">pricing page</Link> covers both.
        </p>
      </section>

      <Link
        href="/create"
        className="inline-block h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium leading-10 text-white hover:opacity-90"
      >
        Create your form
      </Link>
    </main>
  );
}
