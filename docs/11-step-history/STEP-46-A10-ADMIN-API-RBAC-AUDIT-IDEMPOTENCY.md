# EQCOFE — Step 46 / A10

## Admin API + RBAC + Audit + Idempotency

**Status:** COMPLETE / FINAL GATE PASS

## Scope
A10 exposes the Step-46 Marketing and Customer Club operational capabilities through staff-only administrative controllers while reusing the canonical RBAC, Step-Up and idempotency platform controls.

## Marketing admin surface
`admin/marketing` now exposes:
- Campaign list/get/create/reschedule and lifecycle transitions;
- Promotion list/create/enable/disable;
- Coupon list/create/enable/disable;
- Redemption history list with optional status filter.

Campaign mutations reuse the A4 `CampaignService`, preserving its transaction, optimistic concurrency, audit and outbox behavior. Promotion/Coupon administrative writes use `MarketingAdminService`, with domain validation, campaign/promotion window containment, optimistic version checks, and transaction-scoped audit records.

## Loyalty admin surface
`admin/loyalty` now exposes:
- customer points balance;
- bounded customer points history;
- critical manual points adjustment;
- exact reversal of a previous points entry.

Manual adjustment/reversal are executed through `LoyaltyAdminService` and write the ledger mutation and audit record through the same transaction executor.

## Security contract
All routes are `@StaffOnly()`.
Permissions reuse A3 canonical keys:
- `marketing.view`
- `marketing.manage`
- `marketing.activate`
- `marketing.redemption.view`
- `loyalty.view`
- `loyalty.adjust`

Critical activation/deactivation and loyalty correction paths require `@RequireStepUp()`. All admin mutations require a canonical `@RequireIdempotency(...)` scope. No new parallel RBAC namespace is introduced.

## Financial / Loyalty boundary
A10 does not introduce any cash conversion, points-to-Toman exchange, stored value or payment behavior. Loyalty remains points-only and balance remains derived from immutable ledger entries.

## Deliberate Redemption boundary
A10 does not add arbitrary manual Redemption state mutation endpoints. A8 ties Redemption state to authoritative Checkout/Order state and deferred financial integrity checks; bypassing those lifecycle owners from an admin endpoint would violate that invariant. Redemption is therefore read-only in this admin surface.

## Verification coverage
`test/marketing-loyalty-step46-a10.spec.ts` verifies staff-only routing, RBAC reuse, Step-Up, idempotency, audit wiring, optimistic concurrency, points-only semantics and module registration.

## Canonical CI verification
Verification-only Draft PR #15 tested the exact A10 source already present on `main`; its branch added only a documentation CI marker and was not merged.

Final GitHub Actions Canonical CI run `32264512373`, job `verify` (`96105581639`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI contract validation: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 369 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A10 tests: **10/10 PASS**
- runtime tests: **204 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A10 FINAL GATE = PASS**
**A10 = COMPLETE**

## Next approved substep
**Step 46 / A11 — E2E + Concurrency + Security + Regression**
