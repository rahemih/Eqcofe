# Step 51 / A12 — Management Export Jobs + Safe Serialization

**Status:** COMPLETE / FINAL GATE PASS

## Scope
A12 implements the A11-frozen Analytics export application/persistence boundary without adding HTTP/OpenAPI exposure, XLSX, public links or external delivery.

## Implementation
- Added forward-only migration `0061_analytics_management_exports.sql`.
- Added actor-bound, idempotent management-export job claims with immutable completed/failed terminal artifacts.
- Added exactly three permissions: `analytics.export.create`, `analytics.export.view`, `analytics.export.download`.
- Composes the nine allow-listed datasets exclusively through existing A4–A10 management services.
- Added deterministic UTF-8 BOM CSV and versioned allow-listed JSON serializers.
- CSV serialization neutralizes spreadsheet formula injection and safely handles quoting/control characters.
- Enforces 1–500 rows, existing 366-day read bounds and a 5 MiB encoded-content ceiling.
- Stores content hash, row count, source watermark and server-generated filename/MIME evidence.
- Create, complete, fail and every download attempt use redacted central audit metadata; artifact rows/content are excluded.
- Direct-download application result sets attachment, `nosniff` and `no-store, private` headers.

## Authority and security invariants
- Analytics exports only Analytics read models and never queries owner-domain tables directly.
- Job access is actor-scoped; a staff actor cannot retrieve another actor's artifact through this application boundary.
- Idempotency replay returns the existing job; reuse for a different normalized request fails closed.
- Terminal artifacts cannot be updated or deleted.
- No arbitrary object/database-row serialization is permitted.
- No Controller, OpenAPI path, XLSX writer, external dependency, public URL, email/cloud delivery or retention deletion rule is introduced.

## GitHub evidence
- Implementation PR: `#109` — MERGED
- Implementation head: `434b19193fb062aa888bea56939f2c7f51ee5bcc`
- Merge commit: `7e17e4969b812916cb730e4ba5dc5b9052a84ab7`
- Canonical CI run: `32733087408` — PASS
- Verify job: `97449559653` — PASS

## Verification
- A12 dedicated tests: **7/7 PASS**
- Runtime tests: **549 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- TypeScript build: PASS
- OpenAPI: PASS — 522 paths / 591 operations / 1159 refs
- Architecture: PASS — 466 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- `git diff --check`: PASS

## Next
Proceed to Step 51 / A13 — Hardened Management HTTP / RBAC / OpenAPI. It may expose the existing bounded management reads and A12 export application boundary only; runtime permissions, Step-Up, idempotency, validation, response/download headers, audit agreement and strict OpenAPI contracts must be verified together.
