# EQCOFE — Step 67-G Dashboard Foundation & Global States

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `f40bd2cfc60243adc2611a5070d94191732af7b6`  
Linear: `HOS-71 — Step 67 — Admin Shell, RBAC & Dashboard Foundation`  
Risk: **MEDIUM**  
Human Gate: **NOT REQUIRED**

## Entry proof

- Step 67-F is terminally canonical through PR #357.
- Exact approved 67-F head: `b2502a4f62b09a83a7d87db2d8471faa887e35d1`.
- Exact 67-F artifact: `99d8a04442bd1eba2686b399896c8013b04d4804591c1696848dee63723d2537`.
- Canonical main/merge SHA: `f40bd2cfc60243adc2611a5070d94191732af7b6`.
- Exact-SHA Canonical CI #1825, Phase A #1324, Storefront Quality #835 and CodeQL #971 are SUCCESS.
- Terminal 67-F Lock release comment: `6163008531`.

## Frozen 67-G authority

`AD-B-03` remains the dashboard design authority. `GET /admin/dashboard` is contract-only and unresolved, with `NO_ACTION_UNTIL_CANONICAL_RECONCILIATION`. Therefore the production overview is intentionally unavailable-only for dashboard data.

Allowed in 67-G:
- explicit unavailable dashboard panel;
- static links to destinations already filtered by server-derived permission context;
- reusable loading, empty, error, denied and conflict state primitives;
- safe explicit read retry and authoritative-reread guidance.

Forbidden in 67-G:
- dashboard API consumption;
- KPI/count/health/notification/business metrics;
- synthetic dashboard success;
- Backend/OpenAPI/database/Product Design/current-state mutation;
- Steps 68–73 domain workspaces or commands;
- silent overwrite or blind mutation retry.

## Implementation package

- `apps/admin/app/platform/state/admin-surface-state.ts`: canonical state taxonomy/copy.
- `apps/admin/app/platform/state/AdminSurfaceState.tsx`: accessible shared state surface.
- `apps/admin/app/routes/foundation.tsx`: AD-B-03 unavailable-only overview plus authorized destinations.
- authenticated/deep-link failure paths reuse the shared error/denied states.
- Admin shell passes only the already-filtered destination groups into the overview outlet.
- `apps/admin/scripts/verify-step67-dashboard-states.ts`: deterministic authority/state verifier.
- Admin verify chain advances to 67-G.

## Exit gate

67-H remains blocked until 67-G reaches terminal canonical closure:
1. exact-head Canonical CI and Phase A PASS;
2. deterministic Review PASS;
3. exact-artifact Scope Lock ACTIVE;
4. protected merge;
5. exact-SHA postmerge Canonical CI, Phase A and CodeQL PASS;
6. terminal Lock RELEASED;
7. Linear HOS-71 synchronized.

```text
STEP_67_G = IN_PROGRESS / NOT_CANONICAL
STEP_67_H = BLOCKED_FROM_MUTATION
```
