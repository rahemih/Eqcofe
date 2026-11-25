# EQCOFE Step70-H2 — POS Offline & Reconciliation Admin

Status: **DRAFT / HIGH / NOT_CANONICAL / NO_SECURITY_PASS / NO_HUMAN_GATE / NO_MERGE**
Canonical protected base: `f0a01c76a65a71a8d30b1d51bdcd1420225b532a` from PR #424, with official guarded dispatch #45581898288 and terminal LOCK released #7159628989.
Task: `EQCOFE-STEP70-H2-POS-OFFLINE-RECONCILIATION-ADMIN-001`; Linear: HOS-74; source preflight Issue #422. This is the second bounded 70-H subtask only.

## Six source-backed operations in AD-E-11
1. `POST /admin/pos/offline/commands`: source `pos.sell`, scope `pos.offline.capture`, stable originally captured offline client command UUID is the Backend idempotency key. Exact `sale.sync` payload: warehouse, retail/wholesale, cash/card, optional payment reference <=120, 1..100 lines with UUID variants and positive quantity 1..999, no client price or COGS.
2. `POST /admin/pos/offline/commands/{clientCommandId}/sync`: source `pos.sell`, scope `pos.offline.sync`, current staff and warehouse scope rechecked canonically on Backend, no automated retries.
3. `GET /admin/pos/reconciliation/failed`: source `pos.reconcile`, limit integer 1..100, only authoritative failed records.
4. `GET /admin/pos/reconciliation/{clientCommandId}`: source `pos.reconcile`, strict UUID, whitelisted command and immutable history.
5. `POST /admin/pos/reconciliation/{clientCommandId}/retry`: `pos.reconcile`, `pos.reconciliation.admin.retry`, fresh WebAuthn step-up and exact failed record. Maximum five recoveries, returns `requires_owner_sync=true`; never sync using admin identity.
6. `POST /admin/pos/reconciliation/{clientCommandId}/abandon`: `pos.reconcile`, `pos.reconciliation.admin.abandon`, fresh WebAuthn step-up, explicit review and only failed state. No implicit replay.

## Fail-closed security invariants
Admin session and scoped RBAC validated server-side on loader and every action, same-origin POST enforced; all sensitive step-up tokens are used exclusively server-side in same verification request and never returned or stored in browser. Challenge uses the existing WebAuthn API. Backend HIGH warehouse-scope BOLA fix was canonically merged in PR #426 at `042b29207927d5538b9f8d8787c879622df93114`. Frontend does not substitute client-side warehouse filtering for Backend authority. Authenticated command lookup and freshness are repeated before recovery. Never fabricate a successful mutation; network/timeout/408/5xx is explicitly **UNKNOWN OUTCOME** and no silent retry occurs. Response projection strips raw payload, actor fields and protected data.

No store/register/shift/order endpoints; no permission changes, DB, payments, inventory or backend mutation. No UI H2 merge authorization from H1 or owner-internal assurance opt-in PR #428: **H2 Task ID is NOT in that exact allowlist.** Fresh independent qualified human security review and exact-artifact `SECURITY:PASS` are required unless a separately reviewed, explicitly owner-approved governance amendment is canonically merged. An internal assessment by the coding assistant is NOT independent security approval.

## Mandatory gates
New HEAD and frozen nine-path Task Contract, exact-HEAD CI + Phase A/PostgreSQL + Step57 + Step58 if applicable, CodeQL aggregate and 3 analyzers, negative verifier, deterministic Review, ACTIVE Scope Lock, independent HIGH security evidence, distinct owner Human Gate, official protected GitHub workflow_dispatch, exact merge-SHA postmerge, terminal LOCK:RELEASED and Linear mirror. PR stays draft until prerequisites. Step70-I/J and Step71 are excluded.