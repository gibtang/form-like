---
status: accepted
---

# Use email and password with Auth.js

Creators authenticate with email and password using Auth.js (NextAuth.js), as specified by Gibson on 2026-11-05, replacing the proposed Google sign-in. The implementation will use the Credentials provider and application-managed account persistence and password handling; Auth.js does not supply account persistence or the complete password lifecycle through that provider.

Gibson subsequently accepted creator signup, email verification, and password reset. Each form has one owner in the initial release. Respondents submit without an account; creators add explicit name/email fields when identification is needed. Password inputs must include the visibility toggle required by the workspace's UI rules.

Postdrop supplies reference code for the Credentials provider and account lifecycle, but its current source can auto-verify accounts when mail is absent or verification mail fails. That fallback does not satisfy this product's accepted email-verification requirement and must not be copied into the hosted signup flow.

Reference: [Auth.js Credentials documentation](https://authjs.dev/getting-started/authentication/credentials).
