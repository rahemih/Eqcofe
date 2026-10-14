# EQCOFE — Step 68-B Catalog & Media Contract Readiness

Status: **IN_PROGRESS / HIGH RISK / HUMAN GATE REQUIRED**

Canonical base: `fcca92ee97dfb81ba56f5519bf5be85d02a1336c`  
Linear: `HOS-72`  
Task: `EQCOFE-STEP68-B-CATALOG-MEDIA-CONTRACT-001`

## Entry proof
Step 68-A is canonical complete through PR #361, exact merge SHA `fcca92ee97dfb81ba56f5519bf5be85d02a1336c`, postmerge Canonical CI/Phase A/CodeQL PASS and terminal Lock release comment `6167410028`.

## Frozen authority
Step56-C remains exactly 8 surfaces / 46 source-traced Catalog & Media operations. Step69 pricing/inventory/Excel authority remains out of scope. Graph/Graphify remains retired.

## Live contract findings
- Existing Admin Catalog operations: 46/46 present.
- Explicitly typed success responses before 68-B: 3.
- Untyped success responses before 68-B: 43.
- Canonical media attachment type before 68-B: image/video/document.
- Canonical upload MIME before 68-B: JPEG/PNG/WebP/MP4.
- Roadmap-required true 3D/360 capability before 68-B: absent.
- Admin variant read path leaks camelCase domain properties beside snake_case HTTP aliases and must be normalized.
- Media upload OpenAPI carries a purpose field while runtime ignores it; purpose/MIME compatibility must become authoritative.

## 3D resolution boundary
68-B authorizes the smallest self-contained 3D transport:
- upload MIME: `model/gltf-binary`;
- attached media type: `model_3d`;
- format: GLB only;
- max upload size remains the existing 50 MiB runtime limit;
- no `model/gltf+json`, external buffer/texture dependency graph, invented viewer URL, spin-frame schema, or arbitrary 3D metadata.

Public Product Detail remains image/video-only during 68-B. Public 3D rendering is not silently enabled by this backend/admin contract stage.

## Execution checkpoints
1. DB/runtime 3D capability + boundary tests.
2. HTTP response-shape normalization required for typed Admin contracts.
3. OpenAPI explicit success schemas for all 46 operations + generated TypeScript parity.
4. Deterministic test/CI repair, including source-hash-only Step56/57 provenance regeneration if required.
5. Exact-head Review + Lock + CI/CodeQL.
6. **Human Gate** before protected merge.

Until checkpoint 5 completes:
```text
STEP_68_B = IN_PROGRESS / NOT_CANONICAL
PROTECTED_MERGE = FORBIDDEN
HUMAN_GATE = NOT_YET_READY
```
