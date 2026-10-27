# EQCOFE — Step 70-C Shared Admin Inventory / Procurement / POS Foundation

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `4a98b9b856233ec01fff4472163b37644d911ce6`  
Linear: `HOS-74`  
Risk: **MEDIUM**  
Human Gate: **NOT_REQUIRED**

## Entry proof

Step70-B is terminally canonical:

- PR: `#382`;
- exact approved Head: `f0b0532385f5d6f94d055126f17adf64ab795d70`;
- artifact: `fe4f402d0d8686383f58e4fa7282cf29451cbbc2d691d4a503a13207a77976d3`;
- canonical merge/main SHA: `4a98b9b856233ec01fff4472163b37644d911ce6`;
- postmerge Canonical CI #2186, Phase A #1685 and CodeQL #1331 = **PASS**;
- terminal Step70-B Lock release comment: `6435828755`.

## Purpose

70-C creates the shared, permission-safe Admin entry foundation for the frozen Step70 Inventory, Procurement and POS surfaces. It is deliberately **read/state only**.

The stage proves server transport and honest availability before any Step70-D..H mutation workspace is implemented.

## Frozen surfaces and Stage-C behavior

| Surface | Stage-C source behavior |
| --- | --- |
| AD-D-06 | `GET /admin/inventory` |
| AD-D-07 | boundary only — adjustment is mutation-only; remains 70-D |
| AD-D-08 | `GET /admin/inventory/transfers` |
| AD-D-09 | `GET /admin/inventory/reservations` |
| AD-D-10 | `GET /admin/inventory/allocations` |
| AD-D-11 | `GET /admin/inventory/warehouses` |
| AD-D-12 | `GET /admin/procurement/suppliers` |
| AD-D-13 | `GET /admin/procurement/purchase-requests` |
| AD-D-14 | `GET /admin/procurement/purchase-orders` |
| AD-D-15 | `GET /admin/procurement/goods-receipts` |
| AD-D-16 | `GET /admin/procurement/landed-costs` |
| AD-D-17 | `GET /admin/procurement/supplier-invoices` |
| AD-D-18 | `GET /admin/procurement/purchase-returns` |
| AD-E-09 | boundary only — no source-backed store/register/shift/order authority remains after 70-B |
| AD-E-10 | boundary only — canonical scan GET requires explicit operator `kind` + `value`; no synthetic scan |
| AD-E-11 | `GET /admin/pos/reconciliation/failed` |

Stage-C does not claim that these first reads are complete domain workspaces. Detail views and mutation controls remain owned by 70-D through 70-H.

## Transport and permission boundary

- Server-side Admin session authority remains in the existing `createAdminAuthBridge`.
- Canonical paths/types remain sourced from `src/generated/openapi.ts`.
- Only GET is invoked in the Stage-C service.
- Backend 401/403 is authoritative and maps to neutral denied state.
- Transport/5xx failure fails closed as unavailable; stale or guessed data is never substituted.
- Request IDs are preserved when the transport exposes them.
- Destination visibility is not treated as Backend authorization.
- No raw session token/cookie is disclosed to browser code.

## Explicit non-authority

70-C does **not**:

- adjust inventory;
- create/approve/ship/receive/cancel transfers;
- create/release/convert/expire reservations;
- allocate/pick/unpick/release/consume stock;
- create warehouses or patch protection percentages;
- create/update/activate/deactivate suppliers;
- create/submit/approve/reject/cancel Purchase Requests;
- create/submit/approve/send/cancel/close Purchase Orders;
- create/post/reverse Goods Receipts;
- create/preview/finalize landed cost;
- create/match/dispute/cancel Supplier Invoices;
- create/approve/ship/complete Purchase Returns;
- scan a POS item without explicit operator input;
- create/price/commit POS sales;
- capture/sync offline POS commands;
- retry or abandon POS reconciliation;
- invent POS store/register/shift/order authority;
- mutate Backend, OpenAPI, generated contract, database, Storefront, Product Design or Current-State;
- begin Step71;
- resurrect Graph/Graphify.

## Execution branch

`eqcofe/step70-c-admin-inventory-procurement-pos-foundation`

Task Contract:
`docs/14-multi-agent/tasks/EQCOFE-STEP70-C-ADMIN-INVENTORY-PROCUREMENT-POS-FOUNDATION-001.json`

## Exit gate

70-D remains blocked until:

1. Step70-C deterministic Admin verifier is in the canonical verify chain;
2. exact-head Canonical CI PASS;
3. exact-head Phase A PASS;
4. exact-head CodeQL PASS;
5. deterministic Review PASS;
6. exact-artifact Scope Lock ACTIVE;
7. protected merge;
8. exact-SHA postmerge Canonical CI / Phase A / CodeQL PASS;
9. terminal Scope Lock RELEASED;
10. Linear `HOS-74` records `STEP_70_C = CANONICAL_COMPLETE`.

No Project Owner Human Gate is required for this frozen MEDIUM-risk stage.

Until then:

```text
STEP_70_C = IN_PROGRESS / NOT_CANONICAL
STEP_70_D = BLOCKED_FROM_MUTATION
```
