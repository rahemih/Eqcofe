# EQCOFE Current State

## Trusted state date
**2026-08-19**

## Official repository
- Repository: `rahemih/Eqcofe`
- Default/canonical branch: `main`
- Historical repository: `rahemih/digikala-clone` — retained as historical/recovery evidence; it is not the canonical application source.

## Canonical baseline lineage
The canonical Step-44 source was recovered and verified before import.

Verified Step-44 code baseline:
`b239dfe825b615f36caf2e26cc7abc80c70d349c`

Later Step implementation and trusted-state documentation advance `main` beyond that immutable Step-44 baseline.

## Step 45 closure
**Step 45 — Content, Articles & SEO Backend — CLOSED / FINAL GATE PASS**

Canonical Step-45 closure evidence records:
- A1–A12 COMPLETE
- A12 final audit: 54/54 PASS
- final runtime regression: 152/152 PASS
- 10-cycle regression: 10/10 PASS
- 1440/1440 runtime executions PASS
- production build: PASS
- PostgreSQL: PASS
- OpenAPI: PASS
- architecture/policy gates: PASS
- launch blocker introduced: NO

Step 45 is not to be repeated.

## Active step
**Step 46 — Marketing, Promotions & Customer Club Backend**

### Completed substep
**A1 — Discovery, Scope Recovery & Business Rules Freeze — COMPLETE**

Canonical A1 artifact:
`docs/11-step-history/STEP-46-A1-DISCOVERY-SCOPE.md`

### Current substep
**A2 — Marketing Domain Model + Invariants — IMPLEMENTED / VERIFICATION PENDING**

Canonical A2 artifact:
`docs/11-step-history/STEP-46-A2-DOMAIN-MODEL-INVARIANTS.md`

A2 implementation now contains:
- Campaign aggregate and lifecycle invariants;
- Promotion definition, active-window, Toman and stacking rules;
- first-purchase and wholesale eligibility facts;
- Coupon normalization, enablement and usage-limit rules;
- Redemption reserved/consumed/released/reversed lifecycle;
- non-cash integer customer-points ledger;
- dedicated A2 invariant tests.

Static architecture/policy review found and corrected one forbidden-token issue in an initial loyalty error-code name. New domain files otherwise respect the existing domain dependency gate: no NestJS, database/infrastructure dependency or `any` in domain source.

Fresh runtime verification is not yet evidenced: the GitHub connector returned no check status for the latest A2 commit and the local execution environment could not resolve github.com to clone the repository. No build/test PASS is fabricated.

Therefore A2 must remain `PARTIAL / VERIFICATION PENDING` until a fresh `pnpm verify` or equivalent CI result is available. A3 must not be formally closed ahead of that gate.

## Step-46 ownership boundary
- Pricing remains authoritative for base pricing.
- Marketing owns campaign/promotion/coupon eligibility and redemption state.
- Cart/Checkout persists commercial snapshots including discounts.
- Orders consumes the reserved checkout snapshot.
- Customer supplies customer/wholesale eligibility facts.
- Finance remains authoritative for downstream profit/financial accounting.
- Loyalty, if retained for MVP, is a non-cash points ledger only.
- Cash-account functionality remains prohibited.

## Step-46 launch classification

### Launch critical
Campaign/promotion core, coupon validation, eligibility, first-purchase promotion, activation windows, usage limits, conflict/stacking rules, redemption concurrency/idempotency, Pricing/Cart/Checkout/Order integration, financial correctness, RBAC/audit and regression coverage.

### Launch preferred
Minimal festival administration and a minimal points/club ledger only if they do not destabilize launch-critical commerce.

### Post-launch
Advanced loyalty tiers, gamification, referrals unless separately approved, segmentation, personalization, recommendation-driven campaigns and AI marketing automation.

## Global trust rules
1. `rahemih/Eqcofe` is the official repository.
2. `main` is the canonical branch.
3. Commit `b239dfe825b615f36caf2e26cc7abc80c70d349c` remains the exact verified Step-44 baseline reference.
4. `docs/12-current-state/MASTER-ROADMAP.md` is the canonical end-to-end execution roadmap.
5. Financial values remain integer Toman.
6. Cash-account functionality must not be reintroduced.
7. A step/substep is not COMPLETE merely because code exists; applicable implementation, migrations, tests, contracts, security and documentation gates must pass.
8. Historical recovery evidence must not be rewritten as newly verified implementation.
