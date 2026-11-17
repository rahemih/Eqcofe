# Step 70 — Step57 Prototype GitHub Runner Compatibility

Status: **PROPOSED / UNMERGED**. Issue [#401](https://github.com/rahemih/Eqcofe/issues/401). Task `EQCOFE-STEP70-CI-STEP57-RUNNER-COMPAT-001`. Canonical base `946ccb63ed210305b0ced2fb12143944ff37b796`.

## Confirmed root cause

Actual [GitHub Actions log 44042004778](https://github.com/rahemih/Eqcofe/actions/runs/44042004778) shows Playwright 1.55.0 failed to install Chromium on `ubuntu26.04-x64`. The project workflow specified `runs-on: ubuntu-latest`, which GitHub began migrating to Ubuntu 26.04 during 2026-10-19 through 2026-11-19. GitHub officially recommends pinning `ubuntu-24.04` while unsupported dependencies are adjusted: https://github.blog/changelog/2026-09-17-ubuntu-26-generally-available-and-latest-migration/

## Single-line repair

In `.github/workflows/step57-prototype.yml` change **only** `runs-on: ubuntu-latest` to `runs-on: ubuntu-24.04`. Retain Playwright `1.55.0`, Chromium install, all 134-screen prototype checks, 1143 Admin views, browser/a11y/RTL/keyboard/responsive audits, screenshots, artifacts, job permissions and every existing step unchanged. Do not rebase or modify Step70-G governance PR #400 as part of this repair.

## Gate and verification policy

This is a **MEDIUM-risk** isolated compatibility repair: it does not alter a required main status check, delete a test, remove security checks or change execution privileges, but it changes CI infrastructure and must pass deterministic Review, exact-head CI/Phase A and ACTIVE Scope Lock. It is not a Human or Security approval and does not make PR #400 or #390 merge-eligible.

Closure requires the **actual** Step57 Prototype workflow to pass on this head and after protected merge. If any other browser tests fail, investigate and remediate rather than suppress. Pinned runner is intentionally temporary and should be reviewed against future Playwright platform support. No CodeQL/CI test disabling or branch protection changes.
