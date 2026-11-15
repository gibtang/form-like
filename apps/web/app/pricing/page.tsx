import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Form-like pricing: Free with 250 submissions per month, Pro $9.99/month for unlimited submissions.",
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Start free, keep free. Pay only when your forms outgrow the free cap.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section data-testid="pricing-free" className="space-y-3 rounded-lg border border-[var(--border)] bg-white p-6">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="text-3xl font-bold">$0<span className="text-sm font-normal text-[var(--text-muted)]">/month</span></p>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            <li>Unlimited forms and public links</li>
            <li>250 submissions/month per account, hard stop</li>
            <li>AI form generation (20 ops/day)</li>
            <li>Submission inbox, CSV export</li>
            <li>Email notifications</li>
          </ul>
          <Link
            href="/signup"
            className="inline-block h-10 rounded-lg border border-[var(--border)] px-4 text-sm leading-10 hover:bg-[var(--surface)]"
          >
            Start free
          </Link>
        </section>

        <section data-testid="pricing-pro" className="space-y-3 rounded-lg border-2 border-[var(--accent)] bg-white p-6">
          <h2 className="text-lg font-semibold">
            Pro <span className="ml-1 rounded-full bg-[var(--accent)] px-2 py-0.5 align-middle text-xs font-medium text-white">Popular</span>
          </h2>
          <p className="text-3xl font-bold">
            $9.99<span className="text-sm font-normal text-[var(--text-muted)]">/month</span>
          </p>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            <li>Everything in Free</li>
            <li>Unlimited submissions</li>
            <li>Custom domain for your forms</li>
            <li>File uploads on submissions</li>
            <li>Cancel anytime — stays Pro until period end</li>
          </ul>
          <Link
            href="/dashboard/settings"
            className="inline-block h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium leading-10 text-white hover:opacity-90"
          >
            Upgrade to Pro
          </Link>
        </section>
      </div>

      <section className="space-y-1 text-sm text-[var(--text-muted)]">
        <h2 className="font-semibold text-[var(--text)]">Questions</h2>
        <p>What counts against the cap? Every submission stored by any of your forms in the current calendar month (UTC). Pro removes the cap entirely.</p>
        <p>What happens at the cap? The form stops accepting responses — respondents see a clear message, and nothing is stored. Upgrade and it accepts again instantly.</p>
        <p>Can I cancel? Anytime from your dashboard. Pro stays active until the end of the paid period.</p>
      </section>
    </main>
  );
}
