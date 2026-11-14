import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Say what you need",
    description:
      "Describe the people you’re asking and what you want to learn. Start with the idea, not a blank canvas.",
  },
  {
    number: "02",
    title: "Make it yours",
    description:
      "Review a working draft, then tweak a question yourself or ask for a change in plain language.",
  },
  {
    number: "03",
    title: "Share it anywhere",
    description:
      "Publish when it feels right and send one simple link. People can respond without an account.",
  },
];

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Form-like home">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>form-like</span>
    </Link>
  );
}

function HeroPreview() {
  return (
    <figure className="hero-art" aria-label="A preview of a prompt-built feedback form">
      <Image
        src="/images/form-like-hero.jpg"
        alt=""
        fill
        priority
        sizes="(max-width: 760px) 100vw, 55vw"
        className="hero-art-image"
      />
      <div className="prompt-note">
        <span className="prompt-note-icon"><Sparkles size={15} aria-hidden="true" /></span>
        <span>
          <span className="prompt-note-label">Your prompt</span>
          <span className="prompt-note-text">A friendly customer feedback form</span>
        </span>
        <Check className="prompt-note-check" size={17} aria-hidden="true" />
      </div>

      <div className="form-preview">
        <div className="preview-topbar">
          <span className="preview-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span className="preview-form-name">Customer feedback</span>
          <span className="preview-live"><span /> Draft</span>
        </div>
        <div className="preview-body">
          <span className="preview-kicker"><Sparkles size={12} aria-hidden="true" /> FIRST DRAFT</span>
          <h2>How are we doing?</h2>
          <p className="preview-intro">A couple of quick questions to help us make things better.</p>

          <div className="preview-question">
            <span className="preview-question-title">How was your experience?</span>
            <div className="rating-options" aria-label="Example rating choices">
              {["Not great", "Okay", "Good", "Great", "Amazing"].map((label, index) => (
                <span className="rating-option" key={label}>
                  <span className={index === 3 ? "rating-dot selected" : "rating-dot"}>{index + 1}</span>
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="preview-question">
            <span className="preview-question-title">What could we improve?</span>
            <span className="preview-textarea">Share anything that comes to mind…</span>
          </div>
          <div className="preview-submit">Send feedback <ArrowRight size={14} aria-hidden="true" /></div>
        </div>
      </div>

      <div className="refine-note">
        <span className="refine-sparkle"><Sparkles size={14} aria-hidden="true" /></span>
        <span>“Add a question about what’s missing”</span>
        <ArrowUpRight size={14} aria-hidden="true" />
      </div>
    </figure>
  );
}

export default function HomePage() {
  return (
    <main className="landing-page">
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="header-nav" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="https://github.com/gibtang/form-like" target="_blank" rel="noreferrer">
              Open source <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </nav>
          <div className="header-actions">
            <Link href="/login" className="sign-in-link">Sign in</Link>
            <Link href="/create" className="header-cta">
              Get started <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> FORMS, MADE SIMPLE</div>
          <h1>Good forms<br />start with <em>a prompt.</em></h1>
          <p className="hero-description">
            Tell Form-like what you want to ask. Get a thoughtful first draft, make it yours, and share it with one link.
          </p>
          <div className="hero-actions">
            <Link href="/create" className="primary-cta">
              Create your first form <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className="text-cta">See how it works <ChevronRight size={16} aria-hidden="true" /></a>
          </div>
          <div className="hero-footnote">
            <span className="footnote-check"><Check size={12} aria-hidden="true" /></span>
            Free to use <span className="footnote-separator">·</span> Open source <span className="footnote-separator">·</span> No design skills needed
          </div>
        </div>
        <HeroPreview />
      </section>

      <section className="workflow-section" id="how-it-works">
        <div className="section-heading">
          <div className="eyebrow"><span className="eyebrow-dot" /> FROM IDEA TO INBOX</div>
          <h2>Less fiddling.<br /><em>Better questions.</em></h2>
          <p>Skip the setup. Spend your time on what you actually want to learn.</p>
        </div>
        <div className="step-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-section">
        <div className="closing-sparkle"><Sparkles size={19} aria-hidden="true" /></div>
        <div>
          <p className="closing-kicker">A better place to begin</p>
          <h2>Your next good question<br />is just a sentence away.</h2>
        </div>
        <Link href="/create" className="closing-cta">Make a form <ArrowRight size={16} aria-hidden="true" /></Link>
        <div className="closing-shape closing-shape-one" aria-hidden="true" />
        <div className="closing-shape closing-shape-two" aria-hidden="true" />
      </section>

      <footer className="site-footer">
        <Brand />
        <span className="footer-note">Thoughtful forms, without the busywork.</span>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="https://github.com/gibtang/form-like" target="_blank" rel="noreferrer">Source <ArrowUpRight size={12} aria-hidden="true" /></a>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <span className="copyright">© {new Date().getFullYear()} Form-like</span>
      </footer>
    </main>
  );
}
