import Link from "next/link";
import { Button } from "@/components/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="max-w-xl text-4xl font-bold tracking-tight text-[var(--text)]">
        Build forms by describing them.
      </h1>
      <p className="max-w-md text-[var(--text-muted)]">
        Describe a form in plain English, review the preview, refine it through
        prompts or direct edits, and publish a stable public link.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
      <footer className="mt-auto flex w-full items-center justify-center gap-4 pb-6 pt-12 text-xs text-[var(--text-muted)]">
        <span>© {new Date().getFullYear()} Form-like</span>
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        <a href="https://github.com/gibtang/form-like" target="_blank" rel="noreferrer" className="hover:underline">
          Source (Apache-2.0)
        </a>
      </footer>
    </main>
  );
}
