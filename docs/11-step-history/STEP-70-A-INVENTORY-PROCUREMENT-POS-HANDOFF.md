# EQCOFE — Step 70-A Inventory / Procurement / POS Canonical Handoff

## Status

`STEP_70_A = IN_PROGRESS / NOT_CANONICAL`

Canonical base: `da446535d29ad4e6a95197a4d0a6058c8d27654e`  
Linear: `HOS-74 — Step 70 — Inventory, Procurement & POS Administration`  
Risk: **MEDIUM**  
Project Owner Human Gate: **NOT REQUIRED**

## Entry proof

Step 69 is closed / final canonical pass through PR #378, and its post-closure state synchronization is terminal through PR #379. Protected `main` is `da446535d29ad4e6a95197a4d0a6058c8d27654e`.

Step70-A is documentation/governance-only. It freezes source authority and the execution plan before any Backend/OpenAPI/Admin runtime mutation.

## Frozen Step70 ownership

### Inventory / Procurement — Step56-D

Step70 owns exactly these 13 Step56-D surfaces:

| Surface | Task | Operations |
| --- | --- | ---: |
| AD-D-06 | موجودی، گردش و لایه‌های بهای تمام‌شده | 5 |
| AD-D-07 | اصلاح موجودی | 1 |
| AD-D-08 | انتقال بین انبارها | 7 |
| AD-D-09 | رزرو و تعهد موجودی و پرداخت دیررس | 9 |
| AD-D-10 | تخصیص و برداشت و مصرف فروش | 6 |
| AD-D-11 | انبار و سهم حفاظت فروش حضوری | 3 |
| AD-D-12 | تأمین‌کنندگان | 6 |
| AD-D-13 | درخواست خرید | 8 |
| AD-D-14 | سفارش خرید | 9 |
| AD-D-15 | رسید کالا و برگشت سند | 7 |
| AD-D-16 | هزینهٔ تأمین و تخصیص آن | 5 |
| AD-D-17 | صورتحساب تأمین‌کننده و مغایرت | 5 |
| AD-D-18 | مرجوعی خرید | 6 |

Inventory/Procurement total: **77 operations**.

### POS — Step56-E

Step70 additionally owns the three POS administration obligations:

| Surface | Task | Operations | Current Step70-A execution state |
| --- | --- | ---: | --- |
| AD-E-09 | فروشگاه، صندوق و شیفت حضوری | 7 | BLOCKED — canonical OpenAPI only; no matching source controller |
| AD-E-10 | اسکن و فروش حضوری | 6 | BLOCKED — mixed canonical-contract-only + controller/supplemental-contract authority |
| AD-E-11 | فرمان آفلاین و تطبیق فروش حضوری | 6 | BLOCKED — controller + supplemental Step49 contract, absent from canonical assembled OpenAPI |

POS total: **19 operations**.

Frozen Step70 union: **16 surfaces / 96 operations**.

## POS authority reconciliation boundary

The old Step56 `NO_ACTION` state must not be silently upgraded.

Current live source proves two opposite gaps:

1. **11 runtime controller operations + Step49 supplemental POS contract, but absent from canonical assembled OpenAPI**
   - `GET /admin/pos/scan`
   - `POST /admin/pos/sales`
   - `POST /admin/pos/sales/{id}/lines`
   - `POST /admin/pos/sales/{id}/price`
   - `POST /admin/pos/sales/{id}/commit`
   - `POST /admin/pos/offline/commands`
   - `POST /admin/pos/offline/commands/{clientCommandId}/sync`
   - `GET /admin/pos/reconciliation/failed`
   - `GET /admin/pos/reconciliation/{clientCommandId}`
   - `POST /admin/pos/reconciliation/{clientCommandId}/retry`
   - `POST /admin/pos/reconciliation/{clientCommandId}/abandon`

2. **8 canonical assembled-OpenAPI operations, but no matching source controller**
   - `GET /admin/pos/stores`
   - `GET /admin/pos/registers`
   - `GET /admin/pos/shifts/current`
   - `POST /admin/pos/shifts/open`
   - `POST /admin/pos/shifts/{id}/begin-closing`
   - `POST /admin/pos/shifts/{id}/close`
   - `POST /admin/pos/shifts/{id}/reconcile`
   - `POST /admin/pos/orders`

