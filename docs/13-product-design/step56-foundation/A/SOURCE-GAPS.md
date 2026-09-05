# Step 56-A — Unresolved canonical source gaps

These gaps block FINAL GATE PASS and merge. Structural validation verifies that this register is complete; it does not waive a gap or prove runtime implementation. No backend/API/permission repair is authorized by this foundation.

## GAP-01 — 156 operations

156 assembled Admin OpenAPI operations have no matching source controller route; contract existence does not prove executable admin capability.

Resolution: Separate authorized canonical API/runtime reconciliation or explicit approved scope deferral; do not implement backend in 56-A.

| Operation | Surface | OpenAPI source | Controller source | Permission status |
|---|---|---|---|---|
| `GET /admin/ai/jobs` | AD-F-13 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/ai/jobs/{id}` | AD-F-13 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/ai/knowledge` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/ai/knowledge/{id}` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/ai/research/{id}` | AD-F-14 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/ai/research/{id}/sources` | AD-F-14 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/approvals` | AD-G-18 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/approvals/{id}` | AD-G-18 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/customers` | AD-F-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/customers/{id}` | AD-F-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/customers/{id}/loyalty` | AD-F-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/customers/{id}/orders` | AD-F-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/customers/{id}/timeline` | AD-F-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/dashboard` | AD-B-03 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data-quality` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data-quality/issues` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data-quality/issues/{id}` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/catalog` | AD-G-32 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/catalog/{entity}` | AD-G-32 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/deletion-requests` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/deletion-requests/{id}` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/lineage/{entity}` | AD-G-32 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/reconciliation` | AD-G-34 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/reconciliation/runs/{id}` | AD-G-34 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/retention-policies` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/integrations/providers` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/integrations/providers/{id}` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/loyalty/accounts/{customer_id}` | AD-F-03 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/loyalty/tiers` | AD-F-04 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/marketing/coupons/{id}/redemptions` | AD-F-08 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/marketing/segments` | AD-F-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/marketing/segments/{id}` | AD-F-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/alerts` | AD-G-25 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/alerts/{id}` | AD-G-25 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/backups` | AD-G-27 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/backups/{id}` | AD-G-27 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/capacity` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/dashboard` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/deployments` | AD-G-28 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/deployments/{id}` | AD-G-28 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/consumers` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/consumers/{consumer}` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/dead-letter` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/dead-letter/{id}` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/outbox` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/outbox/{id}` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/jobs/{id}` | AD-G-26 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/manual-reviews` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/manual-reviews/{id}` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/processes` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/processes/{id}` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/processes/{id}/steps` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/queues` | AD-G-26 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/queues/{name}` | AD-G-26 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/services` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/services/{service}/health` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/slos` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/slos/{id}` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/orders` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/orders/{id}` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/orders/{id}/allowed-actions` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/orders/{id}/timeline` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/pos/registers` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/pos/shifts/current` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/pos/stores` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/reviews` | AD-F-05 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/reviews/{id}` | AD-F-05 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/dashboard` | AD-G-19 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/events` | AD-G-19 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/events/{id}` | AD-G-19 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/incidents` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/incidents/{id}` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/secrets` | AD-G-22 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/vulnerabilities` | AD-G-23 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/vulnerabilities/{id}` | AD-G-23 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `PATCH /admin/data/retention-policies/{id}` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `PATCH /admin/loyalty/tiers/{id}` | AD-F-04 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `PATCH /admin/marketing/campaigns/{id}` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `PATCH /admin/marketing/coupons/{id}` | AD-F-08 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `PATCH /admin/marketing/segments/{id}` | AD-F-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/articles/{draft_id}/create-article` | AD-F-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/articles/{draft_id}/fact-check` | AD-F-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/articles/generate` | AD-F-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/jobs` | AD-F-13 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/jobs/{id}/cancel` | AD-F-13 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/jobs/{id}/retry` | AD-F-13 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/knowledge` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/knowledge/{id}/approve` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/knowledge/{id}/archive` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/knowledge/{id}/reindex` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/research` | AD-F-14 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/research/{id}/approve` | AD-F-14 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/research/{id}/reject` | AD-F-14 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/approvals/{id}/approve` | AD-G-18 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/approvals/{id}/cancel` | AD-G-18 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/approvals/{id}/reject` | AD-G-18 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data-quality/issues/{id}/accept-risk` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data-quality/issues/{id}/plan-repair` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data-quality/issues/{id}/resolve` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data-quality/issues/{id}/start-investigation` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data/deletion-requests` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data/deletion-requests/{id}/approve` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data/deletion-requests/{id}/cancel` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data/reconciliation/run` | AD-G-34 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/{type}/switch-provider` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/providers/{id}/activate` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/providers/{id}/disable` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/providers/{id}/health-check` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/providers/{id}/maintenance` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/providers/{id}/standby` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/loyalty/adjustments` | AD-F-03 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/loyalty/tiers` | AD-F-04 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/approve` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/cancel` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/preview` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/resume` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/schedule` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/submit-review` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/coupons/{id}/activate` | AD-F-08 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/coupons/{id}/deactivate` | AD-F-08 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/segments` | AD-F-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/segments/{id}/preview` | AD-F-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/alerts/{id}/acknowledge` | AD-G-25 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/alerts/{id}/resolve` | AD-G-25 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/alerts/{id}/suppress` | AD-G-25 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/backups/{id}/restore` | AD-G-27 | contracts/http/openapi.yaml | No matching source controller | SOURCE_EXPLICIT |
| `POST /admin/operations/backups/{id}/restore-preview` | AD-G-27 | contracts/http/openapi.yaml | No matching source controller | SOURCE_EXPLICIT |
| `POST /admin/operations/events/dead-letter/{id}/redrive` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/events/replay/apply` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/events/replay/preview` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | SOURCE_EXPLICIT |
| `POST /admin/operations/jobs/{id}/cancel` | AD-G-26 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/jobs/{id}/retry` | AD-G-26 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/manual-reviews/{id}/assign` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/manual-reviews/{id}/dismiss` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/manual-reviews/{id}/resolve` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/orders/{id}/cancel` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | SOURCE_EXPLICIT |
| `POST /admin/orders/{id}/complete` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/orders/{id}/confirm` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/pos/orders` | AD-E-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/pos/shifts/{id}/begin-closing` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/pos/shifts/{id}/close` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/pos/shifts/{id}/reconcile` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/pos/shifts/open` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/reviews/{id}/approve` | AD-F-05 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/reviews/{id}/hide` | AD-F-05 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/reviews/{id}/reject` | AD-F-05 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/acknowledge` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/close` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/contain` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/resolve` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/start-investigation` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/start-recovery` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/secrets/{id}/rotate` | AD-G-22 | contracts/http/openapi.yaml | No matching source controller | SOURCE_EXPLICIT |
| `POST /admin/security/vulnerabilities/{id}/accept-risk` | AD-G-23 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/vulnerabilities/{id}/resolve` | AD-G-23 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |

