# EQCOFE — Step 67-E Permission/Scope-Aware Shell & Safe Navigation

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `32756cee24d7f60e63c768472e571c21eb2ec04f`  
Linear: `HOS-71`  
Risk: **MEDIUM**  
Human Gate: **NOT_REQUIRED**

## Entry proof

Step 67-D is terminally canonical:
- PR #355 merged from exact approved head `306efe4c8e048c86e4265441c612cfc35a255de0`;
- artifact `e45b64b2ac410d827d88489bd659f46f5f48dae7e2371163abd53856db12ed75`;
- canonical merge/main `32756cee24d7f60e63c768472e571c21eb2ec04f`;
- exact-SHA Canonical CI #1797, Phase A #1296 and CodeQL #943 = SUCCESS;
- terminal Lock release comment `6145858971`.

`STEP_67_D = CANONICAL_COMPLETE` and frozen 67-E is authorized.

## Purpose

Implement only the authenticated Admin shell authorization-context layer:
- server-authoritative permissions/scopes loading;
- permission-aware destination discovery;
- immutable server-assigned scope presentation;
- neutral deep-link denial;
- breadcrumb;
- local permitted-destination search;
- safe navigation to shell-owned destination handoffs.

## Authorization rule

The Backend remains the only operation authorization authority.

Destination visibility is computed from the Step56 final audit operation matrix:
1. operation must be runtime-backed;
2. operation must not be blocked;
3. operation must have no unresolved gap IDs;
4. all permissions required by that single operation must exist in the current authenticated permission set;
5. a surface becomes discoverable when at least one such operation is satisfiable.

The full surface permission union is **never** treated as an operation authorization grant.

## Scope context

`GET /admin/me/scopes` is server authority. Current source-proven scope types are `warehouse` and `physical_store`.

67-E may display assigned scopes as immutable context only. It does not:
- edit RBAC;
- assign/revoke scopes;
- invent scope-to-destination mappings;
- impersonate another scope or staff member.

## Destination boundary

Step56 design surface IDs are stable references, not later-domain runtime URLs.

67-E may expose a generic shell-owned handoff keyed by design surface ID only after current authorization-context checks pass. This handoff:
- is not a Step 68–73 domain workspace;
- executes no mutation;
- loads no entity data;
- does not claim later-domain readiness.

Unknown and unauthorized deep links share the same neutral denial surface.

## Explicit boundaries

67-E does **not** implement:
- Step-Up UX or credential self-service — 67-F;
- dashboard metrics/runtime — 67-G;
- Catalog/Media CRUD — Step 68;
- Pricing/Inventory administration — Step 69;
- Commerce/Orders operations — Step 70;
- Customers/Growth administration — Step 71;
- Finance/Reports administration — Step 72;
- Staff/RBAC/security/operations management workspaces — Step 73;
- Backend/OpenAPI/database/Storefront/Product Design/Current-State mutations.

## Exit gate

67-F remains blocked until:
1. exact-head Canonical CI and Phase A PASS;
2. CodeQL/deterministic Review PASS;
3. exact-artifact Scope Lock ACTIVE;
4. protected merge;
5. exact-SHA postmerge Canonical CI/Phase A/CodeQL PASS;
6. terminal Lock RELEASED;
7. Linear HOS-71 reflects `STEP_67_E = CANONICAL_COMPLETE`.

Human Gate is not required for frozen MEDIUM-risk 67-E.

Task Contract: `docs/14-multi-agent/tasks/EQCOFE-STEP67-E-PERMISSION-SCOPE-SHELL-001.json`
