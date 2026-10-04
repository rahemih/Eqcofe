# EQCOFE — Step 64-A Canonical Handoff, Live Guard & Scope Freeze

## Verdict

Step 64 — Customer Account & After-Sales is authorized to begin at Stage 64-A.

Stage 64-A is documentation/governance-only. Runtime, API/OpenAPI, database, dependency, permission and business-rule mutation remain forbidden until this stage completes its canonical transport.

## Fresh live guard

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Live main SHA before Stage-A write: `e7985b7b3c7bfd81cab293607674d576ca93a82e`
- Step 63: **CLOSED / FINAL CANONICAL PASS (Graph deferred by Owner)**
- Step 63 terminal PR: **#315 merged**
- Post-merge Canonical CI #1351 / run `37208274324`: **SUCCESS**
- Post-merge Phase A #850 / run `37208274314`: **SUCCESS**
- Terminal Step-63 Lock: **RELEASED** in PR #315 comment `5980921349`
- Linear Step 63: `HOS-67 = Done`
- Linear Step 64: `HOS-68 = In Progress`
- Roadmap: **3.59 — Step-63 Final Canonical Closure**
- Roadmap Step 64 state at baseline: **NEXT / NOT_STARTED**
- Competing Step-64 branch before write: **NONE**
- Open PRs observed before write: dependency-only PRs #289, #290, #291; none is a Step-64 writer.

## Owner Graph directive

The authoritative Graph/Graphify environment is local-only and currently unavailable to the Project Owner.

For Step 64:

```text
GRAPH_STATE = DEFERRED_BY_OWNER / LOCAL_ONLY_UNAVAILABLE
GRAPH_PASS_CLAIM = FORBIDDEN
GRAPH_BLOCKING = WAIVED_FOR_NON_GRAPH_EXECUTION_BY_OWNER
```

The deferred Graph work remains a future reconciliation item. No Stage may manufacture graph evidence.

## Frozen Step 64 scope

### IN

Step 64 owns the production Storefront customer-account and after-sales experience for:

1. Account overview and authenticated account navigation.
2. Customer profile read/update and account-security/session actions justified by current contracts.
3. Customer-owned address list/create/update/delete/default management.
4. Customer order list with bounded pagination/filtering supported by the backend.
5. Customer-owned order detail, timeline and invoice presentation.
6. Only customer order actions that authoritative backend state explicitly permits.
7. Account-level Wishlist management reusing Step-62 authoritative membership/mutations.
8. Customer notifications/inbox only where current canonical contract/runtime authority exists or is separately repaired in Stage 64-B.
9. Contract-authorized customer tools such as loyalty, product alerts or review actions only if Stage 64-B proves current canonical API support.
10. Customer return request/list/detail/timeline/cancel flows.
11. Customer warranty request/list/detail/timeline flows.
12. Persian RTL, responsive, accessibility, loading/empty/error/offline and ownership-denied hardening for all Step-64 surfaces.

### OUT / RESERVED

- Wholesale application/status/pricing/B2B ordering → **Step 65**.
- Articles/content/SEO/policies → **Step 66**.
- Admin customer/order/returns/warranty operations → **Steps 67–73**.
- Live SMS/email provider integration → **Step 75**.
- New customer business rules or eligibility logic invented by the frontend.
- Browser-local copies of account/session/order/after-sales authority.
- Wallet; Wallet remains prohibited.

## Storefront discovery

The current Storefront already registers the Step-64 routes, but they remain placeholders:

- `/account` → SF-E-01
- `/account/profile` → SF-E-02
- `/account/addresses` → SF-E-03
- `/account/orders` → SF-E-04
- `/account/orders/:order-number` → SF-E-05
- `/account/tools` → SF-E-06
- `/account/returns/:return-number?` → SF-E-11
- `/account/warranty/:claim-number?` → SF-E-12

All use `RoutePlaceholder` with `targetStep={64}`. Step 64 has therefore not been silently implemented by earlier Storefront stages.

## Canonical backend readiness discovered at Stage A

### Identity / profile / security

- `GET /auth/session`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `GET /customer/profile`
- `PATCH /customer/profile` with idempotency at runtime

### Addresses

- `GET /customer/addresses`
- `POST /customer/addresses`
- `PATCH /customer/addresses/{id}`
- `DELETE /customer/addresses/{id}`
- `POST /customer/addresses/{id}/set-default`

