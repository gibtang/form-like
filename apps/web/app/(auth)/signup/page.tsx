import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <SignupForm />
      <Link href="/" className="text-sm text-[var(--text-muted)] hover:underline">
        ← Back to Form-like
      </Link>
    </main>
  );
}
