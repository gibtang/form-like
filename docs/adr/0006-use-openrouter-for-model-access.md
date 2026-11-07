---
status: accepted
---

# Access models through OpenRouter with the Vercel AI SDK

Model access for form generation and Jev control selection goes through OpenRouter using the Vercel AI SDK's `generateObject` with Zod schemas — never raw HTTP. Gibson directed this on 2026-11-06 ("use openrouter which has jev.ai"). It supersedes the TypeSafe SDK implementation detail in ADR 0001: Jev is still the decision model (`typesafe/jev-1.14`, matching the pinned jev-1.14.0 choice), reached through the same OpenRouter key and provider as the text model (`openai/gpt-5.4-mini` default). Slugs stay server-configurable (`OPENROUTER_TEXT_MODEL`, `OPENROUTER_JEV_MODEL`).

This also satisfies the workspace rule that all OpenRouter calls use the Vercel AI SDK with structured output. The private hosted generation instructions keep their boundary from ADR 0003: `GENERATION_INSTRUCTIONS_OVERRIDE` remains a server-only env; the public starter prompt remains independently usable.

Version pairing accepted at implementation time: `ai@6` with `@openrouter/ai-sdk-provider@2` (provider 3.x requires ai@7; upgrade both together if the SDK line moves).

Consequences: one API key for both models, one structured-output path, and provider failures surfaced as recoverable errors that leave the creator's draft untouched (quota accounting in the hosted usage rules).
