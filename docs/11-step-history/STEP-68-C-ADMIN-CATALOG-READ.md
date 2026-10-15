# EQCOFE — Step 68-C Shared Admin Catalog Read Foundation

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `bc5bb287a14d3200a8c234ed5ec0c30e0ee50c11`  
Linear: `HOS-72`  
Risk: **MEDIUM**  
Human Gate: **NOT_REQUIRED**

## Entry proof

Step 68-B is terminally canonical:

- PR: `#362`;
- exact approved head: `f37061906ead9ab341ec8e57cb3758a7c986a904`;
- artifact: `d6796e1d70264bbd94bf5561419a4c784077d47ff18fbcd800753a5c881f1739`;
- canonical merge/main SHA: `bc5bb287a14d3200a8c234ed5ec0c30e0ee50c11`;
- exact-SHA Canonical CI #1898, Phase A #1397, CodeQL #1047 and Storefront Quality #889 = **SUCCESS**;
- terminal Step 68-B Lock release comment: `6204157481`.

## Purpose

68-C creates the first executable Catalog workspace inside the existing secure Admin shell, but it is deliberately **read-only**.

Owned capability:
- source-proven Admin product list;
- source-proven product detail;
- source-proven product variant read context;
- typed server-side transport through the existing Admin auth bridge;
- opaque cursor navigation;
- client-local filtering of rows already loaded in the current page;
- explicit loading, empty, denied, not-found and unavailable states;
- Persian RTL, responsive and keyboard-accessible read presentation.

## Frozen source authority

### Product list

Canonical operation:
`GET /admin/products`

Allowed query parameters only:
- `limit`;
- opaque `cursor`.

No server-side `q`, status, category, brand or other filter is source-proven for this endpoint. Stage 68-C must not invent one.

The local search field filters only rows already present in the loaded response. The UI must state this limitation and must not claim catalog-wide completeness.

### Product detail

Canonical operation:
`GET /admin/products/{id}`.

Only response-owned fields may be rendered. Absent optional fields are not fabricated. Catalog audit-history has no canonical HTTP endpoint and remains explicitly unavailable.

### Variants

Canonical read operation:
`GET /admin/products/{product_id}/variants`.

Stage 68-C may present variant read context only. Create/edit/status/sales changes remain Stage 68-D.

## Permission and transport boundary

- Admin session authority remains server-owned.
- Catalog reads must reuse the existing `createAdminAuthBridge`.
- Browser code receives no raw session cookie or credential authority.
- Backend `403` remains authoritative and must render a neutral denied state.
- Transport/network/5xx failure must fail closed with a recoverable unavailable state and request ID when present.
- No navigation visibility is treated as authorization.

## Explicitly out of scope

68-C does **not** implement:
- product create/edit/publish/archive/unarchive;
- product or variant stop/resume sales;
- variant create/edit;
- attribute/brand/category mutations — 68-E;
- media upload/review/attach/reorder/primary/detach/delete — 68-F;
- sales-control preview/apply — 68-G;
- pricing/FX/Excel — Step 69;
- Backend/OpenAPI/generated contract/database changes;
- Storefront or Product Design mutations;
- Current-State / Master Roadmap closure reconciliation — 68-I;
- Graph/Graphify.

## Execution branch

`eqcofe/step68-c-admin-catalog-read`

Task Contract:
`docs/14-multi-agent/tasks/EQCOFE-STEP68-C-ADMIN-CATALOG-READ-001.json`

## Exit gate

68-D remains blocked until:
1. exact-head Canonical CI PASS;
2. exact-head Phase A PASS;
3. exact-head CodeQL PASS;
4. deterministic Review PASS;
5. exact-artifact Scope Lock ACTIVE;
6. protected merge;
7. exact-SHA postmerge Canonical CI / Phase A / CodeQL PASS;
8. terminal Lock RELEASED;
9. Linear `HOS-72` records `STEP_68_C = CANONICAL_COMPLETE`.

No Project Owner Human Gate is required for this frozen MEDIUM-risk stage.
