import { ResetPasswordForm } from "./reset-password-form";
import Link from "next/link";

export const metadata = { title: "Set a new password" };

interface ResetPasswordProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <ResetPasswordForm token={token} />
      <Link href="/login" className="text-sm text-[var(--text-muted)] hover:underline">
        ← Back to sign in
      </Link>
    </main>
  );
}
