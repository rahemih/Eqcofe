# EQCOFE — Step 65-B Wholesale Contract Readiness

## Status

`STEP_65_A = CANONICAL_COMPLETE`

`STEP_65_B = IN_PROGRESS / HIGH_RISK`

Canonical baseline: `a36757a1fa36d1f541102e0e1a3426406e3c5864`

Task: `EQCOFE-STEP65-B-WHOLESALE-CONTRACT-001`

Linear: `HOS-69`

Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Contract audit result

The Wholesale domain implementation already exists and remains authoritative. Stage 65-B does not redesign Wholesale.

The blocking gap is HTTP contract drift:

1. Runtime customer submit is customer-only and idempotency-protected and returns the created Wholesale application.
2. Nest POST semantics make that route HTTP 201 unless explicitly overridden.
3. Current OpenAPI incorrectly advertises untyped 200/202 success responses.
4. Runtime customer status read returns the latest owned application or `null`.
5. Current OpenAPI advertises an untyped 200 response.

Therefore production Storefront implementation cannot derive trustworthy generated response types until this contract is repaired.

## Runtime authority preserved

`CustomerWholesaleService` remains unchanged.

It owns:

- active-customer eligibility;
- retail-only application submission;
- one active application at a time;
- normalized bounded business fields;
- application statuses `submitted | under_review | approved | rejected`;
- staff-only review/approve/reject;
- atomic promotion from retail to wholesale only on staff approval;
- audit and outbox emission.

No browser or HTTP schema is allowed to promote a customer or reproduce these transitions.

## HTTP/OpenAPI repair

Stage 65-B will align only the presentation contract:

- submit becomes explicit `201 Created`;
- submit success content becomes a typed Wholesale application view;
- latest-application GET becomes a typed application-or-null response;
- customer-session security remains mandatory;
- request-body fields and limits remain unchanged;
- 401/409/422 error semantics are declared where runtime/global exception handling can produce them;
- generated TypeScript is regenerated/reconciled byte-for-byte from OpenAPI.

## Wholesale application view

The typed view is limited to fields already returned by runtime:

- application/customer IDs;
- business name;
- manager name;
- business type;
- province/city IDs;
- optional business identifier and note;
- authoritative status;
- submitted/review-started/reviewed timestamps;
- optional decision note and rejection reason.

No internal version, staff identifier, audit payload or admin action is exposed.

## B2B identity/pricing authority

No additional runtime mutation is needed for pricing identity:

- `CustomerProfileResponse.customer_type` already exposes `retail | wholesale`.
- `AuthSessionActor` currently does not expose customer type and remains unchanged.
- Cart Quote resolves customer type server-side from the cart owner.
- Pricing receives authoritative `quantity + customerType`.
- `CheckoutQuoteResponse.customer_type` snapshots the resolved type.
- Pricing/Cart/Checkout code remains unchanged.

Stage 65-C+ must consume these boundaries instead of local flags.


## Recovered Step56/57 provenance repair

Canonical CI and Phase A correctly failed closed after the intentional Wholesale OpenAPI/controller contract repair because historical Step56/57 recovered-source evidence pins mutable source SHA256 values.

Stage 65-B follows the already-canonical Step 60/61/62/63/64 repair pattern:

- refresh only the changed recovered-source SHA256 values for `contracts/http/openapi.yaml` and `src/modules/customer/presentation/customer.controller.ts`;
- propagate source hashes through Step56 A–G contracts and their generated manifest `sourceSha256` links;
- regenerate the Step56-H final-audit provenance hashes and audit manifest;
- refresh only Step57 high-fidelity source-linked SHA256 values;
- preserve every design screen, journey, operation, permission disposition, review status, visual artifact, historical verdict and runtime-release claim.

No Product Design semantics changed. The repair is provenance/hash-only and exists solely to keep deterministic historical evidence aligned with the intentionally changed canonical contract sources.

## Explicit non-scope

- CustomerWholesaleService/domain/repository.
- Database/migrations.
- Pricing rules or wholesale discount threshold.
- Cart/Checkout/Order logic.
- Admin review/approve/reject behavior.
- Storefront implementation.
- Product Design sources.
- Current State / Master Roadmap.
- Dependencies.
- Graph/Graphify.
- Wallet.

## Human Gate

Stage 65-B is HIGH risk because it changes public HTTP/OpenAPI contract authority consumed by later Wholesale Storefront work.

Technical implementation, exact-head CI, Phase A, CodeQL/Security, deterministic Review and exact-artifact ACTIVE Lock proceed autonomously.

Protected merge requires explicit Project Owner approval bound to the frozen exact head/artifact.

Until that gate is complete:

`STEP_65_B = IN_PROGRESS / NOT_CANONICAL`

`STEP_65_C = BLOCKED_FROM_MUTATION`
