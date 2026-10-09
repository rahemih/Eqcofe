# EQCOFE — Step 65-C Wholesale Storefront Foundation

## Status

`STEP_65_A = CANONICAL_COMPLETE`

`STEP_65_B = CANONICAL_COMPLETE`

`STEP_65_C = IN_PROGRESS / MEDIUM_RISK`

Canonical baseline: `91406a9c2ef70662c326d1d82b6c1273d6a4708f`

Task: `EQCOFE-STEP65-C-WHOLESALE-FOUNDATION-001`

Linear: `HOS-69`

Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Goal

Stage 65-C establishes the shared typed Wholesale Storefront read/session/recovery foundation and replaces only the public `/wholesale` placeholder with production Persian RTL content.

Application submission and application-status production routes remain reserved for Stage 65-D.

## Authority

The Storefront consumes current generated OpenAPI types only:

- `GET /auth/session` proves authenticated customer identity.
- `GET /customer/profile` is the authoritative presentation source for `customer_type: retail | wholesale`.
- `GET /customer/wholesale/application` is the authoritative customer-owned latest application source and may return `null`.
- application status never promotes the browser to wholesale; backend customer type remains authoritative.
- wholesale price, savings and quantity rules are not calculated in this stage.

## Session/data behavior

The Wholesale loader reuses the existing server-only customer session bridge.

- unauthenticated session → guest public introduction;
- authenticated session → profile and latest application fetched in parallel;
- 401 from customer-owned reads → guest recovery;
- transport/configuration/server failure → explicit unavailable state;
- rotated Set-Cookie values are propagated through the existing sanitizer;
- no customer session token/cookie is exposed to browser JavaScript, URL, analytics or local/session storage.

## Public Wholesale introduction

`/wholesale` now provides:

- honest description of the wholesale application process;
- no guaranteed approval or discount promise;
- no hardcoded wholesale quantity threshold;
- explicit statement that prices are authoritative server results;
- reuse of the existing Cart/Checkout/Order path rather than a parallel B2B engine;
- state-aware CTA:
  - guest → application path;
  - authenticated retail with no application → application path;
  - existing non-rejected application → status path;
  - rejected application → re-application path plus previous status;
  - authoritative wholesale customer type → product discovery, with optional status link.

## Explicit non-scope

- application form/mutation implementation;
- application-status production page;
- idempotency mutation UX;
- admin review/approve/reject;
- wholesale pricing/discount/quantity calculations;
- Product/Cart/Checkout wholesale visual integration;
- backend/OpenAPI/database/dependency changes;
- Product Design source changes;
- Current State/Master Roadmap changes;
- Graph/Graphify;
- Wallet.

## Exit gate

65-C closes only after:

1. exact-head Canonical CI PASS;
2. exact-head Phase A PASS;
3. deterministic Review PASS;
4. exact-artifact ACTIVE Lock;
5. protected merge;
6. exact-SHA postmerge verification PASS;
7. terminal Lock RELEASED;
8. Linear HOS-69 reconciliation.

No Project Owner Human Gate is required because this stage is MEDIUM risk.
