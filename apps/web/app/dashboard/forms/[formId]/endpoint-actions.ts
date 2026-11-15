"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form } from "@/lib/models";
import { hashEndpointKey, newEndpointKey } from "@/lib/endpoint";

export interface EndpointState {
  enabled: boolean;
  hasKey: boolean;
  whitelist: string[];
  /** Raw key shown exactly once after generate/regenerate. */
  key?: string;
}

export interface EndpointActionResult extends EndpointState {
  ok: boolean;
  error?: string;
}

async function loadOwnedForm(formId: string) {
  const user = await requireUser();
  if (!user) return null;
  await connectDb();
  return Form.findOne({ formId, ownerId: String(user._id) }).lean();
}

function toState(form: { endpointEnabled?: boolean; endpointKeyHash?: string | null; endpointWhitelist?: string[] | null }): EndpointState {
  return {
    enabled: form.endpointEnabled === true && Boolean(form.endpointKeyHash),
    hasKey: Boolean(form.endpointKeyHash),
    whitelist: form.endpointWhitelist ?? [],
  };
}

export async function generateEndpointKeyAction(formId: string): Promise<EndpointActionResult> {
  const form = await loadOwnedForm(formId);
  if (!form) return { ok: false, enabled: false, hasKey: false, whitelist: [], error: "Form not found" };
  const raw = newEndpointKey();
  await Form.updateOne(
    { formId: form.formId },
    { endpointEnabled: true, endpointKeyHash: hashEndpointKey(raw) },
  );
  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true, enabled: true, hasKey: true, whitelist: toState(form).whitelist, key: raw };
}

export async function revokeEndpointAction(formId: string): Promise<EndpointActionResult> {
  const form = await loadOwnedForm(formId);
  if (!form) return { ok: false, enabled: false, hasKey: false, whitelist: [], error: "Form not found" };
  await Form.updateOne(
    { formId: form.formId },
    { endpointEnabled: false, endpointKeyHash: null },
  );
  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true, enabled: false, hasKey: false, whitelist: toState(form).whitelist };
}

export async function saveEndpointWhitelistAction(
  formId: string,
  domains: string[],
): Promise<EndpointActionResult> {
  const form = await loadOwnedForm(formId);
  if (!form) return { ok: false, enabled: false, hasKey: false, whitelist: [], error: "Form not found" };
  const cleaned = [...new Set(
    domains
      .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
      .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)),
  )];
  await Form.updateOne(
    { formId: form.formId },
    { endpointWhitelist: cleaned.length > 0 ? cleaned : null },
  );
  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true, ...toState({ ...form, endpointWhitelist: cleaned.length > 0 ? cleaned : null }) };
}
