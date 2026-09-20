# Step 59-A — Canonical Handoff, Live Guard & Discovery Scope Freeze

**This Stage is documentation/governance-only. Step 59 runtime implementation remains NOT_STARTED until this Stage passes exact-head checks, protected Merge Policy transport and exact-SHA post-merge verification.**

## خلاصه ساده

Step 59 صفحهٔ اصلی و مسیرهای اصلی کشف محصول در فروشگاه EQCOFE را وارد فاز Production می‌کند. Stage 59-A عمداً هیچ UI/runtime جدیدی پیاده‌سازی نمی‌کند؛ ابتدا وضعیت واقعی GitHub، تغییرات بعد از بسته‌شدن Step 58، Lockها و مرز دقیق Step 59 را قفل می‌کند تا مراحل بعدی بدون تداخل با Step 60 تا 66 اجرا شوند.

## Canonical handoff

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Step 58 final PR: `#201`
- Step 58 final merge: `8f17364fc7c27dc30de5845c1af467b1215d1351`
- Stage 59-A live baseline: `61dac96e99ff30282f137d7b76f1006918199683`
- Step 58 status: `CLOSED / FINAL CANONICAL PASS`
- Step 59 pre-start status: `NEXT / NOT_STARTED`
- Live open PRs immediately before branch creation: `0`
- Mission V1.6 PR `#232`: `MERGED / POSTMERGE PASS / LOCK RELEASED`
- Transient negative-test PR `#233`: `CLOSED_UNMERGED / PASS-BLOCKED_AS_EXPECTED / LOCK RELEASED-ABORTED`
- Linear: `HOS-15 — Step 59 — Home, Navigation & Discovery`

## Post-Step58 drift reconciliation

The compare from the Step 58 final merge to this Stage-A baseline is 103 commits ahead. The drift contains Multi-Agent governance/acceptance work, dependency maintenance, design-provenance synchronization and narrow backend hardening.

Storefront-specific evidence:
- `home.tsx` is byte-identical to the Step 58 closure baseline and remains the `SF-B-01` Step-59 placeholder.
- `search.tsx` is byte-identical and remains a Step-60 placeholder.
- `category.tsx` is byte-identical and remains a Step-60 placeholder.
- `apps/storefront/package.json` changed only `@types/node` from `24.13.3` to `24.13.5`; Storefront scripts, runtime dependencies and Step-59 behavior are unchanged.
- No production Home implementation exists before 59-A.

Therefore later repository drift does not invalidate the Step-58 frontend foundation and does not constitute early Step-59 implementation.

## Frozen Step 59 scope

### IN — Step 59
- Production Home route `/`.
- Responsive header and primary navigation refinement.
- Search entry points and suggestion-entry UX, without full search-results behavior.
- Category and brand discovery entry points.
- Home promotional and merchandising surfaces.
- Selected/recommended Home products only through authoritative backend contracts.
- Buying-guide/content entry surfaces where supported by existing contracts.
- Wholesale CTA at discovery-entry level only.
- First-purchase promotional entry only when supported by authoritative data/contracts.
- Home Loading / Empty / Error / Offline / Recovery behavior.
- Home-specific basic metadata.
- Persian `fa-IR`, real RTL, responsive behavior and accessibility.
- Browser regression evidence for implemented Step-59 surfaces.

### OUT — reserved for later Steps
- Step 60: full search results, category/product listings, filters, sorting, pagination/infinite strategy and listing SEO.
- Step 61: product detail, variants, stock/price states, rich media/video/3D and add-to-cart.
- Step 62: compare and wishlist implementation.
- Step 63: cart, checkout, shipping/pickup, discount presentation and payment handoff.
- Step 64: account and after-sales.
- Step 65: full wholesale application/status/B2B ordering.
- Step 66: full articles/content/SEO/structured-data/sitemap/policy frontend.
- Admin frontend, backend business-rule changes, new API authority, database changes, provider integrations and Wallet.

## Existing implementation inventory

