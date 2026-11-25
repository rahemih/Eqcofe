# Step70-H2A — POS Offline Admin (four of six AD-E-11 operations)

Status: **DRAFT / HIGH / NOT CANONICAL / NO OWNER RISK / NO HUMAN GATE / NO MERGE**.

Canonical protected base: `f0a01c76a65a71a8d30b1d51bdcd1420225b532a`; this base contains the official protected, postmerge-verified H1 PR #424 and backend warehouse BOLA PR #426. This is new scope, with no inherited prior approvals.

## Four explicitly source-backed operations

1. `POST /admin/pos/offline/commands` — requires `pos.sell`, `pos.offline.capture` and server-generated Idempotency-Key, strict server-side payload `warehouse_id`, `customer_type`, `payment_method`, optional external_reference <= 120, 1..100 lines, quantity 1..999. Warehouse assignment pre-check in Admin UI and authoritative backend warehouse ScopePolicy.
2. `POST /admin/pos/offline/commands/{clientCommandId}/sync` — explicit operator action only, `pos.sell`, `pos.offline.sync`, no automatic retries.
3. `GET /admin/pos/reconciliation/failed?limit=50` — requires `pos.reconcile`; returns source-backed failed commands, strict whitelisted projection, max 100.
4. `GET /admin/pos/reconciliation/{clientCommandId}` — requires `pos.reconcile`; inspect status and bounded metadata but never surface payment payload or arbitrary backend fields.

**Not a local-first offline PWA.** The name “offline command” refers to the server's authoritative queued POS command; this Admin route requires a live authenticated server connection. Never claim payment or inventory effect without backend status. Unknown mutation outcomes are flagged with **NO AUTO RETRY**; operator must independently reconcile. All incoming POSTs require same-origin validation.

## Deliberately deferred H2B

The other two source-backed operations `POST /admin/pos/reconciliation/{clientCommandId}/retry` and `POST /admin/pos/reconciliation/{clientCommandId}/abandon` require `pos.reconcile`, `RequireStepUp()`, WebAuthn, idempotency, failed-only state, 500-char reason and retry cap 5. These remain unavailable in H2A and require a separately governed HIGH H2B implementation. They must not be activated without an interactive WebAuthn flow and independent security verification.

## Governance/security gate

The **H owner-internal-security governance amendment PR #428 explicitly allows only #424 and #426**, NOT this H2A task. Therefore internal assistant security assessment alone **CANNOT** unblock H2A. It requires either genuine independent human security review or a new independently owner-approved exact-task governance amendment, with no weakening of CodeQL, CI, Scope Lock, protected merge, authentication, risk or Human Gate. All code/tests must pass exact-head Canonical CI, Phase A/PostgreSQL, Step57, CodeQL three analyses; Step58 if applicable; exact task lock, deterministic review and separate Owner Human Gate. Official protected merge only, exact merged-SHA postmerge checks, terminal lock RELEASED. No H2B/70-I/70-J/Step71 authorization transferred.

## Governance incident checkpoint — PR #431

The initial push triggered a closed-fail CI/Phase A PR event before the required exact Task Contract path was included in the GitHub PR description. The PR description now declares exactly one source path: `docs/14-multi-agent/tasks/EQCOFE-STEP70-H2A-POS-OFFLINE-RECONCILIATION-READ-001.json`, as mandated by scope history and deterministic Merge Policy. The new documentation-only commit intentionally triggers fresh workflows with a new PR event snapshot; previous failed runs cannot count as PASS. Task remains HIGH/DRAFT and has no Security/Human approval or merge authorization. H2A is not covered by PR #428 owner-only security assurance allowlist.
