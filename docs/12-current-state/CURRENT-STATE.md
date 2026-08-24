# EQCOFE Current State

## Trusted state date
**2026-08-24**

## Official repository
- Repository: `rahemih/Eqcofe`
- Default/canonical branch: `main`
- Historical repository: `rahemih/digikala-clone` — historical/recovery evidence only; not canonical application source.

## Canonical baseline lineage
- Verified Step-44 baseline: `b239dfe825b615f36caf2e26cc7abc80c70d349c`.
- Step-48 final closure merge: `149d5ec440fc789376ade48553b67f636a571f6d`.
- Step-49 A10 merge: `b6adb6180ffd9e770af7ae04f85f8d513e5bffc8`.
- Step-49 A11 final closure merge: `2ebe995c829914b6cb230c7e05363af59be2ec38`.
- Step-50 A1 merge: `11a39c6bda058c9d590acfcf2c78616197c86247`.
- Step-50 A2 merge: `2f1780684c2575750535f8740e678d7e5c4e37cb`.
- Step-50 A3 merge: `de0cd36237ce51e2acb87a12b432b121b42e8a9d`.
- Step-50 A4 merge: `4118ea87f7e6d895596d2ccd8411b2b89b997518`.
- Step-50 A5 merge: `458fe4eed2202e45e786ff690ab5989f96baeb31`.
- Step-50 A6 merge: `bfb10e39bab53b1371260f005693ba9589139c7e`.
- Step-50 A7 merge: `1ac725e7bc23557993905d6d7754ee8b822fee5a`.
- Step-50 A8 merge: `6fe3147ef1af901253dbb7f8295e4781555157f8`.
- Step-50 A9 merge: `d67a70ffd0fc54a8fe908a4a7e608cc06b49e1ad`.
- Step-50 A10 implementation/final-closure merge: `f41007622b5b9fa32f240d8b8a4729d4110d4700`.
- Step-51 A2 implementation merge: `f1ed3b1f555a6bac518e9fdf66919b503e2a2a59`; final evidence merge: `8b86c8697ee851589a2bc9a3670a1515ce23307f`.
- Step-51 A3 implementation merge: `3a1a292500b2a8638cd4e345a0912341dec08309`; final evidence merge: `5fe451d7998bfca876a5de715137c7fff2908cd9`.
- Step-51 A4 implementation merge: `57e42d1154c19f1a554dff602556d1d5c947f8a`; final evidence merge: `501235990299f8e5fd1d53fe3c4ffb8a0729d86f`.
- Step-51 A5 implementation merge: `b57a2ae3919490f8897ee456cea2dde24c6c3729`; final evidence merge: `d16a928e562d299b1ce562467ca8c54c36e962a6`.
- Step-51 A6 implementation merge: `ec59ca7020a50923bb9bfc8ae329ba397f0c99cc`; final evidence merge: `a9b38cd3fd9f9100a862f850b282fb9abfcc1024`.
- Step-51 A7 implementation merge: `84babcaf8ca2dff930696d058339cf2b84417762`; final evidence merge / canonical audit baseline: `bb1d2376d00e9b615e1532d0520d951ef1b07e09`.
- Step-51 A8 implementation merge: `77516f27a468006996bcbcbdd411b27d6870d0e9`.
- Step-51 A8 final evidence merge / A9 discovery baseline: `f1da042582dc1443a94be3a2cfa1866c0b0d18d8`.
- Step-51 A9 discovery/final evidence merge: `a3c0aeb3aa346987357181d1b572a7081b7d0efc`.
- Step-51 A10 implementation merge: `06f2d3636e8232b318d846c7ea3f50ff684d33cb`.
- Step-51 A10 final evidence merge / A11 discovery baseline: `5df2b32ac9fafc5b2a3e7628f62fca83d5e53331`.
- Step-51 A11 discovery/final evidence merge: `551cd800d5c96fc4c148896e8322295dbbaf078e`.
- Step-51 A12 implementation merge: `7e17e4969b812916cb730e4ba5dc5b9052a84ab7`.

## Closed steps
- **Step 45 — Content, Articles & SEO Backend — CLOSED / FINAL GATE PASS**
- **Step 46 — Marketing, Promotions & Customer Club Backend — CLOSED / FINAL GATE PASS**
- **Step 47 — External Integration Foundation — CLOSED / FINAL GATE PASS**
- **Step 48 — EQCOFE AI Backend Foundation — CLOSED / FINAL GATE PASS**
- **Step 49 — Physical Store / POS Backend — CLOSED / FINAL GATE PASS**
- **Step 50 — Excel Product & Pricing Management Backend — CLOSED / FINAL GATE PASS**

Detailed closure evidence remains immutable in `docs/11-step-history/` and merged PR/CI history.

