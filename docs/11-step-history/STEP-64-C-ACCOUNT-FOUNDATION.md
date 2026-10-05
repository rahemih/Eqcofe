# EQCOFE — Step 64-C Shared Account Foundation

## Status

`STEP_64_B = CANONICAL_COMPLETE`

`STEP_64_C = IN_PROGRESS`

Canonical baseline: `901542c71138406226474381909649067f8869e8`

## Purpose

Stage 64-C establishes the shared Storefront Account data/session/recovery boundary and productionizes only **SF-E-01 /account**.

It does not implement the detailed Profile, Addresses, Orders, Customer Tools, Returns or Warranty routes owned by later Step-64 stages.

## Implemented foundation

- generated-contract aliases for `GET /auth/session`, `GET /customer/orders` and `GET /customer/notifications`;
- server-only access through the existing `CustomerSessionBridge`;
- no localStorage/sessionStorage/browser cookie authority;
- authenticated session check before personal account data;
- bounded parallel reads for recent Orders and Notifications;
- 401 from any account read fails closed to the unauthenticated state;
- non-auth Orders/Notification failures are isolated as partial failures;
- responsive Account overview navigation and summary cards;
- child routes remain deferred to their owning stages.

## Contract/design authority

Current runtime/OpenAPI/generated contracts remain authoritative. Step-55 SF-E-01 guides user intent and state semantics only.

The historical SF-E-01 design references Wholesale/Loyalty summaries. Wholesale remains Step 65, and Loyalty has no proven customer runtime authority in Step 64-B. Stage 64-C therefore does not fabricate either capability.

## Security boundary

Customer identity is represented only by the sanitized Step-64-B Auth Session response. Internal session IDs, permissions, scopes and cookie values are not exposed in route data.

## Stage boundary

Deferred:
- 64-D: Profile, account security, Addresses;
- 64-E: Orders list/detail/timeline/invoice/actions;
- 64-F: Wishlist, Notifications management and authorized Customer Tools;
- 64-G: Returns and Warranty;
- 64-H: full integrated browser acceptance.

## Exit criteria

64-C becomes canonical only after exact-head providers, Review, exact-artifact Lock, protected merge, exact-SHA postmerge verification and terminal Lock release.
