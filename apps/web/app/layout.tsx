import type { Metadata } from "next";
import { auth } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BASE_URL ?? "http://localhost:3000"),
  title: {
    default: "Form-like — build forms by describing them",
    template: "%s — Form-like",
  },
  description:
    "Describe a form in plain English, review the preview, refine it, and publish a stable public link.",
};

// Owner/test accounts excluded from analytics (BUILD-BRIEF launch rules).
// Server-side decision: when the signed-in session belongs to an excluded
// account, the gtag scripts are not rendered at all.
const excludedEmails = (process.env.ANALYTICS_EXCLUDED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

// Reading auth() here makes routes dynamic; acceptable while the analytics
// exclusion is a render-time guarantee. Revisit with middleware-injected
// headers if a route needs static rendering.
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.GA_MEASUREMENT_ID;
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const excluded = !!email && excludedEmails.includes(email);
  return (
    <html lang="en">
      <body>
        {children}
        {gaId && !excluded && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
