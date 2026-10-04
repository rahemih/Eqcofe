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
