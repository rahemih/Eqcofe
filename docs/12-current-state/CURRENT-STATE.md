# EQCOFE Current State

## Trusted state date
**2026-08-19**

## Official repository
- Repository: `rahemih/Eqcofe`
- Default/canonical branch: `main`
- Historical repository: `rahemih/digikala-clone` — retained as historical/recovery evidence; it is not the canonical application source.

## Canonical baseline lineage
Verified Step-44 baseline: `b239dfe825b615f36caf2e26cc7abc80c70d349c`.
Later implementation advances `main` beyond that immutable reference.

## Step 45 closure
**Step 45 — Content, Articles & SEO Backend — CLOSED / FINAL GATE PASS**
Step 45 is not to be repeated.

## Active step
**Step 46 — Marketing, Promotions & Customer Club Backend**

### Completed substeps
- **A1 — Discovery, Scope Recovery & Business Rules Freeze — COMPLETE**
- **A2 — Marketing Domain Model + Invariants — COMPLETE / FINAL GATE PASS**
- **A3 — PostgreSQL Schema + RBAC — COMPLETE / FINAL GATE PASS**
- **A4 — Campaign Lifecycle Engine — COMPLETE / FINAL GATE PASS**

Canonical artifacts:
- `docs/11-step-history/STEP-46-A1-DISCOVERY-SCOPE.md`
- `docs/11-step-history/STEP-46-A2-DOMAIN-MODEL-INVARIANTS.md`
- `docs/11-step-history/STEP-46-A3-POSTGRES-RBAC.md`
- `docs/11-step-history/STEP-46-A4-CAMPAIGN-LIFECYCLE.md`

### A4 implementation
A4 connected the Campaign domain lifecycle to application and persistence layers:
- `CampaignService` implements create/read/list, activate, pause, end, archive and reschedule;
- `CampaignRepository` uses row locks and expected-version compare-and-set semantics;
- lifecycle writes are transactional and emit audit records plus transactional outbox events;
- `MarketingModule` registers and exports the campaign lifecycle engine;
- additive migration `0036_marketing_campaign_lifecycle.sql` hardens persistence and reconciles the previously omitted `ended` state without rewriting A3 migrations.

Database lifecycle protection rejects illegal transitions, physical delete, archived mutation, expired activation and rescheduling outside draft/paused.

### A4 canonical verification evidence
Verification-only Draft PR #8 tested the exact A4 main base commit `327a80ddc331e89aecc2edade779966639330d1c`; its branch added only a documentation trigger marker.

GitHub Actions Canonical CI run `32255765865`, job `verify` (`96076979001`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 354 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A4 lifecycle tests: 8/8 PASS
- runtime tests: **148 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A4 FINAL GATE = PASS**
**A4 = COMPLETE**

### Next approved substep
**Step 46 / A5 — Coupon + Eligibility Engine**

## Step-46 ownership boundary
- Pricing remains authoritative for base pricing.
- Marketing owns campaign/promotion/coupon eligibility and redemption state.
- Cart/Checkout persists commercial snapshots including discounts.
- Orders consumes the reserved checkout snapshot.
- Customer supplies customer/wholesale eligibility facts.
- Finance remains authoritative for downstream profit/financial accounting.
- Loyalty is a non-cash points ledger only.
- Cash-account functionality remains prohibited.

## Global trust rules
1. `rahemih/Eqcofe` is the official repository.
2. `main` is the canonical branch.
3. `docs/12-current-state/MASTER-ROADMAP.md` is the canonical execution roadmap.
4. Financial values remain integer Toman.
5. Cash-account functionality must not be reintroduced.
6. A step/substep is not COMPLETE merely because code exists; applicable implementation, migrations, tests, contracts, security and documentation gates must pass.
7. Historical recovery evidence must not be rewritten as newly verified implementation.
