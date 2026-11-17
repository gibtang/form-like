import type { NextRequest } from "next/server";

/**
 * llms.txt — AI-agent discovery (workspace launch requirement). Plain facts,
 * no grammar rules.
 */
export const dynamic = "force-static";

export function GET(_req: NextRequest): Response {
  const base = process.env.BASE_URL ?? "https://form-like.com";
  const body = `# Form-like

> Form-like is a form builder for small SaaS teams: creators describe a form in plain English, review an AI-generated proposal, refine it through prompts or direct edits, and publish a stable public link. Respondents answer a fixed published form version without an account.

Production instance: ${base}

Full agent-facing reference (endpoint details, error codes, MCP tools): ${base}/llms-full.txt

## Endpoint mode for static sites

- Collect submissions from any static HTML form without a backend: point the form at ${base}/api/endpoint/<formId> with an access key. Enable it in the dashboard editor under "Endpoint mode"; the access key is shown once when generated.
- Canonical snippet (replace <formId> and <accessKey>):

<form action="${base}/api/endpoint/<formId>" method="POST">
  <input type="hidden" name="formlike_key" value="<accessKey>">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <button type="submit">Send</button>
</form>

- Accepts application/x-www-form-urlencoded, multipart/form-data, and JSON POSTs. JSON responses: {"ok":true,"submissionId":"..."} on success; {"ok":false,"error":"..."} on failure (401 invalid_key, 402 quota_reached, 403 origin_not_allowed, 404 not_found, 409 closed, 422 upload_requires_pro, 429 rate_limited).
- Plain HTML posts redirect to a hosted result page. Submissions land in the same dashboard table, CSV export, and optional per-form email notification as published-form submissions.
- Hidden honeypot field _formlike_hp must stay empty. Optional per-form origin whitelist restricts which sites may submit. Rate limit: 30 submissions/minute/form (429).
- Free plan: 250 submissions/month per account across all forms (hard stop, resets monthly in UTC). Pro ($9.99/month): unlimited submissions and file uploads (multipart file fields store file name, size, and type).

## Which integration to use

- End user has form HTML already (or the agent is writing a static site): use Endpoint mode with the snippet above. No account needed by the agent; the site owner creates the form and supplies the form id + access key.
- End user wants a hosted form page at a stable link: use the builder — guest drafts at /create, or MCP create_form/propose_form + publish_form with a Bearer token. Respondents answer at /f/<formId>.
- Agents operating forms programmatically for an existing account (create drafts, AI proposals, publish lifecycle, read submissions): use the MCP server at /api/mcp.
- Free plan: 250 submissions/month per account across all forms (hard stop, resets monthly UTC). Pro $9.99/month: unlimited submissions + file uploads. Pricing page: /pricing.

## Public pages

- [Home](${base}/): product overview; start building at ${base}/create without an account.
- [Create a form](${base}/create): open builder; no account needed until you save.
- [Terms of service](${base}/terms)
- [Privacy policy](${base}/privacy)

## How publishing works

- Every published form has a stable public link at ${base}/f/<formId>.
- A form link always serves the latest published version; each response is stored against the exact version the respondent answered.
- Closed forms display a closed message and reject submissions across all versions.

## For creators (authenticated)

- Building a draft needs no account: start at ${base}/create, and an account is requested only when saving. The unsaved draft is kept in the browser across the signup/login round trip and lands in the account afterward.
- Sign up with Google or email/password; email verification is required for password accounts.
- Submissions are owner-only: table view, per-response detail with the original question wording, CSV export.
- Optional per-form email notification on new submissions.

## For agents (MCP)

- Authenticated MCP server at ${base}/api/mcp (Bearer token from dashboard settings). Owner-scoped.
- Create and edit drafts: create_form (complete definition; you supply fld_/opt_ ids), update_draft (full replace). AI proposals: propose_form / propose_edit return an unsaved definition to persist with create_form / update_draft; they consume the account's daily AI operation quota.
- Publish lifecycle: publish_form (snapshots a new immutable version), close_form, reopen_form, archive_form, unarchive_form. The public link ${base}/f/<formId> always serves the latest published version.
- Read: list_forms, get_form_submissions. Form results carry editorUrl (dashboard editor with draft preview) and publicUrl (set once a version is published).
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
