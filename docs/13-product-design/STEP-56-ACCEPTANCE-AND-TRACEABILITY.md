# Step 56 — Acceptance and Traceability

**56-A: candidate only; final gate BLOCKED. B–H: NOT_STARTED.**

## Acceptance matrix

| Gate | Scope | Required evidence before PASS |
|---|---|---|
| A | Canonical handoff and scope freeze | Pinned main/closure evidence; complete source inventory; exact actor/permission and operation coverage; zero unresolved source gaps; contract/docs/tests; full verify; exact-head CI and safe merge |
| B | IA and shared shell | All AD-B obligations; eight inherited navigation groups; session/permission/scope filtering; local destination search; table/detail/form patterns; shared state, confirmation and Step-Up patterns |
| C | Catalog and media | All AD-C obligations; product/variant/taxonomy/media lifecycle and source-proven action restrictions; review/publish/stop/archive/recovery trace |
| D | Pricing, inventory, procurement, Excel | All AD-D obligations; preview/hash/version/approval boundaries; FIFO and stock ownership; receipt/reversal lineage; opaque workbook validation, safe retry and no raw payload leakage |
| E | Orders, payment, after-sales, POS | All AD-E obligations; allowed actions, uncertain payment/status recovery, immutable outcomes, fulfillment handoffs, POS shared-stock/pricing and offline reconciliation |
| F | Customer, wholesale, marketing, content | All AD-F obligations; customer ownership, no self-promotion, terminal wholesale decisions, content versioning, delivery failure and governed AI evidence |
| G | Finance, analytics, configuration, security | All AD-G obligations; integer Toman and source-owned finance, bounded exports, secret boundaries, least privilege, preview/approval/Step-Up and safe operations recovery |
| H | Full audit and canonical closure | Union of every B–G obligation and all 12 journeys; no unowned/duplicate operations; no unresolved source/permission/state exceptions; manifests and exact-head/main CI evidence; canonical synchronization |

The machine gate lists are authoritative for exact surface ownership. A current green structural validator confirms that blocked evidence is accurately represented. It does not grant A acceptance. `node scripts/validate-step56-admin-foundation.mjs --require-ready` intentionally exits 2 while GAP-01/02/03 remain. A later authorized reconciliation must update the contract, source snapshots, counts, negative tests and validator deliberately; deleting a blocker is not a resolution.

## Per-obligation matrix

Every obligation must retain its stable ID, Persian primary task, owning gate, actor personas, journey IDs, domain owner, operation list, permission boundary and required facets. The generated traceability JSON includes each operation's exact HTTP identity, OpenAPI source, runtime source/handler/line when present, supplemental contract evidence, explicit permission keys and source classification. No route-to-persona mapping grants runtime authority.

| Dimension | Required later evidence |
|---|---|
| Entry and task | Navigation/deep-link/related-entity context, primary task and valid exit |
| Read and detail | Bounded list/filter/pagination, authoritative detail/history or an explicit unsupported-read state |
| Action | Owner-supported action, present lifecycle/version, operation permission and scope; no all-or-any union shortcut |
| Sensitive action | Impact and reversibility; source-proven preview, Step-Up, approval, idempotency, conditional policy and audit behavior |
| States | Every required state represented or justified with source evidence; empty ≠ denied ≠ unavailable; conflict/stale/unknown-result recovery |
| Responsive | Compact and expanded frames plus review of six inherited widths, 400% zoom, long Persian and text-spacing |
| Accessibility | Logical reading/focus, keyboard alternatives, visible unobscured focus, target size, names/headings/errors/status announcements and reduced motion |
| Trust and privacy | No secret/token/raw workbook leaks; no invented business rules, Wallet, fake success, customer promotion or editable terminal decisions |
| Provenance | Deterministic artifact/input hashes and validator checks; no paid or Figma dependency |

Shared B components may be referenced by later gates, but each domain screen must still document its actual action/state/focus behavior. A generic dialog frame cannot stand in for every dangerous action's impact, approval or recovery requirements. Source gaps prohibit presenting executable success for a contract-only operation. If later governance explicitly accepts a concept-only deferral, that decision must be recorded canonically with affected operations and acceptance limits.

## Cross-domain handoffs

Order → Payments/Refund carries stable order/payment identity, attempts and authoritative status. Order → Fulfillment/Shipment carries allocation and immutable destination context. Returns/Warranty → Inventory/Payments carries owner-supported resolution and audit lineage. Procurement → Inventory/Finance preserves receipt, FIFO and cost lineage. Pricing/FX/Excel → Approval/Audit uses exact preview/hash and scope, never a stale client snapshot. Customer → Wholesale/Pricing uses authoritative customer type, not persona intent. POS → Catalog/Pricing/Inventory preserves owner truth and immutable sale snapshots. AI → Content requires governed draft/source review and never overwrites published truth. Operations → retry/restore uses bounded source-supported controls, never blanket replay.

## Validation and governance

`scripts/step56-admin-sources.mjs` assembles exactly the current canonical OpenAPI base and named overlays, and inspects TypeScript controller decorators with the installed TypeScript parser. Route parameters are normalized only for structural matching; exact source names are retained. This is static source evidence, not live HTTP execution, service-level audit verification or a new API assembler. The separate POS YAML remains supplemental.

`scripts/validate-step56-admin-foundation.mjs` validates source hashes, inherited contracts, all operation classifications, no invented permissions, one owning surface per operation, tasks/journeys/components/states/domains, later gate ownership and complete blocker coverage. `scripts/generate-step56-admin-foundation.mjs --check` verifies deterministic inventory, traceability, gap register and manifest; unexpected generated files fail. Focused tests inject missing operations, fabricated permissions, false runtime claims, missing states, changed breakpoints, duplicate ownership and premature gate start/PASS.

Full `pnpm verify` continues all existing OpenAPI/design/architecture/policy/build/test checks and adds foundation structural validation/drift checking. No existing test, migration, dependency, runtime or policy check is weakened. `git diff --check` remains required. A draft PR is reviewable, but merge requires every acceptance gate—including the explicit readiness check—to pass on the exact head. Current source gaps mean no merge and no Roadmap/CURRENT-STATE promotion.

After an eventual authorized resolution, rerun focused checks and full verification, obtain exact-head Canonical CI PASS, merge, reread remote main and post-merge CI, then synchronize Roadmap/Current State/Step History with actual transport evidence. Do not predict a commit SHA or self-certify a CI run. Stop after A; B begins only under a later instruction.
