# EQCOFE — Step 69-A Pricing, FX & Excel Administration Canonical Handoff

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical starting baseline: `2eb803d8b2e8ee0eb247818d6bff3d871b71eefc`  
Linear: `HOS-73 — Step 69 — Pricing, FX & Excel Administration`  
Risk: **MEDIUM**  
Human Gate: **NOT REQUIRED**

## Entry proof

Step 68 is terminally closed:

- final closure PR: `#369`;
- Step-68 final merge/main SHA: `2eb803d8b2e8ee0eb247818d6bff3d871b71eefc`;
- Step-68-I exact head: `cdda56715818849ff51f741ae334883f429db0cc`;
- Step-68-I artifact: `8fbad429a2bcf576adffb5adafbf6e7759ec4ca83edfe94ab0eb6f45ebaae437`;
- exact-head Canonical CI #1987 / `39035477471`, Phase A #1486 / `39035477468` and CodeQL #1134 / `39035475859` = SUCCESS;
- Merge Policy #1643 final evaluation = SUCCESS / `blockers=[]` / `merge_eligible=true`;
- exact-SHA postmerge Canonical CI #1988 / `39035953698`, Phase A #1487 / `39035953718` and CodeQL #1135 / `39035953795` = SUCCESS;
- terminal Step-68-I Lock release comment: `6234380960`.

Live guard at Stage-A start:

- `main = 2eb803d8b2e8ee0eb247818d6bff3d871b71eefc`;
- comparison `2eb803d8b2e8ee0eb247818d6bff3d871b71eefc...main` is identical: ahead 0 / behind 0;
- no open repository PR exists;
- no Step-69 implementation PR existed before this Stage-A branch;
- Graph/Graphify remains **RETIRED / OUT OF SCOPE**.

Therefore Step 69 is authorized to start.

## Canonical Step-69 product scope

Roadmap / Step-68-I handoff scope:

- base price and price-history administration;
- pricing rules and bulk/category/brand/product pricing controls with preview-before-apply;
- FX source/status/rate administration and affected-product preview/apply;
- Excel template/import/export-equivalent template download, dry-run, recovery, catalog preview/apply and pricing preview/apply UX;
- governed bulk data handling with existing Backend authority, Step-Up, idempotency and stale-state protections.

Step 69 does **not** own Inventory, Warehouse, Reservation, Transfer, Procurement or POS administration. Those Step56-D surfaces belong to Step 70.

## Step56-D inheritance

Step69 owns exactly **8 Step56-D Admin surfaces / 35 source-traced operations**:

| Surface | Scope | Operations |
| --- | --- | ---: |
| AD-D-01 | Base price and price history | 4 |
| AD-D-02 | Pricing rules | 6 |
| AD-D-03 | Bulk pricing preview/status/apply | 3 |
| AD-D-04 | Currency rates, source observation and impact | 8 |
| AD-D-05 | FX-linked pricing rules | 6 |
| AD-D-19 | Excel template, dry-run, import and recovery | 4 |
| AD-D-20 | Excel Catalog preview/apply | 2 |
| AD-D-21 | Excel Pricing preview/apply | 2 |
| **Total** | **Step69-owned** | **35** |

Explicitly excluded Step56-D surfaces: **AD-D-06 through AD-D-18**. They are Inventory/Procurement scope and remain for Step 70.

## Frozen operation authority

### AD-D-01 — Base price and history
- `GET /admin/pricing/base-prices`
- `POST /admin/pricing/base-prices`
- `POST /admin/pricing/base-prices/preview`
- `POST /admin/variants/{variant_id}/prices`

### AD-D-02 — Pricing rules
- `GET /admin/pricing/rules`
- `GET /admin/pricing/rules/{id}`
- `PATCH /admin/pricing/rules/{id}`
- `POST /admin/pricing/rules`
- `POST /admin/pricing/rules/{id}/activate`
- `POST /admin/pricing/rules/{id}/deactivate`

### AD-D-03 — Bulk pricing
- `GET /admin/pricing/bulk/{operation_id}`
- `POST /admin/pricing/bulk/preview`
- `POST /admin/pricing/bulk/apply`

### AD-D-04 — FX rates and impact
- `GET /admin/pricing/currency-rates`
- `GET /admin/pricing/currency-rates/current`
- `POST /admin/pricing/currency-rates/{id}/reject`
- `POST /admin/pricing/currency-rates/{id}/select`
- `POST /admin/pricing/currency-rates/refresh`
- `POST /admin/pricing/currency-rates/register`
- `POST /admin/pricing/currency/impact-preview`
- `POST /admin/pricing/currency/apply`

### AD-D-05 — FX-linked pricing rules
- `GET /admin/pricing/currency-rules`
- `GET /admin/pricing/currency-rules/{id}`
- `PATCH /admin/pricing/currency-rules/{id}`
- `POST /admin/pricing/currency-rules`
- `POST /admin/pricing/currency-rules/{id}/activate`
- `POST /admin/pricing/currency-rules/{id}/deactivate`

### AD-D-19 — Excel template / dry-run / import / recovery
- `GET /admin/excel/exports/template`
- `POST /admin/excel/dry-run`
- `POST /admin/excel/imports`
- `POST /admin/excel/imports/{id}/recover`

### AD-D-20 — Excel Catalog
- `POST /admin/excel/catalog/preview`
- `POST /admin/excel/catalog/apply`

### AD-D-21 — Excel Pricing
- `POST /admin/excel/pricing/preview`
- `POST /admin/excel/pricing/apply`

No additional Pricing/FX/Excel HTTP authority may be invented by the Admin frontend.

