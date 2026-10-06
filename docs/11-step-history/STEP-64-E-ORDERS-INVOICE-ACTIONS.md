# EQCOFE — Step 64-E Orders, Detail, Timeline, Invoice & Actions

## Status

`STEP_64_D = CANONICAL_COMPLETE`

`STEP_64_E = IN_PROGRESS / HIGH_RISK`

Canonical baseline: `2a0bb00543177a229e6650132e4fa9e99a778f93`

Task: `EQCOFE-STEP64-E-ORDERS-INVOICE-ACTIONS-001`

Linear: `HOS-68`

Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Purpose

Stage 64-E productionizes:

- SF-E-04 — `/account/orders`
- SF-E-05 — `/account/orders/:order-number`

using only customer-owned canonical order contracts and the server-only customer session bridge.

## Runtime/OpenAPI reconciliation

The Stage-E audit found one real contract mismatch in the customer Order timeline path.

Canonical OpenAPI/generated contract requires each `OrderTimelineEntry` to expose:

- `from_status`
- `to_status`
- `reason`
- `created_at`

The runtime currently emits mixed rows shaped as `source/status/reason/created_at` for order, fulfillment and shipment history. Mutating that legacy backend source would invalidate frozen Product Design provenance hashes outside the Stage-E scope. Stage 64-E therefore contains the mismatch at the server-only Storefront adapter: it accepts canonical `to_status` or the observed legacy `status`, validates each row and emits only the canonical `OrderTimelineResponse` shape to the React surface. Backend, OpenAPI, generated types, database and business transitions remain unchanged.

## Orders list authority

`GET /customer/orders` supports only:

- `cursor`
- `limit`

The Storefront therefore uses a fixed bounded page size and next-cursor navigation. Step-55 filter language is not treated as runtime authority; no status/search/sort filter is invented.

Empty, invalid-cursor, unauthenticated and unavailable states are distinct and fail closed.

## Detail / timeline / invoice

Order detail is loaded first from `GET /customer/orders/{order_number}`. A 403/404-equivalent ownership denial is presented generically and does not reveal whether another customer's record exists.

Timeline and invoice are loaded as secondary authoritative projections:

- `GET /customer/orders/{order_number}/timeline`
- `GET /customer/orders/{order_number}/invoice`

A secondary projection failure does not fabricate data and does not invalidate an already-authoritative order detail response. Partial failure is visible.

Invoice presentation renders integer-Toman totals from `OrderInvoiceResponse.order`. There is no canonical PDF/file-download contract, so the Storefront does not manufacture one. Wallet remains absent.

## Authoritative cancellation

The UI offers cancellation only when the authoritative `OrderResponse.allowed_actions` contains `cancel_order`.

Before mutation, the server re-fetches the current owned order and rechecks `allowed_actions`. The mutation then calls:

`POST /customer/orders/{order_number}/cancel`

with:

- required `Idempotency-Key`;
- bounded `reason_code` <= 100;
- optional `note` <= 1000.

401/403/404/409/422 and uncertain outcomes fail closed. Unknown outcomes do not manufacture success.

## Security / privacy

- Credentials remain server-only through `CustomerSessionBridge`.
- No customer-session, payment-token or checkout-token authority is moved to browser storage.
- Customer payment endpoints that require checkout access tokens are not exposed as Account authority.
- Order references use bidi-isolated presentation.
- No raw diagnostic/backend payload is reflected to the customer.
- No other-customer existence/content leak is introduced.

## UX / accessibility

- Persian RTL.
- Integer Toman.
- Stable order references with `bdi`.
- Semantic H1/H2 structure.
- 44px interactive targets.
- Visible focus.
- Responsive reflow through narrow/mobile widths.
- Timeline and invoice remain readable without two-axis page scrolling.
- Brown palette additions remain prohibited.

## Implementation paths

- `apps/storefront/app/features/account/account-contract.ts`
- `apps/storefront/app/features/account/account-orders.server.ts`
- `apps/storefront/app/features/account/AccountOrdersView.tsx`
- `apps/storefront/app/features/account/AccountOrderDetailView.tsx`
- `apps/storefront/app/routes/account-orders.tsx`
- `apps/storefront/app/routes/account-order-detail.tsx`
- `apps/storefront/app/styles/account.css`
- `apps/storefront/scripts/verify-step64-orders-invoice-actions.ts`
- `test/step64-orders-storefront-contract.spec.ts`
- `apps/storefront/package.json`

## Explicitly unchanged

- Backend Orders runtime (including `src/modules/orders/application/order.service.ts`)
- Database/migrations
- OpenAPI
- generated OpenAPI TypeScript
- dependencies/lockfile
- payment implementation
- Returns/Warranty implementation
- Product Design sources
- Current State / Master Roadmap
- Step 64-F+ routes

## Human Gate

64-E is HIGH risk because it displays customer-owned financial/order state and invokes order cancellation.

Technical implementation, exact-head CI, Security, deterministic Review and exact-artifact ACTIVE Lock may proceed autonomously.

Protected merge requires explicit Project Owner HUMAN approval bound to the frozen exact head/artifact after the technical gates are green. Stage 64-F remains blocked until merge, exact-SHA postmerge verification and terminal Lock release complete.
