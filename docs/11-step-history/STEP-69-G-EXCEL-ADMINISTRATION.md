# EQCOFE — Step 69-G Excel Administration

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `a2cfcb5a306110e84aa17fcbc17c7114da9ddf88`  
Linear: `HOS-73 — Step 69 — Pricing, FX & Excel Administration`  
Risk: **HIGH**  
Human Gate: **REQUIRED — FINAL EXACT ARTIFACT**

## Entry proof

69-F is terminal/canonical:

- PR #375 merged from exact Head `86d56b91d1601b7ca93a00b440b85c748c0638b9`;
- exact 69-F artifact: `2064a93699049daae992162306ed2b06578425e89248c97e7398f40c40dccacd`;
- protected canonical merge/main SHA: `a2cfcb5a306110e84aa17fcbc17c7114da9ddf88`;
- exact-SHA Canonical CI #2101, Phase A #1600 and CodeQL #1250 are SUCCESS;
- terminal 69-F Lock release comment: `6312340369`.

Stage 69-G therefore owns the previously frozen Excel surfaces AD-D-19, AD-D-20 and AD-D-21 only.

## Frozen source authority

### AD-D-19 — template / dry-run / import / recovery

- `GET /admin/excel/exports/template` — `excel.view`;
- `POST /admin/excel/dry-run` — `excel.view`;
- `POST /admin/excel/imports` — `excel.import`, Idempotency-Key required;
- `POST /admin/excel/imports/{id}/recover` — `excel.recover`, Step-Up + Idempotency-Key required.

### AD-D-20 — Catalog Excel

- `POST /admin/excel/catalog/preview` — `excel.view`;
- `POST /admin/excel/catalog/apply` — `excel.apply`, Step-Up + Idempotency-Key required.

Catalog Apply can mutate only source-proven existing Product/Variant fields represented by preview operations. No new Product creation authority is claimed.

### AD-D-21 — Pricing Excel

- `POST /admin/excel/pricing/preview` — `excel.view`;
- `POST /admin/excel/pricing/apply` — `excel.apply`, Step-Up + Idempotency-Key required.

Pricing values remain nonnegative integer Toman. Existing Backend current-price verification remains authoritative.

## Untrusted XLSX boundary

Browser file metadata is not workbook authority. The Admin route accepts an XLSX file only to construct the canonical binary transport:

- fileName;
- canonical XLSX MIME type;
- opaque contentBase64.

The Backend remains authoritative for workbook structure and security. Frozen limits remain:

- maximum upload: 10 MiB;
- maximum rows per sheet: 5000;
- maximum columns per sheet: 64;
- maximum ZIP entries: 256;
- maximum expanded payload: 50 MiB.

## Recovery and idempotency boundary

No import-list or import-status GET route exists. The Admin UI must not invent one.

Idempotency keys are server-derived and never browser authority:

- import create: exact workbook-byte SHA-256;
- Catalog Apply: exact preview hash;
- Pricing Apply: exact preview hash;
- recovery: job UUID + normalized note digest.

Unknown import/apply/recovery outcomes fail closed. Because no source-proven status read exists, the UI does not automatically replay and does not claim that an uncertain mutation succeeded or failed.

Recovery accepts only the source-proven failed-import workflow; Backend remains authority for failed-only status, maximum three attempts and note validation. UI additionally bounds recovery note to 3..500 characters before transport.

## Transaction boundary

Catalog Apply and Pricing Apply are separate transactions and separate Step-Up actions. No combined atomic Catalog+Pricing apply is provided or claimed.

## Stage-G write boundary

Allowed:
- `apps/admin/**`;
- this history document;
- Stage-G Task Contract;
- generated Task Catalog.

Forbidden:
- Backend, OpenAPI, generated contract or database mutation;
- Storefront;
- Current-State / Master Roadmap;
- Product Design semantic mutation;
- Inventory / Procurement / POS;
- production FX-provider integration;
- Graph/Graphify.

## Exit gate

69-H remains blocked until:

1. exact-head Canonical CI + Phase A + CodeQL PASS;
2. deterministic Review PASS;
3. independent Security PASS;
4. exact-artifact Scope Lock ACTIVE;
5. Project Owner Human Gate on exact Head + Artifact;
6. protected merge;
7. exact-SHA postmerge verification;
8. terminal Lock RELEASED;
9. Linear HOS-73 synchronized.

Until then:

```text
STEP_69_G = IN_PROGRESS / HIGH / NOT_CANONICAL
STEP_69_H = BLOCKED_FROM_MUTATION
```
