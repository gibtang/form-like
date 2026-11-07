"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form, Submission } from "@/lib/models";

/** Owner-checked single submission deletion (BUILD-BRIEF submission rules). */
export async function deleteSubmissionAction(formId: string, submissionId: string): Promise<void> {
  const user = await requireUser();
  if (!user) redirect("/login");
  await connectDb();
  const form = await Form.findOne({ formId, ownerId: String(user._id) }).lean();
  if (!form) redirect(`/dashboard/forms/${formId}/submissions`);
  await Submission.deleteOne({ submissionId, formId: form.formId });
  redirect(`/dashboard/forms/${formId}/submissions`);
}
