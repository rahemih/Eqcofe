# ADR-002 — PostgreSQL SQL-first migrations

**Status:** Accepted

Advanced PostgreSQL constraints, partial indexes, exclusion constraints, partitioning and deferred triggers are first-class design requirements. Migration SQL is the schema contract; Kysely is used for type-safe queries and transaction orchestration, not as the sole schema author.
