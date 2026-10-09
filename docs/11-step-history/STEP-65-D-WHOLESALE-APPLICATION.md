# EQCOFE — Step 65-D Wholesale Application & Status

## Status

`STEP_65_A = CANONICAL_COMPLETE`

`STEP_65_B = CANONICAL_COMPLETE`

`STEP_65_C = CANONICAL_COMPLETE`

`STEP_65_D = IN_PROGRESS / HIGH_RISK`

Canonical baseline: `a8905e495f43c7afc9a39a6de0eca38d484b1cbf`

Task: `EQCOFE-STEP65-D-WHOLESALE-APPLICATION-001`

Linear: `HOS-69`

Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Goal

Stage 65-D productionizes the customer-owned Wholesale application and status routes:

- `/account/wholesale/apply` — SF-E-08
- `/account/wholesale` — SF-E-09

The stage consumes the typed contract established in 65-B and the server/session foundation from 65-C. It does not add or alter Backend business transitions.

## Authority

- `GET /auth/session` proves authenticated customer context.
- `GET /customer/profile` provides authoritative `customer_type: retail | wholesale`.
- `GET /customer/wholesale/application` provides the latest customer-owned application or `null`.
- `POST /customer/wholesale/applications` is the only customer submit mutation and returns HTTP 201 on successful creation.
- application statuses are server-owned: `submitted`, `under_review`, `approved`, `rejected`.
- staff/admin review, approval and rejection remain outside Storefront authority.
- an application status, including `approved`, never substitutes for the authoritative customer type returned by the profile contract.

## Application eligibility

The Storefront does not invent eligibility rules.

Before displaying or submitting a form it re-reads authoritative customer type and latest application.

A form is available only when:

1. customer type is `retail`; and
2. no application exists, or the latest application is `rejected`.

A wholesale customer or an account with an existing non-rejected application is handed to the status route instead of receiving a second submit path.

## Request validation

Current generated contract limits are preserved:

- `business_name`: required, max 250;
- `manager_name`: required, max 200;
- `business_type`: required free text, max 100;
- `province_id`: required canonical EntityId;
- `city_id`: required canonical EntityId;
- `business_identifier`: optional, max 100;
- `note`: optional, max 4000.

Province/city pairs are verified against the existing Iran geography 1404 reference. No business-type enum, document upload, minimum quantity or pricing requirement is invented.

## Idempotency and mutation recovery

Every submit uses a server-derived SHA-256 `Idempotency-Key` based on mutation purpose, authenticated customer session material and normalized request body.

The raw session cookie is used only inside the server-side hash and is never rendered, returned, placed in URLs or stored in browser storage.

Outcomes:

- 201 → redirect to `/account/wholesale`;
- 401 → fail closed as expired/unauthenticated;
- 409 → re-read profile + latest application; if an authoritative existing application or wholesale customer now exists, recover to status; otherwise remain a visible conflict;
- 422 → safe validation failure;
- network/timeout/unknown → no success is manufactured; user is told to re-read status.

There is no automatic mutation retry.

## Status UX

SF-E-09 displays only server-owned application data and bounded presentation:

- status label and explanation;
- application/business fields returned by the customer contract;
- submitted/review timestamps when available;
- decision note/rejection reason only when returned by the server;
- stable bidi isolation for identifiers.

If application status is `approved` while profile `customer_type` is still `retail`, the Storefront explicitly remains retail and does not promote itself. Only a profile response of `wholesale` enables the authoritative wholesale-account presentation.

Rejected retail applications expose a re-application CTA. Pending applications expose no duplicate submit path. No admin decision control exists.

## Explicit non-scope

- backend/OpenAPI/database mutation;
- staff/admin review, approve or reject;
- pricing/discount/quantity rule calculation;
- Product/Cart/Checkout wholesale integration → 65-E/65-F;
- Product Design source mutation;
- dependencies or lockfiles;
- Current State/Master Roadmap mutation;
- Graph/Graphify;
- Wallet.

## Exit gate

65-D is HIGH risk. It may close only after:

1. exact-head Canonical CI PASS;
2. exact-head Phase A PASS;
3. exact-head Storefront Quality PASS;
4. CodeQL/Security PASS;
5. deterministic Review PASS;
6. exact-artifact ACTIVE Lock;
7. exact-artifact Project Owner Human approval;
8. protected merge;
9. exact-SHA postmerge verification PASS;
10. terminal Lock RELEASED;
11. Linear reconciliation.

Until exact-artifact Owner approval is received, protected merge is forbidden.
