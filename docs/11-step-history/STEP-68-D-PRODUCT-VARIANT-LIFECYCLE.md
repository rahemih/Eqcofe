# EQCOFE — Step 68-D Product & Variant Lifecycle Administration

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `e90a454f001d4e831f6d300927c8fa93325fe1d0`  
Linear: `HOS-72`  
Risk: **HIGH**  
Human Gate: **REQUIRED**

## Entry proof

Step 68-C is terminally canonical:
- PR `#363`;
- governed head `9293ade748941b498c6dced2cb715b47a19b00dc`;
- artifact `23dd05532354b4e23cc8ceb4abedd5952fa7786c99d611644a04f529c80cab6f`;
- canonical merge SHA `e90a454f001d4e831f6d300927c8fa93325fe1d0`;
- postmerge Canonical CI #1905, Phase A #1404 and CodeQL #1055 = **SUCCESS**;
- terminal Lock release `6204515193`.

## Owned capability

68-D implements only:
- Product create;
- Product edit with canonical `If-Match`;
- Product publish;
- Product archive / unarchive;
- Product stop / resume sales;
- Variant create;
- Variant edit;
- Variant stop / resume sales.

The existing 68-C list/detail/read-state foundation remains the read authority.

## Product concurrency

`PATCH /admin/products/{id}` requires `If-Match`.

The UI must submit the exact version loaded with the edit form. A 409 outcome means the state changed and must be re-read before any further action. Silent overwrite, automatic replay, or browser-side version invention is forbidden.

## Lifecycle authority

Frontend guards are only UX guards; Backend remains authoritative.

Frozen lifecycle boundaries:
- new product starts as draft;
- archived product cannot be edited, published or resumed;
- archive disables sales;
- unarchive returns draft and must not silently resume sales;
- publish prerequisites are server-owned and are not duplicated in browser logic;
- stop/resume sales results are authoritative server outcomes.

## Mutation transport

All mutations:
- originate only from same-origin Admin form actions;
- use the existing server-owned Admin auth bridge;
- do not expose raw cookies or tokens to browser code;
- are not auto-retried;
- fail closed on auth/permission failure;
- preserve request ID for recovery when available.

Endpoints that may return HTTP 202 are treated as **accepted but not final**. The UI re-reads canonical state or instructs the operator to re-read; it never fabricates completion.

## Variant boundary

Source-proven variant fields:
- SKU;
- optional barcode;
- optional name suffix;
- active / inactive state;
- sales enabled;
- optional positive-integer weight;
- canonical existing attribute assignments on create when explicitly supplied by later UI authority.

68-D does not create or edit Attribute definitions/values/assignments UI. It does not edit price or inventory.

## Read-only supporting references

Brand and Category canonical GET operations may be used only to populate Product create/edit choices. Their mutation belongs to 68-E.

## Explicit exclusions

68-D does not implement:
- Attribute / Brand / Category structure mutation — 68-E;
- Media upload/review/attachment/order/primary/delete — 68-F;
- Sales-Control preview/apply bulk operations — 68-G;
- pricing, FX, inventory editing or Excel import — Step 69;
- Backend/OpenAPI/generated-contract/database changes;
- Storefront or Product Design mutations;
- Master Roadmap / Current-State closure reconciliation — 68-I;
- Graph/Graphify.

## Execution branch

`eqcofe/step68-d-product-variant-lifecycle`

Task Contract:
`docs/14-multi-agent/tasks/EQCOFE-STEP68-D-PRODUCT-VARIANT-LIFECYCLE-001.json`

## Exit gate

68-E stays blocked until the final exact 68-D artifact has:
1. Canonical CI PASS;
2. Phase A PASS;
3. CodeQL PASS;
4. deterministic Review PASS;
5. Independent Security PASS;
6. exact-artifact Scope Lock ACTIVE;
7. explicit Project Owner Human Gate approval;
8. protected merge;
9. exact-SHA postmerge Canonical CI / Phase A / CodeQL PASS;
10. terminal Lock RELEASED;
11. Linear `HOS-72` synchronized.

Any HEAD or artifact mutation after Owner approval invalidates that approval and requires a new Human Gate.


## Entry audit repair — Variant optimistic concurrency

Before exposing Variant edit UI, live runtime and the canonical HTTP contract were compared.

Observed:
- runtime `PATCH /admin/variants/:id` reads required `If-Match` and calls `expectedVersion(v)`;
- VariantCommandService rejects a changed version with `VERSION_CONFLICT`;
- canonical OpenAPI and its generated TypeScript previously omitted the `If-Match` parameter for this exact operation.

68-D therefore includes one bounded carry-forward contract repair:
- `contracts/http/openapi.yaml`: add canonical `IfMatch` to `PATCH /admin/variants/{id}`;
- `src/generated/openapi.ts`: synchronize that exact operation header typing.

No other operation, schema, database model or backend business rule is changed by this repair.

The same audit confirmed that runtime Variant creation always creates status `active`; therefore 68-D does not present a create-time status selector and does not expose create-time Attribute assignment. Those capabilities are not fabricated from broader OpenAPI fields.

## Implementation evidence

The Admin implementation is intentionally server-mediated:
- `catalog-mutation.server.ts` owns typed mutation transport and authoritative post-mutation re-read;
- `catalog-form.server.ts` owns same-origin and bounded form parsing;
- Product update and Variant update send quoted exact versions through `If-Match`;
- network/timeout/abort after mutation becomes an explicit unknown outcome, never an automatic retry;
- HTTP 202 remains accepted/non-final and is followed by canonical re-read;
- Product create/edit/lifecycle and Variant create/edit/sales actions do not expose pricing, inventory, taxonomy-structure, media or bulk-sales-control mutation.

