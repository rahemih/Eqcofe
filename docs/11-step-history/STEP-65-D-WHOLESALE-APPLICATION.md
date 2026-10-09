# EQCOFE — Step 65-D Wholesale Application & Status Experience

## Status

`STEP_65_C = CANONICAL_COMPLETE`

`STEP_65_D = IN_PROGRESS / HIGH_RISK`

Canonical baseline: `a8905e495f43c7afc9a39a6de0eca38d484b1cbf`

Task: `EQCOFE-STEP65-D-WHOLESALE-APPLICATION-001`

Linear: `HOS-69`

Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Goal

Stage 65-D productionizes only the customer-owned Wholesale application and application-status routes:

- `/account/wholesale/apply` — SF-E-08
- `/account/wholesale` — SF-E-09

The public `/wholesale` introduction remains the canonical 65-C implementation. Approved wholesale Product/Cart UX remains reserved for 65-E.

## Authority

The Storefront does not own Wholesale state transitions.

- `CustomerProfileResponse.customer_type` remains the authoritative retail/wholesale identity.
- `GET /customer/wholesale/application` remains the authoritative latest customer application.
- `POST /customer/wholesale/applications` remains the only customer submit command.
- `submitted | under_review | approved | rejected` are backend-owned application states.
- review/start-review/approve/reject remain staff-only and are not exposed by Storefront.
- a submitted/under_review application blocks a duplicate form;
- rejected is terminal and a retail customer may submit a later request;
- an approved application does not make the browser wholesale unless Customer Profile also reports `customer_type=wholesale`.

## Application mutation safety

The mutation boundary:

1. uses the existing server-only customer session bridge;
2. validates current profile + latest application before mutation;
3. validates required field bounds and canonical Iran province/city pair;
4. creates the Idempotency-Key on the server from the customer session identity and canonicalized request body;
5. requires the typed 201 response for a successful submit;
6. redirects only after authoritative success;
7. on 409, rereads current profile/application and recovers to status only if the server now proves an existing active/approved application or wholesale identity;
8. never auto-retries mutation or assumes success when outcome is unknown.

## UX

The application form is Persian-first RTL, responsive and accessible:

- bounded text fields matching backend limits;
- province/city data from the canonical 1404 internal reference;
- semantic labels and safe server error messages;
- visible focus and minimum 44px targets;
- rejected application recovery to a fresh form;
- active application recovery to status;
- no guaranteed approval/discount language;
- no hardcoded wholesale quantity threshold;
- no browser auth/token/session storage.

The status page presents only server-owned facts and explicitly separates application status from authoritative customer type.

## Explicit non-scope

- Admin/staff review, start-review, approve or reject.
- Pricing rules or discount calculation.
- Product/Cart/Checkout wholesale visual integration — 65-E/F.
- Backend/OpenAPI/database/dependency changes.
- Product Design or Current State/Master Roadmap mutation.
- Graph/Graphify.
- Wallet.

## Exit gate

65-D is HIGH risk and is not canonical until:

1. exact-head Canonical CI PASS;
2. exact-head Phase A PASS;
3. Storefront Quality PASS;
4. applicable CodeQL/Security PASS;
5. deterministic Review PASS;
6. exact-artifact ACTIVE Lock;
7. Project Owner Human Gate APPROVED for the exact head/artifact;
8. protected merge;
9. exact-SHA postmerge verification PASS;
10. terminal Lock RELEASED;
11. Linear HOS-69 reconciliation.

Until the exact-artifact Human Gate is explicitly approved:

`STEP_65_D = IN_PROGRESS / NOT_CANONICAL`

`STEP_65_E = BLOCKED_FROM_MUTATION`
