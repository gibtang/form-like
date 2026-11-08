import Link from "next/link";
import { Button } from "@/components/button";

const steps = [
  {
    n: "1",
    title: "Describe it",
    body: "Type what you need in plain English. “A customer feedback form asking about satisfaction, missing features, and permission to follow up.”",
  },
  {
    n: "2",
    title: "Refine it",
    body: "Review the working preview, then tweak field wording, options, and required status directly — or ask for changes and apply them with one click. Every AI edit shows a summary first, and undo is always available.",
  },
  {
    n: "3",
    title: "Publish it",
    body: "Get a stable public link. Respondents fill in a saved version of the form — no account, no AI calls, no surprises. Submissions land in a table you can export as CSV.",
  },
];

const features = [
  {
    title: "Prompt to form, with an escape hatch",
    body: "AI gets you 90% there; direct edits handle the last 10%. Failed generations never touch your draft.",
  },
  {
    title: "Stable public links",
    body: "Every publish creates a fixed /f/<id> URL respondents can bookmark. Edits create new saved versions — links never break.",
  },
  {
    title: "Submissions without lock-in",
    body: "Review responses in a table or one by one, export to CSV any time, and opt in to email notifications for new responses.",
  },
  {
    title: "Only the fields you need",
    body: "Short and long text, email, number, date, single choice, multiple choice — the building blocks of good feedback forms.",
  },
  {
    title: "Self-hostable, Apache-2.0",
    body: "The whole product is open source. Run it on your own domain with your own database in an afternoon.",
  },
  {
    title: "Light by design",
    body: "No account needed to respond, no AI calls at fill-in time, no tracking scripts beyond basic analytics you control.",
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight text-[var(--text)]">
          Form-like
        </span>
        <nav className="flex items-center gap-2 sm:gap-4">
          <a
            href="https://github.com/gibtang/form-like"
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:underline sm:inline"
          >
            GitHub
          </a>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 pb-16 pt-14 text-center sm:pt-20">
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
          Open source · Apache-2.0
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl">
          Build forms by describing them.
        </h1>
        <p className="max-w-xl text-lg text-[var(--text-muted)]">
          Describe a form in plain English, review the preview, refine it
          through prompts or direct edits, and publish a stable public link.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/signup">Start building — free</Link>
          </Button>
          <Button variant="secondary" asChild>
            <a href="https://github.com/gibtang/form-like" target="_blank" rel="noreferrer">
              Star on GitHub
            </a>
          </Button>
        </div>

        {/* Sample prompt card */}
        <div className="mt-8 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-sm">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            You type
          </div>
          <p className="font-mono text-sm leading-relaxed text-[var(--text)]">
            “Create a customer feedback form asking about satisfaction, missing
            features, and permission to follow up.”
          </p>
          <div className="my-4 border-t border-dashed border-[var(--border)]" />
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            You get
          </div>
          <div className="flex flex-col gap-2">
            {[
              "Overall, how satisfied are you?  (single choice)",
              "What’s missing?  (long text)",
              "May we follow up with you?  (yes / no)",
              "Your email  (email, shown only if follow-up)",
            ].map((line) => (
              <div
                key={line}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)]"
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Three steps, start to submissions
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-[var(--border)] bg-white p-6"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[var(--text)]">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
          Small tool, honest features
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-[var(--text)]">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Open source CTA */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Open source, self-hostable, yours
          </h2>
          <p className="max-w-xl text-[var(--text-muted)]">
            Form-like is Apache-2.0 licensed. Read every line, self-host it on
            your own domain, or shape the roadmap by opening an issue.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/signup">Create your first form</Link>
            </Button>
            <Button variant="secondary" asChild>
              <a href="https://github.com/gibtang/form-like" target="_blank" rel="noreferrer">
                Read the source
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="flex w-full items-center justify-center gap-4 px-6 pb-8 pt-10 text-xs text-[var(--text-muted)]">
        <span>© {new Date().getFullYear()} Form-like</span>
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        <a
          href="https://github.com/gibtang/form-like"
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          Source (Apache-2.0)
        </a>
      </footer>
    </main>
  );
}
