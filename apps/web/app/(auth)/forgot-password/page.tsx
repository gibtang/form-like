import { ForgotPasswordForm } from "./forgot-password-form";
import Link from "next/link";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <ForgotPasswordForm />
      <Link href="/login" className="text-sm text-[var(--text-muted)] hover:underline">
        ← Back to sign in
      </Link>
    </main>
  );
}
