# EQCOFE — Step 67-A Admin Shell, RBAC & Dashboard Canonical Handoff

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical starting baseline: `30c300ba9b72f990523fd0771630bb905f9ae528`  
Linear: `HOS-71 — Step 67 — Admin Shell, RBAC & Dashboard Foundation`  
Risk: **MEDIUM**  
Human Gate: **NOT REQUIRED**

## Entry proof

Step 66 is terminally closed through PR #351:
- exact closure head `2a82ab91008f4c5dc7bdd5b57ea73a1412e27cc9`;
- artifact `4ff2b352400c2f519e8b2768e4ddbab5eff8fc20ec15dcea216863afca8d433c`;
- merge/main `30c300ba9b72f990523fd0771630bb905f9ae528`;
- postmerge Canonical CI #1708, Phase A #1207 and CodeQL #842 SUCCESS;
- terminal Lock release comment `6108497830`;
- Linear HOS-70 = Done.

Roadmap v3.63 therefore makes Step 67 `NEXT / NOT_STARTED`. Live open PR inspection before 67-A write found only unrelated Dependabot PRs #289 and #290 and no Step-67 writer.

## Repository topology discovery

The pnpm workspace already includes `apps/*`, but canonical `main` has only:
- `apps/api`;
- `apps/scheduler`;
- `apps/storefront`;
- `apps/worker`.

There is **no `apps/admin`**. Step 67 is therefore the first runtime Admin frontend implementation. The advisory Frontend Constitution's example `apps/admin` layout is not authority by itself; the Roadmap + this governed handoff are the implementation authority.

## Canonical Admin UX authority

Step 53 + Step 56 + Step 57 remain design authority. Step 56-B freezes:
- eight navigation groups: overview; commerce/orders; merchandise/pricing; inventory/supply; customers; finance/reports; configuration/governance; security/operations;
- 97 design destination obligations; design IDs are not invented URLs;
- destination visibility from authenticated server permission/scope evidence;
- operation authorization remains Backend-owned and every operation permission must pass; a surface permission union is never an authorization shortcut;
- server-assigned context only; scope switching narrows presentation and never edits RBAC;
- deep-link denial is neutral and must not leak entity existence, count, PII or secret metadata;
- local shell search searches permitted destination labels only—never customers/orders/entities;
- quick actions navigate to an authorized review destination and never execute commands;
- role/scope/session revocation invalidates cached sensitive destination/content state;
- expanded shell at 840px+, 240px inline-start sidebar, compact disclosure/drawer below 840;
- widths 320/360/600/840/1200/1440 plus 400% reflow at equivalent 320 CSS px;
- semantic landmarks/headings, 44px targets, visible focus, safe modal focus, Persian RTL, no Wallet, no Brown.

Step 67 must implement these obligations without promoting later Step-68–73 domain workspaces into scope.

## Runtime security authority found

`AuthController` already implements real Admin runtime endpoints:
- `POST /admin/auth/login`;
- `POST /admin/auth/fido/challenge`;
- `POST /admin/auth/fido/verify`;
- `POST /admin/auth/step-up/challenge`;
- `POST /admin/auth/step-up/verify`;
- `POST /admin/auth/logout`;
- `GET /admin/auth/session`;
- `GET /admin/me`;
- `GET /admin/me/permissions`;
- `GET /admin/me/scopes`.

Admin login is username/password → server pre-auth cookie → FIDO registration/authentication → server admin session cookie. Admin/pre-auth cookies are HttpOnly and SameSite=Strict in current Backend code. Step-Up tokens are bound to staff account + current session and expire after five minutes.

`PermissionsGuard` requires **every** permission declared by an operation. `ScopePolicy` remains Backend authority for scope filtering. The browser must not convert navigation visibility into authorization.

`RbacController` exposes real permission/role/staff administration with Step-Up on sensitive mutations, but those management workspaces are not Step 67 shell scope and remain reserved for the later Management/Security administration step.

## Contract-readiness gaps

The generated OpenAPI paths include the Admin auth/session/me/permissions/scopes operations, but their successful responses are currently generated as `content?: never` even though runtime returns JSON. A production Admin frontend must not compensate with frontend-local guessed models.

`GET /admin/dashboard` also exists in the OpenAPI/design inventory, but live source discovery still finds no matching runtime controller or reconciled permission authority. Step 56 already classifies it `UNRESOLVED_NOT_GRANTED`.

Therefore:
1. 67-B must reconcile the implemented Admin auth/session/me/permissions/scopes response contracts with runtime and generated types.
2. 67-B must explicitly reconcile the dashboard contract/runtime discrepancy.
3. Until proven otherwise, the Step-67 dashboard foundation is **unavailable-metrics + authorized destinations only**. No KPI, count, health, notification or business metric may be fabricated.

## Explicit Step-67 boundaries

Step 67 owns the Admin application foundation, authentication/session entry, permission/scope-aware shell, Step-Up shell UX, dashboard foundation and global operational states.

It does **not** own:
- Catalog/Media CRUD — Step 68;
- Pricing/Inventory administration — Step 69;
- Commerce/Orders/Operations administration — Step 70;
- Customers/Growth administration — Step 71;
- Finance/Reports administration — Step 72;
- Staff/RBAC/approval/security/operations management workspaces — Step 73.

Step 67 may provide destination placeholders/handoffs for later domains only when current authenticated permission/scope evidence allows discovery; it must not implement or simulate their mutations.

## Frozen execution plan

| Stage | Goal | Risk | Human Gate |
| --- | --- | --- | --- |
| 67-A | Canonical handoff, live discovery and Admin shell/RBAC/dashboard scope freeze | MEDIUM | No |
| 67-B | Backend/OpenAPI/generated response-contract readiness for Admin auth/session/me/permissions/scopes + dashboard discrepancy reconciliation | HIGH | Yes |
| 67-C | Admin application foundation, Persian RTL shell primitives, server-data/config/security transport and quality gates | MEDIUM | No |
| 67-D | Admin login + pre-auth/FIDO + authenticated session entry and fail-closed route/session lifecycle | HIGH | Yes |
| 67-E | Permission/scope-aware shell, context presentation, deep-link denial, breadcrumb, local destination search and safe navigation | MEDIUM | No |
| 67-F | Step-Up UX, credential self-service and generic safe action-review boundary without domain mutations | HIGH | Yes |
| 67-G | Dashboard foundation + global loading/empty/error/denied/conflict states; unresolved metrics remain unavailable-only | MEDIUM | No |
| 67-H | Integrated Admin shell RTL/accessibility/responsive/security production-browser acceptance | MEDIUM | No |
| 67-I | Final canonical verification, documentation reconciliation and Step 68 handoff | MEDIUM | No |

## 67-A exit gate

67-B must not mutate Backend/OpenAPI until 67-A itself is terminally canonical:
1. exact-head Canonical CI and Phase A PASS;
2. deterministic Review PASS;
3. exact-artifact Scope Lock ACTIVE;
4. protected merge;
5. exact-SHA postmerge Canonical CI and Phase A PASS;
6. terminal Lock RELEASED;
7. Linear HOS-71 reflects the live canonical state.

Until then:

```text
STEP_67_A = IN_PROGRESS / NOT_CANONICAL
STEP_67_B = BLOCKED_FROM_MUTATION
```
