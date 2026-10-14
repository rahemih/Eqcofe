# EQCOFE — Step 67-F Step-Up UX, Credential Self-Service & Safe Action Review

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `6ec157ea5799d7c06cde5599a5bb3b828d767a1e`  
Linear: `HOS-71`  
Risk: **HIGH**  
Human Gate: **REQUIRED_FINAL_EXACT_ARTIFACT**

## Entry proof

Step 67-E is terminally canonical:
- PR #356 merged from exact head `df33ab07f980871e959a0fa788dd1afa7ad35552`;
- artifact `5e1b3805996ffd50e3f78dbba7d0e3cdb6285b2fb4ff7ee8764a1b8397e01308`;
- canonical merge/main `6ec157ea5799d7c06cde5599a5bb3b828d767a1e`;
- exact-SHA Canonical CI #1802, Phase A #1301 and CodeQL #947 = SUCCESS;
- terminal Lock release comment `6147507394`.

`STEP_67_E = CANONICAL_COMPLETE`; frozen 67-F is authorized.

## Contract-readiness finding

The Backend already implements:
- `POST /admin/auth/step-up/challenge`;
- `POST /admin/auth/step-up/verify`;
- `GET /admin/auth/fido/credentials`;
- `POST /admin/auth/fido/credentials/register/challenge`;
- `POST /admin/auth/fido/credentials/register/verify`;
- `POST /admin/auth/fido/credentials/{id}/revoke`.

The Step-Up pair is already represented by typed canonical OpenAPI responses. The four credential self-service endpoints are not present in the canonical OpenAPI/generated client at the 67-E baseline even though runtime source exists.

67-F therefore includes a narrow contract reconciliation for those four **existing** runtime endpoints. It does not add or change Backend behavior.

## Runtime credential summary authority

`IdentityRepository.listCredentialSummaries()` exposes only:
- `id`;
- `device_name`;
- `credential_device_type`;
- `backed_up`;
- `last_used_at`;
- `created_at`.

The list must never expose public key bytes, credential ID, sign counter, WebAuthn user ID, enrollment token, session token, challenge secret or transport-internal authentication material.

Runtime enforces `LAST_FIDO2_CREDENTIAL_CANNOT_BE_REVOKED`; frontend review must not optimistically remove a credential.

## Step-Up boundary

Backend Step-Up tokens are bound to the current account and current session and expire after five minutes. The browser must not persist the token in localStorage, sessionStorage, cookies or visible UI.

Step-Up is used only for the immediate reviewed protected action. Cancel, expiry, verification failure, session revocation or authority drift discards transient review context.

## Credential lifecycle

- list: authenticated server read;
- add: explicit review → Step-Up → registration challenge → browser WebAuthn create → server verify → authoritative refresh;
- revoke: explicit credential impact review → Step-Up → server revoke → authoritative refresh;
- last-key conflict remains Backend authoritative and is rendered as a neutral conflict/recovery state.

## Generic safe action-review boundary

67-F provides a reusable review/confirm/Step-Up boundary only. It may hold a safe action descriptor and confirmation copy, but **must not execute** Steps 68–73 domain mutations. No mutation is retried blindly.

## Explicit deferrals

67-F does not implement:
- dashboard metrics or runtime dashboard states — 67-G;
- domain workspaces or their mutations — Steps 68–73;
- staff/RBAC administration — Step 73.

## Exit gate

67-G remains blocked until:
1. exact-head Canonical CI and Phase A PASS;
2. CodeQL and independent Security PASS;
3. deterministic Review PASS;
4. exact-artifact Scope Lock ACTIVE;
5. Project Owner Human Gate APPROVED for the exact Head/Artifact;
6. protected merge;
7. exact-SHA postmerge Canonical CI/Phase A/CodeQL PASS;
8. terminal Lock RELEASED;
9. Linear HOS-71 reflects `STEP_67_F = CANONICAL_COMPLETE`.

Task Contract: `docs/14-multi-agent/tasks/EQCOFE-STEP67-F-STEPUP-CREDENTIALS-001.json`
