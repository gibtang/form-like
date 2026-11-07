import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDb } from "@/lib/db";
import { Form, FormVersion, Submission } from "@/lib/models";
import { withApiErrors } from "@/lib/api-wrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * CSV export (owner-only). Columns are the union of answered fields across
 * all versions, labeled with each field's earliest-known wording; every cell
 * shows the answer stored for that fieldId on the submission's own version,
 * so historical wording changes never reinterpret exported data.
 */
export const GET = withApiErrors("api/submissions/export", async function GET(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  await connectDb();
  const form = await Form.findOne({ formId, ownerId: String(session.user.id) }).lean();
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const submissions = await Submission.find({ formId: form.formId }).sort({ submittedAt: -1 }).lean();
  const versions = await FormVersion.find({ formId: form.formId }).sort({ versionNumber: 1 }).lean();

  // fieldId -> earliest wording across versions (first appearance wins).
  const labels = new Map<string, string>();
  const order: string[] = [];
  for (const v of versions) {
    for (const f of v.definition?.fields ?? []) {
      if (!labels.has(f.fieldId)) {
        labels.set(f.fieldId, f.label);
        order.push(f.fieldId);
      }
    }
  }
  // Fields answered but no longer in any version still get a column.
  for (const s of submissions) {
    for (const a of s.answers) {
      if (!labels.has(a.fieldId)) {
        labels.set(a.fieldId, a.fieldId);
        order.push(a.fieldId);
      }
    }
  }

  const optionLabel = (versionId: string, fieldId: string, optionId: string): string => {
    const v = versions.find((ver) => ver.versionId === versionId);
    const field = v?.definition?.fields?.find((f: { fieldId: string }) => f.fieldId === fieldId);
    return field?.options?.find((o: { optionId: string }) => o.optionId === optionId)?.label ?? optionId;
  };

  const lines: string[] = [
    ["submissionId", "submittedAt", "version", ...order.map((id) => csvCell(labels.get(id) ?? id))].join(","),
  ];
  for (const s of submissions) {
    const cells = [s.submissionId, new Date(s.submittedAt).toISOString(), String(s.versionId)];
    for (const fieldId of order) {
      const a = s.answers.find((x: { fieldId: string }) => x.fieldId === fieldId);
      let value = "";
      if (a) {
        if (a.optionIds.length > 0) {
          value = a.optionIds.map((oid: string) => optionLabel(s.versionId, fieldId, oid)).join("; ");
        } else if (a.value !== null && a.value !== undefined) {
          value = String(a.value);
        }
      }
      cells.push(csvCell(value));
    }
    lines.push(cells.join(","));
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${form.formId}-submissions.csv"`,
    },
  });
}
);