## GAP-02 — 151 operations

151 contract-only operations have no explicit permission key in OpenAPI or matching runtime controller. Complete permission boundary cannot be frozen as verified.

Resolution: Owner-approved canonical permission evidence or explicit scope deferral; never invent permission names or persona grants.

| Operation | Surface | OpenAPI source | Controller source | Permission status |
|---|---|---|---|---|
| `GET /admin/ai/jobs` | AD-F-13 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/ai/jobs/{id}` | AD-F-13 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/ai/knowledge` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/ai/knowledge/{id}` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/ai/research/{id}` | AD-F-14 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/ai/research/{id}/sources` | AD-F-14 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/approvals` | AD-G-18 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/approvals/{id}` | AD-G-18 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/customers` | AD-F-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/customers/{id}` | AD-F-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/customers/{id}/loyalty` | AD-F-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/customers/{id}/orders` | AD-F-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/customers/{id}/timeline` | AD-F-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/dashboard` | AD-B-03 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data-quality` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data-quality/issues` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data-quality/issues/{id}` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/catalog` | AD-G-32 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/catalog/{entity}` | AD-G-32 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/deletion-requests` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/deletion-requests/{id}` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/lineage/{entity}` | AD-G-32 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/reconciliation` | AD-G-34 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/reconciliation/runs/{id}` | AD-G-34 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/data/retention-policies` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/integrations/providers` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/integrations/providers/{id}` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/loyalty/accounts/{customer_id}` | AD-F-03 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/loyalty/tiers` | AD-F-04 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/marketing/coupons/{id}/redemptions` | AD-F-08 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/marketing/segments` | AD-F-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/marketing/segments/{id}` | AD-F-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/alerts` | AD-G-25 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/alerts/{id}` | AD-G-25 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/backups` | AD-G-27 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/backups/{id}` | AD-G-27 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/capacity` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/dashboard` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/deployments` | AD-G-28 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/deployments/{id}` | AD-G-28 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/consumers` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/consumers/{consumer}` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/dead-letter` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/dead-letter/{id}` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/outbox` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/events/outbox/{id}` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/jobs/{id}` | AD-G-26 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/manual-reviews` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/manual-reviews/{id}` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/processes` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/processes/{id}` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/processes/{id}/steps` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/queues` | AD-G-26 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/queues/{name}` | AD-G-26 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/services` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/services/{service}/health` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/slos` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/operations/slos/{id}` | AD-G-24 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/orders` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/orders/{id}` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/orders/{id}/allowed-actions` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/orders/{id}/timeline` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/pos/registers` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/pos/shifts/current` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/pos/stores` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/reviews` | AD-F-05 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/reviews/{id}` | AD-F-05 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/dashboard` | AD-G-19 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/events` | AD-G-19 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/events/{id}` | AD-G-19 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/incidents` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/incidents/{id}` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/secrets` | AD-G-22 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/vulnerabilities` | AD-G-23 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `GET /admin/security/vulnerabilities/{id}` | AD-G-23 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `PATCH /admin/data/retention-policies/{id}` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `PATCH /admin/loyalty/tiers/{id}` | AD-F-04 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `PATCH /admin/marketing/campaigns/{id}` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `PATCH /admin/marketing/coupons/{id}` | AD-F-08 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `PATCH /admin/marketing/segments/{id}` | AD-F-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/articles/{draft_id}/create-article` | AD-F-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/articles/{draft_id}/fact-check` | AD-F-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/articles/generate` | AD-F-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/jobs` | AD-F-13 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/jobs/{id}/cancel` | AD-F-13 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/jobs/{id}/retry` | AD-F-13 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/knowledge` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/knowledge/{id}/approve` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/knowledge/{id}/archive` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/knowledge/{id}/reindex` | AD-F-16 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/research` | AD-F-14 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/research/{id}/approve` | AD-F-14 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/ai/research/{id}/reject` | AD-F-14 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/approvals/{id}/approve` | AD-G-18 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/approvals/{id}/cancel` | AD-G-18 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/approvals/{id}/reject` | AD-G-18 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data-quality/issues/{id}/accept-risk` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data-quality/issues/{id}/plan-repair` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data-quality/issues/{id}/resolve` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data-quality/issues/{id}/start-investigation` | AD-G-31 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data/deletion-requests` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data/deletion-requests/{id}/approve` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data/deletion-requests/{id}/cancel` | AD-G-33 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/data/reconciliation/run` | AD-G-34 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/{type}/switch-provider` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/providers/{id}/activate` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/providers/{id}/disable` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/providers/{id}/health-check` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/providers/{id}/maintenance` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/integrations/providers/{id}/standby` | AD-G-15 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/loyalty/adjustments` | AD-F-03 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/loyalty/tiers` | AD-F-04 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/approve` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/cancel` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/preview` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/resume` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/schedule` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/campaigns/{id}/submit-review` | AD-F-07 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/coupons/{id}/activate` | AD-F-08 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/coupons/{id}/deactivate` | AD-F-08 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/segments` | AD-F-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/marketing/segments/{id}/preview` | AD-F-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/alerts/{id}/acknowledge` | AD-G-25 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/alerts/{id}/resolve` | AD-G-25 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/alerts/{id}/suppress` | AD-G-25 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/events/dead-letter/{id}/redrive` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/events/replay/apply` | AD-G-29 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/jobs/{id}/cancel` | AD-G-26 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/jobs/{id}/retry` | AD-G-26 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/manual-reviews/{id}/assign` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/manual-reviews/{id}/dismiss` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/operations/manual-reviews/{id}/resolve` | AD-G-30 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/orders/{id}/complete` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/orders/{id}/confirm` | AD-E-01 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/pos/orders` | AD-E-10 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/pos/shifts/{id}/begin-closing` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/pos/shifts/{id}/close` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/pos/shifts/{id}/reconcile` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/pos/shifts/open` | AD-E-09 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/reviews/{id}/approve` | AD-F-05 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/reviews/{id}/hide` | AD-F-05 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/reviews/{id}/reject` | AD-F-05 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/acknowledge` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/close` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/contain` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/resolve` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/start-investigation` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/incidents/{id}/start-recovery` | AD-G-20 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/vulnerabilities/{id}/accept-risk` | AD-G-23 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |
| `POST /admin/security/vulnerabilities/{id}/resolve` | AD-G-23 | contracts/http/openapi.yaml | No matching source controller | UNRESOLVED_NOT_GRANTED |

