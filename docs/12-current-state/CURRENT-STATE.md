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
- Step-49 A10 merge: `b6adb6180ffd9e770af7ae04f85f8d513e5bffc8`.
- Step-50 A1 merge: `11a39c6bda058c9d590acfcf2c78616197c86247`.
- Step-50 A2 merge: `2f1780684c2575750535f8740e678d7e5c4e37cb`.

## Closed steps
- **Step 45 — Content, Articles & SEO Backend — CLOSED / FINAL GATE PASS**
- **Step 46 — Marketing, Promotions & Customer Club Backend — CLOSED / FINAL GATE PASS**
- **Step 47 — External Integration Foundation — CLOSED / FINAL GATE PASS**
- **Step 48 — EQCOFE AI Backend Foundation — CLOSED / FINAL GATE PASS**

Detailed closure evidence remains immutable in `docs/11-step-history/` and merged PR/CI history.

## Deferred closure state
**Step 49 — Physical Store / POS Backend — implementation complete through A10; A11 Final Canonical Closure intentionally deferred by explicit project instruction until Step 53 completes.**

Step 49 evidence must not be rewritten or falsely marked closed before that deferred A11 audit. The deferred audit must review PRs #44–#53 and changed files, verify Step-49 migrations and `src/modules/pos`, verify CI evidence, complete the A11 closure document, synchronize `CURRENT-STATE.md` and `MASTER-ROADMAP.md`, and formally close Step 49.

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
- **A11 — Final Canonical Closure — DEFERRED UNTIL STEP 53**

## Active step
**Step 50 — Excel Product & Pricing Management Backend — ACTIVE**

### Step 50 progress
- **A1 — Discovery / Requirements / Ownership Freeze — COMPLETE / FINAL GATE PASS**
- **A2 — Workbook Contract + Safe Parser / Export Template Foundation — COMPLETE / FINAL GATE PASS**
- **A3 — Import Job Persistence + Fingerprint / Idempotency Foundation — NEXT**
- **A4 — Catalog Dry-Run Validation + Row-Level Error Model — PENDING**
- **A5 — Catalog Product / Variant Apply Boundary — PENDING**
- **A6 — Pricing Preview / Apply Boundary — PENDING**
- **A7 — Re-import / Recovery / Concurrency Controls — PENDING**
- **A8 — Staff RBAC / Audit / API + Export Operations — PENDING**
- **A9 — Security / E2E / Regression Gate — PENDING**
- **A10 — Final Canonical Closure — PENDING**

## Step 50 A1 frozen boundary
- Step-50 orchestration owns workbook/template contract versioning, import-job identity/fingerprint metadata, parse/validation/dry-run orchestration, row-level result records, preview/apply orchestration, idempotent re-import/replay state, and import/export audit/recovery metadata.
- Catalog remains authoritative for product/variant/SKU/barcode identity, lifecycle and actual catalog mutations.
- Pricing remains authoritative for integer-Toman prices, price rules/history and actual pricing mutations.
- Step 50 must not create a parallel product database, price engine/ledger, stock authority, payment/order/finance authority, or treat uploaded workbook content as trusted authoritative state.
- Uploaded workbook content is untrusted. File type/size, workbook structure, sheet names, headers, cell types and row counts require server-side validation.
- Formula, macro and external-link behavior must fail closed or be explicitly neutralized; imported formulas must never become executable server authority.
- Dry-run has zero business-state mutation. Apply must derive from a validated server-side preview and canonical Catalog/Pricing services, detect stale previews/concurrent changes, and fail closed.
- Re-import is content/idempotency bound so the same workbook cannot double-apply mutations.
- Any Step-50 persistence is forward-only and limited to orchestration evidence; existing Catalog/Pricing tables remain authoritative and old migrations are not rewritten.
- Future management HTTP surfaces require Staff/RBAC, validation, idempotency/errors, OpenAPI/strict contract coverage and Step-Up for sensitive apply/recovery actions where applicable.

## Step 50 A2 canonical foundation
A2 introduces a dedicated `src/modules/excel` bounded orchestration surface without importing Catalog or Pricing mutation services:
- versioned workbook contract `eqcofe-step50-v1`;
- XLSX filename/MIME and 10 MiB upload bound;
- bounded sheet/row/column/cell model;
- fail-closed rejection of macros, formulas, external links, invalid sheet names, duplicate sheets, unsafe control characters and unsupported cell types;
- NFKC normalization of sheet names and text;
- versioned export-template metadata with `products`, `variants`, and `prices` sheets;
- `price_toman` is template metadata only; Pricing remains authoritative for actual Toman mutation;
- no database migration, HTTP/OpenAPI endpoint, import-job persistence or business mutation is introduced in A2;
- no new npm dependency is introduced; binary XLSX upload/codec transport remains a later boundary, while A2 defines the sanitized decoded-workbook contract that later orchestration must consume.

### Step 50 A2 verification evidence
PR: `#55` — MERGED  
Implementation head: `1e7a23b0b16a954d53a57876bcfb26119221dbbc`  
Final PR head: `edca7a2916d6b5a6b69c3b24c738ce33aa4076f1`  
Merge commit: `2f1780684c2575750535f8740e678d7e5c4e37cb`  
Canonical implementation CI run: `32557880443` — PASS  
Final exact-head Canonical CI run: `32557958240` — PASS  
Job: `verify` (`96994851910`) — PASS

- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 436 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A2 dedicated tests: **5/5 PASS**
- Runtime tests: **438 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

## Step 49 frozen ownership boundary
- POS owns physical-sale/session orchestration, physical-sale transaction identity, POS-specific offline command/sync state, reconciliation state, and POS-facing read models.
- Catalog remains authoritative for product/variant/SKU/barcode identity and lifecycle facts.
- Pricing remains authoritative for mutable Toman prices and pricing rules; POS persists immutable transaction snapshots only.
- Inventory remains authoritative for stock truth, availability, reservation/allocation/consumption, physical-protection rules, FIFO and cost lineage.
- Payments remains authoritative for payment facts.
- Finance remains authoritative for accounting/financial facts.

## Next safe action
Proceed to **Step 50 / A3 — Import Job Persistence + Fingerprint / Idempotency Foundation** from canonical merge `2f1780684c2575750535f8740e678d7e5c4e37cb`. Do not perform Step 49 A11 closure before Step 53 completes.

## Global trust rules
1. `rahemih/Eqcofe` is the official repository.
2. `main` is the canonical branch.
3. `docs/12-current-state/MASTER-ROADMAP.md` is the canonical execution roadmap.
4. `docs/11-step-history/` retains immutable substep/closure evidence.
5. Financial values remain integer Toman.
6. Cash-account functionality must not be reintroduced.
7. A step/substep is not COMPLETE merely because code exists; applicable implementation, migrations, contracts, security, tests, documentation, CI and merge gates must pass.
8. Historical recovery evidence must not be rewritten as newly verified implementation.
