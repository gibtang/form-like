import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "Privacy policy for Form-like.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-bold">Privacy policy</h1>
      <p className="text-sm text-[var(--text-muted)]">Last updated: November 6, 2026</p>
      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">What we store</h2>
        <p>
          <strong>Creators:</strong> your account email, name (if given), authentication records, and the forms you
          create — drafts, published versions, and the responses they collect.
          <br />
          <strong>Respondents:</strong> only what the form's creator asks you to answer. No respondent account is
          created, and form responses do not require AI services.
        </p>
        <h2 className="font-semibold">What we do not do</h2>
        <p>
          We do not sell data. We do not send form answers, prompts, or secrets to analytics or error-tracking
          services. Analytics (if enabled) uses cookie-less measurement and excludes the operator's own test account.
        </p>
        <h2 className="font-semibold">Processors</h2>
        <p>
          The hosted service relies on a database host, an email provider (transactional email such as verification,
          password reset, and optional submission notifications), AI model providers (OpenRouter) used only when a
          creator generates a proposal, and error reporting (Sentry, redacted payloads). Public form submission does
          not call AI providers.
        </p>
        <h2 className="font-semibold">Emails</h2>
        <p>
          Transactional only: address verification, password resets, and (if the form creator enables it) a submission
          notification to the creator. No marketing email.
        </p>
        <h2 className="font-semibold">Retention and deletion</h2>
        <p>
          Deleting a form permanently removes its submissions. Account deletion is available on request while the
          product is in beta.
        </p>
        <h2 className="font-semibold">Self-hosting</h2>
        <p>
          The open-source version runs on your own infrastructure; you control the database, keys, and processors.
        </p>
        <h2 className="font-semibold">Contact</h2>
        <p>Privacy questions: the contact address published on the hosted instance.</p>
      </section>
    </main>
  );
}
