# Step 52 / A4 — Database Integrity & Concurrency Gate

**Status:** COMPLETE / CANDIDATE GATE PASS

## Canonical baseline
- Source baseline: merged A3 commit `50d873d9b407297f51699734d0192777d353bac6` on `main`.
- A3 PR #117 exact-head Canonical CI run `32808742192`: PASS.
- Open pull requests at A4 start: 0.

## Database catalog verification
A fresh isolated PostgreSQL database was built by executing all 65 canonical migrations before the integrity probes.

- Unvalidated constraints: **0**.
- Invalid indexes: **0**.
- Application tables without a primary key: **0**.
- Foreign-key constraints: **248**.
- Unique constraints: **75**.
- Check constraints: **653**.

## Executed integrity probes
All probes ran transactionally against the isolated migrated database:

- invalid permission risk value rejected by the check constraint: PASS;
- duplicate permission key rejected by uniqueness: PASS;
- orphan role/permission relation rejected by foreign keys: PASS;
- role deletion removed the join relation through the declared cascade: PASS;
- test records were removed and the disposable project `little-night-21625153` was deleted after verification.

## Concurrency audit
- Migration execution is serialized by `pg_advisory_lock` and checksum-bound.
- Runtime repositories retain explicit row locks (`FOR UPDATE`), optimistic aggregate/version checks, idempotency uniqueness and bounded `SKIP LOCKED` claim patterns.
- Existing regression includes concurrent wholesale decision, Excel execution/recovery, POS offline reconciliation, physical inventory protection, publication claims, Outbox and notification delivery behavior.
- No test was skipped, disabled or removed and no transaction/business rule was changed.

## Gate decision
No launch-blocking integrity or concurrency defect was reproduced. A4 is a gate-only evidence substep and adds no runtime source, migration, API, dependency or business-rule change. Canonical completion requires PR exact-source CI, merge and main-HEAD verification.

## Next
Proceed to Step 52 / A5 — Contract, Build & Full Regression Gate after canonical A4 completion.
