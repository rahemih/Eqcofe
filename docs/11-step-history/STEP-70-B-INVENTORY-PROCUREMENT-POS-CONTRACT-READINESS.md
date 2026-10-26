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

## Step56-H provenance regeneration authorization

Exact-head validation after the source-count reconciliation reached Step56-H and proved one remaining generated-evidence drift: the final audit generator still froze the historical 532-operation union even though canonical reconciliation now derives 524 operations by removing exactly eight source-unproven POS authorities. 70-B therefore authorizes a generator-equivalent refresh of `scripts/step56-final-audit.mjs` and the complete `step56-final-audit/**` generated artifact set. This changes no product semantics, runtime route, permission, lifecycle or business rule; it only makes the terminal design evidence reflect the already-authorized source union.

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

## 2026-10-26 — Step56-H generated audit synchronized

The complete Step56-H generated audit set is now regenerated from the reconciled 524-operation source union. The repair is provenance-only: 97 surfaces and 12 journeys remain intact; exactly eight source-unproven POS OpenAPI authorities are absent; no runtime, permission, lifecycle or product semantic authority was added. This checkpoint also confirms the branch tree is intact, `behind=0`, and the PR changed-file set is bounded rather than a destructive tree replacement.

## Step57 provenance cascade authorization

Step57 foundation deterministically pins Step56 B-H source hashes and inherits the generated Admin operation/view authority. The Step56-H reconciliation therefore requires a source-linked Step57 regeneration: the high-fidelity contract, deterministic acceptance count assertions, prototype coverage projection and prototype manifest may be refreshed generator-equivalently. Closure/review fields remain PENDING and no Step57 approval, design semantic, route, permission or product behavior is changed.

## 2026-10-26 — Step57 provenance projection synchronized

The deterministic Step57 source-linked contract now inherits the reconciled Step56 authority: 134 total screens, 97 Admin screens, 524 unique Admin operations, 167 NO_ACTION operations, 1143 Admin views and 4472 Admin states. All Step57 closure/review fields remain PENDING. Prototype coverage and manifest are regenerated only for source parity; no prototype behavior or approval state changed.
