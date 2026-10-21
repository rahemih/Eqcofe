# EQCOFE — Step 69-E Bulk Pricing Administration

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `8621831d688e55e0150c6928944d3dff2b385e11`  
Linear: `HOS-73 — Step 69 — Pricing, FX & Excel Administration`  
Surface: `AD-D-03`  
Risk: **HIGH**  
Human Gate: **REQUIRED**

## Entry proof

Step 69-D is terminally canonical:

- PR #373 approved exact Head: `18aa62e67eabcd67e402e6ec744989ec4ef40267`;
- exact Artifact: `1d65c625d84fb63862706806c0d9d8f407b50b8197278fae150673ed2b1c3da5`;
- merge/main SHA: `8621831d688e55e0150c6928944d3dff2b385e11`;
- Human Gate comment: `6309364227`;
- exact-SHA Canonical CI #2081 / `39553914968`, Phase A #1580 / `39553914981`, CodeQL #1232 / `39553915756` = SUCCESS;
- terminal Lock release comment: `6309500326`.

Therefore 69-E is authorized to mutate its frozen Admin/docs scope.

## Source authority

69-E owns exactly the source-proven AD-D-03 operations:

- `POST /admin/pricing/bulk/preview` — permission `pricing.bulk.manage`;
- `POST /admin/pricing/bulk/apply` — permission `pricing.bulk.manage`, Step-Up required, Idempotency scope `pricing.bulk.apply`;
- `GET /admin/pricing/bulk/{operation_id}` — permission `pricing.view`.

No generic list/history/audit endpoint exists and none is invented.

## Preview boundary

Canonical Backend `BulkPricingService.preview` proves:

- scopes: `all | category | brand | product`;
- non-`all` scopes require at least one scope ID;
- affected population above 5000 is rejected;
- response `affected_count` is authoritative for the stored preview;
- response item display is capped to the first 200 items;
- preview lifetime is 10 minutes;
- decreases run the source profit guard and warnings are persisted;
- the preview itself grants no Apply permission.

The Admin UI must label the returned item set as a bounded sample/list and never present it as the complete affected population when `affected_count > items.length`.

## Apply boundary

Canonical Backend `BulkPricingService.apply` proves:

- `preview_id`, reason and exact `expected_affected_count` are required by the generated contract;
- Step-Up is required by runtime middleware;
- `Idempotency-Key` is required and scoped to `pricing.bulk.apply`;
- preview must remain `previewed` and unexpired;
- stored preview count must still match the reviewed count;
- stored items with blocked/unavailable guard status stop the apply;
- current base-price amount is re-read and must match the preview old price before each write;
- success writes new base-price rows and marks the operation applied/completed.

Not source-proven and therefore never claimed:

- requester binding between preview and apply;
- a universal fresh profit-guard evaluation at apply time;
- a newly computed full-population count beyond source behavior;
- automatic safe retry with a new idempotency key.

## Recovery boundary

Unknown Apply outcomes fail closed.

The Admin may read `GET /admin/pricing/bulk/{operation_id}` using the known preview ID. An explicit replay is permitted only when:

1. status has been read authoritatively;
2. operation type is `bulk_price`;
3. operation remains `previewed`;
4. the preview is unexpired;
5. the stored affected count equals the reviewed count;
6. the exact same Apply payload is retained;
7. the exact same `Idempotency-Key` is reused;
8. a fresh Step-Up is completed.

No automatic replay is permitted.

## Implementation scope

Planned Admin implementation:

- `apps/admin/app/pricing/pricing-bulk.server.ts`;
- `apps/admin/app/routes/pricing-bulk.tsx`;
- `apps/admin/app/routes.ts`;
- `apps/admin/app/shell/AdminShell.tsx`;
- `apps/admin/app/styles/pricing.css`;
- `apps/admin/scripts/verify-step69-e-bulk-pricing.ts`;
- `apps/admin/package.json`;
- this history document;
- Stage-E task contract and generated task catalog.

## Explicit non-authority

69-E does not mutate:

- FX / currency-rate / currency-rule workflows (69-F);
- Excel workflows (69-G);
- Backend, OpenAPI, generated contracts or database;
- Inventory / Procurement / POS (Step 70);
- production FX provider integration (Step 77);
- Storefront, Current-State or Product-Design source files;
- Graph/Graphify.

## Exit gate

69-F remains blocked until 69-E completes:

1. exact-head Canonical CI + Phase A + CodeQL;
2. deterministic Review PASS;
3. independent Security PASS;
4. exact-artifact Scope Lock ACTIVE;
5. Project Owner exact-artifact Human Gate;
6. protected merge;
7. exact-SHA postmerge Canonical CI + Phase A + CodeQL;
8. terminal Lock RELEASED;
9. Linear HOS-73 sync.

Until then:

```text
STEP_69_E = IN_PROGRESS / NOT_CANONICAL
STEP_69_F = BLOCKED_FROM_MUTATION
```
