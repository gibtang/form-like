import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-user";
import { connectDb } from "@/lib/db";
import { Form, FormVersion, Submission } from "@/lib/models";
import { formDefinitionSchema, type FormDefinition } from "@/lib/form-schema";

export const metadata = { title: "Submissions" };

function displayValue(
  versionDef: { fields: { fieldId: string; type: string; options: { optionId: string; label: string }[] | null; ratingMax: number | null }[] } | null,
  fieldId: string,
  answer: { value: unknown; optionIds: string[] },
  optionLabels: Map<string, string>,
): string {
  const field = versionDef?.fields.find((f) => f.fieldId === fieldId);
  // Legacy rows may store a single-choice answer as a raw optionId string.
  if (
    typeof answer.value === "string" &&
    (field?.options ?? []).some((o) => o.optionId === answer.value)
  ) {
    return optionLabels.get(answer.value) ?? answer.value;
  }
  if (answer.optionIds.length > 0) {
    return answer.optionIds
      .map((oid) => optionLabels.get(oid) ?? field?.options?.find((o) => o.optionId === oid)?.label ?? "Selected option")
      .join("; ");
  }
  if (answer.value === null || answer.value === undefined || answer.value === "") return "—";
  if (field?.type === "rating") return `${answer.value}/${field.ratingMax ?? 5}`;
  return String(answer.value);
}

export default async function SubmissionsPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const user = await requireUser();
  if (!user) redirect("/login");
  await connectDb();

  const form = await Form.findOne({ formId, ownerId: String(user._id) }).lean();
  if (!form) notFound();

  const submissions = await Submission.find({ formId: form.formId }).sort({ submittedAt: -1 }).limit(500).lean();
  const versions = await FormVersion.find({ formId: form.formId }).sort({ versionNumber: 1 }).lean();
  const versionById = new Map(versions.map((v) => [v.versionId, v]));
  // optionId -> label across all versions (earliest wording wins); the UI
  // never shows raw ids to the creator.
  const optionLabels = new Map<string, string>();
  for (const v of versions) {
    for (const f of v.definition?.fields ?? []) {
      for (const o of f.options ?? []) {
        if (!optionLabels.has(o.optionId)) optionLabels.set(o.optionId, o.label);
      }
    }
  }
  const parsedByVers = new Map<string, { ok: boolean; data?: FormDefinition }>();
  for (const v of versions) {
    const r = formDefinitionSchema.safeParse(v.definition);
    parsedByVers.set(v.versionId, r.success ? { ok: true, data: r.data } : { ok: false });
  }

  // Table columns: the latest version's fields (labels), plus version column.
  const latestVersion = versions.at(-1) ?? null;
  const latestParsed = latestVersion ? parsedByVers.get(latestVersion.versionId) : undefined;
  const latestDef = latestParsed?.ok ? latestParsed.data : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/forms/${formId}`} className="text-sm text-[var(--text-muted)] hover:underline">
            ← Back to editor
          </Link>
          <h1 className="text-xl font-semibold">Submissions — {form.title}</h1>
        </div>
        <a
          href={`/api/dashboard/forms/${formId}/submissions/export`}
          data-testid="export-csv"
          className="h-9 rounded-lg border border-[var(--border)] px-4 text-sm leading-9 text-[var(--text)] hover:bg-[var(--surface)]"
        >
          Export CSV
        </a>
      </div>

      {submissions.length === 0 ? (
        <p className="rounded-lg border border-[var(--border)] bg-white p-6 text-sm text-[var(--text-muted)]">
          No submissions yet. Share the public link to start collecting responses.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-3 py-2">Submitted</th>
                <th className="px-3 py-2">Version</th>
                {(latestDef?.fields ?? []).map((f) => (
                  <th key={f.fieldId} className="px-3 py-2">
                    {f.label}
                  </th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => {
                const rowParsed = parsedByVers.get(s.versionId);
                const vDef = rowParsed?.ok ? (rowParsed.data ?? null) : null;
                const vNum = versionById.get(s.versionId)?.versionNumber ?? "?";
                return (
                  <tr key={s.submissionId} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(s.submittedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">v{vNum}</td>
                    {(latestDef?.fields ?? []).map((f) => {
                      const a = s.answers.find((x: { fieldId: string }) => x.fieldId === f.fieldId);
                      return (
                        <td key={f.fieldId} className="max-w-40 truncate px-3 py-2">
                          {a ? displayValue(vDef, f.fieldId, { value: a.value ?? null, optionIds: a.optionIds ?? [] }, optionLabels) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/dashboard/forms/${formId}/submissions/${s.submissionId}`}
                        className="text-xs text-[var(--accent)] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-[var(--text-muted)]">
        Columns follow the latest published version. Each submission keeps its own version&rsquo;s wording — open it
        for the exact questions the respondent answered.
      </p>
    </main>
  );
}
