# EQCOFE — Step 67-C Admin Application Foundation

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `2af5eb86b605184f78b47e7b3df9e458ce1d7bd7`  
Linear: `HOS-71`  
Risk: **MEDIUM**  
Human Gate: **NOT_REQUIRED**

## Purpose

Create the independent Admin frontend application foundation after Step 67-B made the Admin authentication/context contract executable and runtime-accurate.

67-C owns only:
- `apps/admin` workspace/bootstrap and SSR build;
- Persian `fa-IR` / RTL document and shell primitives;
- exact bridge to canonical design tokens;
- typed server-only API transport sourced from `src/generated/openapi.ts`;
- strict Admin session/pre-auth cookie transport isolation;
- deterministic typecheck, lint, build, transport and SSR shell verification;
- root canonical verification integration.

## Explicit boundaries

67-C does **not** implement:
- username/password login or FIDO flows — 67-D;
- authenticated session probing/entry lifecycle — 67-D;
- permission/scope-aware navigation or deep-link denial — 67-E;
- Step-Up UX or credential self-service — 67-F;
- dashboard metrics or runtime dashboard consumption — 67-G;
- Steps 68–73 Admin domain workspaces;
- Backend, OpenAPI, generated contract, database, Storefront, Product Design or Current-State mutations.

The existing `GET /admin/dashboard` contract remains `UNRESOLVED_NOT_GRANTED` and forbidden for frontend consumption.

## Security foundation

The Admin transport must be server-side by default. Browser-visible `VITE_*` configuration is not an authority path. The cookie bridge may forward only allow-listed Admin session/pre-auth cookies, must remove Authorization/proxy-authorization and unrelated cookies, and must fail closed on ambiguous or weakened Set-Cookie attributes.

## Exit gate

67-D remains blocked until:
1. exact-head Canonical CI and Phase A PASS;
2. CodeQL/security evidence PASS;
3. deterministic Review PASS;
4. exact-artifact Scope Lock ACTIVE;
5. protected merge;
6. exact-SHA postmerge verification PASS;
7. terminal Lock RELEASED;
8. Linear HOS-71 reflects `STEP_67_C = CANONICAL_COMPLETE`.

No Owner Human Gate is required for this MEDIUM-risk stage.
