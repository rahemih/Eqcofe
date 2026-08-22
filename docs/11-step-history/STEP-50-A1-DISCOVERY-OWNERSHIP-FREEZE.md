# Step 50 / A1 — Discovery / Requirements / Ownership Freeze

## Status
COMPLETE — discovery and ownership freeze recorded; implementation has not started.

## Canonical source
- Repository: `rahemih/Eqcofe`
- Branch baseline: `main`
- Roadmap: `docs/12-current-state/MASTER-ROADMAP.md`
- Official Step 50 scope: Excel Product & Pricing Management Backend.

## Sequencing note
Step 49 A11 Final Canonical Closure is intentionally deferred by explicit project instruction until Step 53 completes. Step 50 work must not rewrite or falsely close Step 49 evidence.

## Official Step 50 scope
1. export templates;
2. validated / dry-run imports;
3. row-level errors;
4. product / variant updates;
5. price preview / apply;
6. idempotent re-import;
7. recovery / audit behavior.

## Existing implementation discovery
- No dedicated `src/modules/excel` module exists on the canonical baseline.
- Repository code search found no existing Excel/XLSX import/export implementation to reuse as an authoritative Step-50 subsystem.
- Catalog already owns product/variant/SKU/barcode identity and lifecycle.
- Pricing already owns mutable Toman prices, price rules and price history.
- Existing project-wide Audit, RBAC, Idempotency and Step-Up conventions must be reused rather than duplicated.

## Ownership freeze
### Step-50 orchestration owns
- workbook/template contract versioning;
- import job identity and file/content fingerprint metadata;
- parse/validation/dry-run orchestration;
- row-level validation/result records;
- preview identity and apply orchestration;
- idempotent re-import/replay state;
- import/export audit/recovery metadata.

### Catalog remains authoritative for
- product and variant identity;
- SKU/barcode uniqueness;
- product/variant lifecycle and mutable catalog facts;
- actual catalog mutations.

### Pricing remains authoritative for
- integer-Toman prices;
- price rules and price history;
- actual pricing mutations and commercial validation.

### Step 50 must not own
- a parallel product database;
- a parallel price engine or price ledger;
- inventory quantities or stock mutations unless separately scoped by the roadmap;
- payment/order/finance state;
- raw uploaded workbook as trusted authoritative state.

## Security / integrity boundaries
- Uploaded workbook content is untrusted input.
- File type, size, workbook structure, sheet names, headers, cell types and row counts require server-side validation.
- Formula/macro/external-link behavior must fail closed or be explicitly neutralized; imported formulas must never become executable server authority.
- Every mutation must derive from a validated server-side preview and canonical Catalog/Pricing services.
- Dry-run must have zero business-state mutation.
- Apply must detect stale preview / concurrent canonical changes and fail closed rather than silently overwrite newer data.
- Re-import must be content/idempotency bound so the same workbook cannot double-apply mutations.
- Row errors must not leak secrets or unrelated internal data.
- Staff/RBAC is mandatory for management surfaces; sensitive apply/recovery operations should follow existing Step-Up/idempotency conventions where applicable.

## Data / persistence requirements
Any Step-50 persistence must be forward-only and limited to orchestration evidence such as import jobs, content hashes, row results, previews, apply/recovery state and audit references. Existing Catalog/Pricing tables remain authoritative and old migrations must not be rewritten.

## API / contract requirements
Future Step-50 HTTP operations must define request validation, response contracts, RBAC, idempotency, errors and OpenAPI/strict contract coverage before closure. Export/download surfaces must not expose secrets or unrestricted internal columns.

## Proposed dependency-ordered substeps
- **A1** — Discovery / Requirements / Ownership Freeze — COMPLETE
- **A2** — Workbook Contract + Safe Parser / Export Template Foundation
- **A3** — Import Job Persistence + Fingerprint / Idempotency Foundation
- **A4** — Catalog Dry-Run Validation + Row-Level Error Model
- **A5** — Catalog Product / Variant Apply Boundary
- **A6** — Pricing Preview / Apply Boundary
- **A7** — Re-import / Recovery / Concurrency Controls
- **A8** — Staff RBAC / Audit / API + Export Operations
- **A9** — Security / E2E / Regression Gate
- **A10** — Final Canonical Closure

The exact implementation details of A2+ may be refined by evidence, but no new business scope may be added without roadmap/project authorization.

## A1 Definition of Done
- canonical roadmap scope extracted;
- existing implementation searched;
- authoritative Catalog/Pricing ownership preserved;
- workbook security boundary frozen;
- DB/API/dependency requirements identified;
- substep order frozen for implementation;
- no production feature, migration or unrelated refactor introduced in A1.

## Next safe action
Step 50 / A2 — Workbook Contract + Safe Parser / Export Template Foundation.
