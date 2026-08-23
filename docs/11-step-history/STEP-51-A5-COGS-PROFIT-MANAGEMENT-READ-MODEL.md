# Step 51 / A5 — COGS & Profit Management Read Model

**Status:** VERIFICATION GATE PENDING

## Scope
A5 verifies and closes the management-facing COGS/profit analytics composition over the existing Analytics-owned `profit_daily` projection. During canonical discovery, the implementation and focused tests were already present on `main`; this closure therefore avoids rewriting working runtime code and instead verifies the existing slice non-destructively.

## Verified implementation present on canonical main
- `ProfitManagementService` is registered and exported by `AnalyticsModule`.
- Reads only from `AnalyticsProjectionRepository.profitDaily(from, to)`.
- Validates strict real-calendar `from` / `to` dates.
- Rejects reversed ranges and caps query windows to 366 days.
- Aggregates revenue, COGS, operating cost and profit in integer Toman.
- Derives gross profit as revenue minus COGS.
- Derives gross/net margin as integer basis points without floating-point money persistence.
- Preserves negative profit/loss values.
- Returns zero margins when revenue is zero rather than fabricating a ratio.
- Exposes the latest projection `sourceWatermark` and daily points.
- Empty projection windows return zero activity.
- Invalid watermarks and unsafe integer conversions/aggregates fail closed.

## Authority / security invariants
- A5 does not query Finance, Orders, Payments, Inventory, Catalog, Pricing or Customer tables directly.
- A5 does not mutate any business-domain state.
- No migration is introduced by this closure.
- No HTTP endpoint, OpenAPI operation or RBAC permission is introduced by this closure.
- No dependency is added.
- Authoritative cross-domain ingestion remains outside this read-side composition.

## Focused tests already present
`test/step51-analytics-a5.spec.ts` covers:
1. integer-Toman aggregation for revenue / COGS / operating cost / profit;
2. gross/net margin derivation;
3. loss and zero-revenue behavior;
4. empty projection windows;
5. date/range validation, invalid watermark and safe-integer fail-closed behavior;
6. Analytics-owned read-only boundary.

## Verification gate
This PR intentionally contains documentation only. Canonical CI must run the repository-wide `pnpm verify` against the already-present A5 runtime and tests. A5 is not FINAL until that CI gate passes and the closure PR is merged.