## Step 49 final closure state
**Step 49 — Physical Store / POS Backend — CLOSED / FINAL GATE PASS.**

A11 completed the previously deferred final canonical closure audit after reviewing PRs #44–#53, changed files, Step-49 migrations, `src/modules/pos`, ownership/security/concurrency/recovery invariants and fresh Canonical CI evidence. No feature, migration, dependency, permission, API or business-rule change was introduced by A11.

### Step 49 progress
- **A1 — Discovery / Requirements / Ownership Freeze — COMPLETE / FINAL GATE PASS**
- **A2 — POS Domain + Physical Sale Transaction Model — COMPLETE / FINAL GATE PASS**
- **A3 — Barcode / SKU Resolution Boundary — COMPLETE / FINAL GATE PASS**
- **A4 — Shared Inventory Consumption + Physical/Online Reserve Enforcement — COMPLETE / FINAL GATE PASS**
- **A5 — POS Pricing / Commercial Snapshot Boundary — COMPLETE / FINAL GATE PASS**
- **A6 — Physical Sale Commit / Payment-Finance Integration Boundary — COMPLETE / FINAL GATE PASS**
- **A7 — Offline Command Queue + Idempotent Sync — COMPLETE / FINAL GATE PASS**
- **A8 — Reconciliation + Conflict / Recovery Controls — COMPLETE / FINAL GATE PASS**
- **A9 — POS RBAC / Admin Operations / Audit + API Contract — COMPLETE / FINAL GATE PASS**
- **A10 — Security / Concurrency / E2E Regression Gate — COMPLETE / FINAL GATE PASS**
- **A11 — Final Canonical Closure Audit — COMPLETE / FINAL GATE PASS**

## Current position
**Step 51 — Analytics & Management Read Models — IN PROGRESS**

### Step 51 progress
- **A1 — Discovery / Requirements / Ownership Freeze — COMPLETE**
- **A2 — Analytics Data Model & Read Projection Foundation — COMPLETE / FINAL GATE PASS**
- **A3 — Authoritative Projection Ingestion — COMPLETE / FINAL GATE PASS**
- **A4 — Sales & Revenue Management Read Model — COMPLETE / FINAL GATE PASS**
- **A5 — COGS / Profit Management Read Model — COMPLETE / FINAL GATE PASS**
- **A6 — Inventory Management Read Model — COMPLETE / FINAL GATE PASS**
- **A7 — Customer Management Read Model — COMPLETE / FINAL GATE PASS**
- **A8 — Wholesale Management Read Model — COMPLETE / FINAL GATE PASS**
- **A9 — Operational Analytics Discovery / Ownership Freeze — COMPLETE / FINAL GATE PASS**
- **A10 — Operational Analytics Projection + Bounded Read Model — COMPLETE / FINAL GATE PASS**
- **A11 — Management Export Discovery / Contract Freeze — COMPLETE / FINAL GATE PASS**
- **A12 — Management Export Jobs + Safe Serialization — COMPLETE / FINAL GATE PASS**

### Step 51 current canonical boundary
- Analytics is read-side and non-authoritative. Orders, Payments, Finance, Inventory, Customer and Wholesale retain mutation authority for their own facts.
- A2 introduced forward-only Analytics projections and stale-watermark protection; A3 consumes event triggers but re-reads authoritative source state before projection.
- A4–A8 provide bounded management composition for sales/revenue, profit/COGS, inventory, customer lifetime metrics and the wholesale application lifecycle.
- A8 re-reads Customer-owned wholesale application facts before stale-watermark-guarded Analytics projection and adds migration `0059`.
- A9 freezes operational analytics to four derived projections: Fulfillment per order, Shipment per shipment, Returns per return and Warranty per claim.
- A9 verified that carrier tracking transitions currently update authoritative Shipment state without an Outbox domain event; A10 must close that durable trigger gap before Shipment projection can be accepted.
- A10 adds migration `0060`, four source-version/watermark-guarded projections, bounded status/age/cycle/freshness composition and atomically closes the Shipment tracking trigger gap with `shipment.tracking_status_changed.v1`.
- A11 freezes nine single-dataset Analytics exports, CSV/JSON safe serialization, 1–500 row and 366-day bounds, immutable idempotent job evidence, three export permissions, audit/redaction and authenticated direct delivery.
- A12 adds migration `0061`, three permissions, actor/idempotency-bound immutable export jobs, nine allow-listed datasets, hardened CSV/JSON, content/freshness evidence and audit-safe direct-download application behavior.
- No A4–A12 HTTP/OpenAPI surface, cross-domain mutation authority, XLSX writer, public/external delivery, SLA threshold or monetary/business-rule change has been introduced.

