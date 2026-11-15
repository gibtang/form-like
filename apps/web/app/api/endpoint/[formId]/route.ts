import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { Form, Submission, User } from "@/lib/models";
import { sendSubmissionNotification } from "@/lib/email";
import { checkSubmissionAllowance, recordQuotaRejection } from "@/lib/billing";
import {
  HONEYPOT_FIELD,
  RESERVED_FIELDS,
  extractKey,
  hashEndpointKey,
  rateLimited,
  requestOriginHost,
} from "@/lib/endpoint";
import { withApiErrors } from "@/lib/api-wrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint-only submission target for static sites (issue #26). Accepts plain
 * HTML form POSTs (urlencoded or multipart) and fetch/JSON. Access key required;
 * cap, closed-form, whitelist, honeypot and rate-limit rules all store nothing
 * on rejection.
 */
export const POST = withApiErrors("api/endpoint", async function POST(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;

  const wantsHtml = (req.headers.get("accept") ?? "").includes("text/html");
  const respond = (status: number, code: string, message: string): NextResponse => {
    if (wantsHtml) {
      return NextResponse.redirect(new URL(`/endpoint-done?c=${code}`, req.nextUrl.origin), 303);
    }
    return NextResponse.json({ ok: false, error: code, message }, { status });
  };

  const contentType = req.headers.get("content-type") ?? "";
  let entries: [string, FormDataEntryValue][] = [];
  let payloadKey: string | null = null;
  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      payloadKey = typeof body.formlike_key === "string" ? body.formlike_key : null;
      entries = Object.entries(body).map(([k, v]) => [
        k,
        typeof v === "object" && v !== null ? JSON.stringify(v) : String(v),
      ]);
    } else {
      const form = await req.formData();
      payloadKey = typeof form.get("formlike_key") === "string" ? (form.get("formlike_key") as string) : null;
      entries = [...form.entries()];
    }
  } catch {
    return respond(400, "invalid_payload", "Could not parse the request body.");
  }

  await connectDb();
  const form = await Form.findOne({ formId, status: { $in: ["published", "closed"] } }).lean();
  if (!form || !form.endpointEnabled) {
    return respond(404, "not_found", "This endpoint does not accept submissions.");
  }
  if (form.status === "closed") {
    return respond(409, "closed", "This form is closed and no longer accepts submissions.");
  }

  const key = extractKey(req.headers, payloadKey);
  if (!key || !form.endpointKeyHash || hashEndpointKey(key) !== form.endpointKeyHash) {
    return respond(401, "invalid_key", "Missing or invalid access key.");
  }

  if (form.endpointWhitelist?.length) {
    const host = requestOriginHost(req.headers);
    if (!host || !form.endpointWhitelist.includes(host)) {
      return respond(403, "origin_not_allowed", "This origin is not whitelisted for the form.");
    }
  }

  if (rateLimited(formId)) {
    return respond(429, "rate_limited", "Too many submissions for this form. Try again shortly.");
  }

  const allowance = await checkSubmissionAllowance(form.ownerId);
  if (!allowance.allowed) {
    await recordQuotaRejection(form.ownerId);
    return respond(402, "quota_reached", "This form has reached its free plan submission limit.");
  }

  // Honeypot: bots that fill the hidden field get a fake success, store nothing.
  if (entries.some(([k, v]) => k === HONEYPOT_FIELD && String(v).trim() !== "")) {
    if (wantsHtml) return NextResponse.redirect(new URL(`/endpoint-done?c=ok`, req.nextUrl.origin), 303);
    return NextResponse.json({ ok: true });
  }

  const isPro = allowance.pro;
  const answers: { fieldId: string; value: unknown; optionIds: string[] }[] = [];
  for (const [name, entry] of entries) {
    if (RESERVED_FIELDS.has(name)) continue;
    if (typeof entry === "object" && entry !== null && "arrayBuffer" in entry) {
      const file = entry as File;
      if (file.size === 0) continue;
      if (!isPro) {
        return respond(422, "upload_requires_pro", "File uploads require the Pro plan.");
      }
      answers.push({
        fieldId: name,
        value: { fileName: file.name, size: file.size, contentType: file.type || "application/octet-stream" },
        optionIds: [],
      });
      continue;
    }
    answers.push({ fieldId: name, value: String(entry), optionIds: [] });
  }
  if (answers.length === 0) {
    return respond(400, "no_fields", "No submission fields were provided.");
  }

  const created = await Submission.create({ formId, versionId: null, answers });

  // Optional creator notification — a mail failure must never fail the submission.
  if (form.notifyEmail) {
    try {
      const summary = answers
        .map((a) => {
          let value: string;
          if (a.value && typeof a.value === "object" && "fileName" in a.value) {
            const name = a.value.fileName;
            value = typeof name === "string" && name !== "" ? name : "[file]";
          } else if (a.value !== null && a.value !== undefined) {
            value = String(a.value);
          } else {
            value = "";
          }
          return `<p style="margin:0 0 6px;font-size:14px"><strong>${a.fieldId}:</strong> ${value}</p>`;
        })
        .join("");
      await sendSubmissionNotification({
        to: form.notifyEmail,
        formTitle: form.title,
        submittedAt: new Date(created.submittedAt as unknown as string),
        summaryHtml: summary,
        detailUrl: `${req.nextUrl.origin}/dashboard/forms/${formId}/submissions/${created.submissionId}`,
      });
    } catch (err) {
      console.error("endpoint notification failed:", err instanceof Error ? err.message : err);
    }
  }

  if (wantsHtml) {
    return NextResponse.redirect(new URL(`/endpoint-done?c=ok`, req.nextUrl.origin), 303);
  }
  return NextResponse.json({ ok: true, submissionId: created.submissionId });
});

/** Plain-HTML flow landing page shows the outcome without a JS handler. */
export const GET = withApiErrors("api/endpoint/done", async function GET(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const code = req.nextUrl.searchParams.get("c") ?? "ok";
  const { formId } = await params;
  await connectDb();
  const form = await Form.findOne({ formId, endpointEnabled: true }, { title: 1 }).lean();
  const title = form?.title ?? "Form";
  const messages: Record<string, { heading: string; body: string }> = {
    ok: { heading: "Thanks — your response was recorded.", body: "You can safely close this page." },
    quota: { heading: "Not accepting responses right now", body: "The owner of this form has reached their plan limit, so this response was not recorded." },
    closed: { heading: "This form is closed", body: "It is no longer accepting submissions." },
    origin_not_allowed: { heading: "Submission blocked", body: "This site is not whitelisted to submit to this form." },
    rate_limited: { heading: "Slow down", body: "Too many submissions were sent recently. Try again in a minute." },
    invalid_key: { heading: "Submission blocked", body: "The form's access key is missing or invalid." },
    upload_requires_pro: { heading: "File uploads not supported", body: "This form's plan does not include file uploads." },
  };
  const message = messages[code] ?? { heading: "Thanks — your response was recorded.", body: "You can safely close this page." };
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif"><div style="max-width:560px;margin:48px auto;background:#fff;border-radius:12px;padding:32px;text-align:center"><p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8a8aa3">Form-like</p><h1 style="margin:0 0 12px;font-size:20px;color:#1a1a2e">${message.heading}</h1><p style="margin:0;font-size:14px;color:#8a8aa3">${message.body}</p></div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});
