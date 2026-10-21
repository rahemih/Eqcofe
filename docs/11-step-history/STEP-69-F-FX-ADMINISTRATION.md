# EQCOFE — Step 69-F FX Administration

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `3f9e1157d28aa6d515e1591a5899fe5bc59a8274`  
Linear: `HOS-73 — Step 69 — Pricing, FX & Excel Administration`  
Task: `EQCOFE-STEP69-F-FX-ADMINISTRATION-001`  
Risk: **HIGH**  
Human Gate: **REQUIRED**

## Entry proof

Step 69-E is terminally canonical through PR #374:

- approved Head: `b4b0d115fdaa438a7bd191b65bcf03c059d4606f`;
- exact Artifact: `daacb225815022d629c7ca265668563c11d7921856bbc06bb4e4781257dafa80`;
- canonical merge/main SHA: `3f9e1157d28aa6d515e1591a5899fe5bc59a8274`;
- exact-SHA Canonical CI #2091, Phase A #1590 and CodeQL #1241 = PASS;
- terminal Stage-E Lock release comment: `6310990853`.

Therefore 69-F is authorized.

## Owned surfaces

69-F owns only:

- `AD-D-04` — Currency rates, provider/source observation, impact preview and apply;
- `AD-D-05` — FX-linked pricing rules.

69-G Excel remains blocked until terminal 69-F closure.

## Source-proven operation authority

### AD-D-04
- `GET /admin/pricing/currency-rates`
- `GET /admin/pricing/currency-rates/current`
- `POST /admin/pricing/currency-rates/refresh`
- `POST /admin/pricing/currency-rates/{id}/select`
- `POST /admin/pricing/currency-rates/{id}/reject`
- `POST /admin/pricing/currency-rates/register`
- `POST /admin/pricing/currency/impact-preview`
- `POST /admin/pricing/currency/apply`

### AD-D-05
- `GET /admin/pricing/currency-rules`
- `POST /admin/pricing/currency-rules`
- `GET /admin/pricing/currency-rules/{id}`
- `PATCH /admin/pricing/currency-rules/{id}`
- `POST /admin/pricing/currency-rules/{id}/activate`
- `POST /admin/pricing/currency-rules/{id}/deactivate`

No additional FX lifecycle or generic status endpoint is invented.

## Frozen safety boundaries

- Read authority is `pricing.view`; FX mutations use `pricing.currency.manage`.
- Rate selection requires Step-Up but does **not** have Idempotency-Key authority.
- Currency apply requires Step-Up plus scoped idempotency `pricing.currency.apply`.
- Currency-rule PATCH requires exact `If-Match`; conflict requires reread and no silent overwrite.
- Provider refresh validates/fetches through the existing FX abstraction, registers the observation and creates impact preview only when the rate is validated/active.
- Production FX-provider integration remains Step 77. Stage 69-F must not claim production provider readiness.
- Impact preview lifetime is ten minutes and returns at most 200 visible items.
- The underlying scope query uses a bounded default cap; `affected_count` is not proof that every possible target outside the returned query population was enumerated.
- Currency apply checks preview type/status/expiry, optional expected affected count and stored blocked/unavailable guard state.
- Existing source does **not** prove requester binding, current-price recheck or a fresh universal Profit Guard during Currency Apply. Admin copy explicitly avoids those guarantees.
- Unknown mutation outcomes are fail-closed. Non-idempotent rate/rule commands are never auto-replayed. Currency Apply uses a deterministic server-derived key, but because no source-proven Stage-F status endpoint exists, an unknown result is surfaced for manual review rather than blind replay.

## Admin implementation

### Server transport
`apps/admin/app/pricing/pricing-fx.server.ts` provides typed:
- rates/current reads;
- provider refresh;
- manual rate registration;
- Step-Up rate selection;
- rate rejection;
- impact preview;
- Step-Up + idempotent Currency Apply;
- currency-rule list/detail/create/update/activate/deactivate;
- exact quoted `If-Match`;
- denied/conflict/expired/guard/provider/review/unknown-outcome classification.

### AD-D-04 route
`apps/admin/app/routes/pricing-fx.tsx` provides:
- filtered authoritative rate read/current state;
- manual rate registration;
- provider refresh-to-preview;
- rate reject;
- WebAuthn Step-Up rate selection;
- impact preview with total-versus-visible disclosure;
- final Action Review + WebAuthn Step-Up Currency Apply;
- deterministic server-derived idempotency;
- Persian RTL denied/error/unknown/success states and request IDs;
- explicit Step77 provider boundary and no-invented-guarantee disclosures.

### AD-D-05 route
`apps/admin/app/routes/pricing-currency-rules.tsx` provides:
- list/detail;
- create with explicit scopes;
- PATCH of source-permitted mutable fields only;
- exact version-bound If-Match;
- activate/deactivate;
- no fabricated delete or scope-edit lifecycle.

### Wiring and quality
- routes: `/pricing/fx`, `/pricing/currency-rules`;
- AdminShell maps AD-D-04 and AD-D-05;
- existing Pricing CSS extended with token-only responsive/focus/touch-target rules;
- verifier: `apps/admin/scripts/verify-step69-f-fx-admin.ts`;
- Admin verify chain includes `step69-fx-admin:verify`.

## Explicit non-authority

69-F does not mutate:
- Backend runtime, OpenAPI, generated contracts or database;
- Excel;
- Storefront or Current State;
- Product Design source;
- Inventory/Procurement/POS;
- production FX provider integration;
- Graph/Graphify.

## Exit gate

Because risk is HIGH, terminal closure requires:

1. exact-head Canonical CI PASS;
2. exact-head Phase A PASS;
3. exact-head CodeQL PASS;
4. deterministic Review PASS;
5. independent Security PASS;
6. exact-artifact Scope Lock ACTIVE;
7. Project Owner Human Gate for the exact Head/Artifact;
8. protected squash merge;
9. exact-SHA postmerge Canonical CI, Phase A and CodeQL PASS;
10. terminal Lock RELEASED;
11. Linear HOS-73 synchronized.

Until all terminal evidence exists:

```text
STEP_69_F = IN_PROGRESS / NOT_CANONICAL
STEP_69_G = BLOCKED_FROM_MUTATION
```
