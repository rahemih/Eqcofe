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
- Step-50 A3 merge: `de0cd36237ce51e2acb87a12b432b121b42e8a9d`.
- Step-50 A4 merge: `4118ea87f7e6d895596d2ccd8411b2b89b997518`.
- Step-50 A5 merge: `458fe4eed2202e45e786ff690ab5989f96baeb31`.
- Step-50 A6 merge: `bfb10e39bab53b1371260f005693ba9589139c7e`.

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
- **A3 — Import Job Persistence + Fingerprint / Idempotency Foundation — COMPLETE / FINAL GATE PASS**
- **A4 — Catalog Dry-Run Validation + Row-Level Error Model — COMPLETE / FINAL GATE PASS**
- **A5 — Catalog Product / Variant Apply Boundary — COMPLETE / FINAL GATE PASS**
- **A6 — Pricing Preview / Apply Boundary — COMPLETE / FINAL GATE PASS**
- **A7 — Re-import / Recovery / Concurrency Controls — NEXT**
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
A2 introduces a dedicated `src/modules/excel` bounded orchestration surface without giving parser/template mutation authority:
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

## Step 50 A3 canonical foundation
A3 adds the forward-only `excel.import_jobs` orchestration boundary, deterministic SHA-256 fingerprinting over sanitized A2 workbook content, database-enforced `(contract_version, fingerprint)` uniqueness, atomic duplicate detection, explicit pending/processing/completed/failed lifecycle transitions, requester-conflict protection and terminal replay safety.

Implementation head: `cacd969d12d106e17fae4fa106c411904350458c`
Final PR head: `5a427a787e3f43f79dff7e421c0ff6512225f673`
Merge commit: `de0cd36237ce51e2acb87a12b432b121b42e8a9d`
Canonical implementation CI run: `32573137560` — PASS
Final exact-head PR CI run: `32573263073` — PASS
Canonical main CI run: `32573327905` — PASS
Job: `verify` (`97031479566`) — PASS
- Migration: `0055_excel_import_jobs.sql` — forward-only
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 440 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A3 dedicated tests: **6/6 PASS**
- Runtime tests: **444 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- No workbook binary/raw payload, Catalog/Pricing mutation, HTTP/API surface or new npm dependency is introduced.

## Step 50 A4 canonical foundation
A4 introduces read-only Catalog dry-run validation over the sanitized workbook contract:
- `products` and `variants` sheets plus required headers are validated before row execution;
- product slugs resolve through exported `CatalogQueryService`;
- SKU resolves through Catalog-owned `PosVariantLookupService`;
- variant/product ownership mismatches fail closed;
- row results retain sheet, 1-based workbook row, code, field and message;
- `prices` is not treated as Catalog authority;
- Excel imports `CatalogModule` only to consume exported query/read boundaries;
- no Catalog/Pricing mutation, direct Catalog SQL, migration, HTTP/API, apply or recovery authority is introduced.

Implementation/final PR head: `0863315c3843fc484f50f1ae4fc3dc5ae1f75e7d`
Merge commit: `4118ea87f7e6d895596d2ccd8411b2b89b997518`
Canonical implementation CI run: `32575606327` — PASS
Exact documentation-head CI run: `32575683495` — PASS
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 442 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A4 dedicated tests: **6/6 PASS**
- Runtime tests: **450 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- First CI run `32575520560` failed only because an A2 test encoded a temporary no-CatalogModule assumption; the test was narrowed to the durable no-mutation/no-execution invariant without deleting or disabling any test.

## Step 50 A5 canonical foundation
A5 adds a server-derived Catalog apply preview and an atomic Catalog-owned mutation boundary:
- preview runs only after A4 dry-run succeeds;
- workbook fingerprint, canonical Product/Variant IDs and optimistic versions are bound into a SHA-256 preview hash;
- apply requires the exact preview hash and recomputes canonical state, so stale previews fail closed;
- Product `name_fa` and lifecycle status changes are applied only through Catalog aggregate rules;
- Variant `barcode` changes are applied only through the Variant aggregate;
- Catalog performs all multi-row Product/Variant mutation in one transaction with optimistic version checks;
- changed aggregates preserve Outbox and central Audit writes;
- publish continues to enforce the existing active-variant and sellable-price rule while Pricing remains authoritative for price mutation;
- no direct Catalog SQL exists in Excel and no Pricing/Inventory/Payments/Finance mutation authority is introduced;
- no new migration, dependency, HTTP/API or RBAC surface is introduced in A5.

