"use server";

import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form } from "@/lib/models";
import { reenableNotifications } from "@/lib/notification";

export interface NotificationSettingResult {
  ok: boolean;
  error?: string;
}

/** Owner-checked per-form notification toggle (email or off). */
export async function updateNotificationAction(
  formId: string,
  notifyEmail: string | null,
): Promise<NotificationSettingResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const email = notifyEmail?.trim() ? notifyEmail.trim().toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  await connectDb();
  const result = await Form.updateOne({ formId, ownerId: String(user._id) }, { notifyEmail: email });
  if (result.matchedCount === 0) return { ok: false, error: "Form not found" };
  return { ok: true };
}

/** Owner-checked auto-send switch for submission notifications. */
export async function updateEmailNotificationsAction(
  formId: string,
  enabled: boolean,
): Promise<NotificationSettingResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };
  await connectDb();
  const result = await Form.updateOne(
    { formId, ownerId: String(user._id) },
    { emailNotifications: enabled },
  );
  if (result.matchedCount === 0) return { ok: false, error: "Form not found" };
  return { ok: true };
}

/** Clears the consecutive-failure disable flag so auto-email resumes. */
export async function reenableNotificationsAction(formId: string): Promise<NotificationSettingResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };
  await connectDb();
  const form = await Form.findOne({ formId, ownerId: String(user._id) }, { _id: 1 }).lean();
  if (!form) return { ok: false, error: "Form not found" };
  await reenableNotifications(formId);
  return { ok: true };
}
