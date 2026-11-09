import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/button";
import "./landing.css";

export const metadata: Metadata = {
  title: "Form-like — build forms by describing them",
  description:
    "Describe a form in plain English, review the proposal, refine it, and publish a stable public link. Fixed versions, owner-only responses, open source.",
};

const FEATURES = [
  {
    title: "Prompt-built, human-reviewed",
    body: "Every generation arrives as a rendered proposal with a change summary. Apply it, discard it, or undo — your draft only changes when you say so.",
  },
  {
    title: "Direct control when you want it",
    body: "Fix wording by hand, toggle required fields, edit choice options, set rating scales, and wire conditional rules — no prompting needed.",
  },
  {
    title: "Stable public links",
    body: "Publishing snapshots an immutable version at one URL. Later edits stay draft until you explicitly publish an update.",
  },
  {
    title: "Answers keep their questions",
    body: "Each response is stored against the exact version the respondent saw. Renaming a question never reinterprets old answers.",
  },
  {
    title: "No respondent accounts",
    body: "Share the link, collect answers. Public submission never calls an AI service, so your forms stay fast and your costs stay predictable.",
  },
  {
    title: "Open source, self-hostable",
    body: "Apache-2.0. Bring your own MongoDB and OpenRouter key; the bundled starter instructions are fully replaceable.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Describe",
    body: "Say what you need: “a customer feedback form about satisfaction, missing features, and permission to follow up.”",
  },
  {
    step: "2",
    title: "Review & refine",
    body: "Check the rendered proposal, apply or discard it, then adjust anything directly — wording, options, required, branching.",
  },
  {
    step: "3",
    title: "Publish & collect",
    body: "One click puts a fixed version at a permanent link. Watch responses arrive in your dashboard, export CSV any time.",
  },
];

export default function HomePage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link href="/" className="landing-logo">
          Form-like
        </Link>
        <nav className="landing-nav">
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className="landing-cta">
            Get started
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <h1>
              Build forms by <span className="landing-accent">describing them</span>.
            </h1>
            <p>
              Say what you need in plain English. Form-like drafts the questions, shows you a real preview, and
              publishes a stable link your respondents can always trust.
            </p>
            <div className="landing-hero-actions">
              <Button asChild>
                <Link href="/signup">Create your first form</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <p className="landing-hero-note">Free while in beta · No respondent accounts · Apache-2.0</p>
          </div>
          <div className="landing-hero-art">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG asset; the image optimizer rejects SVGs */}
            <img
              src="/hero-formlike.svg"
              alt="A prompt becomes a reviewed form proposal, then a published public form"
              width={1120}
              height={640}
              className="landing-hero-img"
            />
          </div>
        </section>

        {/* In-page product preview (styled mock of the editor) */}
        <section className="landing-preview">
          <h2>What you work in</h2>
          <p className="landing-section-sub">
            A real editor: prompts on the left, a live preview that answers exactly like your respondents will.
          </p>
          <div className="preview-shell" aria-hidden>
            <div className="preview-toolbar">
              <span className="preview-status">published</span>
              <span className="preview-version">v3 live</span>
              <span className="preview-link">form-like.com/f/…</span>
              <span className="preview-spacer" />
              <span className="preview-save">Save draft</span>
            </div>
            <div className="preview-columns">
              <div className="preview-left">
                <div className="preview-prompt">
                  <span className="preview-label">Describe the form or change</span>
                  <span className="preview-input">Ask about onboarding and add a follow-up for low scores</span>
                  <span className="preview-generate">Generate proposal</span>
                </div>
                <div className="preview-field">
                  <span className="preview-q">Overall satisfaction *</span>
                  <div className="preview-rating">
                    <span className="on">1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>
                <div className="preview-field">
                  <span className="preview-q">What should we improve?</span>
                  <span className="preview-rule">show only when satisfaction &lt; 3</span>
                </div>
                <div className="preview-field">
                  <span className="preview-q">Permission to follow up?</span>
                  <span className="preview-option">● Yes&ensp;○ No</span>
                </div>
              </div>
              <div className="preview-right">
                <span className="preview-label">Proposed result — apply or discard</span>
                <div className="preview-proposal">
                  <p className="preview-summary">Edited your draft (kept 3 fields): satisfaction now 1–5, follow-up shown below a rating of 3.</p>
                  <div className="preview-mini">
                    <span className="preview-mini-q">Follow-up comment *</span>
                    <span className="preview-mini-input" />
                  </div>
                  <div className="preview-actions">
                    <span className="preview-apply">Apply</span>
                    <span className="preview-discard">Discard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="landing-features">
          <h2>Why small teams pick it</h2>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="landing-steps">
          <h2>From description to live link</h2>
          <div className="step-row">
            {STEPS.map((s) => (
              <div key={s.step} className="step-card">
                <span className="step-number">{s.step}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="landing-cta-band">
          <h2>Your next feedback form is one sentence away.</h2>
          <Button asChild>
            <Link href="/signup">Get started free</Link>
          </Button>
        </section>
      </main>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Form-like</span>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <a href="https://github.com/gibtang/form-like" target="_blank" rel="noreferrer">
          Source (Apache-2.0)
        </a>
      </footer>
    </div>
  );
}
