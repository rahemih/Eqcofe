# Step 60-A — Canonical Handoff, Live Guard & Listing Scope Freeze

**This Stage is documentation/governance-only. Step 60 runtime implementation remains NOT_STARTED until this Stage passes exact-head checks, protected Merge Policy transport and exact-SHA post-merge verification.**

## خلاصه ساده

Step 60 باید ورودی‌های کشف محصول ساخته‌شده در Step 59 را به صفحات واقعی Search، Category، Filters و Listing تبدیل کند. Stage 60-A عمداً هیچ UI/runtime یا API جدیدی پیاده‌سازی نمی‌کند؛ ابتدا وضعیت زنده GitHub، تغییرات بعد از Step 59، Multi-Agent shared writers، وضعیت قراردادهای Storefront/OpenAPI و مرز دقیق Step 60 را Canonical می‌کند.

## Canonical handoff

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Step 59 final closure PR: `#253`
- Step 59 final merge: `321b3f5a519ae44817beab503791529d842cf37c`
- Stage 60-A live baseline: `cc7597258baccc3df553444bdc5410bf5491a58a`
- Step 59 status: `CLOSED / FINAL CANONICAL PASS`
- Step 60 pre-start status from Roadmap/Current State: `NEXT / NOT_STARTED`
- Live open PRs immediately before Branch creation: `0`
- Latest shared Task Catalog writer before 60-A: Agent A9 / PR `#257`
- A9 protected merge: `cc7597258baccc3df553444bdc5410bf5491a58a`
- A9 postmerge job: `106268196318` — PASS
- A9 Lock: `LOCK-MA-AGENT-A9-DESIGN-001-01 = RELEASED`
- Agent A10 branch at the final pre-write guard: `ABSENT`
- Linear: `HOS-16 — Step 60 — Search, Category, Filters & Listing`

## Post-Step59 drift reconciliation

After Step 59 closure, Agent Layer A6 through A9 continued through governance-only protected merges. The latest of those, A9 Product Design / UX, explicitly keeps repository Product Design artifacts canonical and does not expand product-rule/API/runtime implementation authority.

- Search route blob: `0d20db7014a5676956fc62cf81574455a79fb305` — still the Step 60 placeholder.
- Category route blob: `05e9df10ee4e2844c781a9887a0ffd39b1e90a86` — still the Step 60 placeholder.
- OpenAPI source blob: `de14010511fbd4b7c2c7dc1aef8ccace143da353`.
- Generated OpenAPI blob: `9bfb11017156db45c2f593f2781def714c5df8fe`.
- No Step 60 production Search/Category/Filter/Listing runtime implementation exists before 60-A.

Therefore the post-Step59 Agent Layer drift does not invalidate the Step 59 Storefront baseline and does not constitute early Step 60 runtime implementation.

## Existing implementation inventory

- Storefront workspace/build/SSR: **IMPLEMENTED — Step 58**
- Persian RTL/i18n: **IMPLEMENTED**
- Typed API/server-data boundary: **IMPLEMENTED**
- Auth/session/security boundary: **IMPLEMENTED**
- Loading/error/offline recovery primitives: **IMPLEMENTED**
- Home/Header/navigation/search-entry foundation: **IMPLEMENTED — Step 59**
- Search route `/search?q=`: **PLACEHOLDER — Step 60**
- Category route `/category/:slug`: **PLACEHOLDER — Step 60**
- `GET /products`: **TYPED FOUNDATION AVAILABLE** with cursor/limit/category/brand/min_price/max_price/available/sort and `ProductListResponse`
- `GET /search`: **ENDPOINT EXISTS / SUCCESS BODY UNTYPED**
- `GET /categories/{slug}/products`: **ENDPOINT EXISTS / SUCCESS BODY UNTYPED**
- `GET /categories/{slug}/filters`: **ENDPOINT EXISTS / SUCCESS BODY UNTYPED**
- `GET /search/suggestions`: **ENDPOINT EXISTS / SUCCESS BODY UNTYPED**
- Generated effect of those untyped successful bodies: `content?: never`
- Production listing UI: **MISSING — Step 60**
- Filter/sort/query-state UX: **MISSING — Step 60**
- Listing SEO and Step-60 browser acceptance: **MISSING — Step 60**

## Frozen Step 60 scope

### IN — Step 60

- Production Search Results for `/search?q=`.
- Production Category Listing for `/category/:slug`.
- Shared product listing presentation backed only by authoritative generated OpenAPI/backend contracts.
- Backend-driven filters only for canonically supported capabilities.
- Sorting with canonical semantics; arbitrary client-invented sort rules are forbidden.
- Cursor/pagination or infinite-loading strategy based on authoritative pagination contracts.
- URL/query-state preservation for query, filters, sort and navigation recovery.
- Product cards using authoritative Toman price and availability state.
- Loading, empty, no-result, error, timeout/offline and bounded recovery behavior.
- Listing-specific metadata, canonical/robots behavior and SEO-friendly query handling within Roadmap scope.
- Persian `fa-IR`, real RTL, responsive behavior and accessibility.
- Browser regression/acceptance evidence for all implemented Step-60 surfaces.

