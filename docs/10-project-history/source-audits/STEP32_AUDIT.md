# STEP 32 — Complete Identity/Auth/FIDO2/RBAC Audit

## Scope completed
- Customer OTP login.
- Opaque customer/admin sessions; only SHA-256 token hashes are persisted.
- Separate customer and admin cookie/session resolution.
- Admin password first factor.
- Mandatory cross-platform WebAuthn/FIDO2 roaming authenticator for admin access.
- One-time initial FIDO enrollment token.
- Additional credential registration and credential revocation.
- Session-bound FIDO2 step-up tokens.
- RBAC roles, permissions, staff roles and access scopes.
- Last-superadmin and system-role protection.
- Staff/session lock and revocation operations.
- Audit trail for privilege and security-sensitive operations.
- ETag/If-Match optimistic concurrency on RBAC/staff mutations.
- Browser Origin/CSRF protection and credentialed CORS configuration.
- Subject/IP throttling for OTP and admin login.

## Security corrections made while completing Step 32
1. OTP attempts are now atomically consumed/counted inside a database transaction.
2. WebAuthn challenges are account-bound and atomically consumed at successful finalization.
3. Cross-account challenge substitution is rejected.
4. A challenge cannot be successfully finalized twice during a race.
5. Step-up tokens are bound to both account id and current session id.
6. Customer sessions cannot authenticate admin endpoints and admin sessions cannot authenticate customer endpoints.
7. Session resolver no longer treats arbitrary Bearer tokens as browser sessions.
8. Initial FIDO registration is bound to a one-time enrollment token.
9. FIDO recovery revokes previous credentials and active sessions atomically and is audited.
10. Last FIDO credential cannot be removed through normal self-service credential revocation.
11. System roles cannot be deactivated or have their permissions overwritten.
12. Last active superadmin cannot be disabled or stripped of superadmin role.
13. Superadmin permissions resolve dynamically to all registered permissions, preventing permission drift when new permissions are introduced.
14. RBAC/staff mutations use entity version checks and return VERSION_CONFLICT on stale writes.
15. Privilege mutations revoke affected staff sessions so new authorization is re-established on next login.
16. Bootstrap admin password hashing was upgraded to the same 64-byte scrypt representation used by runtime authentication.
17. Unsafe cookie-authenticated browser requests require an allowed Origin.
18. Production requires explicit WebAuthn RP/origin and allowed browser origin configuration.

## Audit results
- TypeScript files syntax-parsed: 112
- Syntax errors: 0
- Architecture policy check: PASS
- Toman/no-wallet policy check: PASS
- OpenAPI operations: 511
- Duplicate operationId: 0
- Local OpenAPI $ref checked: 807
- Broken OpenAPI $ref: 0
- Step 32 controller route coverage against OpenAPI: PASS
- Broken relative TypeScript imports: 0
- Legacy non-atomic OTP/challenge helper patterns: 0
- Dependency-free identity security tests: 4/4 PASS

## Execution gate
A full NestJS semantic build/integration test run could not be performed in this container because repository dependencies are not installed and npm registry access timed out. The container currently exposes Node 22 while the repository target remains Node 24 LTS. This is an environment gate, not a hidden PASS.

The first CI/development-host gate remains:

```bash
corepack enable
pnpm install
pnpm contract:validate
pnpm contract:types
pnpm build
pnpm test
pnpm arch:check
pnpm policy:check
```

No Step 32 implementation should be promoted to a deployment environment until that full dependency-backed build/test gate passes.
