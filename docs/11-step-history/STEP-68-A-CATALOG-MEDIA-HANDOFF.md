# EQCOFE — Step 68-A Catalog & Media Administration Canonical Handoff

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical starting baseline: `f89d89fb99cc3455253f272083d9414febe0cb70`  
Linear: `HOS-72 — Step 68 — Catalog & Media Administration`  
Risk: **MEDIUM**  
Human Gate: **NOT REQUIRED**

## Entry proof

Step 67 is terminally closed:

- final closure PR: `#360`;
- Step-67 final merge/main SHA: `f89d89fb99cc3455253f272083d9414febe0cb70`;
- Step-67-I exact head: `e7a60b0404f9c9a01eb02fc31019bcf0b5ee0c1f`;
- Step-67-I artifact: `fd0a5f3af50bc3a3ae0f8f28041de0e6152b0ad19204f5d64a5bb2938e9c4995`;
- exact-head Canonical CI #1844, Phase A #1343, CodeQL #987 and Merge Policy #1493 = SUCCESS;
- exact-SHA postmerge Canonical CI #1845 attempt 2, Phase A #1344 and CodeQL #988 = SUCCESS;
- terminal Step-67-I Lock release comment: `6167219589`.

Canonical CI #1845 attempt 1 failed only because the inherited Step60-E test harness encountered transient `EADDRINUSE 127.0.0.1:41745`; attempt 2 passed on the exact same merge SHA with no artifact mutation.

Live guard at Stage-A start:
- `main = f89d89fb99cc3455253f272083d9414febe0cb70`;
- no open Step-68 implementation PR exists;
- open dependency PRs #289/#290 are unrelated writers and do not authorize Step-68 scope;
- Graph/Graphify remains **RETIRED / OUT OF SCOPE**.

## Canonical Step-68 product scope

Roadmap scope:
- product/category/brand/variant editing;
- drag-drop media management with an accessible non-drag alternative;
- video / 3D media capability;
- archive/reactivation;
- bulk catalog operations.

The implementation authority is the conjunction of current Roadmap, current runtime/source, OpenAPI/generated contracts and Step56-C design evidence. A design or contract record alone never proves executable authority.

## Step56-C inheritance

Step56-C owns exactly **8 Admin surfaces / 46 source-traced operations**:

| Surface | Scope | Operations |
| --- | --- | ---: |
| AD-C-01 | Product list/detail/create/edit/publish/archive/restore/sales | 9 |
| AD-C-02 | Variant list/create/edit/sales | 5 |
| AD-C-03 | Attribute definitions/values/product+variant assignment | 10 |
| AD-C-04 | Product media attachment/order/primary/detach | 4 |
| AD-C-05 | Brand list/create/edit/sales | 5 |
| AD-C-06 | Category hierarchy/create/edit/sales | 5 |
| AD-C-07 | Media upload/complete/review/reject/delete | 6 |
| AD-C-08 | Sales-control preview/apply | 2 |

All Step68 runtime pages must stay inside these source-proven surfaces unless a later governed contract stage explicitly adds authority.

## Frozen lifecycle / business boundaries

### Products
- create starts as draft;
- archive forces sales off;
- unarchive returns draft and does not silently resume sales;
- archived product cannot update/publish/resume;
- publish requires an active variant and, when sales are enabled, a sellable price;
- product admin list supports only `limit` + opaque `cursor` (default 25 / max 100);
- no invented server q/status filter;
- product detail omits descriptions; absent fields are not invented or submitted blank if untouched;
- no catalog audit-history HTTP endpoint exists.

### Variants
- SKU required, max 120;
- optional barcode max 120, suffix max 180;
- weight is a positive integer;
- active state is distinct from sales-enabled state;
- pricing and inventory editing remain outside Step68.

### Attributes
- types are text / number / boolean / select;
- exactly one typed value per assignment;
- product/variant assignment validates ownership/category/context;
- PUT assignment replaces the full set;
- no invented If-Match assignment guard.

### Brand / Category
- name max 150 and canonical slug validation;
- category parent must exist;
- self/descendant cycles prohibited;
- no brand/category delete/archive endpoint may be invented.

