# Form-like — prompt-built forms with stable public links

An open-source form builder for small SaaS teams collecting customer feedback.
Describe a form in plain English, review the generated proposal, refine it
through prompts or direct edits, then publish a stable public link. Respondents
answer a fixed published version — no account, no AI calls on the public path.

- **Stack:** Next.js (App Router) · TypeScript · MongoDB · Auth.js · Tailwind · OpenRouter
- **License:** Apache-2.0
- **Hosted instance:** https://form-like.com

## How it works

1. **Create** — describe the form ("create a customer feedback form asking
   about satisfaction, missing features, and permission to follow up"). A text
   model drafts the structure; Jev (TypeSafe's decision model) picks controls.
2. **Review** — every proposal shows a rendered preview and a change summary.
   Apply it, discard it, or undo after applying. Nothing touches your draft
   until you apply, and nothing persists until you save.
3. **Refine** — follow-up prompts or direct edits: wording, options, required
   flags, rating scales, conditional rules (show a follow-up after a low
   rating).
4. **Publish** — publishing snapshots an immutable version at a stable link
   (`/f/<formId>`). Edits stay draft until you explicitly *Publish update*.
   Respondents finish the version they opened; each submission keeps its
   original questions forever.
5. **Collect** — submissions table, per-response detail with the exact wording
   the respondent saw, CSV export, optional email notification per form.
   Close a form to stop submissions across versions; archive to set it aside.

## Self-hosting

Requirements: Node.js 22+, a MongoDB instance (Atlas or self-hosted), and an
OpenRouter API key for AI generation.

```bash
git clone https://github.com/gibtang/form-like.git
cd form-like
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill in the values below
pnpm dev                                        # http://localhost:3000
```

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `AUTH_SECRET` | yes | Auth.js signing secret (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | yes (self-host) | Set `true` behind a proxy |
| `BASE_URL` | yes | Public origin — public links are `${BASE_URL}/f/<formId>` |
| `OPENROUTER_API_KEY` | for AI | Enables generation; unset = manual editing only |
| `OPENROUTER_TEXT_MODEL` | no | Default `openai/gpt-5.4-mini` |
| `OPENROUTER_JEV_MODEL` | no | Default `typesafe/jev-1.14` (Decisions API) |
| `GENERATION_INSTRUCTIONS_OVERRIDE` | no | Replace the built-in starter instructions (server-only; never shipped to clients) |
| `AI_OPS_PER_ACCOUNT_PER_DAY` | no | Default `20`; server-enforced, UTC reset |
| `AI_REQUESTS_PER_MINUTE` | no | Default `10` per account |
| `GLOBAL_DAILY_AI_SPEND_CUTOFF_USD` | prod | Hard daily AI spend ceiling (USD) |
| `AI_INPUT_PRICE_PER_MTOK` / `AI_OUTPUT_PRICE_PER_MTOK` | no | Spend-estimate prices |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google sign-in; redirect URI `https://<host>/api/auth/callback/google` |
| `SES_ACCESS_KEY_ID` / `SES_SECRET_ACCESS_KEY` / `SES_REGION` / `MAIL_FROM` | for email | Verification, password reset, submission notifications. Unset: accounts stay unverified (no auto-verify) and notifications are skipped |
| `GA_MEASUREMENT_ID` | no | GA4 gtag snippet |
| `ANALYTICS_EXCLUDED_EMAILS` | no | Comma-separated emails never loaded into analytics |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` / `TELEGRAM_ALERTS` | no | Ops pager (`off` mutes) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | no | Error tracking; no-op when unset |

### Docker

```bash
docker build -t form-like .
docker run -p 3000:3000 --env-file apps/web/.env.local form-like
```

The image uses Next.js standalone output and runs as a non-root user.

### AI accounts

Bring your own [OpenRouter](https://openrouter.ai) key. Text drafting uses a
chat model with structured output; control selection uses Jev through
OpenRouter's Decisions API. The bundled starter instructions are generic and
replaceable via `GENERATION_INSTRUCTIONS_OVERRIDE`.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
