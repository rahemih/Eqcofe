# EQCOFE Step70-H1 — POS Scan and Sale Administration

Status: **DRAFT / HIGH / NOT_CANONICAL / NO_SECURITY_PASS / NO_HUMAN_GATE / NO_MERGE**
Canonical base: `f7291716fe319138e79fe9934654f708f2479231`; prior Step70-G fully protected-merged in PR #421, exact-SHA Canonical and PostgreSQL postmerge PASS, terminal scope Lock RELEASED.
Linear: HOS-74; preflight Issue #422. This is the first bounded 70-H subtask only.

## Source-authoritative surface
AD-E-10 source-backed operations (five):
1. `GET /admin/pos/scan` with explicit `kind=sku|barcode` and `value` 1..120; source permission `pos.view`.
2. `POST /admin/pos/sales` scoped `pos.sale.create`.
3. `POST /admin/pos/sales/{id}/lines` scoped `pos.sale.line.add`; quantity 1..999.
4. `POST /admin/pos/sales/{id}/price` scoped `pos.sale.price`; retail/wholesale backend pricing.
5. `POST /admin/pos/sales/{id}/commit` scoped `pos.sale.commit`; warehouse, authoritative expected_version and payment cash/card; optional external reference <=120.
All four POST endpoints require source-defined `pos.sell` and Idempotency-Key. No client-generated total/COGS, no fake price override, no sale get-by-id endpoint.

## Security and fail-closed
Admin session/permissions and scope are rechecked server-side; no browser-supplied credential/header or idempotency key. Mutation keys are server generated. Cross-origin POST rejected. Response projection exposes only id/status/version/total or scan summary, never arbitrary Backend fields. Ambiguous network/timeout/5xx outcomes are **unknown**, never retried automatically. Commit cannot use a made-up version; operator must supply an authoritative backend version. No source-unbacked terminal checkout success or inventory claims.

## Explicit excluded POS obligations
AD-E-09 store/register/shift and POST /admin/pos/orders have **NO_ACTION** because runtime source is absent. AD-E-11 offline capture/sync/reconciliation (six backed operations) will be handled in independently governed Step70-H2 with WebAuthn for retry/abandon; no security inheritance or cross-PR lock.

## Gates
Require fresh exact-HEAD Admin verify + Canonical CI + Phase A/PostgreSQL + Step57 + Step58 + CodeQL three analyzers, deterministic Review, bounded HIGH security assessment (independent or disclosed non-independent with separate Owner Risk), exact nine-path ACTIVE scope Lock, **new separate Project Owner Human Gate** for this exact artifact, protected workflow_dispatch merge, exact merge-SHA postmerge, terminal LOCK:RELEASED, and HOS-74 sync. Until then **NOT APPROVED**, no Step70-I, no Step70-J closure and no Step71.
