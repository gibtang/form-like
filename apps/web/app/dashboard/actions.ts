"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form } from "@/lib/models";
import { newId } from "@/lib/ids";
import { validateFormDefinition, type FormDefinition, type DefinitionIssue } from "@/lib/form-schema";

export interface DraftSaveResult {
  ok: boolean;
  issues: DefinitionIssue[];
  error?: string;
}

/** Creates a form with a starter one-field draft and opens the editor. */
export async function createFormAction(): Promise<void> {
  const user = await requireUser();
  if (!user) redirect("/login");
  await connectDb();
  const form = await Form.create({
    ownerId: String(user._id),
    title: "Untitled form",
    draft: {
      title: "Untitled form",
      description: null,
      fields: [
        {
          fieldId: newId("fld_"),
          type: "short_text",
          label: "Your question",
          description: null,
          required: false,
          options: null,
          ratingMax: null,
          conditionalRule: null,
        },
      ],
    },
  });
  redirect(`/dashboard/forms/${form.formId}`);
}

/**
 * Persists a creator's direct edits after full definition validation.
 * Owner check first: another creator cannot write someone else's draft.
 */
export async function updateDraftAction(formId: string, definition: FormDefinition): Promise<DraftSaveResult> {
  const user = await requireUser();
  if (!user) return { ok: false, issues: [], error: "Not signed in" };
  const { ok, issues } = validateFormDefinition(definition);
  if (!ok) return { ok: false, issues };

  await connectDb();
  const form = await Form.findOne({ formId, ownerId: String(user._id) });
  if (!form) return { ok: false, issues: [], error: "Form not found" };

  await Form.updateOne(
    { formId, ownerId: String(user._id) },
    {
      draft: { title: definition.title, description: definition.description ?? null, fields: definition.fields },
      title: definition.title,
      updatedAt: new Date(),
    },
  );
  return { ok: true, issues: [] };
}

/** Resolves the request origin for absolute URL construction. */
export async function origin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
