# EQCOFE — Step 67-D Admin Login, FIDO & Session Lifecycle

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `3b72b7972edcad99531e37503cb359021d1f4b5e`  
Linear: `HOS-71`  
Risk: **HIGH**  
Human Gate: **REQUIRED_FINAL_EXACT_ARTIFACT**

## Entry proof

Step 67-C is terminally canonical:
- PR #354 merged from exact head `f79d2ea02745379e0ec137beac6843f09c230704`;
- artifact `1dacb72b1a925057d358134405b57706a4891e57b50c9d5c0ff7f78e21ac8daf`;
- canonical merge/main `3b72b7972edcad99531e37503cb359021d1f4b5e`;
- exact-SHA Canonical CI #1787, Phase A #1286 and CodeQL #934 = SUCCESS;
- terminal Lock release comment `6144484040`.

`STEP_67_C = CANONICAL_COMPLETE` and frozen 67-D is authorized.

## Purpose

Implement only the Admin authentication/session-entry lifecycle on top of the 67-C server-only transport:
- public username/password login;
- server-issued pre-auth cookie handling;
- WebAuthn authentication or first-credential enrollment;
- FIDO verification and Admin session entry;
- server-authoritative session probe for protected routes;
- logout and expired/revoked-session recovery.

## Security authority

The Backend remains authoritative. Browser code must never receive or persist `pre_auth_token` or `session_token`. Admin and pre-auth cookies remain HttpOnly, SameSite=Strict and host-only; `__Host-` cookies require Secure. Only the server bridge may forward allow-listed Admin cookies.

WebAuthn runs in the browser only for `navigator.credentials.create/get`. Challenge creation and verification are server actions. Credential response material is serialized transiently for the single verification request and is never written to local/session storage.

## Route lifecycle

- `/login`: public controlled entry.
- authenticated application routes: server probe `GET /admin/auth/session` before protected content.
- invalid/missing/expired/revoked session: fail closed to neutral unauthenticated recovery.
- successful FIDO verification: authoritative Admin session cookie, then protected entry.
- logout: Backend mutation + authoritative cookie clear + return to login.

## Explicit boundaries

67-D does **not** implement:
- permission/scope-aware navigation, deep-link authorization or local destination search — 67-E;
- Step-Up UX or credential self-service — 67-F;
- dashboard metrics/runtime — 67-G;
- domain administration workspaces — Steps 68–73;
- Backend/OpenAPI/generated contract/database/Storefront/Product Design/Current-State changes.

## Exit gate

67-E remains blocked until:
1. exact-head Canonical CI and Phase A PASS;
2. CodeQL and independent Security PASS;
3. deterministic Review PASS;
4. exact-artifact Scope Lock ACTIVE;
5. Project Owner Human Gate APPROVED for the exact Head/Artifact;
6. protected merge;
7. exact-SHA postmerge Canonical CI/Phase A/CodeQL PASS;
8. terminal Lock RELEASED;
9. Linear HOS-71 reflects `STEP_67_D = CANONICAL_COMPLETE`.

Task Contract: `docs/14-multi-agent/tasks/EQCOFE-STEP67-D-ADMIN-AUTH-SESSION-001.json`
