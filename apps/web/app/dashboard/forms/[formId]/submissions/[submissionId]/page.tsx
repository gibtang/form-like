import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form, FormVersion, Submission } from "@/lib/models";
import { formDefinitionSchema } from "@/lib/form-schema";
import { DeleteSubmissionButton } from "./delete-submission-button";

export const metadata = { title: "Submission" };

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ formId: string; submissionId: string }>;
}) {
  const { formId, submissionId } = await params;
  const user = await requireUser();
  if (!user) redirect("/login");
  await connectDb();

  const form = await Form.findOne({ formId, ownerId: String(user._id) }).lean();
  if (!form) notFound();
  const submission = await Submission.findOne({ submissionId, formId: form.formId }).lean();
  if (!submission) notFound();
  const version = await FormVersion.findOne({ formId: form.formId, versionId: submission.versionId }).lean();
  const parsed = version ? formDefinitionSchema.safeParse(version.definition) : null;
  if (!version || !parsed || !parsed.success) notFound();
  const def = parsed.data;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-6">
      <Link href={`/dashboard/forms/${formId}/submissions`} className="text-sm text-[var(--text-muted)] hover:underline">
        ← All submissions
      </Link>
      <div className="rounded-lg border border-[var(--border)] bg-white p-6">
        <h1 className="text-lg font-semibold">Submission</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {new Date(submission.submittedAt).toLocaleString()} · version {version.versionNumber} · original wording
          preserved
        </p>
        <dl className="mt-4 space-y-4">
          {def.fields.map((field) => {
            const answer = submission.answers.find((a: { fieldId: string }) => a.fieldId === field.fieldId);
            let value = "—";
            if (answer) {
              if (answer.optionIds.length > 0) {
                value = answer.optionIds
                  .map((oid) => field.options?.find((o) => o.optionId === oid)?.label ?? oid)
                  .join("; ");
              } else if (
                field.type === "single_choice" &&
                typeof answer.value === "string" &&
                (field.options ?? []).some((o) => o.optionId === answer.value)
              ) {
                value = field.options?.find((o) => o.optionId === answer.value)?.label ?? answer.value;
              } else if (answer.value !== null && answer.value !== undefined && answer.value !== "") {
                value =
                  field.type === "rating"
                    ? `${answer.value}/${field.ratingMax ?? 5}`
                    : String(answer.value);
              }
            }
            return (
              <div key={field.fieldId} className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                <dt className="text-sm font-medium text-[var(--text)]">
                  {field.label}
                  {field.required && <span className="ml-1 text-red-500">*</span>}
                </dt>
                <dd data-testid={`answer-${field.fieldId}`} className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {value}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
      <DeleteSubmissionButton formId={formId} submissionId={submission.submissionId} />
    </main>
  );
}
