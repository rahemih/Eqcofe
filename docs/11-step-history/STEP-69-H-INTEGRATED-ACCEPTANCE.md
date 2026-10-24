# Step 69-H — Integrated Pricing / FX / Excel Acceptance

## Status

`STEP_69_H = IN_PROGRESS / NOT_CANONICAL`

Canonical base: `4dae72e58486c35a5cca3a4966de824ecf275527`  
Dependency: Step 69-G = `CANONICAL_COMPLETE`  
Risk: **MEDIUM**  
Project Owner Human Gate: **NOT REQUIRED**

## Goal

Close the implementation portion of Step 69 with integrated production-build acceptance across the completed Admin Pricing / FX / Excel surfaces. This stage validates the existing runtime; it does not add new business capability.

Integrated surfaces:

- AD-D-01 — Base Price / history
- AD-D-02 — Pricing Rules
- AD-D-03 — Bulk Pricing
- AD-D-04 — FX rates / impact preview
- AD-D-05 — Currency Rules
- AD-D-19 — Excel template / dry-run / import / recovery workspace
- AD-D-20 — Excel Catalog preview/apply workspace
- AD-D-21 — Excel Pricing preview/apply workspace

## QA modes

1. **Canonical production SSR/mock mode**
   - always runs from `@eqcofe/admin verify`;
   - starts the production React Router server;
   - uses a dynamic local mock API port;
   - proves authenticated/unauthenticated boundaries and source-backed route rendering.

2. **Isolated Chromium/Axe mode**
   - runs through the existing Storefront Quality chain when `EQCOFE_BROWSER_QA_ROOT` is available;
   - uses the isolated Playwright/Axe tooling already installed by that workflow;
   - does not add production dependencies or modify GitHub workflow authority.

## Acceptance invariants

- Persian `fa-IR` + RTL on every accepted production route.
- Exactly one primary H1 per route.
- No root/body horizontal overflow.
- Visible interactive targets remain at least 44×44 CSS pixels.
- Browser Axe result has zero WCAG-tagged violations.
- Responsive evidence includes canonical widths 320 / 360 / 600 / 840 / 1200 / 1440.
- Browser localStorage/sessionStorage contains no session/pre-auth/Step-Up/credential/Authorization/idempotency/workbook authority.
- Browser acceptance may execute source-proven safe previews/dry-run only; no destructive Apply, import creation/recovery, rule/rate mutation or Step-Up verify is issued.
- Bulk status authority is never generalized beyond operation-id reads.
- Excel import history/status is never invented.
- Template metadata is not represented as a downloadable binary workbook.
- Catalog and Pricing Excel transactions remain distinct; no combined atomic guarantee is claimed.
- Production FX provider readiness remains Step 77.
- Existing Step67 and Step68 acceptance remain chained before Step69-H.

## Explicit exclusions

- Runtime business-rule changes.
- Backend, OpenAPI, generated contract or database mutation.
- Product Design semantic mutation.
- Storefront runtime mutation; only `apps/storefront/package.json` QA routing is permitted.
- GitHub workflow or dependency mutation.
- Current-State / Master-Roadmap reconciliation — deferred to 69-I.
- Inventory / Procurement / POS / Step70.
- Production FX-provider integration.
- Graph/Graphify.

## Exit gate

69-I remains blocked until:

1. deterministic Step69-H verifier PASS;
2. exact-head Canonical CI + Phase A + CodeQL PASS;
3. deterministic Review PASS;
4. exact-artifact Scope Lock ACTIVE;
5. protected merge;
6. exact-SHA postmerge Canonical CI + Phase A + CodeQL PASS;
7. terminal Lock RELEASED;
8. Linear HOS-73 synchronized.

`STEP_69_I = BLOCKED_FROM_MUTATION`
