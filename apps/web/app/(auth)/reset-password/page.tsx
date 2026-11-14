import { AuthShell } from "../auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Set a new password" };

interface ResetPasswordProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <AuthShell backHref="/login" backLabel="← Back to sign in">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
