# EQCOFE — Step 64-F Wishlist, Notifications & Contract-Authorized Customer Tools

## Status

`STEP_64_E = CANONICAL_COMPLETE`

`STEP_64_F = IN_PROGRESS / MEDIUM_RISK`

Canonical baseline: `8a2aef6c643b59822d9c65783464044e7737a514`

Task: `EQCOFE-STEP64-F-WISHLIST-NOTIFICATIONS-TOOLS-001`

Linear: `HOS-68`

Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Purpose

Stage 64-F productionizes SF-E-06 at:

`/account/tools`

The production surface is deliberately narrower than the historical low-fidelity design operation list. Current runtime authority wins over legacy operation labels.

## Runtime authority

### Wishlist — ACTIVE

Canonical runtime and generated contracts support:

- `GET /customer/wishlist`
- `POST /customer/wishlist/{product_id}`
- `DELETE /customer/wishlist/{product_id}`

Step 62 already established customer-owned Wishlist truth and safe add/remove behavior. Stage 64-F reuses that authority for account management.

The Account tools surface lists customer Wishlist memberships and supports removal. Product discovery/addition remains on existing Product/Listing surfaces rather than inventing an account-side product lookup contract.

### Customer in-app notifications — ACTIVE

Stage 64-B added the bounded customer-only HTTP bridge over the existing owner-scoped notification service:

- `GET /customer/notifications`
- `PATCH /customer/notifications/{id}/read`
- `POST /customer/notifications/{id}/acknowledge`

The Account tools surface supports:

- bounded list loading;
- unread-only filtering;
- offset navigation;
- idempotent mark-read;
- idempotent acknowledge.

Only typed title/body/state/timestamps are rendered. The untyped notification `payload` object is never rendered or treated as link/action authority.

### Product Alerts / Loyalty / Reviews — NO_ACTION

Stage 64-B explicitly proved that legacy OpenAPI declarations for Product Alerts, Loyalty and Reviews do not have matching customer-facing runtime controllers.

Therefore Step 64-F:

- does not call Product Alert endpoints;
- does not call Loyalty endpoints;
- does not call customer Review mutation endpoints;
- does not create substitute Storefront state;
- does not infer runtime support from Step-55 design artifacts.

The UI communicates that these historical capabilities are not currently active instead of presenting false functionality.

## Security and ownership

- Customer session transport remains server-only through `CustomerSessionBridge`.
- No credentials, tokens or session authority enter browser storage or URLs.
- Wishlist removal re-reads the customer-owned Wishlist before mutation.
- Notification mutations rely on the owner-scoped customer notification service and use validated UUID identifiers.
- Every Stage-F mutation uses a server-derived `Idempotency-Key`.
- 401 fails closed to unauthenticated presentation.
- 403/404 mutation outcomes use generic account-scoped messaging and do not disclose another customer's record.
- Unknown outcomes never manufacture successful state.
- Raw notification payload objects are not reflected to the browser UI.

## Independent recovery

Wishlist and notification reads execute as independent authoritative resources.

If one resource is temporarily unavailable:

- the other resource remains usable;
- the failed section exposes bounded retry;
- no stale browser copy is used as fallback.

If either resource reports 401, the whole personal surface fails closed.

## UX / accessibility

The production SF-E-06 route provides:

- Persian RTL;
- semantic H1/H2 hierarchy;
- account-tool anchor navigation;
- Wishlist empty/unavailable states;
- notification empty/partial/filter/pagination states;
- semantic status and error announcements;
- 44px interactive targets;
- visible focus;
- bidi isolation for machine identifiers;
- responsive one-column reflow at narrow widths and 400% zoom;
- no brown palette additions.

## Implementation paths

- `apps/storefront/app/features/account/account-contract.ts`
- `apps/storefront/app/features/account/account-tools.server.ts`
- `apps/storefront/app/features/account/AccountToolsView.tsx`
- `apps/storefront/app/routes/account-tools.tsx`
- `apps/storefront/app/styles/account.css`
- `apps/storefront/scripts/verify-step64-wishlist-notifications-tools.ts`
- `test/step64-customer-tools-storefront-contract.spec.ts`
- `apps/storefront/package.json`

## Explicitly unchanged

- Backend/runtime
- canonical OpenAPI
- generated OpenAPI TypeScript
- database/migrations
- dependencies/lockfile
- Product Design sources
- Current State / Master Roadmap
- Returns/Warranty production routes
- Step 64-G+ implementation

## Canonical gate

Stage 64-F is MEDIUM risk and does **not** require a Project Owner Human Gate.

Canonical closure still requires:

1. exact-head Canonical CI PASS;
2. exact-head Phase A PASS;
3. Storefront Quality PASS;
4. deterministic Review PASS;
5. exact-artifact ACTIVE Lock;
6. protected PR merge;
7. exact merge-SHA verification;
8. terminal Lock RELEASED;
9. Linear synchronization.

Until those complete:

`STEP_64_F = IN_PROGRESS / NOT_CANONICAL`

`STEP_64_G = BLOCKED_FROM_MUTATION`
