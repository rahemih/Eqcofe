# EQCOFE — Step 64-B Backend/OpenAPI Account & After-Sales Contract Readiness

## Status

`STEP_64_A = CANONICAL_COMPLETE`

`STEP_64_B = IN_PROGRESS / AUDIT_FIRST`

Canonical baseline: `b1fd06587a7a71cfeff8d4c6233a5a6dbd3284df`

## Purpose

Stage 64-B is the HIGH-risk contract-readiness gate for Customer Account & After-Sales before production Storefront implementation. It audits canonical runtime, OpenAPI and generated TypeScript for authenticated account/session, profile/addresses, orders/invoices, Wishlist, customer notifications, Returns and Warranty.

Graph/Graphify is `DEFERRED_BY_OWNER / LOCAL_ONLY_UNAVAILABLE`. This is not a Graph PASS claim and no Graph evidence may be fabricated.

## Authority

```text
CURRENT RUNTIME + CANONICAL OPENAPI + GENERATED TYPES > LEGACY WIREFRAME LABEL
```

Historical Step-55 operation labels do not prove that a runtime handler exists. Unsupported design-only operations remain NO_ACTION until separately proven.

## Audit pass 1

### Ready / materially aligned

- Customer profile GET/PATCH is typed, authenticated and profile PATCH is idempotency-protected.
- Customer address list/create/update/delete/set-default is typed and idempotency/status drift was already repaired during Step 63.
- Wishlist list/add/remove is typed, customer-owned and idempotency-aware.
- Customer order list/detail/timeline/invoice and cancel have typed primary success contracts; cancel is runtime-idempotent.
- No database migration or dependency is justified by the Stage-B findings.

### Auth/account-security contract drift

Runtime returns stable response bodies for:
- `GET /auth/session` → `{actor}`
- `POST /auth/logout` → `{logged_out:true}`
- `POST /auth/logout-all` → `{logged_out:true}`

OpenAPI currently leaves those success bodies untyped and advertises stale `202` for logout/logout-all although runtime returns Nest default `201` for undecorated POST. Stage 64 requires an exact contract rather than frontend inference.

### Returns contract drift

Runtime:
- create is `@CustomerOnly`, idempotency-protected and returns a created Return view; default POST status is `201`.
- list/detail/timeline are customer-owned.
- cancel is idempotency-protected and explicitly `200`.

Current OpenAPI:
- create advertises generic `200/202`, has no idempotency metadata and untyped success;
- list/detail are untyped;
- customer timeline is typed only as a generic AfterSales timeline but lacks the customer-session declaration and complete path-parameter/error semantics;
- cancel advertises generic `200/202`, lacks idempotency metadata and typed response.

### Warranty contract drift

Runtime:
- create is customer-owned, idempotency-protected and returns the created claim; default POST status is `201`.
- list/detail/timeline are customer-owned.

Current OpenAPI:
- create advertises generic `200/202`, lacks idempotency metadata and typed success;
- list/detail are untyped;
- customer timeline lacks the customer-session declaration and complete path-parameter/error semantics.

### Customer notification readiness gap

The Notification domain already contains `NotificationInAppService` with owner-scoped:
- list;
- idempotent-at-database-boundary mark-read;
- compare-and-set acknowledge with audit/outbox on first mutation.

However the current HTTP controller exposes only Admin notification operations and the internal enqueue endpoint. There is no customer-facing in-app notification HTTP route for Step 64 to consume.

A bounded runtime presentation repair is justified: expose customer-only list/read/acknowledge routes over the existing service without adding database state, provider integration, delivery semantics or new business rules.

### Legacy customer-tool drift

Canonical OpenAPI still advertises customer Product Alerts, Loyalty and Review operations referenced by old Storefront design. Stage-A source inspection found no matching customer-facing runtime controller for those operations. Step 64-B does not invent these handlers or treat OpenAPI-only declarations as executable authority.

For Step 64 production Storefront:
- Wishlist is authorized;
- customer in-app notifications are repaired in this task;
- Product Alerts/Loyalty/Reviews remain NO_ACTION in Step 64 unless a separately governed runtime reconciliation proves them.

Wholesale remains Step 65.

## Scoped repair disposition

Authorized repair:
1. Type auth session/logout/logout-all success responses and align actual runtime status.
2. Type Returns and Warranty customer success responses, idempotency, auth, path/error/status semantics.
3. Add bounded customer-only in-app notification HTTP routes backed by existing `NotificationInAppService`.
4. Add matching OpenAPI schemas and generated TypeScript.
5. Add deterministic contract/security regression tests.
6. If canonical OpenAPI source hash changes invalidate recovered Step56/57 provenance, perform generator-equivalent hash/manifest synchronization only; no design semantics may change.

