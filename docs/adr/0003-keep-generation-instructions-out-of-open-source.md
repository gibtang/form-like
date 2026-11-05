---
status: accepted
---

# Keep production generation instructions outside the open-source code

The project will be open source, following Postdrop as the reference project. Gibson's production generation instructions remain private in server-side environment configuration loaded from an uncommitted .env file or the deployment environment. Gibson specified this boundary on 2026-11-05 because those instructions are proprietary product know-how.

Public source, example configuration, documentation, and client bundles must not include the proprietary instruction text. Gibson subsequently accepted Apache-2.0 licensing and a functional public starter prompt that self-hosters can replace. The hosted deployment overrides the starter through private server-side environment configuration. Self-hosters supply their own text-generation and Jev API keys. No existing production secrets were read to record this decision.

The initial hosted service is free with enforced per-account AI allowances. Gibson accepted 20 AI operations per verified account per day, 30 fields per form, and one concurrent AI operation per account. Successful proposals count even when discarded; failed generations producing no valid proposal do not consume the daily allowance. Published forms collect submissions without invoking AI. Rate limits and an operator-configured global spending cutoff bound provider usage. Publishing the source does not grant access to the hosted deployment's credentials or proprietary prompt.

## Postdrop reference

Read-only inspection found Postdrop at `/Users/gibson.tang/Dropbox/my-files/code/postdrop`. Its README and LICENSE establish Apache-2.0 and documented self-hosting; its current operations documentation describes no billing. The current application uses Auth.js Credentials for email/password authentication, and its authoritative environment template is `apps/web/.env.example`. It has no existing AI prompt integration to reuse, so the private-instructions boundary is a new requirement for this product.
