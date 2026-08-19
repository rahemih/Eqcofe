# ADR-003 — Transactional Outbox

**Status:** Accepted

Business state changes and the corresponding event are committed atomically in PostgreSQL. Delivery is at-least-once; consumers must be idempotent and maintain inbox state for critical side effects.
