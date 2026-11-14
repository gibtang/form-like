import { AuthShell } from "../auth-shell";
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
    <AuthShell backHref="/" backLabel="← Back to Form-like">
      <SignupForm next={next} />
    </AuthShell>
  );
}
