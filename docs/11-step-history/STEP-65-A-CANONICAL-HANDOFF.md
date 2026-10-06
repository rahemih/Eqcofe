# EQCOFE — Step 65-A Canonical Handoff, Live Guard & Wholesale Scope Freeze

## Verdict

Step 65 — Wholesale Experience is authorized to begin at Stage 65-A.

Stage 65-A is documentation/governance-only. Runtime, API/OpenAPI, database, dependency, pricing-rule and business-rule mutation remain forbidden until this stage itself completes canonical transport.

## Fresh live guard

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Live main SHA before Stage-A write: `9bf08d39ea2d45e3dfa4edfc197ac921bf1a8c36`
- Step 64: **CLOSED / FINAL CANONICAL PASS**
- Step 64 terminal PR: **#329 merged**
- Step 64 terminal Lock: **RELEASED** in PR #329 comment `6024963150`
- Post-merge Canonical CI: `37527227711 / 112487185169` — **SUCCESS**
- Post-merge Phase A: `37527227793 / 112487185347` — **SUCCESS**
- Post-merge CodeQL: `37527227650` — **SUCCESS**
- Linear Step 64: `HOS-68 = Done`
- Linear Step 65: `HOS-69 = In Progress`
- Roadmap Step 65 at baseline: **NEXT / NOT_STARTED**
- Competing Step-65 branch/PR before write: **NONE OBSERVED**
- Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Product scope frozen for Step 65

### IN

Step 65 owns the production Storefront Wholesale Experience for:

1. Public wholesale introduction at `/wholesale`.
2. Customer-owned wholesale application at `/account/wholesale/apply`.
3. Customer-owned application status at `/account/wholesale`.
4. Approved-wholesale commerce context represented by SF-E-10 inside existing Product/Cart/Checkout flows.
5. Only the wholesale customer type proven by current backend authority.
6. Authoritative wholesale price/discount/quantity presentation only where current server pricing or Cart Quote proves it.
7. Reuse of existing Cart, Checkout, Reservation and Order flows rather than a parallel B2B order engine.
8. Persian RTL, responsive, accessibility, loading/empty/error/conflict/recovery states for wholesale surfaces.
9. Idempotent application submission and safe handoff to an existing active application.
10. Integrated browser acceptance and final canonical closure.

### OUT / RESERVED

- Admin/staff wholesale review, start-review, approve or reject operations.
- Customer self-approval or frontend promotion to wholesale.
- New wholesale pricing rules or discount percentages invented in the Storefront.
- A hardcoded quantity threshold in the frontend.
- A separate wholesale Cart, Checkout, Reservation or Order authority.
- Content/SEO/policy frontend → **Step 66**.
- Admin wholesale/customer management frontend → later Admin steps, especially **Step 72**.
- Payment/shipping/provider production integrations → **Steps 74–78**.
- Graph/Graphify; it remains retired.
- Wallet; Wallet remains prohibited.

## Storefront discovery

The three dedicated Step-65 routes are still placeholders on canonical main:

- `/wholesale` → SF-E-07 — Wholesale introduction.
- `/account/wholesale/apply` → SF-E-08 — Wholesale application.
- `/account/wholesale` → SF-E-09 — Wholesale application status.

SF-E-10 is not a standalone route. It is the approved-wholesale commerce context that must integrate with existing Product/Cart/Checkout authority.

No Step-65 production surface has been silently implemented by earlier Storefront steps.

## Canonical runtime authority discovered at Stage A

### Wholesale application

Current runtime exposes:

- `POST /customer/wholesale/applications`
  - customer-only;
  - idempotency required at runtime;
  - input includes business name, manager, business type, province/city and optional identifier/note.
- `GET /customer/wholesale/application`
  - customer-only;
  - returns the latest application for the authenticated customer or no application.

The backend enforces:

- customer must be active;
- customer must still be `retail` to submit;
- a customer already promoted to wholesale cannot submit again;
- an active application prevents duplicate submission;
- statuses are backend-owned: `submitted`, `under_review`, `approved`, `rejected`;
- only staff/admin authority can start review, approve or reject;
- approval atomically promotes the authoritative customer type from `retail` to `wholesale`.

Storefront must never reproduce or bypass those transitions.

### Wholesale application contract gap

Current OpenAPI defines the application request body, but response typing is incomplete:

- `POST /customer/wholesale/applications` has 200/202 descriptions without a typed JSON response body.
- `GET /customer/wholesale/application` has a 200 description without a typed JSON response body.

Runtime already returns meaningful application data, so this is a **contract-readiness gap**, not a missing domain implementation.

Stage 65-B must reconcile current runtime, OpenAPI and generated TypeScript before production Storefront application/status code consumes this resource.

