import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

interface LoginProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function flag(params: Record<string, string | string[] | undefined>, key: string): string | null {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

const banners: Record<string, string> = {
  registered: "Account created. Check your inbox for the verification email, then sign in.",
  mailfail:
    "Account created, but we couldn't send the verification email. Sign in below and use the resend option.",
  verified: "Email verified. You can sign in now.",
  unverified: "That verification link was invalid or expired. Sign in to resend it.",
  reset: "Password updated. Sign in with your new password.",
  google_linked:
    "This Google account is already linked to a different Form-like account. Sign in with the linked account or use email and password.",
  google_error: "Google sign-in failed. Try again, or sign in with email and password.",
};

/** Same-origin path check; mirrors safeNext() in the auth actions. */
function safeNextParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^\/(?!\/)/.test(value) ? value : null;
}

export default async function LoginPage({ searchParams }: LoginProps) {
  const params = await searchParams;
  const authError = flag(params, "error");
  const bannerKey =
    ["registered", "mailfail", "verified", "unverified", "reset", "google_linked", "google_error"].find((k) =>
      flag(params, k),
    ) ??
    (authError === "OAuthAccountNotLinked" ? "google_linked" : authError ? "google_error" : null);
  const banner = bannerKey ? banners[bannerKey] : null;
  const next = safeNextParam(params.next);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      {banner && (
        <p className="w-full max-w-sm rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {banner}
        </p>
      )}
      <LoginForm next={next} />
      <Link href="/" className="text-sm text-[var(--text-muted)] hover:underline">
        ← Back to Form-like
      </Link>
    </main>
  );
}
