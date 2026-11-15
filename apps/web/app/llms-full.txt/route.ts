import type { NextRequest } from "next/server";

/**
 * llms-full.txt — the complete agent-facing reference (issue #27): endpoint
 * mode details, error codes, field behavior, builder flow, MCP tools.
 * Plain facts, no grammar rules.
 */
export const dynamic = "force-static";

export function GET(_req: NextRequest): Response {
  const base = process.env.BASE_URL ?? "https://form-like.com";
  const body = `# Form-like — full reference

> Form-like is a form builder for small SaaS teams: creators describe a form in plain English, review an AI-generated proposal, refine it, and publish a stable public link. It also runs a Web3Forms-style endpoint backend for static HTML forms.

Production instance: ${base}

## Endpoint mode (static-site form backend)

1. Owner creates a form (builder or MCP) and enables Endpoint mode in the dashboard editor.
2. Dashboard shows the action URL ${base}/api/endpoint/<formId> and an access key, shown exactly once (regenerate/revoke any time; stored hashed server-side).
3. Submit from any static HTML form or fetch call. No backend code on the site.

Canonical HTML snippet:

<form action="${base}/api/endpoint/YOUR_FORM_ID" method="POST">
  <input type="hidden" name="formlike_key" value="YOUR_ACCESS_KEY">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <button type="submit">Send</button>
</form>

### Request formats

- application/x-www-form-urlencoded (plain HTML forms; response is a 303 redirect to a hosted result page)
- multipart/form-data (adds file upload support; free plan returns 422 upload_requires_pro)
- application/json (machine-readable responses; the key can instead travel in the X-Formlike-Key header or an Authorization: Bearer header)

### Success response (JSON)

{"ok":true,"submissionId":"sub_..."}

### Error responses (JSON, always store nothing)

- 400 no_fields — no submission fields were provided
- 401 invalid_key — missing or wrong access key
- 402 quota_reached — free plan cap (250 submissions/month per account) hit
- 403 origin_not_allowed — request origin not on the form's whitelist
- 404 not_found — unknown form id or endpoint mode disabled
- 409 closed — form closed; it accepts no submissions
- 422 upload_requires_pro — file field on the free plan
- 429 rate_limited — more than 30 submissions/minute/form

### Field rules

- Every non-reserved field name is stored verbatim and shown in the dashboard under that name.
- Reserved names: formlike_key, _formlike_hp (honeypot — keep it empty; a filled honeypot returns fake success and stores nothing), formlike_redirect, _replyto.
- File fields (multipart only) are stored as {fileName, size, contentType} on Pro; free plan rejects them with 422.
- Optional per-form origin whitelist: comma-separated hostnames; when set, requests without a matching Origin/Referer are rejected 403.

## Published forms (builder flow)

- Every published form has a stable public link ${base}/f/<formId> serving the latest published version.
- Respondents answer a fixed version; each submission stores the exact version answered. Closed forms reject submissions across versions.
- Builder: start at ${base}/create without an account (draft lives in the browser); saving asks for an account (Google or email/password; email verification required for password accounts).
- Creators get a submissions table, per-response detail with original question wording, CSV export, and optional per-form email notification.

## Free plan vs Pro

- Free: 250 submissions/month per account across all forms and modes (hard stop; resets monthly UTC); AI generation 20 ops/day; email notifications; CSV export.
- Pro: $9.99/month — unlimited submissions, file uploads, custom domain. Cancel anytime; stays Pro until period end. Pricing: ${base}/pricing

## MCP server (for AI agents)

- Endpoint ${base}/api/mcp, Authorization: Bearer <token> (dashboard settings). Owner-scoped.
- Tools: create_form, update_draft, propose_form, propose_edit, publish_form, close_form, reopen_form, archive_form, unarchive_form, list_forms, get_form_submissions.
- AI proposals consume the account's daily AI operation quota. Form results carry editorUrl and publicUrl.

## Guides

- [HTML form to email](${base}/html-form-to-email)
- [Form backend for static sites](${base}/form-backend-for-static-sites)
- [Web3Forms alternative](${base}/web3forms-alternative)
- [Formspree alternative](${base}/formspree-alternative)
- [Pricing](${base}/pricing)
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
