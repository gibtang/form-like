"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { Input, PasswordInput } from "@/components/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { resetPasswordAction, type FormState } from "../actions";

const initial: FormState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <PasswordInput
            name="password"
            required
            placeholder="New password (at least 8 characters)"
            autoComplete="new-password"
            minLength={8}
          />
          {state.error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
        {!token && (
          <p className="text-sm text-amber-700">
            This page needs a reset link from your email. Request a new one from sign-in.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