Not authorized:
- database migration;
- dependency/lockfile change;
- provider activation;
- SMS/email production integration;
- new Returns/Warranty eligibility rule;
- Loyalty/Product Alert/Review runtime invention;
- Wholesale runtime;
- Storefront Step 64-C+ implementation.

## Human Gate

Stage 64-B is HIGH risk. Technical repair and exact-head verification may proceed under this Task Contract. Final protected merge requires explicit Project Owner HUMAN approval bound to the frozen exact head and artifact after Review/Verification/Security gates are green.

## Exit criteria

`STEP_64_B = CANONICAL_COMPLETE` only after:
- exact-scope contract/runtime/test repair;
- generated OpenAPI byte parity;
- focused regression PASS;
- Canonical CI / Phase A / Security / deterministic Review PASS;
- exact-artifact ACTIVE Lock;
- exact-artifact Project Owner Human Gate;
- Merge Policy `blockers=[]`;
- merge;
- exact-SHA postmerge verification;
- terminal Lock RELEASED.

Until terminal closure, `STEP_64_C = BLOCKED_FROM_MUTATION`.


## Security finding — customer session actor exposure

Stage 64-B source audit found a real security defect rather than contract-only drift:

- `ExecutionActor` contains internal `sessionId`, permissions and scopes fields.
- `GET /auth/session` returned `req.actor` verbatim.
- A customer could therefore receive an internal session identifier in the success payload.

Repair in this stage:
- return a minimal customer actor view only: `type`, `id`, `accountId`;
- never serialize `sessionId`, permissions or scopes to the customer session endpoint;
- make logout/logout-all explicit HTTP 200 operations;
- add focused contract/security regression assertions.

## Customer in-app notification HTTP bridge

The repository already had `NotificationInAppService` with owner-scoped list, mark-read and acknowledge behavior, but no customer HTTP routes. Stage 64-B exposes only a thin customer-only wrapper:

- `GET /customer/notifications`
- `PATCH /customer/notifications/:id/read`
- `POST /customer/notifications/:id/acknowledge`

The mutations remain idempotency-protected. UUID input is validated before the repository cast. No database/provider/routing/business-rule change is introduced.

## Implemented repair and pre-freeze verification

The evidence-backed Stage-B repair is complete before the final artifact freeze:

- `GET /auth/session` now emits only the bounded customer actor view and does not serialize internal `sessionId`, permissions or scopes.
- `POST /auth/logout` and `POST /auth/logout-all` explicitly return HTTP 200 and have typed canonical success responses.
- Customer Returns create/list/detail/timeline/cancel contracts are aligned with runtime ownership, status, idempotency and typed response behavior.
- Customer Warranty create/list/detail/timeline contracts are aligned with runtime ownership, status, idempotency and typed response behavior.
- Customer in-app notification list/read/acknowledge routes are exposed as `CustomerOnly` wrappers over the existing owner-scoped `NotificationInAppService`; no database/provider/routing rule was added.
- UUID notification identifiers are validated before repository casts; mutation routes retain idempotency requirements.
- Generated TypeScript is regenerated from canonical OpenAPI and regression coverage lives in `test/step64-account-after-sales-contract.spec.ts`.
- Product Alerts/Loyalty/Reviews remain NO_ACTION for Step 64 because no matching customer-facing runtime controller was proven.
- Database migration: NONE.
- Dependency/lockfile change: NONE.
- Wholesale/Step65 scope: untouched.

OpenAPI hash drift was reconciled through the recovered Step56/57 provenance chain using hash/manifest-only updates. Diff audit confirms no Product Design screen, journey, permission, operation or visual semantics changed. The cascade includes A and B-G source/manifests, Step56-H final audit/manifest and Step57 high-fidelity source hashes.

Pre-freeze exact-head validation on `06f14df536162f76d2e7ee4adcef6b8473020b7f`:

- Canonical CI #1378 / run `37220988618` / job `111491110089` = SUCCESS;
- Phase A #877 / run `37220988635` / job `111491109798` = SUCCESS;
- GitHub CodeQL dynamic run `37220986328` = SUCCESS for JavaScript/TypeScript, Actions and Python;
- application tests = 965/965 PASS;
- multi-agent tests = 148/148 PASS;
- Step56-H semantic audit = PASS;
- Step57 foundation/prototype checks = PASS inside canonical verify.

This evidence is pre-freeze only. The documentation update itself changes the PR artifact, so exact-head providers and all artifact-bound gates must refresh once more before Lock/Human/merge.
