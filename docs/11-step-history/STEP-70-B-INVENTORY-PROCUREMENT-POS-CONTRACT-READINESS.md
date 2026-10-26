# EQCOFE — Step 70-B Inventory / Procurement / POS Contract Readiness

Status: **IN_PROGRESS / HIGH / NOT_CANONICAL**

Canonical base: `017475977c0377d42a668c84647eff1b3c9097b9`  
Linear: `HOS-74 — Step 70 — Inventory, Procurement & POS Administration`  
Risk: **HIGH**  
Human Gate: **REQUIRED — FINAL EXACT ARTIFACT**

## Entry proof

70-A is terminal/canonical through PR #381:

- exact Head: `940e70275115f5ca0738d4a2b26bf56188a926ff`;
- Artifact: `b9fbbc2f5465cb3ffe9af13e336dc52deca636d109aac408a55c42015fe82989`;
- canonical merge/main: `017475977c0377d42a668c84647eff1b3c9097b9`;
- exact-SHA Canonical CI #2116 / `40194622721`, Phase A #1615 / `40194622629`, CodeQL #1264 / `40194622826` = PASS;
- terminal Lock release comment: `6397857754`.

## Frozen 96-operation union

- Inventory / Procurement AD-D-06..18: **77 operations**.
- POS AD-E-09..11: **19 design obligations**.
- Total: **16 surfaces / 96 operations**.

70-B changes no Inventory/Procurement business semantics unless a separately proven drift is found.

## Proven POS split before 70-B

Two contradictory authorities existed:

### Runtime + supplemental contract, absent from canonical OpenAPI

Exactly 11 operations are implemented by `PosAdminController` and represented by `contracts/http/step49-pos-a9.yaml`:

1. `GET /admin/pos/scan`
2. `POST /admin/pos/sales`
3. `POST /admin/pos/sales/{id}/lines`
4. `POST /admin/pos/sales/{id}/price`
5. `POST /admin/pos/sales/{id}/commit`
6. `POST /admin/pos/offline/commands`
7. `POST /admin/pos/offline/commands/{clientCommandId}/sync`
8. `GET /admin/pos/reconciliation/failed`
9. `GET /admin/pos/reconciliation/{clientCommandId}`
10. `POST /admin/pos/reconciliation/{clientCommandId}/retry`
11. `POST /admin/pos/reconciliation/{clientCommandId}/abandon`

### Canonical OpenAPI, absent from runtime

Exactly 8 operations had canonical contract entries but no source controller/service:

- stores;
- registers;
- current/open/begin-closing/close/reconcile shifts;
- `POST /admin/pos/orders`.

Repository-wide source search found no store/register/shift/order runtime authority. 70-B therefore does **not** fabricate those services.

## Canonical reconciliation decision

Canonical frontend/backend HTTP authority is reconciled to the live source:

- remove the 8 source-unproven POS operations from canonical path authority;
- promote the 11 live `PosAdminController` operations into `contracts/http/openapi.yaml`;
- synchronize `src/generated/openapi.ts`;
- retain Step49 supplemental history as historical/source evidence;
- preserve exact runtime permissions, HTTP status, Step-Up and idempotency semantics.

No POS runtime or database migration is required.

## Runtime security contract

Permissions:

- scan: `pos.view`;
- sale/offline commands: `pos.sell`;
- reconciliation: `pos.reconcile`.

Idempotency scopes:

- `pos.sale.create`;
- `pos.sale.line.add`;
- `pos.sale.price`;
- `pos.sale.commit`;
- `pos.offline.capture`;
- `pos.offline.sync`;
- `pos.reconciliation.admin.retry`;
- `pos.reconciliation.admin.abandon`.

Retry/abandon additionally require WebAuthn Step-Up through the existing backend security transport.

## Runtime validation corrections

The old supplemental Step49 contract permitted `external_reference` up to 160 characters. Current runtime and database authority both cap it at **120**. Canonical Step70-B uses 120.

Other frozen bounds:

- scan input: normalized nonempty <=120;
- quantity: 1..999;
- offline lines: 1..100;
- reconciliation list limit: 1..100;
- optional reconciliation note: 1..500 when present;
- failed reconciliation recovery: max 5 attempts;
- retry/abandon remains failed-only.

Client payload never becomes authority for price, stock, COGS, paid/payment truth or totals.

## Mutation boundary

Allowed:
- canonical OpenAPI;
- generated TypeScript contract;
- focused Step70-B regression;
- this history;
- Task Contract and Task Catalog;
- generator-equivalent Step56/57 source-hash/manifest refresh only if required by design validation.

Forbidden:
- Inventory/Procurement/POS runtime mutation;
- database migration;
- Admin frontend;
- dependencies/workflows;
- Current-State/Roadmap;
- Step71 implementation;
- Product Design semantic changes;
- Graph/Graphify.

## Exit gate

70-C remains blocked until:

1. exact-head Canonical CI + Phase A + CodeQL PASS;
2. deterministic Review PASS;
3. independent Security PASS;
4. exact-artifact Scope Lock ACTIVE;
5. **Project Owner Human Gate on exact Head + Artifact**;
6. protected merge;
7. exact-SHA postmerge Canonical CI + Phase A + CodeQL PASS;
8. terminal Lock RELEASED;
9. Linear HOS-74 synchronized.

```text
STEP_70_B = IN_PROGRESS / HIGH / NOT_CANONICAL
STEP_70_C = BLOCKED_FROM_MUTATION
```