## Live Backend / Admin discovery

Canonical Backend already exposes the Step69 Pricing/FX authority in `src/modules/pricing/presentation/pricing.controller.ts`, including:
- `pricing.view`, `pricing.manage`, `pricing.bulk.manage` and `pricing.currency.manage` RBAC;
- Step-Up and idempotency on bulk apply;
- Step-Up and idempotency on FX apply;
- If-Match on mutable pricing-rule and currency-rule update operations.

Canonical Excel orchestration already exists under `src/modules/excel/**` with staff-only RBAC, safe binary workbook processing, dry-run/preview boundaries and Step-Up/idempotency on sensitive apply/recovery commands.

At Stage-A discovery, `apps/admin/**` contains no Pricing runtime implementation. Excel appears only in generated navigation permission metadata; no Step69 Excel runtime flow is source-proven in the Admin app. Step69 is therefore an Admin implementation phase over existing Backend authority, subject to Stage-B contract reconciliation.

## Frozen pricing boundaries

- Money remains integer Toman.
- Base-price create validates nonnegative integer Toman, interval order and profit guard on decreases.
- Base-price preview is informational; it is not an apply token and does not imply If-Match.
- Price-rule global scope is exclusive; percentage maximum is 100.
- Price-rule PATCH requires If-Match; no rule-delete route exists.
- Bulk preview rejects scope populations above 5000 and exposes at most the first 200 affected items with `affected_count`.
- Bulk apply requires the expected count, Step-Up and scoped idempotency.
- Bulk apply checks stored preview guards and changed current price amounts; no requester-binding or universal fresh-guard guarantee is invented.
- Unknown mutation outcome must resolve through authoritative status/read or manual review, never blind replay.

## Frozen FX boundaries

- `POST /admin/pricing/currency-rates/refresh` delegates observation retrieval through the existing FX service boundary and fails closed on invalid/stale/mismatched/provider-failed observations before Pricing registration.
- Currency impact preview lifetime is source-defined at 10 minutes and exposes at most the first 200 affected items.
- Scope-query default cap 5001 is not proof of a complete population.
- Rate selection and price apply are separate commands.
- FX apply requires Step-Up and idempotency.
- Existing source does not prove that FX apply rechecks current price amounts or a fresh profit guard; the Admin UI must not claim that guarantee.
- Step 69 administers the existing provider/source abstraction. **Production FX-provider integration remains Step 77**; Step69 must not claim live-provider production readiness.

## Frozen Excel boundaries

- Uploaded XLSX is untrusted input.
- Source-proven limits: max 10 MiB upload, 5000 rows/sheet, 64 columns, 256 ZIP entries and 50 MiB expanded payload.
- No import-list/status GET endpoint exists; no generic import history UI may be fabricated.
- Recovery is only for failed imports, max 3 attempts, with note length 3..500; completed/processing jobs cannot recover.
- Catalog Excel apply resolves existing products/variants only; it can apply product name/status and variant barcode according to existing preview authority. It does not create new products.
- Pricing Excel apply uses unique SKU/variant pricing rows with nonnegative integer Toman, recomputed preview hash and current-price checks.
- Catalog apply and Pricing apply are separate transactions; no combined atomic Catalog+Pricing import guarantee exists.
- Sensitive Catalog/Pricing apply and recovery retain Backend Step-Up/idempotency authority.

## Frozen execution plan

| Stage | Goal | Risk | Human Gate |
| --- | --- | --- | --- |
| 69-A | Canonical handoff, live discovery, Step56-D/runtime/Roadmap reconciliation and scope freeze | MEDIUM | No |
| 69-B | Backend/OpenAPI/generated-contract readiness for all 35 Step69 Pricing/FX/Excel operations; repair only proven drift/gaps | HIGH | Yes |
| 69-C | Shared Admin Pricing/FX/Excel read, loading/error/denied/conflict foundation and safe server transport | MEDIUM | No |
| 69-D | Base-price/history and Pricing Rule administration | HIGH | Yes |
| 69-E | Bulk pricing scope/preview/status/review/apply administration | HIGH | Yes |
| 69-F | FX rate/source/rule/impact-preview/apply administration | HIGH | Yes |
| 69-G | Excel template/dry-run/import/recovery plus Catalog/Pricing preview/apply administration | HIGH | Yes |
| 69-H | Integrated Persian RTL/accessibility/responsive/security production-browser acceptance | MEDIUM | No |
| 69-I | Final canonical verification, documentation reconciliation and Step70 handoff | MEDIUM | No |

Risk may only move upward automatically. Any downgrade requires explicit governance evidence.

## Stage-A boundaries

69-A is documentation/governance-only.

Forbidden in 69-A:
- Admin runtime UI mutation;
- Backend/OpenAPI/database/generated-contract mutation;
- pricing/FX/Excel business-rule mutation;
- Inventory/Procurement/POS scope;
- workflow/dependency changes;
- Product Design semantic rewrite;
- production FX-provider integration;
- Graph/Graphify generation.

## 69-A exit gate

69-B must not mutate Backend/OpenAPI/generated contracts until 69-A itself is terminally canonical:

1. exact-head Canonical CI and Phase A PASS;
2. deterministic Review PASS;
3. exact-artifact Scope Lock ACTIVE;
4. protected merge;
5. exact-SHA postmerge Canonical CI, Phase A and CodeQL PASS;
6. terminal Lock RELEASED;
7. Linear HOS-73 synchronized.

Until then:

```text
STEP_69_A = IN_PROGRESS / NOT_CANONICAL
STEP_69_B = BLOCKED_FROM_MUTATION
```
