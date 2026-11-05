import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Form-like — build forms by describing them",
    template: "%s — Form-like",
  },
  description:
    "Describe a form in plain English, review the preview, refine it, and publish a stable public link.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
