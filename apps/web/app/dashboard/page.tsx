import { auth, signOut } from "@/auth";
import { requireUser } from "@/lib/auth-user";
import { Button } from "@/components/button";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const user = await requireUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/login?signedout=1" });
        }}>
          <Button type="submit" variant="secondary" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <section className="rounded-lg border border-[var(--border)] bg-white p-6">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">Account</h2>
        <p className="mt-2 text-[var(--text)]">
          {session?.user?.email} {user?.emailVerified ? "(verified)" : "(unverified)"}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Form creation arrives in the next stage. Authentication is live.
        </p>
      </section>
    </main>
  );
}
