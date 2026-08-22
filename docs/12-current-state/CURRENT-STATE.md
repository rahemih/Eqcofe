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
- Step-49 A8 merge: `d36ebf6e99059878977e0dbbc74db22aaba14a3a`.
- Step-49 A9 merge: `ad9cad39f01c5cc3521f9b2b03675086a04ce018`.

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
- **A9 — POS RBAC / Admin Operations / Audit + API Contract — COMPLETE / FINAL GATE PASS**
- **A10 — Security / Concurrency / E2E Regression Gate — COMPLETE / FINAL GATE PASS**
- **A11 — Final Canonical Closure — NEXT**

## Step 49 frozen ownership boundary
- **POS** owns physical-sale/session orchestration, physical-sale transaction identity, POS-specific offline command/sync state, reconciliation state, and POS-facing read models.
- **Catalog** remains authoritative for product/variant/SKU/barcode identity and lifecycle facts.
- **Pricing** remains authoritative for mutable Toman prices and pricing rules. POS may persist immutable transaction snapshots only.
- **Inventory** remains authoritative for stock truth, availability, reservation/allocation/consumption, physical-protection rules, FIFO and cost lineage.
- **Payments** remains authoritative for payment facts. POS cannot fabricate online paid/refunded states or bypass payment ownership.
- **Finance** remains authoritative for financial facts/accounting. POS cannot directly become a Finance ledger.
- Existing Orders/Fulfillment/Customer/Marketing ownership remains unchanged unless an explicitly scoped later Step-49 boundary requires integration.

## Step 49 A10 canonical gate
A10 is gate-only and adds no migration, business rule or new persistence authority. It freezes the complete A2–A9 security/concurrency/E2E boundary with `test/pos-security-concurrency-e2e-a10.spec.ts`:
1. staff-only POS API and separated `pos.view` / `pos.sell` / `pos.reconcile` authorization;
2. idempotency on every POS mutation and Step-Up on reconciliation retry/abandon;
3. row locking plus optimistic sale-version control before physical sale commit;
4. authoritative Pricing, Inventory, Payments, Finance and Catalog ownership remains outside POS persistence;
5. physical Inventory locking, protected stock buckets and FIFO cost lineage remain enforced;
6. offline command identity is payload-bound and replay-safe under concurrency;
7. offline clients cannot assert price, stock, COGS, payment-state or total authority;
8. reconciliation is explicit, capped, terminal when abandoned, and history is append-only;
9. cross-staff admin recovery never rewrites command ownership, payload or historical line effects;
10. runtime RBAC/Step-Up behavior agrees with the strict A9 HTTP contract;
11. every Step-49 suite A2–A9 remains retained;
12. no automatic offline retry scheduler or `0055_*` persistence was introduced.

The first A10 CI run (`32556522384`) failed only two newly written test assertions: one used the wrong local dependency name (`saleRepo` instead of `repo`) and one expected an outdated event spelling. Production code was not changed. The assertions were corrected and no test was removed, skipped or disabled.

## Step 49 A10 verification evidence
PR: `#53`  
Implementation head: `e8ab29e9b7e882f1fea7ad5dca331012e9b27553`  
Canonical implementation CI run: `32556579625`  
Job: `verify` (`96991625235`) — PASS

- OpenAPI canonical root validation: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 432 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A10 dedicated tests: **13/13 PASS**
- Runtime tests: **433 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

## Step 49 A9 canonical implementation
A9 introduced forward-only migration `0054_pos_rbac_audit_api.sql`, staff/RBAC-protected `/admin/pos` HTTP operations, canonical idempotency, Step-Up for sensitive reconciliation, central audit, cross-staff administrative recovery that preserves original command ownership, and strict contract `contracts/http/step49-pos-a9.yaml`.

## Step 49 A8 canonical implementation
A8 introduced forward-only migration `0053_pos_offline_reconciliation.sql` and explicit recovery for failed A7 offline commands. Retry is explicit and capped at five attempts; every decision is append-only, `abandoned` is terminal, payload/history rewriting is prohibited, and owner-scoped recovery delegates back to canonical A7 sync.

## Step 49 A7 canonical implementation
A7 introduced forward-only migration `0052_pos_offline_command_sync.sql` and an offline-intent / authoritative-server synchronization boundary. POS captures only allow-listed `sale.sync` intent with stable client command identity and deterministic payload hash. Replay-safe line effects prevent duplicate quantities. Reconnect sync uses canonical POS creation, Pricing snapshot and A6 commit boundaries; stale offline price/stock/payment facts are never trusted.

## Step 49 A6 canonical implementation
A6 introduced forward-only migration `0051_pos_commit_payment_finance.sql` and an atomic physical-sale commit path through Payments-owned receipt authority, Inventory-owned stock/FIFO consumption and Finance-owned committed-sale financial facts.

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
- Cross-staff admin recovery never changes original command ownership.

## Next safe action
After the exact A10 documentation/current-state head passes Canonical CI and PR #53 is merged to `main`, proceed to **Step 49 / A11 — Final Canonical Closure**.

## Global trust rules
1. `rahemih/Eqcofe` is the official repository.
2. `main` is the canonical branch.
3. `docs/12-current-state/MASTER-ROADMAP.md` is the canonical execution roadmap.
4. `docs/11-step-history/` retains immutable substep/closure evidence.
5. Financial values remain integer Toman.
6. Cash-account functionality must not be reintroduced.
7. A step/substep is not COMPLETE merely because code exists; applicable implementation, migrations, contracts, security, tests, documentation, CI and merge gates must pass.
8. Historical recovery evidence must not be rewritten as newly verified implementation.
