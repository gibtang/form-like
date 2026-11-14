import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { Form, FormVersion, Submission } from "@/lib/models";
import { requireApiToken } from "@/lib/api-token";
import { withApiErrors } from "@/lib/api-wrap";
import { formDefinitionSchema, validateFormDefinition } from "@/lib/form-schema";
import { generateFormProposal, type ProposalResult } from "@/lib/ai/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

function errorResult(status: number, message: string, extra?: Record<string, unknown>) {
  return {
    isError: true,
    content: [
      { type: "text" as const, text: JSON.stringify({ error: { status, message, ...extra } }) },
    ],
    _status: status,
  };
}

/** Browser links for a form: the editor (always) and the public link (once published). */
function formLinks(form: { formId: string; latestVersionId?: string | null }) {
  const base = process.env.BASE_URL ?? "http://localhost:3000";
  return {
    editorUrl: `${base}/dashboard/forms/${form.formId}`,
    publicUrl: form.latestVersionId ? `${base}/f/${form.formId}` : null,
  };
}

/** AI quota/config denials become MCP errors; unsupported requests pass through as results. */
const AI_DENIAL_STATUSES: Record<string, number> = {
  ai_not_configured: 503,
  quota_exhausted: 429,
  concurrency_limit: 429,
  spend_cutoff: 429,
  rate_limited: 429,
};

function proposalResult(result: ProposalResult) {
  if (!result.supported && "error" in result) {
    const status = AI_DENIAL_STATUSES[result.error];
    if (status) return errorResult(status, result.message);
  }
  return jsonResult(result);
}

