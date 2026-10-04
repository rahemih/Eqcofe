# Step 63-G — Payment Handoff & Authoritative Order Outcome

Status: IMPLEMENTATION_IN_PROGRESS

Canonical baseline: `db8a54c611a7860b27097d09cbba4a14a01bd949`

Task Contract: `docs/14-multi-agent/tasks/EQCOFE-STEP63-G-PAYMENT-OUTCOME-001.json`

## Objective

Replace the SF-D-06 / SF-D-07 placeholders with a fail-closed payment handoff and recovery flow that never treats provider return, browser navigation, timeout or a repeated callback as proof of payment success.

## Scope

- Start payment only after idempotent Reservation + Order creation.
- Bind order/payment identity in an HttpOnly HMAC-signed handoff tied to the server-only Checkout token.
- Receive provider browser callbacks on the Storefront, proxy callback state server-to-server to the existing backend callback operation, then drop callback state before entering `/payment/return`.
- Determine payment result only from authoritative status/verify.
- Render Order Outcome from authoritative Order + bound Payment state.
- Allow retry only after the previous payment is terminal, or when no prior handoff exists.
- Fail closed when initiation is ambiguous before a signed payment handoff exists: authoritative Order payment state blocks duplicate initiation unless the order is unpaid/failed/cancelled.
- Keep backend payment runtime unchanged in Step 63-G; unknown identity recovery that needs new backend surface remains outside this Storefront stage.
- Keep real provider enablement, merchant secrets and production gateway configuration deferred to Step 74.

## Security boundaries

- Callback `state` is never copied to the payment-return URL, UI, browser storage or Storefront logs.
- Query `payment_id` is accepted only when it matches the signed handoff.
- Checkout/payment credentials remain HttpOnly/server-only.
- External redirect accepts only HTTP(S), forbids credentials/hash, and rejects HTTPS downgrade.
- `PAYMENTS_ENABLED=false` and provider `disabled` remain repository defaults.

## Governance

Risk: HIGH. Final completion requires exact-head CI / Phase A / Storefront Quality / CodeQL, deterministic Review, exact-artifact Project Owner Human Gate, ACTIVE Lock, protected merge, exact-SHA postmerge PASS and terminal Lock release.

Graph/Graphify remains deferred by Project Owner directive until final Step 63 acceptance/closure before Step 64.