### Next approved Step 51 slice
**A13 — Hardened Management HTTP / RBAC / OpenAPI** is next. It may expose only existing A4–A10 bounded reads and A12 export operations with Staff/RBAC separation, Step-Up and idempotency where frozen, strict validation, download-header protection, audit agreement and exact OpenAPI contracts.

## Step 50 final closure state
**Step 50 — Excel Product & Pricing Management Backend — CLOSED / FINAL GATE PASS**

### Step 50 progress
- **A1 — Discovery / Requirements / Ownership Freeze — COMPLETE / FINAL GATE PASS**
- **A2 — Workbook Contract + Safe Parser / Export Template Foundation — COMPLETE / FINAL GATE PASS**
- **A3 — Import Job Persistence + Fingerprint / Idempotency Foundation — COMPLETE / FINAL GATE PASS**
- **A4 — Catalog Dry-Run Validation + Row-Level Error Model — COMPLETE / FINAL GATE PASS**
- **A5 — Catalog Product / Variant Apply Boundary — COMPLETE / FINAL GATE PASS**
- **A6 — Pricing Preview / Apply Boundary — COMPLETE / FINAL GATE PASS**
- **A7 — Re-import / Recovery / Concurrency Controls — COMPLETE / FINAL GATE PASS**
- **A8 — Staff RBAC / Audit / API + Export Operations — COMPLETE / FINAL GATE PASS**
- **A9 — Security / E2E / Regression Gate — COMPLETE / FINAL GATE PASS**
- **A10 — Final Canonical Closure + Binary XLSX Trust-Gap Remediation — COMPLETE / FINAL GATE PASS**

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
- no new npm dependency is introduced; A10 later closes the deferred binary XLSX upload/codec transport boundary.

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

## Step 50 A7 canonical foundation
A7 hardens re-import, recovery and concurrency around the existing Excel orchestration boundary:
- forward-only migration `0056_excel_import_recovery.sql` adds append-only `excel.import_job_attempts` evidence;
- one active processing attempt per import job is database-enforced;
- each claim is bound to a unique worker token and terminal transitions require that exact token;
- completed jobs cannot acquire a new execution claim;
- failed jobs cannot auto-retry and require explicit evidence-backed recovery;
- recovery preserves failed attempt evidence and only resets the orchestration job to `pending`;
- retry is bounded to three total attempts;
- no Catalog/Pricing/Inventory/Payments/Finance mutation authority is added and no historical workbook payload is persisted.

Implementation head before evidence commit: `7da51fe5b9b95eea6463045e2464d5eba41d87b5`
Final PR head: `38589cb0929a36ba185c0326311e06ea90f6ab7d`
Merge commit: `1ac725e7bc23557993905d6d7754ee8b822fee5a`
Implementation CI run: `32578116785` — PASS
Exact-head CI run: `32578195241` — PASS
Exact-head verify job: `97043535652` — PASS
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 448 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A7 dedicated tests: **6/6 PASS**
- Runtime tests: **468 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

## Step 50 A8 canonical foundation
A8 exposes the A2–A7 Excel orchestration through a hardened staff administration boundary:
- forward-only migration `0057_excel_rbac_audit_api.sql` adds `excel.view`, `excel.import`, `excel.apply`, and `excel.recover` without assigning roles implicitly;
- `/admin/excel` is staff-only and every route carries explicit RBAC;
- template export reuses the versioned A2 contract;
- dry-run and Catalog/Pricing previews remain non-mutating;
- import creation is HTTP-idempotent in addition to fingerprint identity;
- Catalog/Pricing apply require critical `excel.apply`, Step-Up and idempotency and continue through A5/A6 owner boundaries;
- recovery requires critical `excel.recover`, Step-Up and idempotency and remains A7 evidence/retry bound;
- central Audit records only safe orchestration metadata and never raw workbook/sheet payloads;
- additive `openapi-step50-a8.yaml` contributes 8 strict Admin Excel operations; the canonical validator assembles sorted OpenAPI overlays and rejects duplicate paths/components before validating operations/refs;
- Excel does not gain direct Catalog/Pricing SQL or Inventory/Orders/Payments/Finance authority.

Implementation head before evidence commit: `6bbfba7e7b727827e05d2a691e93ad550eca7926`
Final PR head: `cfb4f63151814a5cc321ebd1a47d386990dc62b8`
Merge commit: `6fe3147ef1af901253dbb7f8295e4781555157f8`
Implementation CI run: `32580222781` — PASS
Implementation verify job: `97048348609` — PASS
Exact-head CI run: `32580318662` — PASS
Exact-head verify job: `97048572444` — PASS
- OpenAPI: PASS — 522 paths / 591 operations / 1161 refs; `openapi-step50-a8.yaml` assembled
- Architecture: PASS — 450 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A8 dedicated tests: **8/8 PASS**
- Runtime tests: **476 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

