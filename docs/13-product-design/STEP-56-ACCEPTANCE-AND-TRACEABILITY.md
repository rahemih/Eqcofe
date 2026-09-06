# Step 56 — Acceptance and Traceability

**56-A: FOUNDATION ACCEPTANCE PASS; canonical CI/merge/post-merge verification required. 56-B: design gate complete, canonical transport required; C–H: NOT_STARTED.**

## Acceptance matrix

| Gate | Scope | Required evidence before PASS |
|---|---|---|
| A | Canonical handoff and scope freeze | Pinned main/closure evidence; complete source inventory; exact actor/permission claims and operation coverage; complete source-gap dispositions and NO_ACTION restrictions; contract/docs/tests; full verify; exact-head CI and safe merge |
| B | IA and shared shell | All AD-B obligations; eight inherited navigation groups; session/permission/scope filtering; local destination search; table/detail/form patterns; shared state, confirmation and Step-Up patterns |
| C | Catalog and media | All AD-C obligations; product/variant/taxonomy/media lifecycle and source-proven action restrictions; review/publish/stop/archive/recovery trace |
| D | Pricing, inventory, procurement, Excel | All AD-D obligations; preview/hash/version/approval boundaries; FIFO and stock ownership; receipt/reversal lineage; opaque workbook validation, safe retry and no raw payload leakage |
| E | Orders, payment, after-sales, POS | All AD-E obligations; allowed actions, uncertain payment/status recovery, immutable outcomes, fulfillment handoffs, POS shared-stock/pricing and offline reconciliation |
| F | Customer, wholesale, marketing, content | All AD-F obligations; customer ownership, no self-promotion, terminal wholesale decisions, content versioning, delivery failure and governed AI evidence |
| G | Finance, analytics, configuration, security | All AD-G obligations; integer Toman and source-owned finance, bounded exports, secret boundaries, least privilege, preview/approval/Step-Up and safe operations recovery |
| H | Full audit and canonical closure | Union of every B–G obligation and all 12 journeys; no unowned/duplicate operations or unresolved design coverage/state/restriction exceptions; open implementation evidence stays release-blocking; manifests and exact-head/main CI evidence; canonical synchronization |

The machine gate lists are authoritative for exact B–G surface ownership. H is audit-only and references the full 97-obligation/12-journey union. `node scripts/validate-step56-admin-foundation.mjs --require-ready` passes only when all foundation invariants, source-gap coverage, responsible domains and NO_ACTION restrictions are intact. It does not certify runtime/API/permission reconciliation. Exact-head CI, merge and post-merge verification remain mandatory transport gates. A source gap can be released for execution only through canonical reconciliation evidence; deleting the record, removing an obligation or weakening its restriction fails validation.

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

Shared B components may be referenced by later gates, but each domain screen must still document its actual action/state/focus behavior. A generic dialog frame cannot stand in for every dangerous action's impact, approval or recovery requirements. Source gaps prohibit presenting executable success for a contract-only operation. Unavailable/disabled concept coverage is required for every operation without reconciled authority; it does not remove its obligation or create an executable success path.

## Cross-domain handoffs

Order → Payments/Refund carries stable order/payment identity, attempts and authoritative status. Order → Fulfillment/Shipment carries allocation and immutable destination context. Returns/Warranty → Inventory/Payments carries owner-supported resolution and audit lineage. Procurement → Inventory/Finance preserves receipt, FIFO and cost lineage. Pricing/FX/Excel → Approval/Audit uses exact preview/hash and scope, never a stale client snapshot. Customer → Wholesale/Pricing uses authoritative customer type, not persona intent. POS → Catalog/Pricing/Inventory preserves owner truth and immutable sale snapshots. AI → Content requires governed draft/source review and never overwrites published truth. Operations → retry/restore uses bounded source-supported controls, never blanket replay.

## Validation and governance

`scripts/step56-admin-sources.mjs` assembles exactly the current canonical OpenAPI base and named overlays, and inspects TypeScript controller decorators with the installed TypeScript parser. Route parameters are normalized only for structural matching; exact source names are retained. This is static source evidence, not live HTTP execution, service-level audit verification or a new API assembler. The separate POS YAML remains supplemental.

`scripts/validate-step56-admin-foundation.mjs` validates the complete mandatory source set, immutable baseline snapshots/identity, inherited contracts, all operation classifications, both permission claims and conflicts, Step-Up/audit provenance, one owning surface per operation, task/actor/journey/component/global-and-lifecycle state coverage, bidirectional domain ownership, B dependencies/auth variants, H union and complete blocker coverage. `scripts/generate-step56-admin-foundation.mjs --check` verifies deterministic inventory, traceability, gap register and manifest; unexpected generated files fail. Negative tests cover omissions and false authority, including the concrete failures identified by the independent Astra review.

Full `pnpm verify` continues all existing OpenAPI/design/architecture/policy/build/test checks and adds foundation structural validation/drift checking. No existing test, migration, dependency, runtime or policy check is weakened. `git diff --check` remains required. Merge requires foundation acceptance, the explicit readiness check and exact-head Canonical CI. Source discrepancies remain visible as open implementation evidence requirements, with no claim of backend/API/permission remediation.

After foundation verification, obtain exact-head Canonical CI PASS, merge, reread remote main and post-merge CI, then synchronize Roadmap/Current State/Step History with actual transport evidence. Do not predict a commit SHA or self-certify a CI run. Stop after A; B begins only under a later instruction.

## B progression

The foundation contract remains the immutable A closure snapshot. B contract `step56-admin-shell-wireframes.json` and `STEP-56-B-ADMIN-IA-SHELL.md` supply subsequent evidence; A's historical nextGate is not a current execution instruction. B retains every A obligation/restriction and provides 74 frames / 91 artifacts. Stop after B; C starts only under a later instruction.
