# EQCOFE — Step 46 / A2

## Marketing Domain Model + Invariants

**Status:** IMPLEMENTED / RUNTIME VERIFICATION PENDING

## Implemented domain model

### Marketing
- `CampaignAggregate`
- `PromotionDefinition` / eligibility model
- `PromotionPolicy` validation and evaluation
- `CouponEntity`
- `RedemptionAggregate`

### Loyalty
- `LoyaltyPointsLedger`

## Frozen invariants

1. Monetary discount inputs/outputs are integer Toman.
2. Discount cannot exceed subtotal; payable amount cannot be driven below zero by the promotion evaluator.
3. Percentage discounts are integer 1..100.
4. Fixed discounts must be positive integer Toman.
5. Promotion active windows require start < end.
6. Promotion stacking defaults to `exclusive`; explicit stackability must be declared.
7. Wholesale customers are ineligible unless a promotion explicitly permits wholesale.
8. First-purchase eligibility consumes an authoritative `hasCompletedPurchase` commerce fact; Marketing does not infer first purchase from profile existence.
9. Usage limits are positive integers and are evaluated explicitly.
10. Per-customer limits require an identified customer.
11. Coupon codes are normalized server-side and validated.
12. Coupon disable/expiry/usage limits fail closed.
13. Redemption lifecycle is `reserved -> consumed`, `reserved -> released`, and `consumed -> reversed` for the same order.
14. Re-consuming the same reservation for the same order is idempotent; incompatible lifecycle transitions fail closed.
15. Loyalty uses integer points and cannot have a negative balance.
16. Loyalty points do not expose Toman conversion or cash-value semantics.
17. Duplicate loyalty ledger entry IDs are rejected.

## Test coverage authored

`test/marketing-loyalty-step46-a2.spec.ts` covers:
- campaign lifecycle safety;
- exclusive stacking default;
- discount floor at zero payable amount;
- first-purchase fact handling;
- wholesale default denial;
- coupon normalization and per-customer usage limits;
- redemption lifecycle/idempotency behavior;
- points balance and cash-conversion prohibition.

## Static gate review

The new domain sources use no NestJS/Kysely/PG/Redis/infrastructure imports and contain no `any`, matching the existing architecture gate rules.

The repository policy scans `src` for the forbidden English cash-account term. An initial A2 error-code name contained that token and was corrected to `LOYALTY_CASH_CONVERSION_FORBIDDEN` before closure documentation.

## Runtime verification note

The GitHub connector exposed no combined status/check run for the latest A2 commit, and the execution container could not resolve github.com to clone the repository. Therefore a fresh runtime `pnpm verify` result is not fabricated here.

A2 implementation is complete, but formal A2 COMPLETE status requires a fresh build/test/CI execution. Until that evidence exists, canonical status is `PARTIAL / VERIFICATION PENDING`.

## Next after verification

Step 46 / A3 — PostgreSQL Schema + RBAC.
