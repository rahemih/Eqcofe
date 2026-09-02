# Step 55-F — Content, Policy, Responsive Audit & Canonical Closure

**Status:** COMPLETE LOCALLY / CLOSURE CANDIDATE — Canonical exact-head CI, merge and final state sync remain required.

## Scope and authority

55-F starts from verified canonical `main` baseline `9105a78af19e8a5f8fc30cc62a5dab94d208e46a`. It owns the seven frozen content and policy surfaces: article listing (`SF-F-01`), article detail (`SF-F-02`), About (`SF-F-03`), Contact/support (`SF-F-04`), FAQ (`SF-F-05`), commerce terms (`SF-F-06`) and returns/warranty policy (`SF-F-07`). The machine-readable source is `step55-content-policy-final-audit-wireframes.json`; its deterministic generator writes `step55-wireframes/F/` and CI rejects byte drift.

Repository evidence remains Canonical. Figma is optional and non-blocking. This Gate does not create routes or claim that route intents are implemented.

## Content and API truth

Article listing/detail show published public content only. Their traceability is deliberately direct to the existing public OpenAPI reads `GET /articles`, `GET /articles/{slug}` and `GET /articles/{slug}/related`; the contract does not falsely assign those capabilities to a Step 53 journey that omitted them. About, FAQ and policy pages use approved static content and declare no API operation. Contact fixes the form intent and validation/submission/failure states, but because no approved public support mutation exists it does not claim a working Runtime endpoint.

Draft/scheduled articles, fabricated statistics, partners, certifications, support channels, response hours and SLAs remain absent. Safe user input may survive a failure; OTP, token, secret and payment data are never requested.

## Policy and commerce safety

Terms and returns/warranty pages expose visible version/effective-date structure and fail closed when no published policy exists. Their copy explains approved policy; it cannot invent shipping, payment, cancellation, eligibility, return or warranty business rules. Customer-specific eligibility stays authoritative to the applicable order/item and after-sales capability. Integer Toman, no Wallet and verified payment-result semantics remain inherited.

## Responsive and accessibility evidence

All required states exist at 320px and each screen has one expanded 1440px frame: 25 frames total. Trace companions cover 320, 360, 600, 840, 1200 and 1440px plus 400% zoom, logical RTL reading/focus order, long Persian content, one H1, heading hierarchy, 44×44px targets, visible focus, non-color status, error association and bounded vertical-only reflow.

The visual review checks all seven compact first states plus expanded article listing/detail, Contact and policy structures. The SVG renderer keeps Persian labels within their right boundary by using logical anchor placement without the duplicate direction attribute that caused earlier clipping.

## Complete Storefront audit

`storefront-final-audit.json` and `STOREFRONT-FINAL-AUDIT.md` roll up Gates B–F: 37 unique screen IDs, 145 frames, five manifests, 268 deterministic artifacts including manifests, all 12 Storefront journeys and ten required checks. Every screen verdict is PASS and there are zero open exceptions. All references remain inside Step 53 journeys, Step 54 components, approved OpenAPI capabilities and the frozen Step 55 inventory.

## Boundary and closure protocol

55-F adds design contracts, low-fidelity SVG evidence, documentation, validators and tests only. It introduces no frontend/backend Runtime, router, API mutation, migration, dependency, permission, business rule, real provider, upload, brand asset, high-fidelity UI, prototype or conformance/usability claim.

The local result is intentionally a closure candidate. Step 55 becomes closed only after the implementation head passes Canonical CI, the PR merges, `main` passes again, a final state-sync changes machine-readable status to `CLOSED_FINAL_GATE_PASS`, that sync merges, and its resulting `main` also passes Canonical CI. Linear `HOS-13` remains In Progress until that sequence completes.

## Acceptance

- Seven frozen folders, 25 SVG frames and 49 manifest-bound children exist.
- Direct article reads exist in validated OpenAPI; all other F surfaces expose no invented operation.
- Published-content, policy, privacy, RTL, responsive, recovery and accessibility constraints pass.
- The 37-screen/145-frame final audit has zero duplicates, omissions or open exceptions.
- Generator drift, focused tests, full verification and Canonical closure evidence must all pass.

Local closure-candidate verification: 623/623 tests PASS; OpenAPI 531 paths / 601 operations / 1179 references; Architecture 467 files; Step 53/54/55 validators, every deterministic generator drift check, Toman/no-Wallet policy and TypeScript build PASS.

Initial Canonical evidence: PR `#150`; implementation head `70f5eea102143971b4126f63b480f3120f1a4908`; Canonical CI `33596925507` / verify `100142144317` PASS. The evidence-sync head and its exact-head CI remain required before merge.
