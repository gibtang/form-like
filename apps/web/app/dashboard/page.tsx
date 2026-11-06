import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form } from "@/lib/models";
import { createFormAction } from "./actions";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const user = await requireUser();
  if (!user) redirect("/login");
  await connectDb();
  const forms = await Form.find({ ownerId: String(user._id) }).sort({ updatedAt: -1 }).lean();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your forms</h1>
          <p className="text-sm text-[var(--text-muted)]">{session?.user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
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
