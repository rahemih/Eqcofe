# EQCOFE — Step 68-F Media Administration

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `4fe36171f1a7902bd449efbeef239e1b05cf0e05`  
Linear: `HOS-72 — Step 68 — Catalog & Media Administration`  
Risk: **HIGH**  
Human Gate: **REQUIRED — FINAL EXACT ARTIFACT**

## Entry proof

- Step 68-E is terminally canonical through PR #365 / merge `4fe36171f1a7902bd449efbeef239e1b05cf0e05`.
- Terminal 68-E Lock release: `6231729776`.
- Exact-SHA Canonical CI #1958, Phase A #1457 and CodeQL #1109 passed.
- Step 58 Storefront Quality #934 passed on exact-SHA rerun after a transient inherited test-harness port collision; no source mutation was needed for the pass.
- Graph/Graphify remains retired and out of scope.

## Frozen authority

Step 68-F owns only source-proven Step56-C media surfaces:

- **AD-C-04 — Product media and ordering**
  - `GET /admin/products/{product_id}/media`
  - `POST /admin/products/{product_id}/media`
  - `POST /admin/products/{product_id}/media/reorder`
  - `DELETE /admin/products/{product_id}/media/{media_id}`
- **AD-C-07 — Media request/review/delete**
  - `POST /admin/media/upload-request`
  - `GET /admin/media/{id}`
  - `POST /admin/media/{id}/complete`
  - `POST /admin/media/{id}/approve`
  - `POST /admin/media/{id}/reject`
  - `DELETE /admin/media/{id}`

No media-library/list endpoint exists and none may be invented.

## Media and 3D boundary

Canonical upload authority is limited to JPEG, PNG, WebP, MP4 and GLB up to 50 MiB. Step 68-B added the bounded Admin-only `model_3d` / `model/gltf-binary` / `product_model_3d` capability. GLB is required; external-resource glTF and spin/360 semantics remain unauthorized. Public Storefront Product Detail remains image/video-only.

Product attachment requires active media, compatible MIME/media type and same-Product ownership for a supplied Variant. Reorder permits at most one primary; detach removes the relationship rather than deleting the asset. Asset deletion remains server-authoritative and referenced assets cannot be deleted.

## Upload-capability safety

The signed upload URL is ephemeral capability material. It must not be printed, visibly rendered, logged or persisted in browser storage. Transfer and completion are separate states. Unsafe mutations are not automatically retried; ambiguous outcomes require an explicit canonical read before any repeat.

## Bounded reliability repair

The Step 68-E exact-SHA postmerge Storefront Quality run exposed `EADDRINUSE 127.0.0.1:41772` in the inherited Step67 Admin acceptance harness. The same SHA passed on rerun. Step 68-F may make only the test harness collision-safe by using OS-assigned mock API binding and a non-ephemeral/collision-safe Admin test port. This is verification infrastructure only and changes no product/runtime behavior.

## Explicit exclusions

- Sales-Control preview/apply — 68-G;
- pricing, inventory and Excel — Step 69;
- Backend/OpenAPI/generated contract/database mutation;
- Storefront runtime or public Product Detail expansion;
- Product Design semantic mutation;
- Current-State/Master-Roadmap closure reconciliation — 68-I;
- Graph/Graphify.

## Exit gate

68-G remains blocked until:
1. exact-head Canonical CI / Phase A / CodeQL PASS;
2. deterministic Review PASS;
3. Independent Security PASS;
4. exact-artifact Scope Lock ACTIVE;
5. Project Owner Human Gate APPROVED for that exact Head + Artifact;
6. protected merge;
7. exact-SHA postmerge verification PASS;
8. terminal Lock RELEASED;
9. Linear HOS-72 synchronization.

```text
STEP_68_F = IN_PROGRESS / NOT_CANONICAL
STEP_68_G = BLOCKED_FROM_MUTATION
```


## Execution checkpoint — PR #366

- Working PR: `#366 — Step 68-F — Admin Media administration`.
- Task Contract reference is now explicit in the PR body:
  `docs/14-multi-agent/tasks/EQCOFE-STEP68-F-MEDIA-ADMINISTRATION-001.json`.
- Governance repair: generated Task Catalog count synchronized after registering 68-F.
- Reliability repair implemented: Admin acceptance mock API binds to an OS-assigned port; the Admin test server uses non-ephemeral port `31771`, removing the inherited fixed `41772` collision that caused the Step 68-E postmerge transient `EADDRINUSE`.
- Human Gate remains intentionally absent until the final exact Head + Artifact is frozen.
