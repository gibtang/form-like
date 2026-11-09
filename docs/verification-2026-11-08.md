# E2E flow verification — 2026-11-08

End-to-end walkthrough of the shipped stack (post-#13 `main`, `807ecd7`), recorded locally
(production build, `next start`, port 3100). Videos attached to the PR.

## Flow exercised

1. **Signup (credentials)** — created `formlike-demo-<ts>@form-like.com`; SES verification email
   accepted by SES (identity `form-like.com`, region `eu-north-1`); UI shows
   "Account created. Check your inbox…".
2. **Login** — credentials login gated on `emailVerified` as designed.
3. **Dashboard → New form → editor.**
4. **AI creation (stage 3)** — real OpenRouter call (`openai/gpt-5.4-mini` + `typesafe/jev-1.14`).
   Prompt asked for a coffee-subscription feedback form with a ≤3-stars conditional follow-up.
   The proposal returned rating / single-choice / long-text / conditional follow-up fields;
   "Jev adjusted 1 control" shown in the change summary. Applied → 5/30 fields → Save draft.
5. **Publish (stage 4)** — v1 published; public link `/f/<formId>` served live;
   lifecycle bar shows Publish update (v2) / Close / Archive / Submissions / Delete.
6. **Respond (stages 2+4)** — fresh logged-out desktop context + a 390×844 mobile context:
   satisfaction **3** arms the conditional — "May we email you for a follow-up?" appears
   (helper: "Shown when overall satisfaction is 3 stars or below"), email field filled,
   submit → "Thanks — your response was recorded." Two submissions total.
7. **Admin (stage 5)** — submissions table resolves option labels and ratings
   (3/5, Coffee quality, 5/5, respondent email), per-row version tag, Export CSV present.

## Environment

- Local Atlas dev cluster (`.env.local`), `GLOBAL_DAILY_AI_SPEND_CUTOFF_USD=1`
  (the agreed launch cutoff), AI ops succeeded under the cutoff.
- Dev-only accommodation, disclosed: no inbox is wired to the synthetic signup address, so
  `emailVerified` was flipped directly in Mongo after signup. The SES send path itself was
  exercised (email accepted); the token → `/api/verify` consume path is unchanged code
  covered by the stage-1 verification.

## Observations (feedback candidates, not bugs)

- AI structure varies run-to-run: the follow-up question was generated as a 1–5 rating in one
  run and as yes/no radios in another. Both render and submit correctly; if a strict
  yes/no shape is wanted for follow-ups, the generator prompt in `apps/web/lib/ai/generate.ts`
  could pin the field type.
- `GLOBAL_DAILY_AI_SPEND_CUTOFF_USD` requires an explicit value in production
  (`apps/web/lib/quota.ts`) — set on Coolify at deploy time.

Evidence: `formlike-demo-desktop.mp4` (signup → verify → login → AI create → publish →
respond → submissions), `formlike-demo-mobile.mp4` (390×844: public form → conditional →
success → submissions).
