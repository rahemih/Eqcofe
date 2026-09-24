# Step 60-G — Listing SEO, States, Accessibility and Responsive Hardening

## Starting guard

- Repository: `rahemih/Eqcofe`; canonical branch: `main`.
- Base: `aa26be53ff3937fc0822c3ae3c1b022da8fd60cf`.
- Step 60-A..F: `CANONICAL_COMPLETE`; PR #265 terminal evidence comment #5797727495, Lock RELEASED.
- Open PRs at start: 0. Linear: HOS-16 In Progress.
- Task: `EQCOFE-STEP60-G-SEO-ACCESSIBILITY-001`; Risk floor MEDIUM; no Human Gate unless provider escalates.

## Stage contract

- Search is noindex/follow regardless of query or result state; it has no fabricated canonical target.
- A successful unfiltered first-page Category can be index/follow; filter/sort/cursor and unavailable/error/invalid states are noindex/follow. Canonical category URLs use the backend-confirmed slug on the fixed EQCOFE origin, never the request Host or query string.
- Filtered-empty feedback differs from ordinary no-result; pending navigation is announced while existing authoritative data remains until the new GET settles. Error recovery stays manually triggered and bounded.
- Mobile filter disclosure uses a semantic button with expanded/controls relationship. Desktop controls remain visible. The Stage verifies Persian RTL, logical CSS, keyboard access, 44px targets, six canonical widths, 400% reflow proxy, reduced-motion and WCAG-tagged axe checks without a conformance claim.
- Static/type/build/SSR and a mock-backed browser check are part of existing Storefront verify/quality gates; no paid tooling or new dependency.
- The historical 60-F verifier is minimally transitioned to permit only the new local disclosure boolean; its URL-owned filter state, backend authority and all original filter/sort assertions remain intact.

## Explicit exclusions

No Pricing or Inventory authority changes, backend, OpenAPI, database, migration, dependency, workflow, Admin, Product Detail, full Step 60 acceptance/prototype (60-H), or Roadmap/Current-State final closure (60-I).

## Current state

`60-G = IN_PROGRESS`. Completion is not claimed before exact-head CI/Phase A/Storefront Quality, deterministic Review, artifact-bound ACTIVE Lock, protected workflow merge, exact-SHA postmerge verification, and terminal Lock RELEASED.
