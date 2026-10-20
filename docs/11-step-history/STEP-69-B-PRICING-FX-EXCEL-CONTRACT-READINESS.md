# EQCOFE — Step 69-B Pricing, FX & Excel Contract Readiness

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `6bc57e87778a3819e0224b6c7e51636af0f0ff95`  
Linear: `HOS-73 — Step 69 — Pricing, FX & Excel Administration`  
Risk: **HIGH**  
Human Gate: **REQUIRED — FINAL EXACT ARTIFACT**

## Entry proof

69-A is terminal/canonical:

- PR #370 merged;
- exact 69-A head: `75a9b1b397fa76185b11152e3d0fdc2257d88a2c`;
- 69-A artifact: `04ad6a8bf38dede7f9bdf6aacf455206f34c2dae2b55f6a5582ae7a7b8cdef7b`;
- canonical merge/main SHA: `6bc57e87778a3819e0224b6c7e51636af0f0ff95`;
- exact-head Canonical CI #1990 / `39039646832` and Phase A #1489 / `39039646715` = SUCCESS;
- deterministic Merge Policy #1646 = SUCCESS / `blockers=[]` / `merge_eligible=true`;
- exact-SHA postmerge Canonical CI #1991 / `39040107247`, Phase A #1490 / `39040107348`, CodeQL #1137 / `39040107088` = SUCCESS;
- terminal 69-A Lock release comment: `6235007699`.

69-B live guard:

- `main = 6bc57e87778a3819e0224b6c7e51636af0f0ff95`;
- compare `6bc57e87778a3819e0224b6c7e51636af0f0ff95...main` = identical, ahead 0 / behind 0;
- no open repository PR exists;
- Graph/Graphify remains RETIRED / OUT OF SCOPE.

## Frozen Step69 authority

Step69 owns exactly 35 source-traced operations:

- AD-D-01..05: 27 Pricing/FX operations;
- AD-D-19..21: 8 Excel operations.

AD-D-06..18 remain Step70. Production FX-provider integration remains Step77.

## Live contract discovery

### Pricing / FX

All 27 Pricing/FX operations are present in:
- canonical runtime: `src/modules/pricing/presentation/pricing.controller.ts`;
- canonical base contract: `contracts/http/openapi.yaml`;
- base generated path inventory: `src/generated/openapi.ts`.

However, before 69-B:
- typed success bodies: **0 / 27**;
- all **17 / 17 POST** operations expose success status that does not match current Nest runtime default 201;
- at least **10** operations omit source-proven `x-eqcofe.permission` metadata despite runtime `@Permissions(...)`;
- base generated path presence therefore exists, but response data is not usable as the Admin business-contract authority.

### Excel

All 8 Excel operations are source-proven in runtime and in historical additive overlay:
`contracts/http/openapi-step50-a8.yaml`.

Before 69-B:
- Excel paths in `src/generated/openapi.ts`: **0 / 8**;
- `pnpm contract:types` generates only from `contracts/http/openapi.yaml`;
- Admin frontend contract authority imports only `src/generated/openapi.ts`;
- retaining Excel only in the Step50 overlay would force Stage 69-G to use ungenerated/parallel DTO authority, which is forbidden.

Therefore 69-B will promote the existing Step50 Excel operation/schema authority into the base canonical OpenAPI, remove the now-redundant Step50 overlay, update the historical Excel contract tests to resolve the canonical base location without weakening their security assertions, and regenerate `src/generated/openapi.ts`.

This is a contract-location/type-readiness migration only. It does not change Excel runtime semantics.

## Runtime-accuracy rules

