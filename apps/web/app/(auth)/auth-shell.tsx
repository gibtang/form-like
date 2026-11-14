import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/** Shared shell for the account screens: site chrome around a centered card. */
export function AuthShell({
  children,
  backHref,
  backLabel,
}: {
  children: React.ReactNode;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        {children}
        <Link href={backHref} className="text-sm text-[var(--text-muted)] hover:underline">
          {backLabel}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
