---
status: accepted
---

# Default-on submission notifications

Creators expect form submissions to reach their inbox with no setup — that is
the baseline Web3Forms-style behavior people arrive with. We decided new forms
auto-send a submission notification email by default, to the creator's
verified account email unless they set a per-form override, with three guards:
a 100-emails/day/form cap, no sending to unverified account emails, and
notifications auto-disabled after three consecutive failed sends until the
creator re-enables them. Forms that existed before this shipped read as off
until toggled, so no existing creator starts receiving surprise email.

## Considered Options

- Opt-in (the prior `notifyEmail` status quo): rejected — silence by default
  makes the product feel broken at its core job.
- SES SNS bounce webhook for hard-bounce detection: rejected for now — no
  webhook infrastructure exists (single Next.js process); consecutive-failure
  disabling covers the pathological cases.
- Tying notifications to a submission quota: rejected — no submission quota
  exists; bundling one into this feature was scope creep.

## Consequences

- `Form.emailNotifications` schema default `true` only applies to newly
  created forms; documents missing the field are off.
- A mail failure never fails the recorded submission.
