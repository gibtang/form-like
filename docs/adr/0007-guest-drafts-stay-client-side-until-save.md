---
status: accepted
---

# Guest drafts stay client-side until first save

Landing-page CTAs used to require an account before any building happened. On 2026-11-14, Gibson accepted opening the builder to visitors without an account: a visitor builds a draft in the browser (`/create`), the draft persists to `localStorage` on every change, and the account prompt appears only when the visitor saves. Saving then creates the Form document owned by that creator in one step, and a visitor who signed in since the draft was stored gets it persisted automatically on their next visit to `/create`.

Server-side anonymous Form documents claimed at signup were considered and rejected: bots would fill the collection with junk drafts, requiring orphan cleanup and claim logic for data most visitors abandon. Auto-verifying accounts created mid-guest-flow was also rejected — email verification is the anti-bot boundary (see ADR 0004), and weakening it for the funnel reopens automated account creation.

Consequences: guest drafts do not survive incognito sessions or device switches (the save prompt states the draft stays in the browser), and visitors hold a single guest draft slot rather than a list. AI generation is available to anonymous visitors, metered against a per-IP pseudo-account in the usage controls (same per-minute and daily caps as accounts, plus the global spend cutoff); signed-in visitors consume their own account quota.
