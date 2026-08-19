# EQCOFE — Step 46 / A5

## Coupon + Eligibility Engine

**Status:** COMPLETE / FINAL GATE PASS

## Implemented
- Coupon lookup by normalized code.
- Campaign, promotion and coupon active-state/window validation.
- Promotion eligibility evaluation for minimum subtotal, first purchase, wholesale policy, total usage and per-customer usage.
- Coupon total/per-customer usage validation.
- Integer-Toman discount evaluation with maximum discount cap.
- Explicit stacking result propagation.
- Marketing module registration/export.

## Persistence hardening
Migration `0037_marketing_coupon_eligibility_hardening.sql`:
- aligns PostgreSQL coupon format with the A2 domain format;
- requires coupon windows to stay inside their promotion window;
- adds active redemption usage indexes for promotion/coupon counting.

## Ownership boundary
A5 consumes authoritative eligibility facts (`isWholesale`, `hasCompletedPurchase`) as inputs. It does not infer wholesale status from profiles and does not query Orders directly. Wiring those authoritative commerce facts into Checkout is deferred to the dedicated integration substep.

## Concurrency note
A5 evaluates usage from `reserved` + `consumed` redemptions and fails closed at the current snapshot. Atomic reservation and concurrent limit enforcement remain the responsibility of the Redemption/Checkout transaction path in later integration/integrity substeps; A5 does not falsely claim race-free reservation.

## Verification coverage
`test/marketing-step46-a5.spec.ts` covers normalization, first-purchase eligibility, wholesale policy, per-customer limits, active campaign/promotion checks, active-usage counting, database hardening and module wiring.

## CI history and final evidence
The first verification run exposed a brittle A4 regression assertion that required the Marketing module exports array to contain only `CampaignService`. A5 correctly added another export, so the old exact-array assertion failed even though all A5 tests passed. The A4 assertion was corrected to verify that `CampaignService` remains exported while allowing additive exports.

Canonical CI rerun `32256531549`, job `verify` (`96079417704`) passed against the exact current main source plus verification-only documentation markers:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 356 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A5 tests: 8/8 PASS
- runtime tests: **156 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A5 FINAL GATE = PASS**
**A5 = COMPLETE**
