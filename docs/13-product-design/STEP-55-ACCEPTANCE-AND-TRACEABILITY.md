# Step 55 — Acceptance & Traceability Matrix

**Status:** 55-A COMPLETE; 55-B..55-F NOT STARTED

## Gate ownership

| Gate | Scope | Screen obligations | Journey coverage required |
|---|---|---:|---|
| 55-B | Home, category/search, listing, filter/sort and discovery recovery | 6 | SJ-01, SJ-11 |
| 55-C | Product detail/media, compare and wishlist/alert actions | 5 | SJ-01, SJ-02, SJ-03, SJ-11, SJ-12 |
| 55-D | Cart, checkout, payment verification and order recovery | 7 | SJ-03, SJ-04, SJ-05, SJ-06, SJ-07, SJ-11 |
| 55-E | Account, wholesale, order, return and warranty | 12 | SJ-03, SJ-05..SJ-12 |
| 55-F | Articles, about/contact/FAQ, policy, responsive audit and closure | 7 | SJ-01, SJ-04, SJ-05, SJ-08..SJ-11 |

The canonical JSON lists exact screen IDs. All 12 storefront journeys are covered at least once across the inventory. OpenAPI traceability is inherited by journey ID from the validated Step 53 contract; wireframes never turn an operation reference into a promise that a production provider is configured.

## Per-screen acceptance

| Area | Required evidence before that screen passes |
|---|---|
| Identity | Stable screen ID, owner gate, revision, viewport, actor and route intent |
| Source | Step 53 journey(s), relevant OpenAPI capability through those journeys, and Step 54 component/token references |
| Structure | Global shell relationship, reusable layout regions, one primary task and clear content priority |
| Responsive | 320px primary frame plus explicit 360/600/840/1200/1440 behavior; 400% reflow review |
| State | Applicable loading, empty, error, disabled, access, lifecycle and recovery states |
| Commerce | Current authoritative price/stock/type; integer Toman; quote/TTL/conflict visibility; no Wallet |
| RTL/Persian | Logical reading/focus order, long Persian copy, correct numeral policy and bidi isolation |
| Accessibility | Landmark/heading plan, 44px targets, focus path, non-color status, form associations and announcements |
| Recovery | Bounded retry/status check, preserved safe input/context and stable reference where available |
| Boundary | No new business rule, permission, API, runtime, high-fidelity visual or invented asset |

## Gate-level Definition of Done

Each of 55-B through 55-E passes only when all owned screen IDs have repository artifacts, traceability and acceptance companions; all required states and widths are reviewed; design validators and `pnpm verify` pass; exact-head Canonical CI passes; and its dedicated PR merges. Completion of one gate does not authorize work owned by the next.

55-F additionally audits the complete storefront set for shell consistency, duplicated/missing journeys, responsive/RTL/accessibility coverage, artifact drift and unresolved exceptions. Only 55-F may canonicalize Step 55 as fully closed. Until then the Roadmap must say Step 55 `IN PROGRESS` and list the latest completed gate.

## Exception policy

An exception must name the screen/state, source requirement, reason, impact, temporary alternative, owner gate and closure evidence. Paid-plan capacity and incomplete Figma mirroring cannot waive repository evidence. A missing production provider cannot be represented as success; the wireframe must show the fail-closed or unavailable path.

## 55-A acceptance result

55-A passes when its contract and two documents are substantive, every screen and gate ID is unique, every required gate owns its exact screens, all 12 storefront journeys are covered, all referenced journey/component/state IDs exist upstream, Step 54 responsive and product constraints match exactly, and repository validation plus full verification, exact-head CI, merge and remote-main re-read succeed. No 55-B artifact is allowed in this change.
