# Step 61-H — Integrated Product Detail Acceptance and Prototype

## Baseline and scope

Canonical pre-H main: `502cf4af22dd5ea5fbb8de33e5b5f9e1020f0eb2` (PR #277, 61-G). Protected Merge Policy Run `36679326809` / #704 passed; merge job `109771123183` and exact-SHA postmerge job `109771217387` succeeded, including canonical `pnpm verify` and Phase A. Terminal Lock release is recorded in PR #277 comment `5905693046`. Linear issue: `HOS-65`.

Stage H is an acceptance-only layer over the production `/product/:slug` route already implemented by Stages C–G. It adds no product feature or API. The acceptance verifier exercises a built production server against an isolated authoritative mock API and verifies the integrated Product Detail flow: product identity, variant price/stock, specifications, related content, media capability boundary, canonical/robots metadata, no-result state and add-to-cart transport. Under the existing Browser Quality environment it also exercises actual variant selection, media navigation and add-to-cart interaction.

The prototype is the running Storefront Product Detail route itself. This document does not claim a live deployment, a separate mockup, or support for 3D/360 media that is absent from the canonical contract.

## Acceptance and closure boundary

Local acceptance and all exact-head provider CI, Phase A, Storefront Quality, deterministic Review and exact-artifact ACTIVE Lock must pass before protected Merge Policy transport. Protected merge, exact-SHA postmerge `pnpm verify` plus Phase A and terminal Lock release are required to declare 61-H canonically complete.

Until those conditions pass, 61-H remains **IN PROGRESS** and 61-I is **BLOCKED**. Final Roadmap/Current State reconciliation, Step 61 closure and Step 62 handoff belong exclusively to Stage 61-I.

No backend/OpenAPI, Pricing/Inventory authority, database/migration, dependency, workflow, governance protection, runtime Product Detail component, or Step 62+ change is in H scope.
