"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form } from "@/lib/models";
import { newId } from "@/lib/ids";
import { formDefinitionSchema, validateFormDefinition, type FormDefinition, type DefinitionIssue } from "@/lib/form-schema";
import { generateFormProposal } from "@/lib/ai/generate";
import type { ProposalResult } from "@/lib/ai/generate";

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

/**
 * Generates an AI proposal (create or edit) for this form. Ownership and
 * the current draft are resolved server-side; the model never sees another
 * creator's data and cannot write anything — only the explicit Apply path
 * (client state) followed by Save draft touches storage.
 */
export async function proposeAction(formId: string, prompt: string): Promise<ProposalResult> {
  const user = await requireUser();
  if (!user) {
    return { supported: false, error: "provider_failure", message: "Not signed in." };
  }
  if (prompt.trim().length === 0) {
    return { supported: false, error: "provider_failure", message: "Describe the form or change you want." };
  }
  await connectDb();
  const form = await Form.findOne({ formId, ownerId: String(user._id) }).lean();
  if (!form) {
    return { supported: false, error: "provider_failure", message: "Form not found." };
  }
  const parsed = formDefinitionSchema.safeParse(form.draft);
  const current = parsed.success ? parsed.data : null;
  return generateFormProposal({ accountId: String(user._id), prompt: prompt.trim(), current });
}
