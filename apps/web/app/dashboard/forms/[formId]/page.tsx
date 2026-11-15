import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form, FormVersion } from "@/lib/models";
import { formDefinitionSchema, type FormDefinition } from "@/lib/form-schema";
import { DraftEditor } from "./editor";

export const metadata = { title: "Edit form" };

const STARTER: FormDefinition = {
  title: "Untitled form",
  description: null,
  fields: [],
};

export default async function FormEditorPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const user = await requireUser();
  if (!user) redirect("/login");
  await connectDb();

  // Ownership first: another creator cannot open someone else's editor.
  const form = await Form.findOne({ formId, ownerId: String(user._id) }).lean();
  if (!form) notFound();

  const parsed = formDefinitionSchema.safeParse(form.draft);
  const definition = parsed.success ? parsed.data : STARTER;
  const latest = form.latestVersionId
    ? await FormVersion.findOne({ formId: form.formId, versionId: form.latestVersionId }).lean()
    : null;
  const publicUrl = form.latestVersionId ? `${process.env.BASE_URL ?? "http://localhost:3000"}/f/${form.formId}` : null;

  return (
    <DraftEditor
      mode="owner"
      formId={formId}
      initialDefinition={definition}
      notifyEmail={form.notifyEmail ?? null}
      notifyEnabled={form.emailNotifications === true}
      notifyDisabledReason={form.notificationsDisabledReason ?? null}
      lifecycle={{
        status: form.status,
        latestVersionNumber: latest?.versionNumber ?? null,
        publicUrl,
        title: form.title,
      }}
    />
  );
}
