# EQCOFE — Step 63-E Checkout Identity

## Status

`STEP_63_D = CANONICAL_COMPLETE`

`STEP_63_E = IMPLEMENTATION AUTHORIZED — GRAPH DEFERRED TO STEP63 FINAL`

Canonical baseline: `8d53017e77ce3c7caf8e7aba0f82967b82753288`

## Purpose

Productionize only `/checkout/identity` while preserving the canonical server-only customer session boundary and the explicit guest-cart merge rule from the frozen Step-55 checkout journey.

## Evidence-confirmed contract drift

Canonical runtime `AuthController.requestOtp()` returns the `AuthService.requestOtp()` result containing `challenge_id` and `expires_at`; because the controller has no explicit HTTP status override, Nest POST semantics return 201. Current OpenAPI advertises 202 and no response content. The frontend therefore cannot obtain a typed authoritative challenge identifier from the current generated contract.

Canonical runtime `verifyOtp()` sets the customer session using the existing HttpOnly cookie boundary and returns only non-secret session metadata. Current OpenAPI advertises 200 without typed response content.

## Required repair

The repair is OpenAPI/generated-contract/test-only for the backend contract: type the runtime OTP request/verify success responses and align the request status. Backend identity business rules, OTP generation, session-token handling, database schema and dependencies remain unchanged.

After that contract is canonical inside this PR, the Storefront identity route may use only `createCustomerSessionBridge`, relay sanitized Set-Cookie headers server-side, probe authoritative session state, merge an existing guest Cart only after OTP success, and continue to `/checkout/address` only after session/merge success.

## Security invariants

OTP codes, challenge identifiers and session secrets are never placed in URL/analytics/logs. Session token is never returned to browser route data. The browser receives only the HttpOnly Set-Cookie already enforced by the Step-58 auth bridge. Unknown OTP/merge outcomes fail closed and do not advance checkout.

## Deferred

Address, delivery, review, reservation/order creation, payment return and order outcome remain later Step-63 stages. Graph UI remains deferred until Step 63 is fully complete.

## Graph deferral — Owner Directive

On 2026-10-03 the Project Owner explicitly directed that all Graphify/graph work for Step 63 be postponed until the end of Step 63. Therefore Stage 63-E is not blocked on local Graphify health/query/path/explain evidence.

This is a deferral, not a removal: the accumulated Step-63 graph health/query/path/explain work and graph UI/reconciliation must be executed during final Step 63 acceptance/closure before handoff to Step 64.

All remaining HIGH-risk gates still apply: exact-head CI, Phase A, Storefront Quality, CodeQL Security, deterministic Review, exact-artifact Human Gate, ACTIVE Lock, protected merge, exact-SHA postmerge verification and terminal Lock release.

## Contract repair applied

Stage 63-E aligns the public OTP contract to the existing runtime without changing Backend identity logic: request success is 201 with an envelope containing `challenge_id` and `expires_at`; verify success is 200 with `session_id` and `expires_at`; invalid/expired credentials are 401 and rate/attempt exhaustion is 429. The generated TypeScript contract and a focused byte-for-byte generator regression are included in this PR.