/** One stateless server per request; tools close over the token's user. */
function buildServer(userId: string): McpServer {
  const server = new McpServer(
    { name: "form-like", version: "1.1.0" },
    {
      instructions:
        "Form-like API for the token's creator: create form drafts, edit them directly or through AI proposals, " +
        "manage the publish lifecycle, list your forms, and read published-version submissions. Owner-scoped. " +
        "propose_form / propose_edit return an unsaved proposal — persist it with create_form / update_draft. " +
        "Every form result carries editorUrl (open in a browser as the creator to edit and preview the draft) and " +
        "publicUrl (the respondent-facing link, set once a version is published).",
    },
  );

  server.tool(
    "create_form",
    "Create a draft form from a complete definition. Supply your own fieldId (fld_ + 32 hex) and optionId (opt_ + 32 hex) values; conditional rules reference the fieldIds you assigned. Returns the new form's links.",
    { definition: formDefinitionSchema },
    async ({ definition }) => {
      const { ok, issues } = validateFormDefinition(definition);
      if (!ok) return errorResult(422, "Definition failed validation", { issues });

      await connectDb();
      const form = await Form.create({
        ownerId: userId,
        title: definition.title,
        draft: {
          title: definition.title,
          description: definition.description ?? null,
          fields: definition.fields,
        },
      });
      return jsonResult({ formId: form.formId, status: form.status, ...formLinks(form) });
    },
  );

  server.tool(
    "update_draft",
    "Replace the draft of one of your forms with a complete definition (full replace, same contract as the dashboard editor). Editing the draft never changes an already-published version until you call publish_form.",
    { formId: z.string().min(1), definition: formDefinitionSchema },
    async ({ formId, definition }) => {
      const { ok, issues } = validateFormDefinition(definition);
      if (!ok) return errorResult(422, "Definition failed validation", { issues });

      await connectDb();
      const form = await Form.findOne({ formId, ownerId: userId });
      if (!form) return errorResult(404, "Form not found");

      await Form.updateOne(
        { formId: form.formId, ownerId: userId },
        {
          draft: { title: definition.title, description: definition.description ?? null, fields: definition.fields },
          title: definition.title,
          updatedAt: new Date(),
        },
      );
      return jsonResult({ formId: form.formId, status: form.status, ...formLinks(form) });
    },
  );

  server.tool(
    "propose_form",
    "Generate an AI proposal for a new form from a creator prompt. Returns an unsaved definition with a change summary — persist it with create_form. Consumes the account's AI operation quota.",
    { prompt: z.string().trim().min(1) },
    async ({ prompt }) => {
      await connectDb();
      return proposalResult(await generateFormProposal({ accountId: userId, prompt, current: null }));
    },
  );

  server.tool(
    "propose_edit",
    "Generate an AI proposal that edits one of your existing drafts from a creator prompt. Returns an unsaved definition with a change summary — persist it with update_draft. Consumes the account's AI operation quota.",
    { formId: z.string().min(1), prompt: z.string().trim().min(1) },
    async ({ formId, prompt }) => {
      await connectDb();
      const form = await Form.findOne({ formId, ownerId: userId }).lean();
      if (!form) return errorResult(404, "Form not found");
      const parsed = formDefinitionSchema.safeParse(form.draft);
      return proposalResult(
        await generateFormProposal({ accountId: userId, prompt, current: parsed.success ? parsed.data : null }),
      );
    },
  );

  server.tool(
    "publish_form",
    "Publish (or publish an update): snapshot the validated draft into a new immutable version served at the stable public link. A closed form stays closed with its new version.",
    { formId: z.string().min(1) },
    async ({ formId }) => {
      await connectDb();
      const form = await Form.findOne({ formId, ownerId: userId });
      if (!form) return errorResult(404, "Form not found");
      if (form.status === "archived") return errorResult(409, "Unarchive the form before publishing.");

      const parsed = formDefinitionSchema.safeParse(form.draft);
      if (!parsed.success) return errorResult(422, "The draft failed validation and cannot be published.");
      const definition = parsed.data;
      if (definition.fields.length === 0) return errorResult(422, "Add at least one field before publishing.");

      const versionNumber = form.versionCounter + 1;
      const version = await FormVersion.create({
        formId: form.formId,
        versionNumber,
        definition: { title: definition.title, description: definition.description ?? null, fields: definition.fields },
      });
      form.versionCounter = versionNumber;
      form.latestVersionId = version.versionId;
      if (form.status !== "closed") form.status = "published";
      form.updatedAt = new Date();
      await form.save();

      return jsonResult({
        formId: form.formId,
        status: form.status,
        versionNumber,
        ...formLinks(form),
      });
    },
  );

  server.tool(
    "close_form",
    "Stop a published form from accepting submissions; its public link shows a closed message.",
    { formId: z.string().min(1) },
    async ({ formId }) => {
      await connectDb();
      const form = await Form.findOne({ formId, ownerId: userId });
      if (!form) return errorResult(404, "Form not found");
      if (form.status !== "published") return errorResult(409, "Only a published form can be closed.");

      form.status = "closed";
      form.closedAt = new Date();
      form.updatedAt = new Date();
      await form.save();
      return jsonResult({ formId: form.formId, status: form.status, ...formLinks(form) });
    },
  );

  server.tool(
    "reopen_form",
    "Reopen a closed form so its public link accepts submissions again.",
    { formId: z.string().min(1) },
    async ({ formId }) => {
      await connectDb();
      const form = await Form.findOne({ formId, ownerId: userId });
      if (!form) return errorResult(404, "Form not found");
      if (form.status !== "closed") return errorResult(409, "Only a closed form can be reopened.");

      form.status = "published";
      form.closedAt = null;
      form.updatedAt = new Date();
      await form.save();
      return jsonResult({ formId: form.formId, status: form.status, ...formLinks(form) });
    },
  );

  server.tool(
    "archive_form",
    "Put a form aside without deleting its definition or submissions.",
    { formId: z.string().min(1) },
    async ({ formId }) => {
      await connectDb();
      const form = await Form.findOne({ formId, ownerId: userId });
      if (!form) return errorResult(404, "Form not found");

      form.status = "archived";
      form.archivedAt = new Date();
      form.updatedAt = new Date();
      await form.save();
      return jsonResult({ formId: form.formId, status: form.status, ...formLinks(form) });
    },
  );

  server.tool(
    "unarchive_form",
    "Restore an archived form: back to published if it has a published version, draft otherwise.",
    { formId: z.string().min(1) },
    async ({ formId }) => {
      await connectDb();
      const form = await Form.findOne({ formId, ownerId: userId });
      if (!form) return errorResult(404, "Form not found");
      if (form.status !== "archived") return errorResult(409, "Form is not archived.");

      form.status = form.latestVersionId ? "published" : "draft";
      form.archivedAt = null;
      form.updatedAt = new Date();
      await form.save();
      return jsonResult({ formId: form.formId, status: form.status, ...formLinks(form) });
    },
  );

  server.tool("list_forms", "List the authenticated creator's forms with status, links, and submission counts", {}, async () => {
    await connectDb();
    const forms = await Form.find({ ownerId: userId }).sort({ updatedAt: -1 }).lean();
    return jsonResult(
      forms.map((f) => ({
        formId: f.formId,
        title: f.title,
        status: f.status,
        fields: f.draft?.fields?.length ?? 0,
        versions: f.versionCounter,
        updatedAt: f.updatedAt,
        ...formLinks(f),
      })),
    );
  });

  server.tool(
    "get_form_submissions",
    "Read submissions for one of your forms (latest first). Each answer references the exact field wording of the version the respondent answered.",
    {
      formId: z.string().min(1),
      limit: z.number().int().min(1).max(100).default(20),
    },
    async ({ formId, limit }) => {
      await connectDb();
      const form = await Form.findOne({ formId, ownerId: userId }).lean();
      if (!form) return errorResult(404, "Form not found");
      const submissions = await Submission.find({ formId: form.formId }).sort({ submittedAt: -1 }).limit(limit).lean();
      const versions = await FormVersion.find({ formId: form.formId }).lean();
      const versionById = new Map(versions.map((v) => [v.versionId, v]));

      return jsonResult({
        form: { formId: form.formId, title: form.title, status: form.status, ...formLinks(form) },
        submissions: submissions.map((s) => {
          const v = versionById.get(s.versionId);
          return {
            submissionId: s.submissionId,
            submittedAt: s.submittedAt,
            version: v?.versionNumber ?? null,
            answers: s.answers.map((a: { fieldId: string; value?: unknown; optionIds?: string[] }) => {
              const field = v?.definition?.fields?.find((f: { fieldId: string }) => f.fieldId === a.fieldId);
              const label = field?.label ?? a.fieldId;
              const value =
                (a.optionIds ?? []).length > 0
                  ? a.optionIds!.map((oid) => field?.options?.find((o: { optionId: string }) => o.optionId === oid)?.label ?? oid)
                  : a.value;
              return { fieldId: a.fieldId, question: label, answer: value };
            }),
          };
        }),
      });
    },
  );

  return server;
}

export const POST = withApiErrors("api/mcp", async function POST(req: NextRequest) {
    const auth = await requireApiToken(req);
    if (!auth) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Provide an API token: Authorization: Bearer fl_live_…" } },
        { status: 401 },
      );
    }

    const server = buildServer(auth.userId);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    try {
      await server.connect(transport);
      let parsedBody: unknown;
      try {
        parsedBody = await req.json();
      } catch {
        return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, { status: 400 });
      }
      return await transport.handleRequest(req, { parsedBody });
    } catch (err) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: err instanceof Error ? err.message : "Invalid MCP request" } },
        { status: 400 },
      );
    } finally {
      await transport.close().catch(() => {});
      await server.close().catch(() => {});
    }
  },
);

export async function GET() {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "GET is not supported in stateless mode" } },
    { status: 405 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "DELETE is not supported in stateless mode" } },
    { status: 405 },
  );
}
