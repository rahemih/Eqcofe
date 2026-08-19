# Contributing to EQCOFE

1. Preserve module ownership and public-port boundaries; do not add direct cross-domain persistence access.
2. Money is integer **Toman**. Do not reintroduce Rial or Wallet semantics.
3. Important mutations must preserve transaction, idempotency, audit and transactional-outbox guarantees where applicable.
4. Critical admin mutations require the established RBAC/Step-Up conventions.
5. Add/update OpenAPI and tests with behavior changes.
6. Never delete/disable a test merely to obtain a green build.
7. Never commit secrets or production credentials.
8. Use small, traceable commits with Step/Substep context when relevant.

Before opening a PR:

```bash
pnpm verify
```

For DB-sensitive changes, also execute the relevant migration and concurrency scenarios on an isolated PostgreSQL branch/environment.
