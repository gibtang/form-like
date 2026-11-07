import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { listApiTokens, createApiToken, revokeApiToken } from "@/lib/api-token";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ created?: string; prefix?: string }> }) {
  const { created, prefix } = await searchParams;
  const session = await auth();
  const user = await requireUser();
  if (!user) redirect("/login");
  await connectDb();
  const tokens = await listApiTokens(String(user._id));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Settings</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="h-9 rounded-lg border border-[var(--border)] px-4 text-sm leading-9 hover:bg-[var(--surface)]"
          >
            Dashboard
          </Link>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/login?signedout=1" });
          }}>
            <button type="submit" className="h-9 rounded-lg border border-[var(--border)] px-4 text-sm hover:bg-[var(--surface)]">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <p className="text-sm text-[var(--text-muted)]">{session?.user?.email}</p>

      <section className="space-y-3 rounded-lg border border-[var(--border)] bg-white p-6">
        <h2 className="text-lg font-semibold">API access (MCP)</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Agents connect to <code className="rounded bg-[var(--surface)] px-1">/api/mcp</code> with{" "}
          <code className="rounded bg-[var(--surface)] px-1">Authorization: Bearer fl_live_…</code>. Tools:{" "}
          <code className="rounded bg-[var(--surface)] px-1">list_forms</code>,{" "}
          <code className="rounded bg-[var(--surface)] px-1">get_form_submissions</code>. Tokens are scoped to your
          account only.
        </p>
        {created && prefix && (
          <div data-testid="token-created" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Token created (prefix <code>{prefix}…</code>). Copy it now — it is shown only once:
            <br />
            <code className="mt-1 block break-all rounded bg-white p-2">{created}</code>
          </div>
        )}
        <form
          action={async (formData: FormData) => {
            "use server";
            const name = String(formData.get("name") ?? "").slice(0, 100) || "API token";
            const { token, keyPrefix } = await createApiToken(String(user._id), name);
            redirect(`/dashboard/settings?created=${encodeURIComponent(token)}&prefix=${encodeURIComponent(keyPrefix)}`);
          }}
          className="flex gap-2"
        >
          <input
            name="name"
            placeholder="Token name (e.g. my agent)"
            maxLength={100}
            className="h-10 flex-1 rounded-lg border border-[var(--border)] px-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
          <button type="submit" className="h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:opacity-90">
            Create token
          </button>
        </form>
        {tokens.length > 0 ? (
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {tokens.map((t) => (
              <li key={t.tokenId} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {t.name}{" "}
                  <span className="text-xs text-[var(--text-muted)]">
                    ({t.keyPrefix}… · created {new Date(t.createdAt).toLocaleDateString()}
                    {t.lastUsedAt ? ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : " · never used"})
                  </span>
                </span>
                <form action={async () => {
                  "use server";
                  await revokeApiToken(String(user._id), t.tokenId);
                  redirect("/dashboard/settings");
                }}>
                  <button type="submit" className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No API tokens yet.</p>
        )}
      </section>
    </main>
  );
}
