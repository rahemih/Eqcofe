# EQCOFE Storefront Foundation

Stage 58-B bootstraps only the storefront build workspace.

## Boundaries

- React Router Framework Mode on Vite.
- Server-side rendering is enabled by default.
- Business rules, authorization, pricing, payment results and inventory truth remain backend-authoritative.
- Stage B contains no customer feature implementation.
- Environment values are server-only by default.
- Any future `VITE_*` variable is public browser input by definition and must never contain secrets, credentials, tokens, private keys or authoritative business configuration.
- API transport configuration is intentionally deferred to Stage 58-D.

## Stage 58-C shell

- Root document is Persian-first: `lang="fa-IR"`, `dir="rtl"`.
- Shell includes skip-link, banner/header, directly reachable search/cart/account, accessible compact navigation disclosure, contextual breadcrumb, one main landmark and footer.
- Canonical Step 54 tokens are copied into `app/styles/tokens.css` and `shell:verify` fails on any drift against the generated design-system source.
- CSS uses logical properties, 44px target baseline, visible focus, inherited 320/360/600/840/1200/1440 verification widths and reduced-motion handling.
- All actual Step 55 route intents are registered only as placeholders. No API, Auth, pricing, inventory, payment result, cart logic or customer feature authority exists in Stage 58-C.
- Stage 58-D owns API/data foundations; Stage 58-E owns Auth/session; Steps 59–66 replace the placeholders with feature implementations.

## Stage 58-D API and server-data foundation

- The canonical API type authority remains `src/generated/openapi.ts`, generated from `contracts/http/openapi.yaml`; the storefront does not copy or redefine request/response DTOs.
- Server API configuration is read only from `app/platform/config/api.server.ts`, preserving the repository config boundary.
- `EQCOFE_API_BASE_URL` is required at server runtime. No localhost, production host, credential, token, or vendor endpoint is hard-coded.
- Requests are JSON-first, typed by OpenAPI path/method, encode path/query inputs, return structured status/request-id metadata, and normalize canonical error envelopes without storing raw response bodies.
- Server-data caching is fail-closed at `no-store` in this foundation. Feature-specific cache semantics must be explicitly introduced later rather than inferred here.
- Automatic retry is limited to GET/HEAD, at most two attempts, and only network/timeout failures or HTTP 502/503/504. Mutations are never retried automatically, even when a future endpoint supports idempotency keys.
- Stage 58-D does not inject credentials, session state, or authorization headers. Stage 58-E owns that security boundary.
- No storefront route consumes live business data yet; Steps 59–66 may adopt this foundation after Step 58 closes.

## Stage 58-E auth/session security boundary

- Customer authentication authority remains the backend. The OpenAPI `customerSession` scheme is an HttpOnly cookie named `eqcofe_session`; secure deployments may use the backend's `__Host-eqcofe_session` variant.
- Storefront browser code never reads or stores the session token. There is no localStorage/sessionStorage/document.cookie auth state and no invented Bearer/JWT customer flow.
- Server-side session transport forwards only the customer session cookie; unrelated cookies and admin session cookies are not proxied to customer API requests.
- Backend `Set-Cookie` is never exposed through general API response metadata. A dedicated server-only bridge validates customer-session cookie name, HttpOnly, Path=/, SameSite=Lax, host-only policy, and Secure for `__Host-` before any future relay.
- `/auth/session` is the backend-authoritative session probe. The frontend represents only authenticated, unauthenticated, expired, forbidden and recovery states; it does not derive permissions or authorize business actions.
- Stage 58-E does not implement login/account UI, route feature loaders, admin auth, CSRF schemes not present in contract, or Step 59 features.