### OUT — reserved for later Steps

- Step 61: Product Detail, variants, rich media/video/3D and add-to-cart.
- Step 62: Compare and Wishlist implementation.
- Step 63: Cart, checkout, shipping/pickup, discount presentation and payment handoff.
- Step 64: Account and after-sales.
- Step 65: Full wholesale application/status/B2B ordering.
- Step 66: Full articles/content/SEO/structured-data/sitemap/policy frontend.
- Admin frontend unrelated to listing.
- New business authority invented in the frontend.
- Wallet.

## Contract authority and Stage 60-B prerequisite

`src/generated/openapi.ts` remains the Storefront type authority. Step 60 must not create a parallel authoritative DTO merely to make UI implementation convenient.

`GET /products` already exposes typed listing primitives and `ProductListResponse` with cursor pagination. The current canonical OpenAPI also contains Search, Category Products, Category Filters and Search Suggestions endpoints, but their successful response bodies do not define usable schemas. Consequently the generated operations expose `content?: never`.

Stage 60-B must resolve these response-schema gaps canonically in the source OpenAPI/backend boundary and regenerate validated types before Search/Category feature implementation. A frontend workaround that fabricates response shapes is explicitly forbidden.

## Inherited non-negotiable contracts

- Persian-first `fa-IR` and actual RTL semantics.
- Authoritative integer Toman money contracts.
- Wallet prohibited.
- Brown prohibited as EQCOFE Brand/UI palette color.
- Backend remains authoritative for auth/authz, price, discount, inventory, wholesale status, payment, profit and business lifecycle transitions.
- API types derive from generated/validated OpenAPI; no parallel authoritative business DTOs.
- Logical CSS properties and logical keyboard/focus order in RTL.
- Visible focus, semantic HTML, skip navigation and minimum 44×44 CSS-pixel targets.
- Verification widths: `320, 360, 600, 840, 1200, 1440`.
- 400% reflow/zoom, reduced-motion and non-color-only meaning.
- Safe recovery; irreversible mutations are never silently retried.
- Repository Product Design contracts remain canonical; external/Figma mirrors do not override repository truth.

## Step 60 execution plan

### 60-A — Canonical Handoff & Contract Freeze
Establish a conflict-free baseline, reconcile post-Step59 drift, register governance, record API readiness gaps and freeze scope.

### 60-B — Backend/OpenAPI Listing Contract Readiness
Canonically resolve Search response shape, category listing/filter response authority, supported sort semantics and pagination/filter contracts without frontend-invented DTOs.

### 60-C — Shared Listing Foundation
Implement query parsing/serialization, URL state, shared listing/product-card foundations and authoritative cursor behavior.

### 60-D — Search Results
Productionize `/search?q=` with authoritative results, query preservation, no-result and bounded recovery.

### 60-E — Category Listing
Productionize `/category/:slug` with authoritative category context and product listing.

### 60-F — Filters, Sorting & Pagination
Implement supported filters, canonical sorting, cursor/pagination strategy, removable selections and history-safe URL state.

### 60-G — SEO, States, Accessibility & Responsive Hardening
Complete listing metadata/SEO boundaries, loading/error/offline/recovery, keyboard/ARIA/RTL/responsive/reflow hardening.

### 60-H — Full Step 60 Acceptance & Prototype
Run integrated static/type/build/SSR/browser/accessibility/responsive/regression acceptance. No new feature scope is introduced here.

### 60-I — Final Canonical Closure
Reconcile final evidence/state, update canonical history/current-state/roadmap, protected merge and handoff to Step 61 without runtime feature mutation.

## Stage 60-A Definition of Done

- live baseline and terminal Locks reverified;
- Step 59 remains canonically closed and post-Step59 drift is classified;
- A-I scope and later-step boundaries are frozen;
- Storefront/OpenAPI readiness gaps are recorded without invented contracts;
- Linear `HOS-15` is reconciled to Done and `HOS-16` tracks Step 60;
- Task Contract and generated Task Catalog are exact;
- changed paths remain documentation/governance-only;
- exact-head `verify`, `phase-a` and `merge-policy` pass;
- MEDIUM artifact REVIEW and ACTIVE LOCK are bound to the exact artifact;
- protected merge transport passes;
- exact-SHA postmerge `pnpm verify` and Phase A pass;
- 60-A Lock becomes terminally RELEASED;
- only then may 60-B begin.

## Current Stage boundary

```text
STEP_59 = CLOSED_FINAL_CANONICAL_PASS
STEP_60 = STARTED_AT_STAGE_A_ONLY
STEP_60_RUNTIME_IMPLEMENTATION = NOT_STARTED
STAGE_60_B = BLOCKED_UNTIL_60_A_CANONICAL_COMPLETE
STEP_61_PLUS_IMPLEMENTATION = NOT_STARTED
```
