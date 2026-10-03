# EQCOFE — Step 63-A Canonical Handoff, Live Guard & Scope Freeze

## Verdict

Step 63 — Cart & Checkout Frontend is authorized to begin at Stage 63-A only.

Stage 63-A is documentation/governance-only. Runtime/API/database/dependency mutation remains forbidden until this stage completes protected merge, exact-SHA postmerge verification and terminal Lock release.

## Fresh live guard

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Live main SHA before Stage-A write: `4215ff81d08455aa0e2e167ecd13dd82eda7ac4a`
- Open PRs before write: **0**
- Step 62: **CLOSED / FINAL CANONICAL PASS**
- Step 62 final audit PR: **#303 merged**
- Linear Step 62: `HOS-66 = Done`
- Linear Step 63: `HOS-67 = Backlog` at discovery start
- Roadmap: **3.58 — Step-62 Final Audit**
- Roadmap Step 63 state: **NEXT / NOT_STARTED**

No competing writer or open PR was observed during connector-visible preflight.

## Frozen Step 63 scope

### IN

Step 63 owns the Storefront implementation for:

1. Cart display and line quantity/remove behavior.
2. Guest and authenticated customer cart access/merge recovery.
3. Authoritative checkout quote presentation.
4. Identity/session handoff needed to continue checkout.
5. Customer-owned address selection/creation/editing needed by checkout.
6. Shipping/pickup method selection from authoritative backend data.
7. Reservation and final review.
8. Idempotent order submission.
9. Payment initiation handoff.
10. Payment return verification/status recovery.
11. Order outcome and retry-safe error/recovery flows.
12. Persian RTL, responsive and accessibility hardening for these surfaces.

### OUT / RESERVED

- Account-wide profile/order/returns/warranty management → **Step 64**.
- Wholesale application/status experience → **Step 65**.
- Content/SEO/policy frontend → **Step 66**.
- Admin checkout/order/payment operations → **Steps 67+**.
- Live payment-provider production integration → **Step 74**.
- New business rules, backend authority or database semantics not justified by a separate governed contract are out of scope.

## Storefront discovery

The route map already contains the entire Step-63 journey:

- `/cart`
- `/checkout/identity`
- `/checkout/address`
- `/checkout/delivery`
- `/checkout/review`
- `/payment/return`
- `/order/:orderNumber/outcome`

All seven currently render `RoutePlaceholder` and explicitly target Step 63. Therefore Step 63 has not been silently implemented by earlier steps.

## Canonical backend/OpenAPI readiness

Current canonical OpenAPI already exposes the required backbone:

### Cart

- `POST /cart`
- `GET /cart/{id}`
- `POST /cart/{id}/items`
- `PATCH /cart/{id}/items/{itemId}`
- `DELETE /cart/{id}/items/{itemId}`
- `POST /cart/{id}/quote`
- `GET /customer/cart`
- `POST /customer/cart/access`
- `POST /customer/cart/merge`

### Checkout

- `POST /checkout/{id}/reserve`
- `POST /checkout/{id}/order`

Quote/reserve/order use backend-controlled access-token boundaries and the applicable mutation endpoints require idempotency.

### Address and delivery

- customer-owned address read/create/update/delete/default operations
- `GET /shipping-methods`

### Payment and outcome

- `POST /orders/{order_number}/payments` — required `Idempotency-Key`
- `POST /payments/{payment_id}/verify`
- `GET /orders/{order_number}/payments/{payment_id}`
- `GET /payments/{payment_id}/status`

Provider return is not authoritative payment truth; status/verify remains authoritative.

## Design-to-contract drift note

The Step-55 checkout/payment wireframe is still useful for screen IDs, journey intent, RTL/accessibility and recovery semantics. Some historical operation labels use customer-prefixed payment route names that no longer match current canonical OpenAPI paths.

For Step 63:

```text
CURRENT OPENAPI / GENERATED CONTRACT > LEGACY WIREFRAME ENDPOINT LABEL
```

No runtime implementation may copy stale endpoint strings from the wireframe when generated/OpenAPI contracts differ.

## Inherited invariants

- Persian `fa-IR`, RTL.
- Integer Toman only.
- Wallet remains prohibited.
- Brown brand palette remains prohibited.
- Backend remains authority for price, stock, discount, shipping cost, totals, ownership and payment/order state.
- No browser-local auth/payment/order authority.
- Required idempotency must be transported and retry-safe.
- Sensitive tokens/OTP/payment material must not leak to URL, logs, analytics or user-visible diagnostics.
- Minimum target size/accessibility/focus/error-summary and responsive requirements remain binding.
- External/provider ambiguity fails closed; UI must not manufacture success.

## Graphify boundary

Graphify operational tooling is canonical, but the live graph artifact is local and ignored by Git. GitHub connector discovery cannot prove a current local graph snapshot.

Therefore, before Stage 63-B or any later runtime mutation, the executing environment must record:

```text
GRAPH_HEALTH = FRESH / PASS
QUERY_EVIDENCE = PRESENT
PATH_EVIDENCE = PRESENT when mutation crosses module boundaries
EXPLAIN_EVIDENCE = PRESENT for non-trivial dependency decisions
```

## Frozen execution plan

| Stage | Goal | Risk | Human Gate |
| --- | --- | --- | --- |
| 63-A | Canonical handoff, live guard, discovery and scope freeze | MEDIUM | No |
| 63-B | Backend/OpenAPI Cart/Checkout/Address/Shipping/Payment contract readiness | HIGH | Yes |
| 63-C | Shared Storefront Cart/Checkout data, token and authoritative state foundation | MEDIUM | No |
| 63-D | Production Cart flow, quantity mutation, quote refresh and cart recovery | MEDIUM | No |
| 63-E | Checkout identity and customer-owned address flow | HIGH | Yes |
| 63-F | Delivery, quote, reservation, review and idempotent order submission | HIGH | Yes |
| 63-G | Payment handoff, verification/status recovery and order outcome | HIGH | Yes |
| 63-H | RTL/a11y/responsive/state hardening and integrated browser acceptance | MEDIUM | No |
| 63-I | Final canonical verification, docs reconciliation and Step 64 handoff | MEDIUM | No |

## Stage 63-A exit gate

63-A is not canonical merely because these files exist. Before Stage 63-B runtime/API mutation:

1. exact-head CI/required verification PASS;
2. deterministic scope/risk validation PASS;
3. artifact-bound REVIEW evidence PASS;
4. artifact-bound Lock evidence ACTIVE for the exact artifact;
5. protected Merge Policy transport succeeds;
6. exact-SHA postmerge verification succeeds;
7. terminal Lock release is recorded;
8. Linear HOS-67 reflects the live stage state.

Until then:

```text
STEP_63_A = IN_PROGRESS / NOT_CANONICAL
STEP_63_B = BLOCKED_FROM_MUTATION
```
