# EQCOFE — Step 70-D Inventory Administration

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `7d7b1468e33b0ec0c7e0e47061e50bb63e72374c`  
Linear: `HOS-74`  
Risk: **HIGH**  
Human Gate: **REQUIRED_FINAL_EXACT_ARTIFACT**

## Entry proof

Step70-C is terminally canonical through PR #383 on `main@7d7b1468e33b0ec0c7e0e47061e50bb63e72374c`. Exact-head and postmerge Canonical CI / Phase A / CodeQL passed and terminal Lock release is comment `6436076540`.

## Scope

70-D owns only:

- AD-D-06 inventory overview / variant inspection / movements / cost basis / FIFO cost-layer probes;
- AD-D-07 inventory adjustment;
- warehouse protection percentage update required by the frozen Inventory administration scope.

Transfer, reservation, allocation and sale-consumption workflows remain 70-E. Procurement remains 70-F/70-G. POS remains 70-H.

## Canonical read authority

- `GET /admin/inventory`
- `GET /admin/inventory/{variant_id}`
- `GET /admin/inventory/{variant_id}/movements`
- `GET /admin/inventory/{variant_id}/cost-basis`
- `GET /admin/inventory/{variant_id}/cost-layers`
- `GET /admin/inventory/warehouses`

The generated OpenAPI currently does not type response bodies for these reads. 70-D does not bypass this authority with raw JSON assumptions. The Admin UI proves endpoint success/status/request-id only and uses explicit variant IDs for variant-scoped reads.

## Adjustment authority

Canonical mutation:

`POST /admin/inventory/adjustments`

Security and runtime invariants:

- permission `inventory.adjust`;
- WebAuthn Step-Up required;
- idempotency scope `inventory.adjust`;
- server-owned fresh idempotency key for the final verified submission;
- exact adjustment types:
  - `count_correction`
  - `receipt_adjustment`
  - `manual`
  - `damage`
  - `quarantine`
  - `quarantine_release`
  - `damaged_disposal`;
- quantity delta is an integer and nonzero;
- reason is trimmed and at least two characters;
- unit cost is an integer nonnegative Toman value when supplied;
- positive ordinary inventory increase requires unit cost;
- Backend remains authority for stock/bucket/FIFO/encumbrance checks.

Network, timeout, aborted or 5xx after submission is an **unknown outcome**. No automatic retry occurs. Operator must inspect authoritative movements before starting a new adjustment.

## Warehouse protection authority

Canonical mutation:

`PATCH /admin/inventory/warehouses/{id}/protection`

Rules:

- permission `inventory.warehouse.manage`;
- explicit current positive entity version is required and is sent as `If-Match`;
- percentage must be finite within 0..100;
- no Step-Up or idempotency is invented because source authority does not require them;
- conflict / stale version never auto-overwrites; a fresh version is required.

## Frozen inventory invariants preserved

- physical availability = `max(0,on_hand-reserved-allocated-damaged-quarantine)`;
- protected quantity = `ceil(physical * protection_percent / 100)`;
- online availability = `max(0,physical-protected)`;
- FIFO layers remain ordered by receivedAt then id;
- adjustment cannot undercut encumbered stock;
- source default physical protection remains 20%.

## Explicit non-authority

70-D does not expose:

- warehouse create/delete/archive/type mutation;
- transfers;
- reservations;
- allocations / pick / unpick;
- consume-sale;
- suppliers / PR / PO / GR / landed cost / invoices / purchase returns;
- POS sales/offline/reconciliation mutations;
- Backend/OpenAPI/generated contract/database changes;
- Storefront/Product Design/Current-State mutations;
- Step71;
- Graph/Graphify.

## Exit gate

70-E is blocked until:

1. exact-head Canonical CI PASS;
2. exact-head Phase A PASS;
3. exact-head CodeQL PASS;
4. deterministic Review PASS;
5. Independent Security PASS for exact Head/Artifact;
6. exact-artifact ACTIVE Scope Lock;
7. explicit Project Owner Human Gate for exact Head/Artifact;
8. protected merge;
9. exact-SHA postmerge Canonical CI / Phase A / CodeQL PASS;
10. terminal Lock RELEASE;
11. Linear records `STEP_70_D = CANONICAL_COMPLETE`.

Until then:

```text
STEP_70_D = IN_PROGRESS / NOT_CANONICAL
STEP_70_E = BLOCKED_FROM_MUTATION
```
