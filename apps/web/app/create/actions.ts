"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form } from "@/lib/models";
import { newId } from "@/lib/ids";
import { validateFormDefinition, type FormDefinition, type DefinitionIssue } from "@/lib/form-schema";
import { generateFormProposal } from "@/lib/ai/generate";
import type { ProposalResult } from "@/lib/ai/generate";

export interface GuestCreateResult {
  ok: boolean;
  formId?: string;
  /** True when no session exists: the client must ask the visitor to sign up / sign in. */
  needsAuth?: boolean;
  issues?: DefinitionIssue[];
  error?: string;
}

/**
 * Creates a form owned by the signed-in visitor from a guest-built draft.
 * Called twice in the guest flow: on Save (returns needsAuth for anonymous
 * visitors, before any account prompt) and again after the visitor signs in
 * to resume a browser-stored draft.
 */
export async function createOwnedFormAction(definition: FormDefinition): Promise<GuestCreateResult> {
  const user = await requireUser();
  if (!user) return { ok: false, needsAuth: true };
  const { ok, issues } = validateFormDefinition(definition);
  if (!ok) return { ok: false, issues };

  await connectDb();
  const form = await Form.create({
    ownerId: String(user._id),
    title: definition.title,
    draft: {
      title: definition.title,
      description: definition.description ?? null,
      fields: definition.fields,
    },
  });
  return { ok: true, formId: form.formId };
}

/**
 * Generates an AI proposal for a draft that is not stored server-side yet:
 * the visitor's current definition travels from the client and nothing is
 * persisted. Quota is reserved against a per-IP pseudo-account so anonymous
 * visitors get the same per-minute and daily caps as accounts (plus the
 * global spend cutoff).
 */
export async function proposeGuestAction(prompt: string, current: FormDefinition | null): Promise<ProposalResult> {
  if (prompt.trim().length === 0) {
    return { supported: false, error: "provider_failure", message: "Describe the form or change you want." };
  }
  // Signed-in builders consume their own account quota; anonymous visitors
  // share per-IP guest limits (same caps, plus the global spend cutoff).
  const user = await requireUser();
  const accountId = user ? String(user._id) : `guest:${await guestIp()}`;
  return generateFormProposal({ accountId, prompt: prompt.trim(), current });
}

async function guestIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
}