### Media attachment / upload
- attached media must be active;
- variant binding must belong to the product;
- media type must match the source asset;
- maximum one primary media;
- reorder applies only to attached media with nonnegative integer order;
- detach removes relation only; it does not delete the asset;
- upload request is separate from complete and approval;
- currently source-proven upload MIME: JPEG / PNG / WebP / MP4;
- current max source-proven size: 52,428,800 bytes;
- SHA-256 is client-computed, not manually entered;
- delete fails while media is referenced;
- no media-library list endpoint and no restore endpoint exist;
- no virus-scan, storage byte-verification, thumbnail-generation or deployed storage-success claim may be invented.

### Sales control
- scope = global / brand / category / product / variant;
- non-global scope requires ID;
- preview lifetime = 600 seconds;
- apply requires existing Step-Up;
- apply compares stored preview count, not a fresh recount;
- requester binding is not source-proven;
- expired/unknown mutation outcome is read/manual follow-up only, never blind retry.

## Required 3D/360 contract reconciliation

Roadmap and Owner scope require video/3D media, but canonical runtime currently supports only image/video/document media capability and Step56-C upload accepts JPEG/PNG/WebP/MP4. Repository discovery found **no canonical 3D/360 media type, GLB/GLTF model metadata, viewer URL contract, spin-frame model or 3D upload authority**.

Step61 explicitly recorded this gap and deferred true 3D/360 backend capability to a later governed media implementation stage.

Therefore:

```text
STEP68_3D_STATUS = REQUIRED_CONTRACT_GAP
STEP68_A_3D_FRONTEND = FORBIDDEN
STEP68_B_MUST_RECONCILE = TRUE
```

68-B must either create a governed canonical backend/database/OpenAPI/generated contract for the required 3D capability or prove a Project Owner-approved scope amendment. The frontend must not fabricate 3D metadata, type aliases or viewer capability.

## Bulk-operation boundary

No generic bulk product-field mutation was proven in current Catalog runtime discovery.

Source-proven Step68 bulk authority is currently:
- sales-control preview/apply across global/brand/category/product/variant scope.

Excel catalog/price bulk import belongs to Step69. Step68 must not move Step69 Excel authority earlier or invent generic bulk editing APIs.

## Frozen execution plan

| Stage | Goal | Risk | Human Gate |
| --- | --- | --- | --- |
| 68-A | Canonical handoff, live discovery, Step56-C/runtime/Roadmap reconciliation and scope freeze | MEDIUM | No |
| 68-B | Backend/DB/OpenAPI/generated contract readiness for all 46 Catalog/Media operations + required 3D capability reconciliation | HIGH | Yes |
| 68-C | Shared Admin Catalog read/detail/list/state foundation; cursor pagination and local-only loaded-row filtering | MEDIUM | No |
| 68-D | Product + Variant create/edit/lifecycle/publish/archive/restore/stop-resume sales | HIGH | Yes |
| 68-E | Attribute / Brand / Category structure administration and version/conflict handling | MEDIUM | No |
| 68-F | Media upload/complete/review/attach/reorder/primary/detach/delete plus approved video/3D capability | HIGH | Yes |
| 68-G | Step-Up protected sales-control preview/apply and source-authorized bulk catalog controls | HIGH | Yes |
| 68-H | Integrated RTL/accessibility/responsive/security production-browser acceptance | MEDIUM | No |
| 68-I | Final canonical verification, documentation reconciliation and Step69 handoff | MEDIUM | No |

Risk may only move upward automatically. Any downgrade requires explicit governance evidence.

## Stage-A boundaries

68-A is documentation/governance-only.

Forbidden in 68-A:
- Admin runtime UI mutation;
- Backend/OpenAPI/database/generated-contract mutation;
- media type/schema mutation;
- product/variant/taxonomy/business-rule mutation;
- Step69 pricing/FX/Excel scope;
- workflow/dependency changes;
- Product Design semantic rewrite;
- graph generation.

## 68-A exit gate

68-B must not mutate Backend/DB/OpenAPI until 68-A itself is terminally canonical:

1. exact-head Canonical CI and Phase A PASS;
2. deterministic Review PASS;
3. exact-artifact Scope Lock ACTIVE;
4. protected merge;
5. exact-SHA postmerge Canonical CI, Phase A and CodeQL PASS;
6. terminal Lock RELEASED;
7. Linear HOS-72 synchronized.

Until then:

```text
STEP_68_A = IN_PROGRESS / NOT_CANONICAL
STEP_68_B = BLOCKED_FROM_MUTATION
```
