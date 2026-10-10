# Step 65-H — Integrated Wholesale Production/Browser Acceptance

**Task:** `EQCOFE-STEP65-H-WHOLESALE-ACCEPTANCE-001`  
**Risk:** MEDIUM  
**Canonical base:** `376ad9de097a20fb8f497a1db74ee683d2928b6c`  
**Linear:** HOS-69

## Goal

Prove the production Storefront Wholesale experience end-to-end without adding a second commerce engine or new business authority.

The acceptance gate covers both frozen Step-65 journeys:

- **SJ-10** — authenticated retail customer submits a Wholesale application, sees server-owned status, duplicate submission recovers safely, and remains retail until authoritative approval;
- **SJ-11** — after authoritative promotion to `wholesale`, the purchase continues through the existing Cart / Checkout / Order / Payment acceptance with Wholesale context sourced from server snapshots.

## Implementation decision

No runtime application code is changed in 65-H.

The new `step65:acceptance` gate:

1. starts the built Storefront in production mode against an isolated authoritative API fixture;
2. verifies Wholesale introduction, application submission, idempotency, duplicate recovery, status presentation and authoritative profile promotion;
3. when browser QA tools are available, runs the same application/status journey in Chromium at 320px and 1200px with RTL, overflow, target-size and axe checks;
4. derives an ephemeral test-only copy of the canonical Step63 integrated Checkout acceptance, changes only fixture `customer_type` / Checkout snapshot to `wholesale`, and adds explicit assertions for the Wholesale Checkout Review and Order Outcome labels;
5. removes the derived test file after execution.

This approach reuses proven Step63 commerce acceptance instead of copying or weakening it.

## Authority boundaries

- no frontend self-approval;
- no frontend wholesale threshold or discount formula;
- no Backend/OpenAPI/database/Pricing/Inventory/Payment/Order rule change;
- no app runtime source mutation;
- no dependency or workflow change;
- Graph/Graphify remains retired.

## Closure

MEDIUM-risk closure requires exact-head Canonical CI + Phase A, deterministic Review, exact-artifact Lock, protected merge, exact-SHA postmerge verification, terminal Lock release, and Linear synchronization. Human Gate is not required.