- Storefront workspace/build/SSR: **IMPLEMENTED — Step 58**
- Persian RTL/i18n: **IMPLEMENTED**
- API/server-data boundary: **IMPLEMENTED**
- Auth/session/security boundary: **IMPLEMENTED**
- Loading/error/offline recovery primitives: **IMPLEMENTED**
- Static/SSR/browser quality gates: **IMPLEMENTED**
- Home route: **PLACEHOLDER ONLY**
- Search route: **PLACEHOLDER — Step 60**
- Category route: **PLACEHOLDER — Step 60**
- Production Home discovery: **MISSING — Step 59**
- Home category/brand discovery: **MISSING — Step 59**
- Promotional/merchandising surfaces: **MISSING — Step 59**
- Home authoritative loader/view-model: **MISSING — Step 59**

## Inherited non-negotiable contracts

- Persian-first `fa-IR` and actual RTL semantics.
- Authoritative integer Toman money contracts.
- Wallet prohibited.
- Brown prohibited as EQCOFE Brand/UI palette color.
- Backend remains authoritative for auth/authz, price, discount, inventory, payment, profit and business lifecycle transitions.
- API types derive from generated/validated OpenAPI; no parallel authoritative business DTOs.
- Logical CSS properties and logical keyboard/focus order in RTL.
- Visible focus, semantic HTML, skip navigation and minimum 44×44 CSS-pixel targets.
- Verification widths: `320, 360, 600, 840, 1200, 1440`.
- 400% reflow/zoom, reduced-motion and non-color-only meaning.
- Safe recovery; irreversible mutations are never silently retried.
- Design behavior/traceability contracts remain authoritative while visual composition stays replaceable.

## Step 59 execution plan

### 59-A — Canonical Handoff, Live Guard & Scope Freeze
Establish a conflict-free baseline, reconcile drift, register governance and freeze scope.

### 59-B — Header, Responsive Navigation & Search Entry
Productionize header/navigation/search-entry without Step-60 results/listing behavior.

### 59-C — Home Data Contract & Server Loader Foundation
Implement authoritative Home server-data/view-model boundaries and safe typed failure/recovery.

### 59-D — Home Discovery: Categories & Brands
Implement category/brand discovery entries without prematurely implementing listings.

### 59-E — Home Merchandising & Promotional Surfaces
Implement contract-backed selected products, campaign/promotional, buying-guide, wholesale and first-purchase entry surfaces.

### 59-F — States, Accessibility & Responsive Hardening
Complete Home state coverage, keyboard/screen-reader behavior, RTL and canonical responsive/reflow requirements.

### 59-G — Full Verification & Browser Acceptance
Pass Storefront/root static/SSR/browser/accessibility/responsive/regression gates on the exact artifact.

### 59-H — Canonical Closure & Step 60 Handoff
Canonicalize evidence/state, protected merge, exact-SHA postmerge verification, close Step 59 and authorize Step 60.

## Stage 59-A Definition of Done

- live baseline and terminal locks reverified;
- post-Step58 drift classified and Step59 pre-start state proven;
- A-H scope and later-step boundaries frozen;
- Linear `HOS-15` synchronized;
- Task Contract and generated Task Catalog exact;
- changed paths documentation/governance-only;
- exact-head `verify`, `phase-a`, `merge-policy` pass;
- MEDIUM artifact REVIEW and ACTIVE LOCK bound to exact artifact;
- protected merge transport passes;
- exact-SHA postmerge `pnpm verify` and Phase A pass;
- only then may 59-B begin.

## Current Stage boundary

```text
STEP_58 = CLOSED_FINAL_CANONICAL_PASS
STEP_59 = STARTED_AT_STAGE_A_ONLY
STEP_59_RUNTIME_IMPLEMENTATION = NOT_STARTED
STEP_60_PLUS_IMPLEMENTATION = NOT_STARTED
STAGE_59_B = BLOCKED_UNTIL_59_A_CANONICAL_COMPLETE
```
