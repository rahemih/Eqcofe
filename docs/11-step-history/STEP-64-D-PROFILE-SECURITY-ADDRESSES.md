# EQCOFE — Step 64-D Profile, Account Security & Addresses

## Status

`STEP_64_C = CANONICAL_COMPLETE`

`STEP_64_D = IN_PROGRESS / HIGH_RISK`

Canonical baseline: `8cbc8fa1c0598f9a3ab819f2468563349fe8b6be`

Task: `EQCOFE-STEP64-D-PROFILE-SECURITY-ADDRESSES-001`

Linear: `HOS-68`

Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Purpose

Stage 64-D productionizes the customer-owned Storefront surfaces:

- SF-E-02 — `/account/profile`
- SF-E-03 — `/account/addresses`

The implementation consumes only canonical runtime/OpenAPI/generated-contract authority. It does not add backend rules, database state, dependencies, Product Design mutations or Step 64-E+ behavior.

## Contract authority and bounded scope

### Profile

Canonical runtime permits customer-owned:

- `GET /customer/profile`
- `PATCH /customer/profile`

Writable profile fields are limited by the backend to:

- `first_name`
- `last_name`
- `email`

The customer mobile number is read-only in this Stage. Customer type, status, IDs and other server-owned identity state are not editable.

The current runtime does **not** require Step-Up for `PATCH /customer/profile`. Historical design language about profile/contact Step-Up therefore does not authorize the Storefront to invent an OTP or step-up boundary.

### Account security

Only current canonical customer-session operations are exposed:

- `POST /auth/logout`
- `POST /auth/logout-all`

No session ID, session token, permission set or internal scope is rendered or stored in browser state.

### Addresses

Canonical customer-owned operations are:

- `GET /customer/addresses`
- `POST /customer/addresses`
- `PATCH /customer/addresses/{id}`
- `DELETE /customer/addresses/{id}`
- `POST /customer/addresses/{id}/set-default`

All mutations use idempotency keys. ID-targeted mutations first reconcile the target against the authoritative customer-owned list and still rely on backend ownership enforcement.

Province/city choices are sourced from the canonical Iran 1404 reference. Create and update requests revalidate every province-city pair server-side with `isIranProvinceCityPair1404` before mutation.

## Security model

- Customer cookies are transported only through `CustomerSessionBridge`.
- Cookie, Authorization and proxy-authorization boundaries remain sanitized by the existing session bridge.
- Idempotency material is SHA-256 derived server-side and raw session cookie material is never exposed.
- 401 fails closed to an unauthenticated state.
- 403/404 returns a generic account-scoped denial without disclosing another customer's record.
- 409 produces explicit stale/conflict recovery rather than overwrite success.
- unknown/5xx outcomes do not manufacture successful mutations.
- mobile and postal data are masked in address-card presentation.
- destructive logout-all and address-delete controls require a second disclosure/confirmation step in the UI.
- no `localStorage` or `sessionStorage` authority is introduced.

## UX / accessibility

The Stage follows the frozen SF-E-02/SF-E-03 intent:

- Persian RTL;
- one task-oriented H1 per route;
- semantic labels and live status/error feedback;
- minimum 44px interactive targets;
- visible focus;
- single-column reflow on narrow viewports;
- no brown palette addition;
- first-use address state;
- authoritative default-address presentation;
- bounded profile/session security help;
- no Wallet surface.

## Implementation paths

- `apps/storefront/app/features/account/account-contract.ts`
- `apps/storefront/app/features/account/account-settings.server.ts`
- `apps/storefront/app/features/account/AccountProfileView.tsx`
- `apps/storefront/app/features/account/AccountAddressesView.tsx`
- `apps/storefront/app/routes/account-profile.tsx`
- `apps/storefront/app/routes/account-addresses.tsx`
- `apps/storefront/app/styles/account.css`
- `apps/storefront/scripts/verify-step64-profile-security-addresses.ts`
- `apps/storefront/package.json`

## Explicitly unchanged

- Backend/runtime modules
- canonical OpenAPI
- generated backend TypeScript
- database/migrations
- dependencies/lockfile
- Product Design source
- Current State / Master Roadmap
- Orders, customer tools, Returns and Warranty production routes

## Verification and Human Gate

Stage 64-D is HIGH risk. Technical implementation, CI, Storefront Quality, Security review, deterministic Review and exact-artifact Lock may proceed autonomously.

Final protected merge requires explicit Project Owner HUMAN approval bound to the frozen exact head and artifact. Stage 64-E remains blocked until 64-D is merged, exact-SHA postmerge verification passes and the terminal Lock is released.
