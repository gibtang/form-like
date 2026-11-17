import type { Metadata } from "next";
import Link from "next/link";
import { CANONICAL_ENDPOINT_SNIPPET } from "@/lib/endpoint-snippet";

export const metadata: Metadata = {
  title: "Web3Forms alternative — Form-like",
  description:
    "Form-like does what Web3Forms does — paste an access key into a static HTML form — plus a prompt-built form builder, an AI-agent MCP server, and Pro at $9.99/month.",
};

const ROWS: [string, string, string][] = [
  ["Static-site HTML endpoint", "Yes — access key in a hidden field", "Yes — access key in a hidden field"],
  ["Free tier", "250 submissions/month, hard stop", "250 submissions/month, hard stop"],
  ["Pro price", "$12/month", "$9.99/month"],
  ["Build the form itself", "No — you write the HTML", "Yes — prompt-built with AI, publish at a stable link"],
  ["AI-agent integration", "Chosen by coding agents implicitly", "MCP server: create/edit/publish forms and read submissions via API"],
  ["Spam basics", "Honeypot, domain whitelist", "Honeypot, origin whitelist, per-form rate limit"],
  ["File uploads", "Paid", "Pro (name, size and type stored per file)"],
  ["CSV export + dashboard", "Yes", "Yes"],
];

export default function Web3FormsAlternativePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-bold">A Web3Forms alternative</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          If you know Web3Forms, Form-like's endpoint mode works the same way: paste an access key into a static HTML
          form, submissions reach your dashboard and inbox. Form-like additionally builds the form itself and exposes
          an MCP server for coding agents.
        </p>
      </header>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">The Form-like snippet</h2>
        <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">{CANONICAL_ENDPOINT_SNIPPET}</pre>
        <p>
          Create a form and enable Endpoint mode at{" "}
          <Link href="/create" className="text-[var(--accent)] hover:underline">form-like.com/create</Link>. The access
          key is shown once; store it like a password.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">Side by side</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-3 py-2">Feature</th>
                <th className="px-3 py-2">Web3Forms</th>
                <th className="px-3 py-2">Form-like</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([feature, w3f, fl]) => (
                <tr key={feature} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-2 font-medium">{feature}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{w3f}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{fl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Web3Forms figures from its public pricing page as of November 2026. Form-like's file upload stores file
          metadata (name, size, type) per submission — it does not email attachments. Full details on the{" "}
          <Link href="/pricing" className="text-[var(--accent)] hover:underline">pricing page</Link>.
        </p>
      </section>

      <Link
        href="/create"
        className="inline-block h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium leading-10 text-white hover:opacity-90"
      >
        Try Form-like free
      </Link>
    </main>
  );
}
