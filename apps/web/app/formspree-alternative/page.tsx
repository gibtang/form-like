import type { Metadata } from "next";
import Link from "next/link";
import { CANONICAL_ENDPOINT_SNIPPET } from "@/lib/endpoint-snippet";

export const metadata: Metadata = {
  title: "Formspree alternative — Form-like",
  description:
    "Form-like is a Formspree alternative with a free 250 submissions/month tier, a prompt-built form builder, CSV export, and Pro at $9.99/month.",
};

export default function FormspreeAlternativePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-bold">A Formspree alternative</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Form-like covers the same core flow as Formspree — point a static HTML form at an endpoint, receive
          submissions in a dashboard with email notifications — and adds a prompt-built form builder plus an MCP server
          for AI coding agents, at $9.99/month for unlimited submissions.
        </p>
      </header>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">How endpoint mode looks</h2>
        <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">{CANONICAL_ENDPOINT_SNIPPET}</pre>
        <p>
          Create the form at{" "}
          <Link href="/create" className="text-[var(--accent)] hover:underline">form-like.com/create</Link>, enable
          Endpoint mode in the editor, copy the action URL + access key, paste. Plain HTML posts land on a hosted
          result page; fetch/JSON posts get machine-readable responses.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">What you get</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Free tier: 250 submissions/month per account, hard stop, monthly reset — no credit card</li>
          <li>Pro $9.99/month: unlimited submissions and file uploads, cancel anytime</li>
          <li>Dashboard table, per-response detail, CSV export</li>
          <li>Optional per-form email notifications, honeypot, origin whitelist, rate limiting</li>
          <li>Prompt-built forms published at stable public links (form-like.com/f/&lt;formId&gt;)</li>
        </ul>
        <p>
          Pricing details on the{" "}
          <Link href="/pricing" className="text-[var(--accent)] hover:underline">pricing page</Link>.
        </p>
      </section>

      <Link
        href="/create"
        className="inline-block h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium leading-10 text-white hover:opacity-90"
      >
        Start free — build your first form
      </Link>
    </main>
  );
}
