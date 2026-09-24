# Step 60-H — Integrated Acceptance and Listing Prototype

## Baseline and scope

Canonical pre-H main: `eddccb0ccf3756a1f01ea06facb7401ce65a0193` (PR #266, 60-G). Protected merge and exact-SHA postmerge verification [passed](https://github.com/rahemih/Eqcofe/actions/runs/35992367555), and [the terminal Lock was released](https://github.com/rahemih/Eqcofe/pull/266#issuecomment-5813172784). At the pre-write guard there are zero open PRs. Linear issue: `HOS-16`.

H accepts the existing production Search and Category routes as the interactive listing prototype. It introduces no new feature or API. `step60:acceptance` exercises the built server with an isolated authoritative mock API: Search and Category results, filtered-empty states, invalid/missing input without API calls, price sort with opaque cursor, GET-only authority, Search noindex and Category canonical/robots rules. The pinned Storefront Quality browser job additionally exercises filter submission and cursor navigation; the inherited 60-G browser checks continue to cover six viewport widths, RTL, reflow, reduced motion, keyboard disclosure, touch targets and axe.

The prototype is the running Storefront `/search?q=...` and `/category/:slug` routes; browser assertions exercise actual forms and links. This document does not claim a live deployment or a separate design mockup.

## Acceptance and closure boundary

Local acceptance and all exact-head provider CI, Phase A, Storefront Quality, deterministic Review and exact-artifact ACTIVE Lock must pass before protected Merge Policy transport. Protected merge, exact-SHA postmerge `pnpm verify` plus Phase A and terminal Lock release are required to declare 60-H canonically complete. Until those conditions pass, 60-H remains **IN PROGRESS** and 60-I is **BLOCKED**. The final Roadmap and Current State synchronization and Step 61 handoff belong exclusively to 60-I.

No backend/OpenAPI, Pricing/Inventory, database/migration, new dependency, workflow, governance protection, Product Detail or Step 61+ change is in H scope.
