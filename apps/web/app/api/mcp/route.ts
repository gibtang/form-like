import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { Form, FormVersion, Submission } from "@/lib/models";
import { requireApiToken } from "@/lib/api-token";
import { withApiErrors } from "@/lib/api-wrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

function errorResult(status: number, message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ error: { status, message } }) }],
    _status: status,
  };
}

/** One stateless server per request; tools close over the token's user. */
function buildServer(userId: string): McpServer {
  const server = new McpServer(
    { name: "form-like", version: "1.0.0" },
    { instructions: "Form-like API: list your forms and read published-version submissions. Owner-scoped." },
  );

  server.tool("list_forms", "List the authenticated creator's forms with status and submission counts", {}, async () => {
    await connectDb();
    const forms = await Form.find({ ownerId: userId }).sort({ updatedAt: -1 }).lean();
    return jsonResult(
      forms.map((f) => ({
        formId: f.formId,
        title: f.title,
        status: f.status,
        fields: f.draft?.fields?.length ?? 0,
        versions: f.versionCounter,
        publicUrl: f.latestVersionId ? `/f/${f.formId}` : null,
        updatedAt: f.updatedAt,
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

      return jsonResult(
        submissions.map((s) => {
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
      );
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
