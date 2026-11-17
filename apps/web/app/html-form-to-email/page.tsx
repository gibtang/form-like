import type { Metadata } from "next";
import Link from "next/link";
import { CANONICAL_ENDPOINT_SNIPPET } from "@/lib/endpoint-snippet";

export const metadata: Metadata = {
  title: "HTML form to email — send submissions to your inbox without a backend",
  description:
    "Point any HTML form at Form-like's endpoint and every submission lands in your inbox and dashboard. Free for 250 submissions/month, no backend code.",
};

export default function HtmlFormToEmailPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-bold">HTML form to email, no backend</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          A plain HTML form can send submissions straight to your email and a dashboard — no server code, no PHP, no
          serverless functions. Form-like's endpoint mode gives any static site a submission backend in five lines.
        </p>
      </header>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">The whole setup</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Create a form at <Link href="/create" className="text-[var(--accent)] hover:underline">form-like.com/create</Link>{" "}
            and enable <em>Endpoint mode</em> in the editor.
          </li>
          <li>Copy the action URL and access key (the key is shown once).</li>
          <li>Paste this snippet into your site and replace the placeholders:</li>
        </ol>
        <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">{CANONICAL_ENDPOINT_SNIPPET}</pre>
        <p>
          Every submission is stored in your Form-like dashboard (table, per-response detail, CSV export) and — if you
          turn on email notifications for the form — sent to your inbox.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">How it works</h2>
        <p>
          The form POSTs to <code>https://form-like.com/api/endpoint/YOUR_FORM_ID</code>. The hidden{" "}
          <code>formlike_key</code> field authenticates the form. Plain HTML posts land on a hosted result page;
          JavaScript <code>fetch</code> posts get a JSON response (<code>{"{ok: true, submissionId}"}</code>).
        </p>
        <p>
          Add any inputs you like — text, email, number, checkbox groups — they are stored under the exact field names
          you send. A hidden honeypot field (<code>_formlike_hp</code>) catches careless bots; an optional per-form
          origin whitelist locks the form to your domains; a rate limit stops floods.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">Pricing</h2>
        <p>
          Free: 250 submissions/month per account, hard stop. Pro ($9.99/month): unlimited submissions and file
          uploads. See the <Link href="/pricing" className="text-[var(--accent)] hover:underline">pricing page</Link>.
        </p>
      </section>

      <Link
        href="/create"
        className="inline-block h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium leading-10 text-white hover:opacity-90"
      >
        Build your form — free, no account needed
      </Link>
    </main>
  );
}
