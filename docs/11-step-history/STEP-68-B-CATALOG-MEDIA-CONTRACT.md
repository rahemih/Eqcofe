# EQCOFE — Step 68-B Catalog & Media Contract Readiness

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `fcca92ee97dfb81ba56f5519bf5be85d02a1336c`  
Linear: `HOS-72 — Step 68 — Catalog & Media Administration`  
Risk: **HIGH**  
Human Gate: **REQUIRED — FINAL EXACT ARTIFACT**

## Entry proof

- Step 68-A is terminally canonical through PR #361 / merge `fcca92ee97dfb81ba56f5519bf5be85d02a1336c`.
- Terminal 68-A Lock release: `6167410028`.
- Frozen authority remains exactly 8 Step56-C surfaces and 46 source-traced operations.
- Graph/Graphify remains retired and out of scope.

## Verified starting gaps

1. Only 3 of the 46 frozen Admin Catalog/Media operations had typed success bodies in generated OpenAPI; 43 remained success-body opaque.
2. Catalog runtime response shapes were mixed across snake_case, aggregate camelCase and raw database rows, which is not a stable frontend contract.
3. Admin product `primary_image` mislabeled an internal `storage_key` as `url`.
4. Roadmap requires video/3D media capability, while canonical media attachment supported only `image|video|document` and upload MIME supported only JPEG/PNG/WebP/MP4.
5. Public Product Detail is intentionally and canonically image/video-only; Step 68-B must not silently widen that Storefront contract.
6. No canonical generic bulk product-field mutation is proven; sales-control preview/apply remains the only source-proven bulk-like Catalog authority. Excel belongs Step 69.

## 3D reconciliation

68-B chooses the minimum governed capability:
- Admin media type: `model_3d`;
- upload MIME: `model/gltf-binary` (GLB);
- database product-media check widened only for `model_3d`;
- public Product Detail exposure remains unchanged;
- upload purpose is authoritative: product_image/article_image -> image MIME, product_video -> MP4, product_model_3d -> GLB;
- external-resource `.gltf` and 360 spin-frame semantics remain unauthorized.

## Contract readiness package

- explicit success response schemas for the frozen 46-operation Admin Catalog/Media surface;
- normalized Admin DTO shapes for Product, Variant, Brand, Category, Attribute, Media and Sales Control outcomes;
- `storage_key` retained as storage identity, never promoted to a public URL;
- generated TypeScript parity enforced against canonical OpenAPI;
- bounded migration + runtime validation for GLB/model_3d;
- static/runtime contract tests;
- no Step68-C frontend implementation.

## Exit gate

68-C remains blocked until:
1. exact-head Canonical CI / Phase A / CodeQL PASS;
2. deterministic Review PASS;
3. Independent Security PASS;
4. exact-artifact Scope Lock ACTIVE;
5. Project Owner Human Gate APPROVED for that exact head + artifact;
6. protected merge;
7. exact-SHA postmerge verification PASS;
8. terminal Lock RELEASED;
9. Linear HOS-72 synchronization.

```text
STEP_68_B = IN_PROGRESS / NOT_CANONICAL
STEP_68_C = BLOCKED_FROM_MUTATION
```