- Global success envelope remains `{ success: true, data, meta }` through the existing ResponseEnvelopeInterceptor.
- GET and PATCH success remain 200 unless runtime proves otherwise.
- Pricing/FX POST operations use runtime-accurate Nest default 201; synthetic 200/202 alternatives are not frontend authority.
- Pricing rule PATCH and currency rule PATCH retain required If-Match.
- Bulk apply retains Step-Up + Idempotency.
- Currency-rate select retains Step-Up but does not gain invented idempotency.
- Currency apply retains Step-Up + Idempotency.
- Preview/read operations do not gain Step-Up.
- Permissions remain server-derived and must match controller decorators exactly.
- No delete route is invented.
- No requester-binding/fresh-guard guarantee is invented for pricing bulk/FX workflows.
- Production FX provider readiness is not claimed.

## Excel migration rules

- Existing eight Step50 Excel routes are preserved one-for-one.
- Existing workbook validation boundaries remain authoritative: 10 MiB upload, 5000 rows/sheet, 64 columns, 256 ZIP entries, 50 MiB expanded payload.
- Existing permissions remain `excel.view`, `excel.import`, `excel.apply`, `excel.recover`.
- Existing Step-Up/idempotency remains source-bound on Catalog/Pricing apply and recovery; import idempotency remains source-bound.
- Catalog apply does not create new products.
- Catalog apply and Pricing apply remain separate/non-atomic.
- No generic import-list/status GET route is invented.
- Historical Step50 documents remain immutable history; only executable tests are updated to follow the current canonical contract location.

## Allowed mutation

69-B is contract/test/governance plus one source-proven bounded runtime repair.

Primary write authority:
- `src/modules/pricing/application/pricing-import-apply.service.ts` — exact one-line source-type constraint repair only;
- `contracts/http/openapi.yaml`;
- `contracts/http/openapi-step50-a8.yaml` (migration/removal only);
- `src/generated/openapi.ts`;
- `test/excel-admin-api-a8.spec.ts`;
- `test/excel-security-e2e-a9.spec.ts`;
- `test/excel-final-closure-a10.spec.ts`;
- `test/excel-pricing-apply-a6.spec.ts` — regression expectation for the bounded source-type repair;
- `test/step69-pricing-fx-excel-contract.spec.ts`;
- this history document;
- the 69-B Task Contract and generated Task Catalog.

Only generator-equivalent Step56/57 provenance/hash repair is additionally authorized if canonical CI proves recovered-source drift from the OpenAPI migration. No Product Design semantics may change.

## Forbidden mutation

- all Pricing runtime files except `src/modules/pricing/application/pricing-import-apply.service.ts`;
- `src/modules/excel/**`;
- `src/modules/integrations/**`;
- `database/**`;
- `apps/**`;
- `.github/**`;
- package/dependency/workspace files;
- Current-State/Roadmap in Stage B;
- Step70 Inventory/Procurement/POS authority;
- Step77 production-provider integration;
- Graph/Graphify.

## Bounded runtime repair discovered during 69-B

Live source/DB reconciliation found a persistence defect in the existing Excel Pricing Apply path:

- `PricingImportApplyService.apply` writes base prices with `sourceType: 'excel_import'`;
- `pricing.base_prices.source_type` CHECK accepts only `manual|bulk|currency|import|system`;
- therefore a valid Excel Pricing Apply can reach persistence and fail on the database constraint.

69-B authorizes exactly one runtime repair: use the already-defined `import` source type. No migration, enum expansion, pricing rule change, permission change or Excel workflow expansion is authorized.

## Exit gate

69-C remains blocked until 69-B reaches all of:

1. exact-head Canonical CI + Phase A PASS;
2. exact-head CodeQL / Independent Security PASS;
3. deterministic Review PASS;
4. exact-artifact Scope Lock ACTIVE;
5. **Project Owner Human Gate on exact head + exact artifact**;
6. protected merge;
7. exact-SHA postmerge Canonical CI + Phase A + CodeQL PASS;
8. terminal Lock RELEASED;
9. Linear HOS-73 synchronized.

Until the Project Owner exact-artifact approval:

```text
STEP_69_B = IN_PROGRESS / HIGH / NOT_CANONICAL
STEP_69_C = BLOCKED_FROM_MUTATION
```