Therefore **all 19 POS operations remain frontend-NO_ACTION in 70-A**. Stage 70-B must perform an explicit canonical Backend/OpenAPI/generated-contract reconciliation before any POS Admin runtime implementation.

## Frozen Inventory invariants

- Physical availability = `max(0, onHand - reserved - allocated - damaged - quarantine)`.
- Protected quantity = `ceil(physical * percent / 100)`; online availability = `max(0, physical - protected)`.
- FIFO cost layer order is `receivedAt`, then id.
- Cost-basis source is not represented as a warehouse-scoped guarantee where source is global.
- Inventory adjustment supports exactly the source-defined adjustment types; delta is nonzero integer; positive count increases require cost; encumbered stock may not be undercut.
- Inventory adjustment requires Step-Up and idempotency scope `inventory.adjust`.
- Transfer approval checks free stock but does not reserve it; shipping does not claim a fresh free-stock guarantee.
- Reservation/allocation command paths do not receive a fabricated uniform warehouse-scope guarantee.
- Warehouse protection update requires current If-Match and finite 0..100; source default remains 20%.
- No warehouse delete/archive or invented type mutation is introduced.

## Frozen Procurement invariants

- Supplier create is idempotent; update and activate/deactivate preserve source concurrency rules; supplier delete is not invented.
- Purchase Request approval/rejection preserves separation of duties and Step-Up.
- Purchase Order amounts remain integer Toman; discount cannot exceed line subtotal.
- Goods Receipt post/reverse preserves Step-Up, idempotency, cost/ownership and reversal guards.
- Landed-cost preview is not a frozen finalize token; finalize recomputes allocations and retains source scope limitations.
- Supplier Invoice list is the read authority; no single-invoice GET or supplier-payment endpoint is invented.
- Purchase Return approval/ship preserves Step-Up requirements; create-time receipt ownership is not represented as a fresh approval-time recheck; no cancel/refund route is invented.

## Frozen execution plan

| Stage | Goal | Risk | Human Gate |
| --- | --- | --- | --- |
| 70-A | Canonical handoff, live discovery, source authority and scope freeze | MEDIUM | No |
| 70-B | Backend/OpenAPI/generated-contract readiness and POS gap reconciliation for the frozen 96-operation union | HIGH | Yes |
| 70-C | Shared Admin Inventory/Procurement/POS read/state/permission/server-transport foundation | MEDIUM | No |
| 70-D | Inventory overview/cost/movement, warehouse protection and inventory adjustment administration | HIGH | Yes |
| 70-E | Transfer, reservation, allocation, pick/unpick and sale-consumption administration | HIGH | Yes |
| 70-F | Supplier, Purchase Request and Purchase Order administration | HIGH | Yes |
| 70-G | Goods Receipt/reversal, landed cost, Supplier Invoice/dispute and Purchase Return administration | HIGH | Yes |
| 70-H | POS store/register/shift, scan/sale, offline sync and reconciliation administration after 70-B authority | HIGH | Yes |
| 70-I | Integrated Persian RTL/accessibility/responsive/security production-browser acceptance | MEDIUM | No |
| 70-J | Final canonical verification, documentation reconciliation and Step71 handoff | MEDIUM | No |

Risk may move upward automatically. Any downgrade requires explicit governance evidence.

## Stage-A mutation boundary

Allowed:
- this Step70-A history;
- Step70-A Task Contract;
- generated Task Catalog.

Forbidden:
- Admin runtime;
- Backend/OpenAPI/generated contract/database;
- workflow/dependency mutation;
- Current State/Master Roadmap/Chat Handoff;
- Product Design semantic mutation;
- Step71 implementation;
- Graph/Graphify.

## Exit gate

70-B remains blocked until:

1. exact-head Canonical CI + Phase A + CodeQL PASS;
2. deterministic Review PASS;
3. exact-artifact Scope Lock ACTIVE;
4. protected merge;
5. exact-SHA postmerge Canonical CI + Phase A + CodeQL PASS;
6. terminal Scope Lock RELEASED;
7. Linear HOS-74 synchronized.

Until then:

```text
STEP_70_A = IN_PROGRESS / NOT_CANONICAL
STEP_70_B = BLOCKED_FROM_MUTATION
```
