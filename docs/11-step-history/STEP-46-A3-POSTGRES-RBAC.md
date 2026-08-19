# EQCOFE — Step 46 / A3

## PostgreSQL Schema + RBAC

**Status:** IMPLEMENTED / CI VERIFICATION PENDING

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

## Closure gate

A3 may be marked COMPLETE only after canonical CI passes on the exact A3 source.
