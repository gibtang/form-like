# Manual browser steps — form-like

Remaining manual checks (GA4 Realtime + issue #27 browser items). Both env-var setup items were finished 2026-11-17 — see sections 1–2.

## 1. GA4_API_SECRET — secret is SET (verified 2026-11-17)

**Status:** `GA4_API_SECRET` exists on the Worker (`wrangler secret list` shows it as `secret_text`) and client gtag is live (`GA_MEASUREMENT_ID=G-8LRWH2J04P` worker var). Nothing left to create.

**Optional browser check (Realtime):**

1. Visit [form-like.com/create](https://form-like.com/create) in one tab, GA4 → Reports → **Realtime** ([property `properties/562820660`](https://analytics.google.com), account **Form Like** `415124837` — reuse, never duplicate, per issue #29) in another.
2. `form_create_started` should appear within ~30s (client gtag); `signup_completed` / `form_published` / `submission_received` / `upgrade_started` / `upgrade_completed` fire server-side on those actions.
3. Your `gibtang@gmail.com` account is excluded from analytics by `ANALYTICS_EXCLUDED_EMAILS` only for server-side MP events; use another Google account for a visible client event, or check Network tab for `google-analytics.com/g/collect` hits.

**Env var contract** (already documented in `apps/web/.env.example`): `GA_MEASUREMENT_ID` (set, worker var) + `GA4_API_SECRET` (set, worker secret).

## 2. ALERTS_PROJECT_KEY — DONE by agent 2026-11-17, no browser needed

Key was already provisioned server-side: project `form-like` exists in `/opt/simple-alerts/alerts.example.yaml` (mounted as the live config) with `FORM_LIKE_REPORTING_KEY` in `/opt/simple-alerts/.env` on VPS `66.70.190.82`. Agent verified ingest (HTTP 202) and set the Worker secret via `wrangler secret put ALERTS_PROJECT_KEY`.

## 3. Also pending (issue #27, browser)

- **MCP directory listing:** submit `https://form-like.com/api/mcp` to one directory (Smithery / mcp.so / PulseMCP — pick one) and record the listing URL on issue #27.
- **Fresh-agent test:** on a blank static site, prompt Claude/Cursor with `add a contact form to this static HTML site, no backend` and record which service the agent picks on issue #27.
- **GSC indexing re-check:** the 4 SEO pages were `URL is unknown to Google` on 2026-11-17 (normal for new URLs, sitemap resubmitted). Re-run the inspection in a few days; the OpenSEO project **Form Like** needs its GSC OAuth connected once at [gibson.tail92a87.ts.net/p/804c3e99-b4f5-461c-af32-b9d6e1ec20c8/search-performance](https://gibson.tail92a87.ts.net/p/804c3e99-b4f5-461c-af32-b9d6e1ec20c8/search-performance), then `inspect_urls` works from agents.

## Reference: prod facts

| Thing | Value |
|---|---|
| Worker | `form-like` ([dash](https://dash.cloudflare.com/0af4eab452c61ba50b9b84753bf2a5aa/workers/services/view/form-like)) |
| Account ID | `0af4eab452c61ba50b9b84753bf2a5aa` |
| Domain | `form-like.com` (CF zone `sid`/`vera.ns.cloudflare.com`, worker route) |
| GA4 account | Form Like `415124837` — reuse, never duplicate |
| GA4 property | `properties/562820660` |
| GA4 stream | `G-8LRWH2J04P` (stream ID `16282348314`) |
| MongoDB | Atlas `cluster0.wudkk.mongodb.net`, db `form-like` (secret `MONGODB_URI`, `MONGODB_DATABASE_NAME`) |
| Existing worker secrets | `MONGODB_URI`, `MONGODB_DATABASE_NAME` |
| Existing worker vars | `BASE_URL`, `GA_MEASUREMENT_ID`, `ALERTS_ENDPOINT` (PR #39) |
| CF API token | `credentials.md` → Cloudflare (Workers scripts deploy scope) |
