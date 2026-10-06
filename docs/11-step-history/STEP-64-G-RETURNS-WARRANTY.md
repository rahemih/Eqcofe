# EQCOFE — Step 64-G Returns & Warranty

## Status

`STEP_64_F = CANONICAL_COMPLETE`

`STEP_64_G = IN_PROGRESS / HIGH_RISK`

Canonical baseline: `5b12963738f094a6d9a5e795519c0760a9745dfe`

Task: `EQCOFE-STEP64-G-RETURNS-WARRANTY-001`

Linear: `HOS-68`

Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Purpose

Stage 64-G productionizes the two remaining operational after-sales Storefront surfaces from Step 64:

- SF-E-11 — `/account/returns/:returnNumber?`
- SF-E-12 — `/account/warranty/:claimNumber?`

Current runtime, canonical OpenAPI and generated TypeScript remain authoritative over historical wireframe labels.

## Returns authority

Customer-owned runtime supports:

- `POST /customer/orders/{order_number}/returns`
- `GET /customer/returns`
- `GET /customer/returns/{return_number}`
- `GET /customer/returns/{return_number}/timeline`
- `POST /customer/returns/{return_number}/cancel`

Creation accepts bounded order-item rows. Runtime validates that the order belongs to the customer, that the order is in a return-eligible state, that every order item belongs to that order and that requested quantity does not exceed the ordered quantity.

Customer cancellation is permitted by runtime only while the return is still `requested`. The Storefront must re-read the owned return and recheck that state immediately before mutation. It does not infer staff review, refund, replacement, inspection or inventory authority.

## Warranty authority

Customer-owned runtime supports:

- `POST /customer/warranty/claims`
- `GET /customer/warranty/claims`
- `GET /customer/warranty/claims/{claim_number}`
- `GET /customer/warranty/claims/{claim_number}/timeline`

Creation accepts an owned `order_item_id`, bounded issue type/description and optional preferred resolution. Runtime alone decides order-item ownership and eligibility. No customer cancel endpoint exists for Warranty and none is invented.

Admin Warranty transitions such as review, approve/reject, receive, repair, resolve or close are not customer authority and remain absent from Storefront.

## Security / recovery

- Customer session transport remains server-only through `CustomerSessionBridge`.
- Mutations require server-derived `Idempotency-Key`.
- Entity/reference inputs are validated before transport.
- 401 fails the personal surface closed.
- 403/404 use generic account-scoped messaging.
- Unknown mutation outcomes never manufacture success.
- Detail remains usable if timeline loading fails.
- Raw additionalProperties and internal after-sales fields are never rendered as action authority.

## Explicit non-scope

- Backend/runtime mutation
- OpenAPI/generated contract mutation
- database/migrations
- dependencies/lockfile
- Product Design source mutation
- Current State / Master Roadmap mutation
- evidence uploads or attachment storage
- refund amount/action
- replacement decision/action
- staff/admin transitions
- payment/shipping/inventory mutation
- Step 64-H+ implementation

## Canonical gate

Stage 64-G is **HIGH risk**. Final protected merge requires explicit Project Owner Human approval bound to the frozen exact head/artifact, but only after Canonical CI, Phase A, Storefront Quality, CodeQL/Security, deterministic Review and exact-artifact ACTIVE Lock are green.

Until terminal closure:

`STEP_64_G = IN_PROGRESS / NOT_CANONICAL`

`STEP_64_H = BLOCKED_FROM_MUTATION`