## Step 50 A9 canonical gate
A9 is the Step-50 security, E2E and regression gate and introduces no new business feature or authority:
- all `/admin/excel` routes remain staff-only and permission-separated;
- apply/recovery remain Step-Up and idempotency protected, and import creation remains idempotent;
- Catalog/Pricing apply remain exact-preview-hash bound and owner-service controlled;
- recovery remains A7 evidence, retry and worker-token constrained;
- Audit excludes raw workbook/sheet/cell payload and secrets;
- runtime RBAC/Step-Up/idempotency agree with the A8 OpenAPI contract;
- migrations `0055`–`0057` remain additive and forward-only;
- all focused Step-50 suites A2–A8 remain present;
- no Inventory/Orders/Payments/Finance authority, migration, dependency or new API is introduced by A9.

Initial gate head: `2d46def081cfdf795372a555eefe3d77fcbf4112`
Final PR head: `7f88eea3587e960b0632fc65425ebbfc742a56c1`
Merge commit: `d67a70ffd0fc54a8fe908a4a7e608cc06b49e1ad`
Focused CI run: `32584563409` — PASS
Focused verify job: `97058886399` — PASS
Exact-head CI run: `32584676256` — PASS
Exact-head verify job: `97059158988` — PASS
- OpenAPI: PASS — 522 paths / 591 operations / 1161 refs
- Architecture: PASS — 450 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A9 dedicated tests: **10/10 PASS**
- Runtime tests: **486 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

## Step 50 A10 final canonical closure
A10 audited A1–A9 and found a material trust-boundary gap: the management API still accepted client-supplied decoded workbook facts while A2 had explicitly deferred real binary XLSX package inspection. A10 closed that gap before closure:
- `BinaryXlsxCodecService` now owns server-side XLSX ZIP/OOXML decoding;
- HTTP accepts opaque base64 XLSX bytes plus file identity, not authoritative client `sheets`, `hasMacros`, `externalLinks` or `byteLength` facts;
- upload, ZIP entry-count and uncompressed-expansion bounds are enforced;
- ZIP64, encryption, unsupported compression, duplicate entries, path traversal and CRC mismatch fail closed;
- required OOXML parts are verified;
- VBA/ActiveX/embedded executable/macro-sheet content, macro-enabled content types, external-link parts/relationships, unsafe XML declarations and formulas are rejected from actual package bytes;
- server-derived workbook sheets/cells are then passed into the existing sanitized parser;
- no new npm dependency, migration, permission or business-domain authority was added;
- Catalog/Pricing preview/apply ownership, Staff/RBAC, Step-Up/idempotency, Audit and recovery boundaries remain intact.

PR: `#84` — MERGED
Final exact-head: `9ca5d33d77afdf054981078bddcca0b5aa69b569`
Merge commit: `f41007622b5b9fa32f240d8b8a4729d4110d4700`
Canonical final CI: `32629722672` — PASS
Verify job: `97170521019` — PASS
- OpenAPI: PASS — 522 paths / 591 operations / 1159 refs
- Architecture: PASS — 451 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A10 dedicated tests: **8/8 PASS**
- Runtime tests: **494 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

## Step 49 frozen ownership boundary
- POS owns physical-sale/session orchestration, physical-sale transaction identity, POS-specific offline command/sync state, reconciliation state, and POS-facing read models.
- Catalog remains authoritative for product/variant/SKU/barcode identity and lifecycle facts.
- Pricing remains authoritative for mutable Toman prices and pricing rules; POS persists immutable transaction snapshots only.
- Inventory remains authoritative for stock truth, availability, reservation/allocation/consumption, physical-protection rules, FIFO and cost lineage.
- Payments remains authoritative for payment facts.
- Finance remains authoritative for accounting/financial facts.

## Next safe action
Proceed to **Step 51 / A13 — Hardened Management HTTP / RBAC / OpenAPI** from the A12 evidence in `docs/11-step-history/STEP-51-A12-MANAGEMENT-EXPORT-JOBS-SAFE-SERIALIZATION.md`. Do not add new projections, XLSX, public links, external delivery or unrelated business scope.

## Global trust rules
1. `rahemih/Eqcofe` is the official repository.
2. `main` is the canonical branch.
3. `docs/12-current-state/MASTER-ROADMAP.md` is the canonical execution roadmap.
4. `docs/11-step-history/` retains immutable substep/closure evidence.
5. Financial values remain integer Toman.
6. Cash-account functionality must not be reintroduced.
7. A step/substep is not COMPLETE merely because code exists; applicable implementation, migrations, contracts, security, tests, documentation, CI and merge gates must pass.
8. Historical recovery evidence must not be rewritten as newly verified implementation.
