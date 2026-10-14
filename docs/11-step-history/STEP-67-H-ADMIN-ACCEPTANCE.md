# EQCOFE — Step 67-H Integrated Admin Acceptance

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `9079f210c21a629df3f82dd377a6e2b46b651e33`  
Linear: `HOS-71 — Step 67 — Admin Shell, RBAC & Dashboard Foundation`  
Risk: **MEDIUM**  
Human Gate: **NOT REQUIRED**

## Entry proof

- Step 67-G is terminally canonical through PR #358.
- Merge SHA: `9079f210c21a629df3f82dd377a6e2b46b651e33`.
- Exact-SHA Canonical CI #1835, Phase A #1334 and CodeQL #980 are SUCCESS.
- Terminal 67-G Lock release comment: `6163658732`.

## Acceptance strategy

67-H adds no product authority. It verifies the integrated Step 67 shell in two modes:

1. **Canonical production SSR** — the Admin production build runs against an isolated Admin API fixture and verifies authentication fail-closed behavior, permission-aware navigation, server-assigned scope, credential privacy, dashboard unavailable-only authority and neutral deep-link denial.
2. **Storefront Quality browser mode** — the existing isolated Chromium/Axe environment also builds Admin and runs the same acceptance at 320px and 1200px for RTL, reflow, keyboard focus, 44px targets and WCAG automated checks.

Playwright/Axe remain isolated in the existing QA environment; no production dependency or workflow mutation is introduced.

## Frozen boundaries

- No `GET /admin/dashboard` runtime consumption.
- No fabricated dashboard metric/count/health/notification data.
- No Backend/OpenAPI/database/Product Design/current-state mutation.
- No Steps 68–73 domain workspaces or commands.
- No browser auth capability persisted in localStorage/sessionStorage.
- No credential secret material rendered.
- No workflow-file mutation.

## Exit gate

67-I remains blocked until:
1. exact-head Canonical CI, Phase A, Storefront Quality and CodeQL PASS;
2. deterministic Review PASS;
3. exact-artifact Scope Lock ACTIVE;
4. protected merge;
5. exact-SHA postmerge Canonical CI, Phase A and CodeQL PASS;
6. terminal Lock RELEASED;
7. Linear synchronization.

```text
STEP_67_H = IN_PROGRESS / NOT_CANONICAL
STEP_67_I = BLOCKED_FROM_MUTATION
```
