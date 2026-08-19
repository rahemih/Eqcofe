# Security Policy

EQCOFE uses fail-closed security boundaries around authentication, payments, admin actions and external providers.

## Never commit
- `.env` or production environment files
- passwords/API keys/merchant credentials
- private certificates or signing keys
- production database dumps containing personal/sensitive data

## Core security expectations
- Server-side authoritative actor/recipient resolution
- RBAC for admin actions
- Step-Up for critical mutations
- Idempotency for retry-prone sensitive mutations
- Transactional outbox for important integration events
- No external provider call inside the transaction that creates durable business state
- No direct cross-domain SQL that violates module ownership
- CSP/rate-limit/session/production hardening remains part of production preparation

Report security issues privately to the project owner rather than publishing exploit details in a public issue.