## GAP-03 — 25 operations

25 implemented admin controller operations are outside assembled OpenAPI; POS has a separate supplemental contract for some of them.

Resolution: Separate authorized contract reconciliation; preserve existing source truth and do not silently add overlay/API changes in A.

| Operation | Surface | OpenAPI source | Controller source | Permission status |
|---|---|---|---|---|
| `GET /admin/loyalty/customers/{customerId}/balance` | AD-F-03 | Not in assembled OpenAPI | src/modules/loyalty/presentation/loyalty-admin.controller.ts:10 | SOURCE_EXPLICIT |
| `GET /admin/loyalty/customers/{customerId}/history` | AD-F-03 | Not in assembled OpenAPI | src/modules/loyalty/presentation/loyalty-admin.controller.ts:11 | SOURCE_EXPLICIT |
| `GET /admin/marketing/promotions` | AD-F-09 | Not in assembled OpenAPI | src/modules/marketing/presentation/marketing-admin.controller.ts:20 | SOURCE_EXPLICIT |
| `GET /admin/marketing/redemptions` | AD-F-08 | Not in assembled OpenAPI | src/modules/marketing/presentation/marketing-admin.controller.ts:30 | SOURCE_EXPLICIT |
| `GET /admin/pos/reconciliation/{clientCommandId}` | AD-E-11 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:52 | SOURCE_EXPLICIT |
| `GET /admin/pos/reconciliation/failed` | AD-E-11 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:48 | SOURCE_EXPLICIT |
| `GET /admin/pos/scan` | AD-E-10 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:11 | SOURCE_EXPLICIT |
| `POST /admin/loyalty/customers/{customerId}/adjust` | AD-F-03 | Not in assembled OpenAPI | src/modules/loyalty/presentation/loyalty-admin.controller.ts:12 | SOURCE_EXPLICIT |
| `POST /admin/loyalty/customers/{customerId}/entries/{entryId}/reverse` | AD-F-03 | Not in assembled OpenAPI | src/modules/loyalty/presentation/loyalty-admin.controller.ts:13 | SOURCE_EXPLICIT |
| `POST /admin/marketing/campaigns/{id}/archive` | AD-F-07 | Not in assembled OpenAPI | src/modules/marketing/presentation/marketing-admin.controller.ts:18 | SOURCE_EXPLICIT |
| `POST /admin/marketing/campaigns/{id}/end` | AD-F-07 | Not in assembled OpenAPI | src/modules/marketing/presentation/marketing-admin.controller.ts:17 | SOURCE_EXPLICIT |
| `POST /admin/marketing/campaigns/{id}/reschedule` | AD-F-07 | Not in assembled OpenAPI | src/modules/marketing/presentation/marketing-admin.controller.ts:14 | SOURCE_EXPLICIT |
| `POST /admin/marketing/coupons/{id}/disable` | AD-F-08 | Not in assembled OpenAPI | src/modules/marketing/presentation/marketing-admin.controller.ts:28 | SOURCE_EXPLICIT |
| `POST /admin/marketing/coupons/{id}/enable` | AD-F-08 | Not in assembled OpenAPI | src/modules/marketing/presentation/marketing-admin.controller.ts:27 | SOURCE_EXPLICIT |
| `POST /admin/marketing/promotions` | AD-F-09 | Not in assembled OpenAPI | src/modules/marketing/presentation/marketing-admin.controller.ts:21 | SOURCE_EXPLICIT |
| `POST /admin/marketing/promotions/{id}/disable` | AD-F-09 | Not in assembled OpenAPI | src/modules/marketing/presentation/marketing-admin.controller.ts:23 | SOURCE_EXPLICIT |
| `POST /admin/marketing/promotions/{id}/enable` | AD-F-09 | Not in assembled OpenAPI | src/modules/marketing/presentation/marketing-admin.controller.ts:22 | SOURCE_EXPLICIT |
| `POST /admin/pos/offline/commands` | AD-E-11 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:37 | SOURCE_EXPLICIT |
| `POST /admin/pos/offline/commands/{clientCommandId}/sync` | AD-E-11 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:42 | SOURCE_EXPLICIT |
| `POST /admin/pos/reconciliation/{clientCommandId}/abandon` | AD-E-11 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:63 | SOURCE_EXPLICIT |
| `POST /admin/pos/reconciliation/{clientCommandId}/retry` | AD-E-11 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:56 | SOURCE_EXPLICIT |
| `POST /admin/pos/sales` | AD-E-10 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:15 | SOURCE_EXPLICIT |
| `POST /admin/pos/sales/{id}/commit` | AD-E-10 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:31 | SOURCE_EXPLICIT |
| `POST /admin/pos/sales/{id}/lines` | AD-E-10 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:20 | SOURCE_EXPLICIT |
| `POST /admin/pos/sales/{id}/price` | AD-E-10 | contracts/http/step49-pos-a9.yaml | src/modules/pos/presentation/pos-admin.controller.ts:25 | SOURCE_EXPLICIT |
