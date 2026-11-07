import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connectDb } from "@/lib/db";
import { Form, FormVersion } from "@/lib/models";
import { formDefinitionSchema } from "@/lib/form-schema";
import { PublicForm } from "./public-form";

export const dynamic = "force-dynamic";

interface PublicFormPageProps {
  params: Promise<{ formId: string }>;
}

export async function generateMetadata({ params }: PublicFormPageProps): Promise<Metadata> {
  const { formId } = await params;
  await connectDb();
  const form = await Form.findOne({ formId, status: { $in: ["published", "closed"] } }).lean();
  if (!form) return { title: "Form not found" };
  return {
    title: form.title,
    description: form.latestVersionId ? "Fill in this form — no account needed." : undefined,
  };
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { formId } = await params;
  await connectDb();

  // Draft and archived forms are not public; closed forms serve a clear
  // closed message across versions (BUILD-BRIEF publishing rules).
  const form = await Form.findOne({ formId, status: { $in: ["published", "closed"] } }).lean();
  if (!form) notFound();

  if (form.status === "closed") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-xl font-semibold text-[var(--text)]">{form.title} is closed</h1>
        <p className="max-w-sm text-sm text-[var(--text-muted)]">
          This form has stopped accepting submissions. Check back later in case it reopens.
        </p>
      </main>
    );
  }

  const version = form.latestVersionId
    ? await FormVersion.findOne({ formId: form.formId, versionId: form.latestVersionId }).lean()
    : null;
  if (!version) notFound();

  const parsed = formDefinitionSchema.safeParse(version.definition);
  if (!parsed.success) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
      <PublicForm formId={form.formId} versionId={version.versionId} definition={parsed.data} />
    </main>
  );
}
