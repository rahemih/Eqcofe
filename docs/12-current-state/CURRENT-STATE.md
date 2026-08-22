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

## Closed steps
- **Step 45 — Content, Articles & SEO Backend — CLOSED / FINAL GATE PASS**
- **Step 46 — Marketing, Promotions & Customer Club Backend — CLOSED / FINAL GATE PASS**
- **Step 47 — External Integration Foundation — CLOSED / FINAL GATE PASS**
- **Step 48 — EQCOFE AI Backend Foundation — CLOSED / FINAL GATE PASS**

Detailed closure evidence for closed steps remains immutable in `docs/11-step-history/` and the corresponding merged PR/CI history. This file records the current operational state rather than duplicating all historical evidence.

## Active step
**Step 49 — Physical Store / POS Backend — ACTIVE**

### Step 49 progress
- **A1 — Discovery / Requirements / Ownership Freeze — COMPLETE**
- **A2 — POS Domain + Physical Sale Transaction Model — COMPLETE / FINAL GATE PASS**
- **A3 — Barcode / SKU Resolution Boundary — COMPLETE / FINAL GATE PASS**
- **A4 — Shared Inventory Consumption + Physical/Online Reserve Enforcement — COMPLETE / FINAL GATE PASS**
- **A5 — POS Pricing / Commercial Snapshot Boundary — COMPLETE / FINAL GATE PASS**
- **A6 — Physical Sale Commit / Payment-Finance Integration Boundary — COMPLETE / FINAL GATE PASS**
- **A7 — Offline Command Queue + Idempotent Sync — NEXT**
- **A8 — Reconciliation + Conflict / Recovery Controls — PENDING**
- **A9 — POS RBAC / Admin Operations / Audit + API Contract — PENDING**
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

## Step 49 A6 canonical implementation
A6 introduces forward-only migration `0051_pos_commit_payment_finance.sql` and establishes an atomic server-side physical-sale commit path:
1. authenticated staff and optimistic POS version are required;
2. A5 pricing snapshots must be complete and the sale total must be valid integer Toman;
3. Payments-owned `payments.physical_sale_receipts` records the authoritative physical-sale receipt (`cash` or `card` at this boundary) with idempotent replay/conflict checks;
4. every sale line is consumed through Inventory-owned `InventoryPosService`, preserving row locking, free-stock checks, FIFO cost lineage and append-only movements;
5. POS CAS-transitions the sale from `draft` to `committed` only after all payment/inventory work succeeds;
6. `pos.sale.committed.v1` is emitted with authoritative sale, receipt, revenue, COGS and movement references;
7. Finance consumes that event idempotently into `finance.pos_sale_financial_facts`, enforcing `revenue_toman - cogs_toman = gross_profit_toman`.

The full path is one database transaction: any receipt, stock, FIFO/cost-lineage or final CAS failure rolls back the commit. POS does not call the order-bound online `PaymentService` and does not write Finance facts directly.

## Step 49 A6 verification evidence
PR: `#49`  
Implementation head after assertion correction: `0de869409df81b9d9bec303abdbd6843ad9b9ea8`  
Canonical implementation CI run: `32539808847`  
Job: `verify` (`96947463346`) — PASS

- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 426 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A6 dedicated tests: **6/6 PASS**
- Runtime tests: **399 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

The first A6 CI run (`32539696690`) exposed two test-assertion defects only; both were corrected without deleting or disabling tests and without weakening production safeguards.

## Step 49 shared inventory / reserve invariants
- Physical and online commerce use the same authoritative Inventory state.
- Online availability continues to honor the existing physical-protection rule through Inventory-owned policy (`onlineSellable()`).
- Physical POS consumption can use only unencumbered physical stock and cannot consume reserved, allocated, damaged or quarantined quantities.
- The existing default physical protection remains 20% unless changed through the already-canonical Inventory warehouse control; POS does not own a second percentage.

## Step 49 pricing invariants
- POS resolves prices through canonical Pricing services only.
- Sale-line commercial snapshots are integer Toman and preserve base price/rule identity needed for historical evidence.
- Quantity mutation invalidates stale pricing snapshots.
- Sale totals obey `subtotal_toman - discount_total_toman = total_toman` at persistence boundary.

## Step 49 offline / reconciliation freeze for next substeps
- Offline capability is limited to POS-originated command capture/synchronization; it is not a separate authoritative store database.
- Every offline command requires stable client-command/idempotency identity.
- Server reconciliation is authoritative; stale offline price/stock facts cannot silently override server rules.
- Conflicts must remain observable and recoverable; destructive history rewriting is prohibited.
- Secrets and privileged credentials must not be embedded in offline payloads.

## Next safe action
Proceed to **Step 49 / A7 — Offline Command Queue + Idempotent Sync** only after the exact A6 documentation/current-state head passes Canonical CI and PR #49 is merged to `main`.

## Global trust rules
1. `rahemih/Eqcofe` is the official repository.
2. `main` is the canonical branch.
3. `docs/12-current-state/MASTER-ROADMAP.md` is the canonical execution roadmap.
4. `docs/11-step-history/` retains immutable substep/closure evidence.
5. Financial values remain integer Toman.
6. Cash-account functionality must not be reintroduced.
7. A step/substep is not COMPLETE merely because code exists; applicable implementation, migrations, contracts, security, tests, documentation, CI and merge gates must pass.
8. Historical recovery evidence must not be rewritten as newly verified implementation.
