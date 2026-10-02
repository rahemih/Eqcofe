# Step 62-H — Integrated Browser Acceptance

## Current status

- Repository: `rahemih/Eqcofe`
- Canonical base: `bcf6787ff5eb31c8e5d0b7b870e1a7fbe99712f1`
- Step 62-A through 62-G: `CANONICAL_COMPLETE`
- Step 62-G terminal Lock release comment: `5951902887`
- Stage 62-H: `IN_PROGRESS`
- Linear tracker: `HOS-66`

## Fresh Live Guard

Immediately before Stage 62-H:

- `main = bcf6787ff5eb31c8e5d0b7b870e1a7fbe99712f1`
- open Step-62 PRs = `0`
- competing Step-62 writer = `NONE OBSERVED`
- predecessor PR #298 = `MERGED / CLOSED`
- predecessor protected workflow_dispatch `37003844033` / Run #815 = `SUCCESS`
- predecessor merge job `110827413213` = `SUCCESS`
- predecessor exact-SHA postmerge job `110827524639` = `SUCCESS`
- predecessor Lock `LOCK-EQCOFE-STEP62-G-UX-HARDENING-001-01` = `RELEASED`

## Scope

Stage 62-H accepts the production Compare/Wishlist flow as one integrated storefront experience using a deterministic mock API, production React Router server build and Chromium when the Storefront browser QA toolchain is available.

The acceptance harness verifies:

- Search/Listing renders Compare and Wishlist actions from production components.
- Compare selection begins on ListingProductCard and uses a local same-primary-category guard.
- Mismatched category remains focusable with `aria-disabled` and described reason.
- Products selected in reverse order serialize to the canonical deterministic URL order.
- Compare route calls backend `POST /compare/validate` and then `POST /compare`.
- Compare table renders authoritative price/specification values.
- 320px Compare table remains internally scrollable without root-page horizontal overflow.
- Compare region is keyboard-focusable.
- Removing down to a single product returns to explicit first-use/empty state without unnecessary backend Compare traffic.
- Guest Wishlist membership resolves to explicit unauthenticated state.
- Guest Wishlist mutation returns explicit 401 feedback and never displays false success.
- Authenticated session cookie is server-forwarded to authoritative Wishlist endpoints.
- Add/remove mutations carry non-empty `Idempotency-Key` headers.
- Successful add/remove immediately updates `aria-pressed` and feedback.
- Reload rehydrates membership from `GET /customer/wishlist`, proving backend ownership rather than browser-local truth.
- RTL, 320/1200 responsive behavior and axe WCAG automated scans run inside Chromium.

## Acceptance architecture

The single acceptance script `verify-step62-acceptance.mjs` runs in two modes:

1. **Canonical verify mode** — mock-backed SSR/API acceptance always runs, including Compare request ordering, invalid-query fail-closed behavior, auth boundary, Wishlist add/remove and idempotency transport.
2. **Storefront Quality browser mode** — when `EQCOFE_BROWSER_QA_ROOT` is available, the same script additionally launches Chromium and executes the user-visible integrated flows.

This avoids a browser-only blind spot while keeping Playwright/axe isolated from production dependencies.

## Important boundary

This Stage does **not**:

- modify any production runtime file under `apps/storefront/app/**`;
- modify backend/OpenAPI/database/auth/dependencies/lockfiles/workflows;
- add client-side auth/session storage;
- add Account Wishlist management or Product Alerts;
- alter Compare/Wishlist business authority;
- update Roadmap/Current State before 62-I.

## Definition of Done

- exact predecessor closure and canonical base captured;
- no competing Step-62 writer;
- acceptance harness is wired into both canonical verify and Storefront browser quality;
- deterministic Compare selection/order/backend validation/result/removal flow passes;
- guest and authenticated Wishlist flows pass with server-cookie and idempotency evidence;
- browser flow passes at 320px and 1200px with RTL/reflow/keyboard checks;
- axe reports zero WCAG violations for accepted Step-62 screens under the automated gate;
- no production runtime mutation occurs;
- exact-head Canonical CI / Phase A / Storefront Quality / deterministic review pass;
- exact-artifact ACTIVE Lock recorded;
- protected merge and exact-SHA postmerge verification pass;
- terminal Lock becomes `RELEASED`;
- only then may 62-I final canonical closure begin.

## Current boundary

```text
STEP_62_A_TO_G = CANONICAL_COMPLETE
STEP_62_H = IN_PROGRESS
STEP_62_I = BLOCKED_UNTIL_62_H_CANONICAL_COMPLETE
CLAIMED_STEP62_FINAL_PASS = NO
```
