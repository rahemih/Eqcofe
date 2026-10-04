# EQCOFE — Step 63 Pre-Closure QA Repair

## Finding

Final pre-Graph audit found a test-coverage gap, not a confirmed production defect: Stage 63-H integrated acceptance exercised the main Cart → Checkout → Payment → Outcome journey, but Cart quantity/remove actions, OTP request/verify + authenticated Cart merge, and Address select/update/create actions were not executed through the production Storefront HTTP/SSR action routes.

## Repair

This task extends only `apps/storefront/scripts/verify-step63-acceptance.mjs`.

Added integrated execution for:
- Cart quantity PATCH and remove DELETE via `/cart` action;
- OTP request/verify via `/checkout/identity`;
- sanitized `eqcofe_session` transport and `/customer/cart/merge`;
- Address selection, safe non-geography update and canonical-reference creation via `/checkout/address`;
- idempotency evidence for address create/update;
- preservation of the existing delivery/quote/review/reserve/order/payment/callback/status/verify/outcome acceptance path.

No production route, component, server implementation, OpenAPI contract, database, dependency or workflow is changed.

## Exit gate

Canonical CI, Phase A, Storefront Quality/browser acceptance, deterministic Review, exact-artifact Lock, Merge Policy, protected merge, exact-SHA postmerge verification and terminal Lock release must pass before Step 63-I final closure resumes.
