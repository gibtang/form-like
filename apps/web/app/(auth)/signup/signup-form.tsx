"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { Input, PasswordInput } from "@/components/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { signupAction, googleSignInAction, type FormState } from "../actions";

const initial: FormState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initial);
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your Form-like account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={googleSignInAction}>
          <Button type="submit" variant="secondary" className="w-full">
            Continue with Google
          </Button>
        </form>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          or
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <form action={action} className="space-y-3">
          <Input name="name" required placeholder="Your name" autoComplete="name" maxLength={200} />
          <Input name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
          <PasswordInput
            name="password"
            required
            placeholder="Password (at least 8 characters)"
            autoComplete="new-password"
            minLength={8}
          />
          {state.error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="text-sm text-[var(--text-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
