# Step 55-E — Account, Wholesale & After-Sales Wireframes

**Status:** COMPLETE / GATE PASS candidate — Step 55 remains IN PROGRESS; 55-F is next.

## Scope and authority

55-E starts from canonical `main` baseline `ae40460bed512bc8a492ffa101f4e6263cd7c4d3`. It owns twelve frozen surfaces: account overview (`SF-E-01`), profile/security (`SF-E-02`), addresses (`SF-E-03`), orders (`SF-E-04`), order detail/invoice (`SF-E-05`), customer tools (`SF-E-06`), wholesale introduction/application/status/approved context (`SF-E-07`..`SF-E-10`), return (`SF-E-11`) and warranty (`SF-E-12`). Step 53 journeys `SJ-03`, `SJ-05` through `SJ-12`, Step 54 components and the Step 55 shell remain authoritative.

The machine-readable source is `step55-account-wholesale-after-sales-wireframes.json`. The deterministic generator writes `step55-wireframes/E/`; CI compares every byte. Repository evidence is Canonical. Figma is optional/non-blocking and cannot replace source, frames, traceability or acceptance companions.

## Account and order truth

Every account resource is customer-owned and Session-bound. Overview separates partial service failure from first use. Profile contact changes use step-up authentication. Address conflict never overwrites a newer version silently. Orders, timeline, invoice and payment information come from their authoritative read models; denied states disclose neither existence nor content of another customer's record. Amounts are grouped integer Toman and Wallet remains absent.

Customer tools keep wishlist, product alerts, loyalty and reviews distinct. A failed tab does not blank healthy sections. Server validation preserves safe input and explains the bounded next action. Order cancellation, return and warranty entry points appear only when the authoritative capability allows them.

## Wholesale and after-sales

A wholesale applicant remains retail until authoritative approval. Application submission is idempotent; an existing active request causes a conflict handoff rather than a duplicate. Pending/approved/rejected states come from the application resource. Approved wholesale commerce displays authoritative price, stock, quantity and quote; quantities over ten receive only the discount confirmed by the current quote.

Return and warranty cases require a customer-owned eligible order/item. Validation, pending and terminal states retain one stable case reference and timeline. Retry does not create another record. No real upload, evidence file or unsupported service promise is invented by the low-fidelity frames.

## Responsive and accessibility evidence

Every screen has all three required states at 320px and one expanded first state at 1440px: 48 frames total. Traceability covers 320, 360, 600, 840, 1200 and 1440px plus 400% zoom. Mobile uses task-first single-column cards and record summaries; wider layouts use bounded 3/9, 4/8 or 7/5 regions. One H1, 44×44px targets, visible focus, error summary/field association, named Tabs, status announcements and non-color indicators are explicit.

Visual QA found and corrected duplicated RTL direction that clipped Persian text at the right edge. The regenerated compact and expanded samples keep headings, state copy, fields, references, cards and actions inside their content boundaries.

## Boundary

55-E changes product-design contracts, generated low-fidelity evidence, validators, tests and state documentation only. It introduces no frontend/backend runtime, router, API, migration, dependency, permission, business rule, real upload, Admin screen, high-fidelity UI, usability claim or prototype. Content/policy pages and final responsive audit remain a handoff to 55-F.

## Acceptance

- Twelve frozen folders and 48 SVG frames exist.
- The Gate manifest binds 85 generated child artifacts plus itself to source SHA-256.
- Journey, operation, component, state, privacy, account/order, wholesale, after-sales, RTL and accessibility traceability validates.
- Generator drift, focused tests, full project verification and exact-head Canonical CI must pass before merge.
- Step 55 stays open; only 55-F may begin after E closes.

Local gate evidence: full verification 616/616 tests PASS; OpenAPI 531 paths / 601 operations / 1179 references; Architecture 467 files; TypeScript build, Toman/no-Wallet policy and every design drift check PASS.
