# EQCOFE — Step 46 / A3

## PostgreSQL Schema + RBAC

**Status:** COMPLETE / FINAL GATE PASS

## Persistence added

Migration `0034_marketing_loyalty_core.sql` adds additive persistence for:
- `marketing.campaigns`
- `marketing.promotions`
- `marketing.coupons`
- `marketing.redemptions`
- `loyalty.points_entries`

Existing `marketing` and `loyalty` schemas are reused; no parallel schema/module was introduced.

## Database invariants

- campaign and promotion active windows require `starts_at < ends_at`;
- percentage value is constrained to 1..100;
- fixed Toman discounts and optional discount caps are positive integers;
- subtotal thresholds and redemption discounts cannot be negative;
- stacking is explicit and defaults to `exclusive`;
- coupon codes are normalized uppercase and globally unique;
- coupon/promotion usage limits are positive when present;
- redemption lifecycle fields are constrained to reserved/consumed/released/reversed state shapes;
- partial unique indexes guard duplicate active promotion/coupon checkout redemption and duplicate order consumption;
- customer usage lookup indexes are present;
- points entries are integer deltas with direction constraints;
- duplicate points reference entries are rejected;
- a PostgreSQL advisory transaction lock plus balance check prevents concurrent writes from creating a negative points balance.

## RBAC added

Migration `0035_marketing_loyalty_rbac.sql` adds, idempotently:
- `marketing.view` — normal
- `marketing.manage` — high
- `marketing.activate` — critical
- `marketing.redemption.view` — normal
- `marketing.redemption.manage` — critical
- `loyalty.view` — normal
- `loyalty.adjust` — critical

Role assignment is intentionally not automatic.

## Verification coverage

`test/marketing-loyalty-step46-a3.spec.ts` verifies schema presence, financial constraints, redemption uniqueness/state protections, coupon usage limits, points concurrency protection and additive/risk-classified RBAC.

## Canonical CI verification

Verification-only Draft PR #7 was created from exact A3 main base commit `a95d8dc264c130dd4034531c1fc2acecbb60d77a`; its branch added only a documentation trigger marker.

GitHub Actions Canonical CI run `32254988853`, job `verify` (`96074498864`) completed successfully.

Results:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 351 module files scanned
- project policy: PASS
- TypeScript build: PASS
- runtime tests: **140 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- A3 persistence/RBAC tests: 6/6 PASS
- overall `pnpm verify`: PASS

## Final decision

**STEP 46 / A3 FINAL GATE = PASS**

**A3 = COMPLETE**

Next approved substep: **Step 46 / A4 — Campaign Lifecycle Engine**.
