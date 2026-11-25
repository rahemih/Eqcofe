# EQCOFE Step70-H — POS warehouse scope BOLA remediation (HIGH)

Status: **DRAFT / NOT_CANONICAL / NO_GATE_PASS**. Base: `f3f34aad5f47fae45260e12d483fd686f7500be6`; source issue [#425](https://github.com/rahemih/Eqcofe/issues/425), parent POS [#422](https://github.com/rahemih/Eqcofe/issues/422), Linear HOS-74.

## Source-proven authorization mismatch
The `@Permissions('pos.sell')` decorator checks permission membership, not authorization for client-selected `warehouse_id`. The POS commit path accepted an input warehouse and proceeded through Payment + Inventory FIFO and Outbox without an explicit `ScopePolicy.assert`. Offline POS `sale.sync` also chooses a warehouse via persisted command payload. This is a security review source finding; actual misuse is covered by negative regression with restricted warehouse assignments, not a claim of production exploitation.

## Minimal correction
Use the existing globally provided `ScopePolicy`. Check `this.scopes.assert(actor,'warehouse',warehouseId)` before starting the commit transaction, so denied requests cannot confirm payment, consume inventory, update sale, or append outbox. Repeat the check on offline capture before persisting the command and on offline sync before create/price/commit side effects. This also handles revocation after capture. Preserve project ScopePolicy semantics: actor with explicit warehouse assignments is bounded; no assigned warehouse scope means existing global staff authority, not a new policy.

## Regression
Extend existing Step49 A6 and A7 tests for restricted/allowed/global staff, denied capture and denied sync, zero write effects and no failed-command state mutation on scope denial. No changes to POS permissions, Step-Up, pricing, payment, FIFO, underlying SQL, OpenAPI or routes.

## Governance
Separate HIGH Task Contract `EQCOFE-STEP70-H-POS-WAREHOUSE-SCOPE-BACKEND-001` with exact sixteen-path allowlist, fresh Canonical CI/Phase A/Step57/Step58/CodeQL + three analyzers, deterministic Review, bounded threat assessment, ACTIVE exact-artifact Lock, independent reviewer or owner-accepted internal assurance with **separate fresh owner risk**, later independent-in-time Project Owner Human Gate, only official protected workflow_dispatch merge, exact-SHA postmerge and terminal Lock release. Frontend #424 MUST NOT inherit this approval and must remain unmerged until source protection lands. No Step70-I/J or Step71.

## Source provenance hash refresh (not design re-approval)

The Step56-E snapshot validator pins source hashes for two files corrected by this new security patch. Update precisely the two `sources[].sha256` entries in `docs/13-product-design/step56-commerce-operations-wireframes.json` to actual SHA256 of these updated source files (normalized LF), with no change to screens, wireframes, operation matrix, accepted designs, textual decisions, or prior approval claims. Frozen design judgments are not regenerated or re-certified. If any downstream provenance hash validation fails, stop and reconcile deterministically within a new governed scope.

## Transitive frozen provenance references (source digests only)

Source SHA256 fields must correspond to the present source repository. The two Step56-E POS source SHA256 entries changed solely because the backend POS authority patch changed source bytes. The downstream Step56-F and Step56-G SHA references, E/F/G frame manifest sourceSha256, Step56-H final audit sources/manifests and its artifact manifest, and Step57 high-fidelity contract source SHA references are updated deterministically. No operation, layout, SVG, screenshot, page render, design decision or historical human review is changed. This refresh does not claim new runtime design certification.

## Governance entry clarification

Step70-H exact Task allowlist is canonical after protected PR #428 merge at `f3f34aad5f47fae45260e12d483fd686f7500be6`. This authorizes only the eligibility of this named HIGH Task for reduced-independence internal review; it does NOT grant this PR a security, owner risk, Human Gate or merge approval. New exact-head INTERNAL_SECURITY:ASSESSED, chronologically later separate OWNER_RISK:ACCEPTED, distinct later HUMAN:APPROVED, CodeQL/CI/Step57/Step58/PostgreSQL, active Scope Lock, official protected workflow dispatch and postmerge are still required. No legacy gates transfer. Retain the 16-file scoped patch and original frozen Step56/57 design judgments; no H2/Step71.
