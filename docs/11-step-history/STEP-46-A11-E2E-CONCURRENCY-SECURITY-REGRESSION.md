# EQCOFE — Step 46 / A11

## E2E + Concurrency + Security + Regression

**Status:** IMPLEMENTED / CI VERIFICATION PENDING

## Scope
A11 is the verification and hardening gate for Step 46 before final canonical closure. It adds no new business feature. Instead it proves that the A1–A10 implementation composes safely across Marketing, Pricing, Cart/Checkout, Orders, Customer, Loyalty, RBAC and project policy boundaries.

## E2E commercial flow coverage
The A11 regression gate verifies:
- deterministic automatic/coupon promotion resolution;
- server-side derivation of wholesale and completed-purchase facts;
- Pricing discount and Marketing discount separation in the checkout snapshot;
- Checkout reservation creating Marketing Redemption state;
- Order creation consuming the exact reserved Redemption facts;
- terminal Order cancellation/expiry reversing consumed Redemptions without deleting history;
- deferred Checkout/Order financial integrity checks.

## Concurrency coverage
The database-owned concurrency controls are reverified for:
- promotion total/per-customer usage limits;
- coupon total/per-customer usage limits;
- first-purchase customer serialization and paid-order recheck;
- Loyalty balance serialization and non-negative invariant.

## Security coverage
A11 verifies:
- staff-only administrative surfaces;
- frozen RBAC key reuse;
- Step-Up on critical Marketing and Loyalty mutations;
- idempotency on administrative mutations;
- Redemption remains read-only from Admin and cannot bypass the Commerce-owned lifecycle;
- the project Toman/no-cash-account policy remains active.

## Regression coverage
`test/marketing-loyalty-step46-a11.spec.ts` contains 15 dedicated A11 checks and also asserts that the canonical Step-46 A2–A10 regression suites and additive migration lineage 0034–0041 remain present.

## Closure gate
A11 becomes COMPLETE only after Canonical CI passes against the exact A11 `main` source, including OpenAPI, architecture, project policy, TypeScript build and the full runtime test suite.

## Next substep after closure
**Step 46 / A12 — Final Canonical Closure**
