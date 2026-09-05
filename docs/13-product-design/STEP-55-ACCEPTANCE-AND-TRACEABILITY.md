# Step 55 — Acceptance & Traceability Matrix

**Status:** STEP 55 CLOSED / FINAL GATE PASS

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

Each of 55-B through 55-F passes only when all owned screen IDs have repository artifacts, traceability and acceptance companions; all required states and widths are reviewed; design validators and full verification pass; exact-head Canonical CI passes; and its dedicated PR merges. Completion of one gate does not authorize work owned by the next.

55-F additionally audits the complete storefront set for shell consistency, duplicated/missing journeys, responsive/RTL/accessibility coverage, artifact drift and unresolved exceptions. Its final audit and Canonical CI/merge evidence authorize the Roadmap to record Step 55 as fully closed.

## Exception policy

An exception must name the screen/state, source requirement, reason, impact, temporary alternative, owner gate and closure evidence. Paid-plan capacity and incomplete Figma mirroring cannot waive repository evidence. A missing production provider cannot be represented as success; the wireframe must show the fail-closed or unavailable path.

## 55-A acceptance result

55-A passes when its contract and two documents are substantive, every screen and gate ID is unique, every required gate owns its exact screens, all 12 storefront journeys are covered, all referenced journey/component/state IDs exist upstream, Step 54 responsive and product constraints match exactly, and repository validation plus full verification, exact-head CI, merge and remote-main re-read succeed. No 55-B artifact is allowed in this change.

## 55-B acceptance result

55-B passes with six owned screen folders, 24 deterministic low-fidelity frames, three required state frames per screen at 320px, one expanded primary frame per screen at 1440px, explicit behavior for every inherited width, 400% reflow review, Persian/RTL/accessibility evidence and complete journey/OpenAPI/component/state companions. The Gate-level manifest binds the source and 43 generated child artifacts with SHA-256. Product Detail remains only a handoff to 55-C; no later screen, runtime, API, business rule, high-fidelity UI, prototype or paid/Figma dependency enters this Gate.

## 55-C acceptance result

55-C passes with five owned screen folders, 20 deterministic low-fidelity frames and 36 generated child artifacts bound by the Gate manifest. Product detail/media, comparison and customer-owned actions cover their three frozen compact states and one expanded state per screen, all inherited widths, 400% reflow, Persian RTL and bounded recovery. Price/stock/Variant remain authoritative; comparison is capped at four same-category products; guest wishlist/alert intent survives authentication safely. Cart/checkout remains a handoff to 55-D and no runtime, API, rule, high-fidelity or paid/Figma dependency enters the Gate.

## 55-D acceptance result

55-D passes with seven owned screen folders, 28 deterministic low-fidelity frames and 50 generated child artifacts bound by the Gate manifest. Cart, identity, address, delivery, review, payment verification and order outcome cover all frozen compact states, expanded evidence, every inherited width and 400% reflow. Quote/stock/shipping/payment/order stay authoritative; expiry, conflict, timeout, unknown-result and callback replay have bounded fail-closed recovery. Account detail remains a handoff to 55-E and no runtime, API, Provider, rule, high-fidelity or paid/Figma dependency enters the Gate.

## 55-E acceptance result

55-E passes with twelve owned screen folders, 48 deterministic low-fidelity frames and 85 generated child artifacts bound by the Gate manifest. Account, profile/security, addresses, orders/invoice, customer tools, wholesale and after-sales cover all frozen compact states, expanded evidence, every inherited width and 400% reflow. Customer ownership, privacy, authoritative approval/price/quantity, return/warranty eligibility and bounded idempotent recovery remain explicit. Content/policy and final audit remain a handoff to 55-F; no runtime, API, upload, rule, high-fidelity or paid/Figma dependency enters the Gate.

## 55-F acceptance result

55-F passes locally with seven owned screen folders, 25 deterministic low-fidelity frames and 49 generated child artifacts bound by the Gate manifest. Article listing/detail, About, Contact, FAQ, Terms and Returns/Warranty cover every frozen compact state plus expanded evidence, all six inherited widths and 400% reflow. Article reads trace only to the three approved public OpenAPI capabilities; static, policy and support surfaces invent no operation. Published-only content, policy versioning, no unsupported eligibility promise and support privacy remain explicit.

The final repository audit passes all 37 uniquely-owned screens, 145 frames, five manifests, 12 storefront journeys and ten cross-cutting checks with zero open exceptions. PR #150 exact-head and post-merge Canonical CI passed; the final state synchronization records the machine status and Roadmap as `CLOSED / FINAL GATE PASS`.
