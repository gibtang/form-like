import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { Form, FormVersion, Submission } from "@/lib/models";
import { formDefinitionSchema } from "@/lib/form-schema";
import { validationIssues, type AnswerMap } from "@/lib/form-eval";
import { sendSubmissionNotification } from "@/lib/email";
import {
  consumeNotificationSlot,
  recordNotificationFailure,
  recordNotificationSuccess,
  resolveNotificationRecipient,
} from "@/lib/notification";
import { withApiErrors } from "@/lib/api-wrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submitSchema = z.object({
  versionId: z.string().min(1),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string()), z.null()])),
});

/**
 * Public submission endpoint. The respondent submits against the versionId
 * their page loaded — publishing an update meanwhile does not reinterpret
 * their answers (BUILD-BRIEF version pinning). Validation always runs on
 * that version's definition via the shared contract.
 */
export const POST = withApiErrors("api/f/submit", async function POST(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const body = submitSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, error: "Invalid submission payload." }, { status: 400 });
  }

  await connectDb();
  const form = await Form.findOne({ formId, status: { $in: ["published", "closed"] } }).lean();
  if (!form) {
    return NextResponse.json({ ok: false, error: "This form does not accept submissions." }, { status: 404 });
  }
  if (form.status === "closed") {
    return NextResponse.json({ ok: false, error: "closed" }, { status: 409 });
  }

  const version = await FormVersion.findOne({ formId, versionId: body.data.versionId }).lean();
  if (!version) {
    return NextResponse.json({ ok: false, error: "Unknown form version." }, { status: 404 });
  }
  const parsed = formDefinitionSchema.safeParse(version.definition);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "This form is temporarily unavailable." }, { status: 500 });
  }

  const issues = validationIssues(parsed.data, body.data.answers as AnswerMap);
  if (issues.length > 0) {
    return NextResponse.json({ ok: false, error: "validation_failed", issues }, { status: 400 });
  }

  // Choice answers normalize to optionIds (single_choice arrives as one
  // optionId string; multiple_choice as an array) so table/detail/CSV
  // rendering resolves labels consistently.
  const typeByField = new Map(parsed.data.fields.map((f) => [f.fieldId, f.type]));
  const answers = Object.entries(body.data.answers).map(([fieldId, value]) => {
    const type = typeByField.get(fieldId);
    const isChoice = type === "single_choice" || type === "multiple_choice";
    if (isChoice) {
      const optionIds = Array.isArray(value) ? value : value === null ? [] : [String(value)];
      return { fieldId, value: null, optionIds };
    }
    return { fieldId, value: Array.isArray(value) ? null : value, optionIds: [] };
  });
  const created = await Submission.create({ formId, versionId: version.versionId, answers });

  // Submission notification — on by default for new forms, recipient is the
  // notifyEmail override or the creator's verified account email. A mail
  // failure must never fail a recorded submission (fire, log, move on).
  if (form.emailNotifications && !form.notificationsDisabledAt) {
    try {
      const recipient = await resolveNotificationRecipient(form);
      if (recipient && (await consumeNotificationSlot(formId))) {
        const origin = req.nextUrl.origin;
        const def = parsed.data;
        const summary = def.fields
          .map((f) => {
            const a = body.data.answers[f.fieldId];
            if (a === undefined || a === null || a === "" || (Array.isArray(a) && a.length === 0)) return null;
            const shown = Array.isArray(a)
              ? a.map((oid) => f.options?.find((o) => o.optionId === oid)?.label ?? oid).join("; ")
              : f.type === "rating"
                ? `${a}/${f.ratingMax ?? 5}`
                : String(a);
            return `<p style="margin:0 0 6px;font-size:14px"><strong>${f.label}:</strong> ${shown}</p>`;
          })
          .filter(Boolean)
          .join("");
        const sent = await sendSubmissionNotification({
          to: recipient,
          formTitle: def.title,
          submittedAt: new Date(created.submittedAt as unknown as string),
          summaryHtml: summary,
          detailUrl: `${origin}/dashboard/forms/${formId}/submissions/${created.submissionId}`,
        });
        if (sent) {
          await recordNotificationSuccess(formId);
        } else {
          await recordNotificationFailure(formId);
        }
      }
    } catch (err) {
      console.error("submission notification failed:", err instanceof Error ? err.message : err);
      await recordNotificationFailure(formId).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
);
