import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Terms of service for Form-like.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-bold">Terms of service</h1>
      <p className="text-sm text-[var(--text-muted)]">Last updated: November 6, 2026</p>
      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">The service</h2>
        <p>
          Form-like lets you build forms by describing them, refine them through prompts or direct edits, and publish
          them at stable public links. The hosted service at form-like.com is provided as-is, free of charge, while in
          beta.
        </p>
        <h2 className="font-semibold">Your forms and your respondents</h2>
        <p>
          You own the forms you create and the responses they collect. You are responsible for the content of your
          forms, for having a lawful basis to collect any personal data you request, and for honoring your respondents'
          rights. Published forms collect responses from anyone with the link; don't publish forms you wouldn't want
          public.
        </p>
        <h2 className="font-semibold">Acceptable use</h2>
        <p>
          Don't use Form-like for unlawful content, phishing, malware distribution, harassment, or to collect data you
          aren't entitled to collect. We may suspend accounts that abuse the service or that threaten its operation for
          others.
        </p>
        <h2 className="font-semibold">AI-generated proposals</h2>
        <p>
          Form generation and edits are produced by AI models and are shown to you as a proposal before anything is
          saved. Review proposals before applying them; you remain responsible for the final form definition you
          publish.
        </p>
        <h2 className="font-semibold">Availability and limits</h2>
        <p>
          The free hosted tier enforces per-account daily AI limits and a global AI spending cutoff, described in the
          product. We don't guarantee uninterrupted availability and may change or discontinue the hosted service; the
          open-source version can always be self-hosted.
        </p>
        <h2 className="font-semibold">Termination</h2>
        <p>
          You can delete your forms (permanently, including their submissions) at any time. Deleting your account is
          available on request while the product is in beta.
        </p>
        <h2 className="font-semibold">Contact</h2>
        <p>Questions about these terms: the contact address published on the hosted instance.</p>
      </section>
    </main>
  );
}
