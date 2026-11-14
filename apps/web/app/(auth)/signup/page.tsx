import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create an account" };

interface SignupProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Same-origin path check; mirrors safeNext() in the auth actions. */
function safeNextParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^\/(?!\/)/.test(value) ? value : null;
}

export default async function SignupPage({ searchParams }: SignupProps) {
  const next = safeNextParam((await searchParams).next);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <SignupForm next={next} />
      <Link href="/" className="text-sm text-[var(--text-muted)] hover:underline">
        ← Back to Form-like
      </Link>
    </main>
  );
}
