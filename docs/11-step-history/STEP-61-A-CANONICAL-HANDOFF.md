# EQCOFE — Step 61-A Canonical Handoff

## Status
Step 61 — Product Detail & Rich Media: **STARTED at Stage A / governance-only**.

Live guard baseline:
- canonical repository: `rahemih/Eqcofe`
- canonical branch: `main`
- main SHA before Stage-A write: `b3fb1034d93b9213769924c87353074c79bdf93a`
- open PRs before write: **0**
- relevant active Locks before write: **0**
- Step 60: **CLOSED / FINAL CANONICAL PASS**
- Post-Step60 reconciliation: PR #270 merged; HOS-103 Done; terminal Lock released
- Linear Step 61: HOS-65 was Backlog before this Stage-A registration

## Scope freeze

### IN — Step 61
- production Product Detail route and authoritative server-loaded product data
- product and variant selection
- authoritative price and stock states
- product media gallery
- video capability
- 3D/360 capability where canonical product media supports it
- product specifications
- related product/content presentation within existing backend authority
- add-to-cart entry behavior and safe recovery
- Product Detail SEO/state/accessibility/responsive acceptance

### OUT — later steps
- Step 62: Compare & Wishlist
- Step 63: Cart/Checkout/Shipping/Payment flow beyond Product Detail add-to-cart entry
- Step 64: Account & after-sales
- Step 65+: wholesale/content/admin/other roadmap scope as defined canonically

## Proposed governed execution plan
1. **61-A — Canonical handoff, live guard & scope freeze**
2. **61-B — Backend/OpenAPI Product Detail contract readiness**
3. **61-C — Shared Product Detail data/rendering foundation**
4. **61-D — Variant selection, price and stock states**
5. **61-E — Media gallery, video and 3D/360 capability**
6. **61-F — Specifications, related content and add-to-cart behavior**
7. **61-G — SEO, loading/empty/error/offline states, accessibility and responsive hardening**
8. **61-H — Integrated browser acceptance and Product Detail prototype verification**
9. **61-I — Final canonical closure and Step 62 handoff**

## Inherited invariants
- Persian-first `fa-IR`, RTL
- integer Toman monetary authority
- no Wallet semantics
- no brown Brand/UI palette
- generated OpenAPI/backend are authoritative; Storefront must not invent price, stock, variant or business decisions
- accessibility and responsive quality gates remain mandatory
- runtime mutation is forbidden in Stage 61-A

## Stage-A Definition of Done
- live guard and prerequisite closure evidence captured
- Step 61 IN/OUT boundary frozen
- A-I plan registered
- backend/OpenAPI readiness inspected and any true contract gaps delegated to 61-B
- Task Contract exists and scope is deterministic
- exact-head verification / Phase A / Merge Policy pass
- valid REVIEW + ACTIVE LOCK evidence
- protected merge
- exact-SHA postmerge verification
- terminal Lock RELEASED
- only after all of the above may Stage 61-B start