Implementation head: `07695e1adf994a5a5bc9ba45f31e678da89e89f5`
Final PR head: `28776ec6768ce0ca46f5d692ca9bea483e2eb4b8`
Merge commit: `458fe4eed2202e45e786ff690ab5989f96baeb31`
Canonical implementation CI run: `32576419753` — PASS
Final exact-head CI run: `32576543739` — PASS
Job: `verify` (`97039619238`) — PASS
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 444 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A5 dedicated tests: **6/6 PASS**
- Runtime tests: **456 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

## Step 50 A6 canonical foundation
A6 adds the canonical Pricing preview/apply boundary for the workbook `prices` sheet:
- SKU identity resolves through Catalog-owned `PosVariantLookupService`;
- `price_toman` must be a non-negative safe integer Toman and duplicate SKU rows fail closed;
- preview binds workbook fingerprint, canonical variant identity, current base-price ID/amount, proposed price and profit-guard outcome into a deterministic SHA-256 hash;
- apply requires the exact preview hash and rechecks current base-price identity/amount inside the Pricing transaction;
- stale price state fails closed with `PRICE_CHANGED_SINCE_PREVIEW`;
- price decreases re-run canonical Profit Guard at apply time;
- changed prices append new canonical `pricing.base_prices` history with `source_type = excel_import`, closing the previous interval;
- Pricing writes canonical Outbox and central Audit evidence including source fingerprint;
- unchanged proposed prices are no-op mutations;
- Excel performs no direct Pricing SQL and receives no Inventory/Payments/Finance authority;
- no new migration, dependency, HTTP/API or RBAC surface is introduced in A6.

Implementation/final head before merge: `9ef01069081165f9fcff17096d26a6a17cdb70ab`
Merge commit: `bfb10e39bab53b1371260f005693ba9589139c7e`
Implementation CI run: `32577388495` — PASS
Exact-head CI run: `32577469737` — PASS
Job: `verify` (`97041781242`) — PASS
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 446 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A6 dedicated tests: **6/6 PASS**
- Runtime tests: **462 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS
- Initial CI run `32577294596` failed only because an A2 regression encoded a temporary no-PricingModule assumption; the test was narrowed to the durable parser/template no-mutation/no-execution invariant without deleting or disabling any test.

## Step 49 frozen ownership boundary
- POS owns physical-sale/session orchestration, physical-sale transaction identity, POS-specific offline command/sync state, reconciliation state, and POS-facing read models.
- Catalog remains authoritative for product/variant/SKU/barcode identity and lifecycle facts.
- Pricing remains authoritative for mutable Toman prices and pricing rules; POS persists immutable transaction snapshots only.
- Inventory remains authoritative for stock truth, availability, reservation/allocation/consumption, physical-protection rules, FIFO and cost lineage.
- Payments remains authoritative for payment facts.
- Finance remains authoritative for accounting/financial facts.

## Next safe action
Proceed to **Step 50 / A7 — Re-import / Recovery / Concurrency Controls** from canonical A6 merge `bfb10e39bab53b1371260f005693ba9589139c7e`. Do not perform Step 49 A11 closure before Step 53 completes.

## Global trust rules
1. `rahemih/Eqcofe` is the official repository.
2. `main` is the canonical branch.
3. `docs/12-current-state/MASTER-ROADMAP.md` is the canonical execution roadmap.
4. `docs/11-step-history/` retains immutable substep/closure evidence.
5. Financial values remain integer Toman.
6. Cash-account functionality must not be reintroduced.
7. A step/substep is not COMPLETE merely because code exists; applicable implementation, migrations, contracts, security, tests, documentation, CI and merge gates must pass.
8. Historical recovery evidence must not be rewritten as newly verified implementation.
