# Step 51 / A5 — Profit Management Read Model

**Status:** COMPLETE / FINAL GATE PASS

## Scope
A5 adds the management-facing profit composition over the existing Analytics-owned `profit_daily` projection. Analytics remains non-authoritative and read-side only.

## Implementation
- Added `ProfitManagementService`.
- Reads only `analytics.profit_daily` through `AnalyticsProjectionRepository.profitDaily`.
- Validates strict real-calendar `from` / `to` dates.
- Rejects reversed ranges and caps management windows at 366 days.
- Aggregates revenue, COGS, operating costs, gross profit and profit as integer Toman values.
- Derives gross and net margins as integer basis points.
- Uses safe-integer guards for projected money and aggregate arithmetic.
- Uses BigInt only for transient basis-point arithmetic so multiplication cannot silently lose precision; no BigInt is persisted or exposed.
- Preserves negative profit/loss values and returns zero margin when revenue is zero rather than fabricating a ratio.
- Exposes latest projection `sourceWatermark` plus daily management points.
- Empty windows return zero activity and null watermark.

## Authority / security invariants
- A5 does not query Finance, Orders, Payments, Inventory, Catalog, Pricing or Customer tables directly.
- A5 does not recalculate authoritative Finance rules; A3 remains responsible for ingesting Finance-owned profit snapshots into Analytics.
- A5 does not write any business-domain state.
- No migration is introduced.
- No HTTP endpoint, OpenAPI operation or RBAC permission is introduced.
- No dependency is added.

## GitHub evidence
- Implementation PR: `#95` — MERGED
- Implementation head: `a750e2324f9797694725a2d6f35a7e03e2d2316a`
- Merge commit: `b57a2ae3919490f8897ee456cea2dde24c6c3729`
- Canonical CI run: `32644122551` — PASS
- Verify job: `97205598097` — PASS

## Verification
- OpenAPI: PASS — 522 paths / 591 operations / 1159 refs
- Architecture: PASS — 459 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A5 dedicated tests: **6/6 PASS**
- Runtime tests: **518 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

## Next
Proceed to the next Step-51 analytics slice while preserving Analytics as a read-only, non-authoritative management reporting boundary.
