# Step 68-H — Integrated Catalog / Media / Sales-Control Acceptance

## Status

`STEP_68_H = IN_PROGRESS / NOT_CANONICAL`

Canonical base: `1399dc20932224a7b26ee45b72b233b80d0ee7f1`  
Dependency: Step 68-G = `CANONICAL_COMPLETE`  
Risk: **MEDIUM**  
Project Owner Human Gate: **NOT REQUIRED**

## Goal

Close the implementation portion of Step 68 with integrated production-build acceptance across the source-proven Admin Catalog / Media surfaces **AD-C-01 through AD-C-08**. This stage validates the completed runtime; it does not add new product capability.

## QA modes

1. **Canonical production SSR/mock mode**
   - always runs from `@eqcofe/admin verify`;
   - starts the production React Router server;
   - uses a dynamic local mock API port;
   - proves authenticated/unauthenticated boundaries and source-backed route rendering.

2. **Isolated Chromium/Axe mode**
   - runs through the already-existing Storefront Quality chain when `EQCOFE_BROWSER_QA_ROOT` is present;
   - uses isolated Playwright/Axe tooling already installed by that workflow;
   - does not add production dependencies or change workflow authority.

## Integrated surfaces

- AD-C-01 — Product list/detail/lifecycle context
- AD-C-02 — Variant administration within Product
- AD-C-03 — Attribute definitions/assignment entry
- AD-C-04 — Product media attachment/order/primary/detach context
- AD-C-05 — Brand administration
- AD-C-06 — Category administration
- AD-C-07 — Media request/review/delete workspace
- AD-C-08 — Sales-Control preview/review/Step-Up entry

## Acceptance invariants

- Persian `fa-IR` + RTL on every production route.
- Exactly one primary H1 per accepted route.
- No root/body horizontal overflow.
- Visible interactive targets remain at least 44×44 CSS pixels.
- Browser Axe result has zero WCAG-tagged violations.
- Responsive evidence includes canonical widths 320 / 360 / 600 / 840 / 1200 / 1440 through the acceptance route matrix.
- Auth/session/Step-Up/credential/signed-media capability material is never persisted in localStorage/sessionStorage.
- Sales-Control browser flow intentionally exercises **preview only**, then the explicit review dialog; Escape/cancel restores focus and no `/admin/sales-control/apply` request is emitted.
- No generic media-list endpoint, generic Catalog bulk runtime, pricing/inventory/FX/Excel or Step69 authority is invented.
- Existing Step67 Admin shell/auth acceptance remains chained before Step68-H.

## Explicit exclusions

- Backend, OpenAPI, generated contract or database mutation.
- Product Design semantic mutation.
- Storefront runtime mutation. The only Storefront-path change permitted is `apps/storefront/package.json` QA routing so the existing browser-quality workflow is triggered and invokes `@eqcofe/admin step68:acceptance`.
- GitHub workflow/dependency mutation.
- pricing, inventory, FX or Excel work.
- Current-State / Master-Roadmap reconciliation — deferred to 68-I.
- Step69 work.
- Graph/Graphify.

## Exit gate

68-I is blocked until:

1. deterministic Step68-H verifier PASS;
2. exact-head Canonical CI + Phase A + CodeQL PASS;
3. deterministic Review PASS;
4. exact-artifact Scope Lock ACTIVE;
5. protected merge;
6. exact-SHA postmerge Canonical CI + Phase A + CodeQL PASS;
7. terminal Lock RELEASED;
8. Linear HOS-72 synchronized.

`STEP_68_I = BLOCKED_FROM_MUTATION`
