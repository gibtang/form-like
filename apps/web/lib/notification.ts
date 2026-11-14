import { Form, User } from "./models";

/**
 * Submission-notification mechanics: recipient resolution, the per-form daily
 * send cap, and consecutive-failure bookkeeping (ADR 0008). Failure counts
 * and the disabled flag keep a broken recipient from burning SES sends on
 * every submission.
 */
export const NOTIFICATION_DAILY_CAP = 100;
export const NOTIFICATION_MAX_CONSECUTIVE_FAILURES = 3;
export const NOTIFICATION_DISABLED_REASON = "Notifications were disabled after repeated delivery failures.";

/**
 * Notification address = the creator's per-form override, else their
 * verified account email. Unverified accounts receive nothing.
 */
export async function resolveNotificationRecipient(form: {
  notifyEmail?: string | null;
  ownerId: string;
}): Promise<string | null> {
  if (form.notifyEmail) return form.notifyEmail;
  const owner = await User.findOne({ _id: form.ownerId }).lean();
  if (!owner?.email || !owner.emailVerified) return null;
  return owner.email;
}

/**
 * Atomically claim one send slot for today (UTC). Two-phase so concurrent
 * submissions can overshoot neither the cap nor the date rollover: phase A
 * resets a stale counter, phase B increments only while under the cap.
 */
export async function consumeNotificationSlot(formId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  await Form.updateOne(
    { formId, notificationsSentOn: { $ne: today } },
    { notificationsSentOn: today, notificationsSentCount: 0 },
  );
  const claimed = await Form.updateOne(
    { formId, notificationsSentOn: today, notificationsSentCount: { $lt: NOTIFICATION_DAILY_CAP } },
    { $inc: { notificationsSentCount: 1 } },
  );
  return claimed.modifiedCount === 1;
}

export async function recordNotificationSuccess(formId: string): Promise<void> {
  await Form.updateOne({ formId }, { notificationFailureCount: 0 });
}

/** Returns true when this failure pushed the form past the disable threshold. */
export async function recordNotificationFailure(formId: string): Promise<boolean> {
  const form = await Form.findOneAndUpdate(
    { formId, notificationsDisabledAt: null },
    { $inc: { notificationFailureCount: 1 } },
    { new: true, projection: { notificationFailureCount: 1 } },
  ).lean();
  if (!form) return false; // already disabled
  if ((form.notificationFailureCount ?? 0) >= NOTIFICATION_MAX_CONSECUTIVE_FAILURES) {
    await Form.updateOne(
      { formId },
      { notificationsDisabledAt: new Date(), notificationsDisabledReason: NOTIFICATION_DISABLED_REASON },
    );
    return true;
  }
  return false;
}

/** Creator-initiated re-enable: clears the failure streak and the flag. */
export async function reenableNotifications(formId: string): Promise<void> {
  await Form.updateOne(
    { formId },
    {
      notificationFailureCount: 0,
      notificationsDisabledAt: null,
      notificationsDisabledReason: null,
    },
  );
}
