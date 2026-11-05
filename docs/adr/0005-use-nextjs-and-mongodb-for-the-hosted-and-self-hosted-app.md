---
status: accepted
---

# Use Next.js and MongoDB for hosted and self hosted deployments

Gibson accepted a TypeScript Next.js application with MongoDB, Auth.js Credentials, Tailwind, and shadcn/ui, packaged with Docker for Coolify and self-hosting. Reusing Postdrop's application, authentication, and deployment patterns reduces the number of unfamiliar operating conventions while keeping the hosted service and self-hosted distribution on the same application.

MongoDB stores form drafts, preserved published versions, submissions, account data, and usage records. Form definitions are data rendered through the supported component catalogue. The application does not execute model-generated application code. This preserves the same validation and rendering behavior for AI edits, direct edits, previews, and public forms.

Use a supported Node.js runtime satisfying the TypeSafe SDK's documented Node.js 22+ requirement. Keep database, password hashing, and model calls in the Node server runtime rather than importing them into Edge or browser code.

References: Postdrop `apps/web/package.json`, `apps/web/auth.ts`, and `docs/OPERATIONS.md`. [TypeSafe JavaScript SDK](https://docs.typesafe.ai/sdk/javascript).
