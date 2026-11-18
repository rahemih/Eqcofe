# Step70 CI Step58 storefront browser QA — runner compatibility

Status: **PROPOSED / NOT MERGED**. [Incident #405](https://github.com/rahemih/Eqcofe/issues/405). Task `EQCOFE-STEP70-CI-STEP58-RUNNER-COMPAT-001`. Base `main@58ac38b730f192799ca582e7d2e0b70ecb580989`.

## Observed failure

The real [Step58 Storefront Quality run #44291906251](https://github.com/rahemih/Eqcofe/actions/runs/44291906251) failed installing Chromium because Playwright 1.55.0 does not support `ubuntu26.04-x64`. `ubuntu-latest` selects that image. The same root cause was previously resolved for Step57 by MEDIUM [PR #402](https://github.com/rahemih/Eqcofe/pull/402) via an explicit Ubuntu 24.04 runner pin.

## Exact one-line fix

In `.github/workflows/step58-storefront-quality.yml`, replace `runs-on: ubuntu-latest` with `runs-on: ubuntu-24.04`. Leave the `playwright@1.55.0 axe-core@4.10.3` isolated install, Chromium, storefront build, browser/a11y/keyboard/RTL/responsive/reflow audits, step order, workflow event triggers, permissions, and timeouts completely unchanged. No disabled/skipped tests or direct merge.

## Governance and proof

This is a separate **MEDIUM-risk** CI repair; it cannot be used to waive HIGH controls on supplier-invoice authorization PR #404 or to claim that Step70-G or Step71 is complete. Exact-head Step58 QA, Canonical CI, Phase A, CodeQL status where required, deterministic Review, ACTIVE Scope Lock and protected merge are prerequisites. No PASS claimed until GitHub provider results confirm it. Only after exact-SHA postmerge verification and terminal Lock release can this CI incident be closed.
