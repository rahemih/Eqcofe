# Step 55-A — Storefront Wireframe Scope & Framework

**Status:** COMPLETE / FOUNDATION GATE PASS — Step 55 remains IN PROGRESS; 55-B has not started.

## Canonical handoff

Step 55-A starts from canonical `main` merge `0e251696478e2cd91571c6103257e0c978c16c88`. At that baseline Step 54 is closed, its Repository library is canonical, its Figma file is only `PARTIAL_FREE_TIER`, and the Roadmap states that Step 55 has not started. This substep creates the wireframe framework only; it contains no page wireframe from 55-B onward.

Authoritative inputs are the Roadmap and Current State; the Step 53 IA, 12 storefront journeys, state/traceability contract and OpenAPI references; the Step 54 token, component, RTL/responsive and accessibility contracts; and the generated repository design-system library. Where the documents disagree, machine-readable contracts and canonical `main` govern. No approved brand/logo asset was found, so the shell reserves a labelled source-approved wordmark slot and does not invent one.

## Frozen storefront scope

The later Step 55 gates own 37 screen obligations: 6 discovery screens in 55-B, 5 product-evaluation screens in 55-C, 7 cart/checkout/payment screens in 55-D, 12 account/wholesale/after-sales screens in 55-E and 7 content/policy screens in 55-F. Each inventory item has a stable `SF-<gate>-<number>` ID, route intent, Step 53 journey links, Step 54 component-family links and required state examples in the canonical JSON contract.

Admin navigation and operational screens remain Step 56. Visual polish and interactive critical-flow prototypes remain Step 57. Frontend routing and implementation remain Steps 58–66. Route intents in this foundation communicate durable information architecture only; they are not a router or API contract.

## Mobile-first layout

All later wireframes start at 320px. Step 54 breakpoints remain unchanged: 360, 600, 840, 1200 and 1440px, with a maximum content width of 1280px. The grid is 4 columns/16px margin/16px gutter for compact, 8 columns/24px margin/24px gutter for tablet and 12 columns/32px margin/24px gutter for desktop.

DOM and focus order follow meaning in RTL; visual mirroring must not reverse semantics. Columns collapse by task priority. Comparison/data structures must provide an equivalent list/card view or bounded horizontal scroll. Every later gate verifies 320, 360, 600, 840, 1200 and 1440px plus 400% zoom, long Persian strings, bidi identifiers and keyboard-only use.

## Global storefront shell

The shell has skip link, optional utility bar, site header, primary navigation, contextual breadcrumb, one main-content region, contextual actions and site footer. Header offers an approved wordmark slot, search entry, cart and account. On compact widths, navigation becomes an accessible disclosure and search may occupy its own row; cart and account remain directly reachable. No bottom-navigation pattern is introduced in A.

Sticky purchase/checkout actions reserve safe-area and focus space. Footer exposes policy, content, contact and support destinations without unverified trust/provider claims. Customer and staff shells never share session or authorization context.

## Shared wireframe language

Wireframes are structural and low fidelity. Every frame records screen ID, gate, viewport, actor, journey, state, source, primary action and recovery action. Persian content uses realistic length envelopes rather than lorem ipsum. Media is a labelled neutral placeholder only. Money is integer Toman with explicit `تومان`; loyalty is non-cash and is never presented as Wallet.

Solid arrows mean the primary path, dashed arrows a recovery path, a lock marker an unavailable action, and an authority marker a server-owned fact. Layout regions are page intro, query/filter, primary content, supporting content, summary, primary actions, status/recovery and related content.

## Shared states and recovery

Every relevant async screen covers loading and refresh while preserving context. Empty-first-use, filtered-empty and no-result are distinct. Validation, server validation and conflict preserve safe input and connect summary errors to fields. Unauthenticated, denied, not-found and expired session remain different outcomes.

Disabled actions show a reason but never stand in for server authorization. Payment timeout or unknown result offers authoritative status checking, never assumed success or an uncontrolled duplicate attempt. Recovery is bounded and idempotency-aware, and keeps the applicable order, payment, return or warranty reference visible.

## Accessibility and content constraints

The target remains WCAG 2.2 AA without claiming conformance. Minimum interactive target is 44×44px; focus must be visible and unobscured; one H1 and logical landmarks are required; statuses cannot rely on color; forms retain visible labels/help/error associations; async changes have an announcement requirement; reduced motion retains meaning; and identifiers are bidi-isolated.

No Brown palette, dark theme, paid service, fabricated provider capability, invented logo or new product rule is permitted. Production payment/shipping/messaging configuration remains fail-closed and outside this design foundation.

## Artifact organization

Later artifacts live under `docs/13-product-design/step55-wireframes/<gate>/<screen-id>/`. Filenames follow `<screen-id>--<viewport>--<state>--v<revision>.<ext>` and each screen folder carries `README.md`, `traceability.json` and `acceptance.md`. Repository artifacts remain canonical; a free Figma mirror may link by screen ID but cannot replace evidence or block completion.

## Boundary verdict

55-A freezes the system for producing and reviewing storefront wireframes. It does not draw Home, listing, product, compare, cart, checkout, account, wholesale, content or policy frames. The next allowed design mutation after this gate is 55-B only.