Frontend-local untyped wholesale models are forbidden as a substitute.

## Wholesale identity authority

Historical design language describes SF-E-10 as entering with a wholesale customer session. Current generated contracts are more specific:

- `GET /auth/session` proves authenticated customer identity but its `AuthSessionActor` does **not** expose `customer_type`.
- `GET /customer/profile` does expose `customer_type: retail | wholesale`.
- backend approval is what changes the authoritative customer type.

Therefore:

```text
CURRENT RUNTIME + OPENAPI + GENERATED CONTRACT > LEGACY WIREFRAME OPERATION LABEL
```

Stage 65 must not infer wholesale status from application appearance, local flags or old wireframe wording. Stage 65-B will choose the smallest canonical typed boundary for wholesale identity presentation.

## Pricing and B2B quantity authority

Canonical Pricing already accepts both quantity and customer type:

- `PricingQueryService.getVariantPrice(..., quantity, customerType)`
- pricing rules can be customer-type and quantity constrained;
- Profit Guard remains authoritative when discounting applies.

Canonical Cart Quote already resolves wholesale authority server-side:

1. Cart resolves the owning customer.
2. `CustomerCommercePort.getCustomerType(customerId)` returns authoritative `retail | wholesale`.
3. Pricing receives `quantity + customerType`.
4. Checkout Quote snapshots authoritative values.
5. Generated `CheckoutQuoteResponse` exposes the resolved `customer_type` and integer-Toman totals.

The configuration key `pricing.wholesale_quantity_discount_min_qty` currently defaults to **11** (“more than 10”), but it is a governed HIGH-risk configuration value.

Consequently:

- frontend may explain that quantity pricing can apply;
- frontend must **not hardcode 11** as business authority;
- frontend must **not calculate a discount percentage itself**;
- final wholesale savings/price shown for an order flow must come from current authoritative pricing/quote data.

## Step-55 design authority retained

Step-55 remains authoritative for product intent, state vocabulary, route ownership and UX obligations:

- SF-E-07: Wholesale introduction.
- SF-E-08: Application.
- SF-E-09: Application status.
- SF-E-10: Approved wholesale commerce state.
- SJ-10: application and tracking.
- SJ-11: approved wholesale purchase.

It does not override live runtime/API truth.

Inherited wholesale UX obligations include:

- applicant remains retail until authoritative approval;
- duplicate/active submission recovers to existing status instead of creating a second application;
- pending/approved/rejected states are server-owned;
- approved wholesale commerce uses authoritative price/stock/quantity/quote;
- 320/360/600/840/1200/1440 responsive behavior and 400% reflow;
- minimum 44×44 targets, visible focus, semantic errors and non-color status cues;
- integer Toman only;
- stable bidi rendering for identifiers;
- no secret/session/token material in browser storage, URLs, analytics or customer-facing errors;
- brown palette remains prohibited.

## Frozen execution plan

| Stage | Goal | Risk | Human Gate |
| --- | --- | --- | --- |
| 65-A | Canonical handoff, live guard, discovery and Wholesale scope freeze | MEDIUM | No |
| 65-B | Backend/OpenAPI contract readiness for application/status, customer-type authority and wholesale pricing/quote boundaries | HIGH | Yes |
| 65-C | Shared Storefront Wholesale session/data/recovery foundation + public Wholesale introduction | MEDIUM | No |
| 65-D | Customer Wholesale application and application-status experience | HIGH | Yes |
| 65-E | Approved-wholesale price/quantity UX integrated with existing Product/Cart authority | HIGH | Yes |
| 65-F | B2B Cart/Checkout/Order integration hardening using existing authoritative checkout flow | HIGH | Yes |
| 65-G | RTL/accessibility/responsive/state hardening across Wholesale surfaces | MEDIUM | No |
| 65-H | Integrated production-build/browser acceptance for application through approved wholesale purchase | MEDIUM | No |
| 65-I | Final canonical verification, docs reconciliation and Step 66 handoff | MEDIUM | No |

## Stage 65-A exit gate

65-A is not canonical merely because these documents exist. Before 65-B may mutate Backend/OpenAPI:

1. exact-head Canonical CI and Phase A PASS;
2. deterministic scope/risk validation PASS;
3. deterministic REVIEW PASS;
4. exact-artifact Lock ACTIVE;
5. protected merge succeeds;
6. exact-SHA postmerge Canonical CI and Phase A PASS;
7. terminal Lock RELEASED is recorded;
8. Linear HOS-69 reflects live status.

Until then:

```text
STEP_65_A = IN_PROGRESS / NOT_CANONICAL
STEP_65_B = BLOCKED_FROM_MUTATION
```
