import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form, User } from "@/lib/models";
import { FREE_SUBMISSIONS_PER_MONTH, monthlySubmissionUsage } from "@/lib/billing";
import { createFormAction } from "./actions";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const user = await requireUser();
  if (!user) redirect("/login");
  await connectDb();
  const forms = await Form.find({ ownerId: String(user._id) }).sort({ updatedAt: -1 }).lean();
  const usage = await monthlySubmissionUsage(String(user._id));
  const quotaUser = await User.findOne(
    { _id: user._id },
    { quotaRejectedMonth: 1, quotaRejectedCount: 1 },
  ).lean();
  const rejectedThisMonth =
    quotaUser?.quotaRejectedMonth === new Date().toISOString().slice(0, 7) ? (quotaUser.quotaRejectedCount ?? 0) : 0;
  const usagePct = usage.cap ? Math.min(100, Math.round((usage.used / usage.cap) * 100)) : 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your forms</h1>
          <p className="text-sm text-[var(--text-muted)]">{session?.user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings"
            className="h-10 rounded-lg border border-[var(--border)] px-4 text-sm leading-10 hover:bg-[var(--surface)]"
          >
            Settings
          </Link>
          <form action={async () => {
            "use server";
            await createFormAction();
          }}>
            <button
              type="submit"
              className="h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:opacity-90"
            >
              New form
            </button>
          </form>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/login?signedout=1" });
          }}>
            <button
              type="submit"
              className="h-10 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section
        data-testid="usage-bar"
        className={`rounded-lg border p-4 ${usagePct >= 100 ? "border-amber-300 bg-amber-50" : usagePct >= 80 ? "border-amber-200 bg-amber-50/60" : "border-[var(--border)] bg-white"}`}
      >
        {usage.pro ? (
          <p className="text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Pro</span> — {usage.used} submissions this month, unlimited.
            {rejectedThisMonth > 0 && <> {rejectedThisMonth} were rejected before the upgrade landed.</>}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">
                {usage.used}/{FREE_SUBMISSIONS_PER_MONTH} submissions this month
              </span>
              {usagePct >= 80 && (
                <span className={usagePct >= 100 ? "font-medium text-amber-800" : "text-amber-700"}>
                  {usagePct >= 100 ? "Cap reached — new submissions are rejected" : `${usage.remaining} left this month`}
                </span>
              )}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
              <div
                data-testid="usage-fill"
                className={`h-full rounded-full ${usagePct >= 100 ? "bg-amber-500" : "bg-[var(--accent)]"}`}
                style={{ width: `${Math.max(2, usagePct)}%` }}
              />
            </div>
            {usagePct >= 80 && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Upgrade to Pro ($9.99/month) for unlimited submissions —{" "}
                <Link href="/dashboard/settings" className="text-[var(--accent)] hover:underline">
                  go to settings
                </Link>
              </p>
            )}
          </>
        )}
      </section>
      {forms.length === 0 ? (
        <p className="rounded-lg border border-[var(--border)] bg-white p-6 text-sm text-[var(--text-muted)]">
          No forms yet. Create one to start collecting feedback.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-white">
          {forms.map((form) => (
            <li key={form.formId}>
              <Link href={`/dashboard/forms/${form.formId}`} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface)]">
                <span className="text-sm font-medium text-[var(--text)]">{form.title}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {form.status} · {form.draft?.fields?.length ?? 0} fields · updated {new Date(form.updatedAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
