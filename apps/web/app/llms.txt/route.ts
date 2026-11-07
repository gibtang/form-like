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

## Public pages

- [Home](${base}/): product overview and sign-up.
- [Terms of service](${base}/terms)
- [Privacy policy](${base}/privacy)

## How publishing works

- Every published form has a stable public link at ${base}/f/<formId>.
- A form link always serves the latest published version; each response is stored against the exact version the respondent answered.
- Closed forms display a closed message and reject submissions across all versions.

## For creators (authenticated)

- Sign up with Google or email/password; email verification is required for password accounts.
- Submissions are owner-only: table view, per-response detail with the original question wording, CSV export.
- Optional per-form email notification on new submissions.

## For agents (MCP)

- Authenticated MCP server at ${base}/api/mcp (Bearer token from dashboard settings). Tools: list_forms, get_form_submissions. Owner-scoped.
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
