# Manual browser steps — form-like

Everything an agent can't do (Google/Cloudflare dashboards). Last updated 2026-11-17, after PRs #38/#39 deployed.

## 1. GA4_API_SECRET — enables the funnel events

**Status:** client gtag already live (`GA_MEASUREMENT_ID=G-8LRWH2J04P` worker var). Only the Measurement Protocol secret is missing; server events silently no-op without it.

**Steps:**

1. Open [analytics.google.com](https://analytics.google.com) (account `gibtang@gmail.com`).
2. Switch to account **Form Like** (`415124837`) → property **form-like.com** (`properties/562820660`). Do NOT create a new property — reuse decision recorded in issue #29.
3. Admin (gear) → **Data streams** → web stream **Form Like Web** — measurement ID `G-8LRWH2J04P`, stream ID `16282348314`, URL `https://form-like.com`.
4. Scroll to **Measurement Protocol** → **API secrets** → **Create**.
   - Name: `formlike-funnel` (anything descriptive).
   - Copy the secret value immediately (shown once).

**Where to put it** — either works:

- CLI (from `apps/web/` in the repo; token + account from `credentials.md` → Cloudflare):

  ```sh
  export CLOUDFLARE_API_TOKEN=<cf token> CLOUDFLARE_ACCOUNT_ID=0af4eab452c61ba50b9b84753bf2a5aa
  pnpm exec wrangler secret put GA4_API_SECRET
  # paste the secret when prompted
  ```

- Dashboard: [Cloudflare dash → Workers & Pages → form-like → Settings → Variables & Secrets](https://dash.cloudflare.com/0af4eab452c61ba50b9b84753bf2a5aa/workers/services/view/form-like) → **Add variable** → type **Secret**, name `GA4_API_SECRET` → Deploy.

Secrets survive `wrangler deploy`; no redeploy needed after setting.

**Verify it works:**

1. Visit [form-like.com/create](https://form-like.com/create) in one tab, GA4 → Reports → **Realtime** in another.
2. `form_create_started` should appear within ~30s (client gtag), `signup_completed` / `form_published` / `submission_received` / `upgrade_started` / `upgrade_completed` fire server-side on those actions.
3. Note: your `gibtang@gmail.com` account is excluded from analytics by `ANALYTICS_EXCLUDED_EMAILS` only for server-side MP events; use another Google account for a visible client event, or check Network tab for `google-analytics.com/g/collect` hits.

**Env var contract** (already documented in `apps/web/.env.example`): `GA_MEASUREMENT_ID` (set, worker var) + `GA4_API_SECRET` (this step).

## 2. ALERTS_PROJECT_KEY — arms server-error alerting

**Status:** `ALERTS_ENDPOINT=https://simple-alerts.feedcode.dev/api/ingest` is already set as a worker var (PR #39). Reporter stays a no-op until the project key exists.

**Steps:**

1. Open [simple-alerts.feedcode.dev](https://simple-alerts.feedcode.dev) (self-hosted Simple Alerts).
2. Open the project provisioned for **form-like** → **Settings/Keys** → copy the **project ingest key**. (If no project exists yet, create one named `form-like` and copy the key it issues.)

**Where to put it** — same two options as above:

- CLI (from `apps/web/`):

  ```sh
  export CLOUDFLARE_API_TOKEN=<cf token> CLOUDFLARE_ACCOUNT_ID=0af4eab452c61ba50b9b84753bf2a5aa
  pnpm exec wrangler secret put ALERTS_PROJECT_KEY
  # paste the key when prompted
  ```

- Dashboard: same Variables & Secrets page as above → **Add variable** → type **Secret**, name `ALERTS_PROJECT_KEY`.

**Verify it works:**

1. Hit any 5xx route on prod, e.g. `curl -s -o /dev/null -w '%{http_code}\n' https://form-like.com/dashboard` while signed out (401/302s don't alert — the reporter pages on 5xx).
2. Simplest deterministic check: [simple-alerts.feedcode.dev](https://simple-alerts.feedcode.dev) project inbox should show the heartbeat/test entry from the next real error. The reporter has a 4xx cooldown and always pages on 5xx (pattern copied from hotel-like `src/lib/notify.ts`).

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
