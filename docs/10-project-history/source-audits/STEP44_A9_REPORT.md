# EQCOFE Step 44 / A9 — Admin/Internal HTTP + RBAC + Step-Up + Idempotency

Status: COMPLETE / PASS
Date: 2026-08-19
Baseline: Step 44 A8 COMPLETE / canonical A8 artifact

## Implemented
- Added NotificationsController for existing admin notification list/detail/retry, template list/create/revise/preview, and internal notification command routes.
- Added explicit template activate/retire HTTP transitions so A4 immutable versioning has a safe operational surface.
- Added NotificationAdminService and admin read models with delivery/attempt visibility.
- Admin reads require `notifications.view`; template reads require `notifications.templates.view`.
- Manual retry requires `notifications.retry + Step-Up + Idempotency`.
- Template create/revise/activate/retire require `notifications.templates.manage + Step-Up + Idempotency`.
- Internal notification command is service-bearer authenticated and Idempotency-Key protected; exactly one customer/staff recipient is required.
- Future `scheduled_at` requests fail closed in A9 and remain A10 scheduler scope.
- Reconciled OpenAPI `name_fa` with persistence through migration `0032_notification_http_rbac.sql`.
- PATCH template creates a new draft version instead of mutating historical template content.
- Manual retry uses an explicit transaction-local PostgreSQL override only for dead-letter -> pending / intent dead-letter -> queued; normal workers cannot use it.
- Delivered/cancelled terminal states remain immutable even with manual retry override.
- OpenAPI now documents Idempotency-Key and Step-Up for sensitive notification operations and includes explicit activate/retire routes.
- Generated OpenAPI TypeScript types regenerated.

## Verification
- A9 audit: 30/30 PASS.
- A9 dedicated tests: 6/6 PASS.
- Full runtime regression: 121/121 PASS.
- Node 24.18.1 / TypeScript 6.0.3 build: PASS, 0 errors.
- OpenAPI: PASS — 512 paths / 581 operations / 1138 refs.
- Architecture: PASS — 344 files.
- Toman / No-Wallet / configuration-boundary policy: PASS.
- PostgreSQL 18.4 isolated verification: PASS.
- Dead-letter -> pending without explicit manual-retry override rejected with `NOTIFICATION_DELIVERY_TERMINAL`.
- Explicit admin retry override reopened dead-letter delivery to pending and intent to queued.
- Delivered -> pending remained rejected even with override.
- `notifications.templates.name_fa` presence verified.
- Verification branch deleted; main/default database unchanged.

## Boundaries preserved
- No live SMS/email provider, credential, SDK or external integration added; Step 47 remains provider scope.
- No frontend notification center UI added.
- No scheduler implementation added before A10.
- No cross-domain ownership or direct Notifications SQL into Orders/Customer/Admin business state added.
- Customer in-app HTTP/UI remains frontend/account-surface scope; A9 implements the canonical Admin/Internal HTTP contract.

## Next
Step 44 / A10 — Operational Scheduler + Delivery Read Models + Audit/Outbox/Observability.