Address ownership/idempotency and canonical geography rules were already hardened during Step 63.

### Wishlist

- `GET /customer/wishlist`
- `POST /customer/wishlist/{product_id}`
- `DELETE /customer/wishlist/{product_id}`

Step 62 already established server-owned membership truth and idempotent mutations; Step 64 owns the account-management surface.

### Orders and invoices

- `GET /customer/orders`
- `GET /customer/orders/{order_number}`
- `GET /customer/orders/{order_number}/timeline`
- `GET /customer/orders/{order_number}/invoice`
- `POST /customer/orders/{order_number}/cancel`

### Returns

- `POST /customer/orders/{order_number}/returns`
- `GET /customer/returns`
- `GET /customer/returns/{return_number}`
- `GET /customer/returns/{return_number}/timeline`
- `POST /customer/returns/{return_number}/cancel`

### Warranty

- `POST /customer/warranty/claims`
- `GET /customer/warranty/claims`
- `GET /customer/warranty/claims/{claim_number}`
- `GET /customer/warranty/claims/{claim_number}/timeline`

### Notifications / customer tools

The repository contains owner-scoped in-app notification infrastructure and historical Step-55 design references for notification/customer-tool surfaces. Stage 64-A does **not** infer missing HTTP authority from design files. Stage 64-B must prove the current OpenAPI/runtime contract for notifications, loyalty, product alerts and reviews before those surfaces can mutate runtime.

## Contract authority rule

For Step 64:

```text
CURRENT RUNTIME + OPENAPI + GENERATED CONTRACT > LEGACY WIREFRAME OPERATION LABEL
```

Step-55 design remains authoritative for screen intent, route ownership, RTL/accessibility/responsive behavior and state vocabulary, but not for inventing endpoints.

## Inherited invariants

- Persian `fa-IR`, RTL.
- Integer Toman only.
- Wallet prohibited.
- Brown brand/UI palette prohibited.
- Customer resources are session-bound and owner-scoped.
- No existence/content leakage for another customer's records.
- Backend remains authority for eligibility, order state, invoice values, return/warranty state and allowed actions.
- Idempotency is mandatory wherever the canonical contract requires it.
- Session/OTP/token/secret material must not enter URLs, logs, analytics or browser storage.
- References such as order/payment/return/warranty numbers require stable bidi presentation.
- Minimum 44×44 CSS px targets, visible focus, semantic errors and 400% reflow remain binding.

## Frozen execution plan

| Stage | Goal | Risk | Human Gate |
| --- | --- | --- | --- |
| 64-A | Canonical handoff, live guard, discovery and Account/After-Sales scope freeze | MEDIUM | No |
| 64-B | Backend/OpenAPI contract readiness for Account, Orders, customer tools, Returns, Warranty and Notifications | HIGH | Yes |
| 64-C | Shared Storefront Account session/data/recovery foundation and Account overview shell | MEDIUM | No |
| 64-D | Profile, account security and customer-owned Address management | HIGH | Yes |
| 64-E | Orders, order detail, timeline, invoice and authoritative customer actions | HIGH | Yes |
| 64-F | Wishlist, notifications and only contract-authorized customer tools | MEDIUM | No |
| 64-G | Returns and Warranty request/detail/timeline/recovery flows | HIGH | Yes |
| 64-H | RTL, accessibility, responsive/state hardening and integrated browser acceptance | MEDIUM | No |
| 64-I | Final canonical verification, documentation reconciliation and Step 65 handoff | MEDIUM | No |

## Stage 64-A exit gate

64-A is not canonical merely because these files exist. Before Stage 64-B may mutate API/runtime:

1. exact-head Canonical CI and required verification PASS;
2. deterministic scope/risk validation PASS;
3. artifact-bound REVIEW evidence PASS;
4. artifact-bound Lock evidence ACTIVE for the exact artifact;
5. protected merge succeeds;
6. exact-SHA postmerge verification succeeds;
7. terminal Lock release is recorded;
8. Linear `HOS-68` reflects the live stage state.

Until then:

```text
STEP_64_A = IN_PROGRESS / NOT_CANONICAL
STEP_64_B = BLOCKED_FROM_MUTATION
```
