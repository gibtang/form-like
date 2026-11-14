import { AuthShell } from "../auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell backHref="/login" backLabel="← Back to sign in">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
