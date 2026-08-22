# EQCOFE Current State

## Trusted state date
**2026-08-22**

## Official repository
- Repository: `rahemih/Eqcofe`
- Default/canonical branch: `main`
- Historical repository: `rahemih/digikala-clone` — historical/recovery evidence only; not canonical application source.

## Canonical baseline lineage
- Verified Step-44 baseline: `b239dfe825b615f36caf2e26cc7abc80c70d349c`.
- Step-48 final closure merge: `149d5ec440fc789376ade48553b67f636a571f6d`.
- Step-49 A5 merged baseline: `ee48c1350991dbb1effda2de21f2ffbcb0b2830c`.
- Step-49 A6 merge: `8f23e38b05812f67b56a1f8986be283ec0947995`.
- Step-49 A7 merge: `e2cea0598c0ba612b1d92fda14a064cc23d43d8a`.

## Closed steps
- **Step 45 — Content, Articles & SEO Backend — CLOSED / FINAL GATE PASS**
- **Step 46 — Marketing, Promotions & Customer Club Backend — CLOSED / FINAL GATE PASS**
- **Step 47 — External Integration Foundation — CLOSED / FINAL GATE PASS**
- **Step 48 — EQCOFE AI Backend Foundation — CLOSED / FINAL GATE PASS**

Detailed closure evidence for closed steps remains immutable in `docs/11-step-history/` and corresponding merged PR/CI history.

## Active step
**Step 49 — Physical Store / POS Backend — ACTIVE**

### Step 49 progress
- **A1 — Discovery / Requirements / Ownership Freeze — COMPLETE**
- **A2 — POS Domain + Physical Sale Transaction Model — COMPLETE / FINAL GATE PASS**
- **A3 — Barcode / SKU Resolution Boundary — COMPLETE / FINAL GATE PASS**
- **A4 — Shared Inventory Consumption + Physical/Online Reserve Enforcement — COMPLETE / FINAL GATE PASS**
- **A5 — POS Pricing / Commercial Snapshot Boundary — COMPLETE / FINAL GATE PASS**
- **A6 — Physical Sale Commit / Payment-Finance Integration Boundary — COMPLETE / FINAL GATE PASS**
- **A7 — Offline Command Queue + Idempotent Sync — COMPLETE / FINAL GATE PASS**
- **A8 — Reconciliation + Conflict / Recovery Controls — COMPLETE / FINAL GATE PASS**
- **A9 — POS RBAC / Admin Operations / Audit + API Contract — NEXT**
- **A10 — Security / Concurrency / E2E Regression Gate — PENDING**
- **A11 — Final Canonical Closure — PENDING**

## Step 49 frozen ownership boundary
- **POS** owns physical-sale/session orchestration, physical-sale transaction identity, POS-specific offline command/sync state, reconciliation state, and POS-facing read models.
- **Catalog** remains authoritative for product/variant/SKU/barcode identity and lifecycle facts.
- **Pricing** remains authoritative for mutable Toman prices and pricing rules. POS may persist immutable transaction snapshots only.
- **Inventory** remains authoritative for stock truth, availability, reservation/allocation/consumption, physical-protection rules, FIFO and cost lineage.
- **Payments** remains authoritative for payment facts. POS cannot fabricate online paid/refunded states or bypass payment ownership.
- **Finance** remains authoritative for financial facts/accounting. POS cannot directly become a Finance ledger.
- Existing Orders/Fulfillment/Customer/Marketing ownership remains unchanged unless an explicitly scoped later Step-49 boundary requires integration.

## Step 49 A8 canonical implementation
A8 introduces forward-only migration `0053_pos_offline_reconciliation.sql` and defines explicit recovery for failed A7 offline commands:
1. failed commands remain observable and can be inspected only by their owning staff actor at the A8 application boundary;
2. retry is explicit, never automatic, and is capped at five recovery attempts;
3. every retry records append-only reconciliation history before failed→queued transition;
4. retry delegates back to A7 `OfflineCommandSyncService`, causing current Pricing, Inventory and Payments rules to be re-evaluated instead of trusting stale offline facts;
5. `abandoned` is a terminal state with explicit history and preserved prior error evidence;
6. applied commands cannot be abandoned, abandoned commands cannot be retried, and cross-staff recovery fails closed;
7. offline payloads and historical line effects are never rewritten by reconciliation;
8. history UPDATE/DELETE is blocked by a database trigger.

A8 deliberately does not introduce cross-user/admin reconciliation permission. Administrative RBAC, audit integration and HTTP/OpenAPI exposure remain A9 scope.

## Step 49 A8 verification evidence
PR: `#51`  
Implementation head: `4dbcf5b56159d3598bbbf413bf16aa00143752a7`  
Canonical implementation CI run: `32552910890`  
Job: `verify` (`96982428605`) — PASS

- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 429 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A8 dedicated tests: **7/7 PASS**
- Runtime tests: **413 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

## Step 49 A7 canonical implementation
A7 introduces forward-only migration `0052_pos_offline_command_sync.sql` and establishes an offline-intent / authoritative-server synchronization boundary. POS captures only allow-listed `sale.sync` intent with stable client command identity and deterministic payload hash. Replay-safe line effects prevent duplicate quantities. Reconnect sync uses canonical POS creation, Pricing snapshot and A6 commit boundaries; stale offline price/stock/payment facts are never trusted.

## Step 49 A6 canonical implementation
A6 introduces forward-only migration `0051_pos_commit_payment_finance.sql` and establishes an atomic physical-sale commit path through Payments-owned receipt authority, Inventory-owned stock/FIFO consumption and Finance-owned committed-sale financial facts.

## Step 49 shared inventory / reserve invariants
- Physical and online commerce use the same authoritative Inventory state.
- Online availability continues to honor the existing physical-protection rule through Inventory-owned policy (`onlineSellable()`).
- Physical POS consumption can use only unencumbered physical stock and cannot consume reserved, allocated, damaged or quarantined quantities.
- Existing default physical protection remains 20% unless changed through the canonical Inventory warehouse control; POS does not own a second percentage.

## Step 49 pricing invariants
- POS resolves prices through canonical Pricing services only.
- Sale-line commercial snapshots are integer Toman and preserve base price/rule identity needed for historical evidence.
- Quantity mutation invalidates stale pricing snapshots.
- Sale totals obey `subtotal_toman - discount_total_toman = total_toman` at persistence boundary.

## Step 49 offline / reconciliation invariants
- Offline capability is POS-originated command capture/synchronization, not a separate authoritative store database.
- Every offline command requires stable client-command/idempotency identity.
- Server state is authoritative; stale offline price/stock facts cannot silently override server rules.
- Line effects are replay-safe and command identity is payload-bound.
- Recovery is explicit and bounded; no automatic retry loop exists.
- Reconciliation history is append-only and destructive history rewriting is prohibited.
- `abandoned` is terminal.

## Next safe action
Proceed to **Step 49 / A9 — POS RBAC / Admin Operations / Audit + API Contract** only after the exact A8 documentation/current-state head passes Canonical CI and PR #51 is merged to `main`.

## Global trust rules
1. `rahemih/Eqcofe` is the official repository.
2. `main` is the canonical branch.
3. `docs/12-current-state/MASTER-ROADMAP.md` is the canonical execution roadmap.
4. `docs/11-step-history/` retains immutable substep/closure evidence.
5. Financial values remain integer Toman.
6. Cash-account functionality must not be reintroduced.
7. A step/substep is not COMPLETE merely because code exists; applicable implementation, migrations, contracts, security, tests, documentation, CI and merge gates must pass.
8. Historical recovery evidence must not be rewritten as newly verified implementation.
