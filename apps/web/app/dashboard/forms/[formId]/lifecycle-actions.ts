"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form, FormVersion, Submission } from "@/lib/models";
import { formDefinitionSchema, type DefinitionIssue } from "@/lib/form-schema";

export interface LifecycleResult {
  ok: boolean;
  error?: string;
  issues?: DefinitionIssue[];
  versionNumber?: number;
}

async function ownedForm(formId: string) {
  const user = await requireUser();
  if (!user) return null;
  await connectDb();
  return Form.findOne({ formId, ownerId: String(user._id) });
}

/**
 * Publish (or Publish update): snapshots the validated draft into a new
 * immutable version. The public link never changes; closing state survives a
 * publish update (a closed form stays closed with its new version).
 */
export async function publishFormAction(formId: string): Promise<LifecycleResult> {
  const form = await ownedForm(formId);
  if (!form) return { ok: false, error: "Form not found" };
  if (form.status === "archived") {
    return { ok: false, error: "Unarchive the form before publishing." };
  }

  const parsed = formDefinitionSchema.safeParse(form.draft);
  if (!parsed.success) {
    return { ok: false, error: "The draft failed validation and cannot be published." };
  }
  const definition = parsed.data;
  if (definition.fields.length === 0) {
    return { ok: false, error: "Add at least one field before publishing." };
  }

  const versionNumber = form.versionCounter + 1;
  const version = await FormVersion.create({
    formId: form.formId,
    versionNumber,
    definition: { title: definition.title, description: definition.description ?? null, fields: definition.fields },
  });
  form.versionCounter = versionNumber;
  form.latestVersionId = version.versionId;
  if (form.status !== "closed") form.status = "published";
  form.updatedAt = new Date();
  await form.save();

  revalidatePath(`/dashboard/forms/${formId}`);
  revalidatePath(`/f/${formId}`);
  return { ok: true, versionNumber };
}

export async function closeFormAction(formId: string): Promise<LifecycleResult> {
  const form = await ownedForm(formId);
  if (!form) return { ok: false, error: "Form not found" };
  if (form.status !== "published") {
    return { ok: false, error: "Only a published form can be closed." };
  }
  form.status = "closed";
  form.closedAt = new Date();
  form.updatedAt = new Date();
  await form.save();
  revalidatePath(`/f/${formId}`);
  return { ok: true };
}

export async function reopenFormAction(formId: string): Promise<LifecycleResult> {
  const form = await ownedForm(formId);
  if (!form) return { ok: false, error: "Form not found" };
  if (form.status !== "closed") {
    return { ok: false, error: "Only a closed form can be reopened." };
  }
  form.status = "published";
  form.closedAt = null;
  form.updatedAt = new Date();
  await form.save();
  revalidatePath(`/f/${formId}`);
  return { ok: true };
}

export async function archiveFormAction(formId: string): Promise<LifecycleResult> {
  const form = await ownedForm(formId);
  if (!form) return { ok: false, error: "Form not found" };
  form.status = "archived";
  form.archivedAt = new Date();
  form.updatedAt = new Date();
  await form.save();
  revalidatePath(`/f/${formId}`);
  return { ok: true };
}

export async function unarchiveFormAction(formId: string): Promise<LifecycleResult> {
  const form = await ownedForm(formId);
  if (!form) return { ok: false, error: "Form not found" };
  if (form.status !== "archived") {
    return { ok: false, error: "Form is not archived." };
  }
  // A form with a published version returns to published; a never-published
  // draft returns to draft. (A closed state is not preserved across archive.)
  form.status = form.latestVersionId ? "published" : "draft";
  form.archivedAt = null;
  form.updatedAt = new Date();
  await form.save();
  revalidatePath(`/f/${formId}`);
  return { ok: true };
}

/**
 * Permanent deletion: removes the form, its versions, and every submission.
 * Requires the creator to type the exact form title (explicit confirmation,
 * BUILD-BRIEF form lifecycle rules).
 */
export async function deleteFormAction(formId: string, confirmTitle: string): Promise<LifecycleResult> {
  const form = await ownedForm(formId);
  if (!form) return { ok: false, error: "Form not found" };
  if (confirmTitle !== form.title) {
    return { ok: false, error: "The typed title does not match this form." };
  }
  await Submission.deleteMany({ formId: form.formId });
  await FormVersion.deleteMany({ formId: form.formId });
  await Form.deleteOne({ formId: form.formId, ownerId: form.ownerId });
  redirect("/dashboard");
}
