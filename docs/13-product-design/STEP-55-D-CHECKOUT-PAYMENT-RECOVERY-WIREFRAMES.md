# Step 55-D — Cart, Checkout & Payment Recovery Wireframes

**Status:** COMPLETE / FINAL GATE PASS — Step 55 remains IN PROGRESS; 55-E is next.

## Scope and authority

55-D starts from canonical `main` baseline `6c866afbdae6499d60df5656e92e78da20923811`. It owns seven frozen surfaces: Cart (`SF-D-01`), Checkout Identity (`SF-D-02`), Address (`SF-D-03`), Delivery (`SF-D-04`), Review (`SF-D-05`), Payment Return/Verification (`SF-D-06`) and Order Outcome/Recovery (`SF-D-07`). Step 53 journeys `SJ-03`, `SJ-04`, `SJ-05`, `SJ-06`, `SJ-07` and `SJ-11`, Step 54 components and the Step 55 shell remain authoritative.

The machine-readable source is `step55-checkout-payment-wireframes.json`. The deterministic generator writes `step55-wireframes/D/`; CI compares every byte. Repository evidence is Canonical. Figma is optional/non-blocking and cannot replace source, frames, traceability or acceptance companions.

## Cart and checkout truth

Cart lines show authoritative Variant, price, stock and quantity validity. A changed price or invalid quantity blocks continuation with a reason and preserves safe context. The summary uses integer grouped Toman only; Wallet remains absent. Cart expiry is 168 hours and checkout reservation expiry is 15 minutes, both shown with bounded recovery rather than silent renewal.

Identity uses OTP without exposing sensitive input. Guest cart access/merge is explicit, idempotent and conflict-aware. Address is customer-owned, respects ownership/version and the one-default rule, and never substitutes a stale concurrent version. Delivery methods and fees come only from the authoritative list for the current address/cart; unavailable methods are not guessed.

Review re-reads quote, customer type, address, delivery, inventory and reservation before order creation. Changed totals require acknowledgement. An expired reservation is rebuilt before proceeding. Submitting uses one idempotent request and prevents accidental duplicate orders.

## Payment and recovery

Returning from a payment Provider is not proof of success. `status` and `verify` determine the authoritative result. Progressive, unknown-result and timeout states preserve order/payment references, avoid creating another payment prematurely and offer only bounded status-check/retry paths. A repeated callback reuses the same result and cannot create a second order or payment.

Order outcome states distinguish paid success, unconfirmed payment and idempotent replay. Each shows the stable order number, the safe next action and a support route. Latin references are bidi-isolated and no secret/provider payload is exposed.

## Responsive and accessibility evidence

Every screen has all three required states at 320px and one expanded first state at 1440px. Traceability covers 320, 360, 600, 840, 1200 and 1440px plus 400% zoom. Mobile uses vertical cards and summaries; wider layouts use bounded 8/4 or 7/5 regions. One H1, textual checkout progress, 44×44px targets, focus visibility, error summary/field association, status announcements and non-color state indicators are explicit.

Visual QA corrected compact RTL heading clipping, mixed Persian/Latin wrapping and long recovery copy before Gate acceptance. Desktop summaries, payment references and action hierarchy remain inside the 1280px content boundary.

## Boundary

55-D changes product-design contracts, generated low-fidelity evidence, validators, tests and state documentation only. It introduces no frontend/backend runtime, router, API, migration, dependency, permission, business rule, live Provider, Admin screen, high-fidelity UI, usability claim or prototype. Account/order detail remains a handoff to 55-E.

## Acceptance

- Seven frozen folders and 28 SVG frames exist.
- The Gate manifest binds 50 generated child artifacts plus itself to source SHA-256.
- Journey, operation, component, state, commerce, identity/address/delivery, payment recovery, RTL and accessibility traceability validates.
- Generator drift, focused tests, full project verification and exact-head Canonical CI must pass before merge.
- Step 55 stays open; only 55-E may begin after D closes.

Canonical evidence: PR `#142`; implementation head `74a17346d374f6728e9be467e252f645fbc1468b`, Canonical CI `33505194321` / verify `99847477144` PASS; final exact head `eea113f25b6ec047c1e575cb87a0b016d96c5c8e`, Canonical CI `33505374371` / verify `99848049249` PASS; merge/main `b5f2534e6893411462cec219e4b75fd6de5a377a`; post-merge CI `33505503842` / verify `99848460921` PASS.
