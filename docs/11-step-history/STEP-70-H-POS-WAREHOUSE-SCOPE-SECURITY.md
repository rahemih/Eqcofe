# EQCOFE Step70-H — POS warehouse scope BOLA remediation (HIGH)

Status: **DRAFT / NOT_CANONICAL / NO_GATE_PASS**. Base: `f7291716fe319138e79fe9934654f708f2479231`; source issue [#425](https://github.com/rahemih/Eqcofe/issues/425), parent POS [#422](https://github.com/rahemih/Eqcofe/issues/422), Linear HOS-74.

## Source-proven authorization mismatch
The `@Permissions('pos.sell')` decorator checks permission membership, not authorization for client-selected `warehouse_id`. The POS commit path accepted an input warehouse and proceeded through Payment + Inventory FIFO and Outbox without an explicit `ScopePolicy.assert`. Offline POS `sale.sync` also chooses a warehouse via persisted command payload. This is a security review source finding; actual misuse is covered by negative regression with restricted warehouse assignments, not a claim of production exploitation.

## Minimal correction
Use the existing globally provided `ScopePolicy`. Check `this.scopes.assert(actor,'warehouse',warehouseId)` before starting the commit transaction, so denied requests cannot confirm payment, consume inventory, update sale, or append outbox. Repeat the check on offline capture before persisting the command and on offline sync before create/price/commit side effects. This also handles revocation after capture. Preserve project ScopePolicy semantics: actor with explicit warehouse assignments is bounded; no assigned warehouse scope means existing global staff authority, not a new policy.

## Regression
Extend existing Step49 A6 and A7 tests for restricted/allowed/global staff, denied capture and denied sync, zero write effects and no failed-command state mutation on scope denial. No changes to POS permissions, Step-Up, pricing, payment, FIFO, underlying SQL, OpenAPI or routes.

## Governance
Separate HIGH Task Contract `EQCOFE-STEP70-H-POS-WAREHOUSE-SCOPE-BACKEND-001` with exact seven-path allowlist, fresh Canonical CI/Phase A/Step57/Step58/CodeQL + three analyzers, deterministic Review, bounded threat assessment, ACTIVE exact-artifact Lock, independent reviewer or owner-accepted internal assurance with **separate fresh owner risk**, later independent-in-time Project Owner Human Gate, only official protected workflow_dispatch merge, exact-SHA postmerge and terminal Lock release. Frontend #424 MUST NOT inherit this approval and must remain unmerged until source protection lands. No Step70-I/J or Step71.
