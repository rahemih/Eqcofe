# Step 58-C — Application Shell / Routing / RTL / i18n

**وضعیت در زمان ایجاد PR: IMPLEMENTED / CANONICAL TRANSPORT PENDING**

## هدف

Stage 58-C پوستهٔ مشترک Storefront، Router واقعی، semantics ریشهٔ فارسی/RTL، معماری i18n تک‌locale، bridge دقیق Design Token و baselineهای Responsive/Accessibility را پیاده‌سازی می‌کند. این Stage هیچ قابلیت تجاری Step 59–66 را پیاده‌سازی نمی‌کند.

## Canonical base

- Repository: `rahemih/Eqcofe`
- Branch مرجع: `main`
- Stage 58-B merge / base: `b3259c922e5b1d8003c243883955d9aaa0be83d9`
- Stage A: `CLOSED / CANONICAL PASS`
- Stage B: `CLOSED / CANONICAL PASS`
- Stage C: `IN_PROGRESS`
- Stage D: `NOT_STARTED`
- Step 59: `NOT_STARTED`
- Linear: `HOS-14`

## Source contracts

Implementation از منابع Canonical زیر مشتق شده است:

- Step 54 Design System Foundation
- Step 54 RTL/Responsive
- Step 54 Accessibility
- Step 54 Persian Typography/Content
- generated `eqcofe-design-tokens.css`
- Step 55 Storefront Wireframe Foundation
- `step55-storefront-wireframe-contract.json`
- Step 57 behavioral/interaction acceptance baseline
- Stage 58-A frozen contracts

## Shell

Shell شامل این نواحی است:

1. Skip link به `#main-content`
2. Site header با text fallback برند؛ هیچ logo asset جدید اختراع نشده است
3. Search entry، Cart و Account با دسترسی مستقیم
4. Primary navigation
5. Contextual breadcrumb
6. دقیقاً یک `main`
7. Footer با About/Contact/FAQ/Terms/Returns-Warranty

در Compact، navigation به disclosure قابل‌دسترسی تبدیل می‌شود. در عرض `840px+` مقصدهای اصلی مستقیم دیده می‌شوند. Bottom navigation اختراع نشده است.

## Routing

فقط `routeIntent`های Canonical که با `/` شروع می‌شوند به Router تبدیل شده‌اند. Design stateهایی مانند `listing-region` یا `compare-selection-state` عمداً route نشده‌اند.

Routeهای Steps 59–66 در Stage C فقط placeholder هستند. Placeholder هیچ loader تجاری، mutation، API call، Auth، pricing، stock، payment result یا server business rule ندارد.

نام پارامترهای Router در دو مورد از kebab-case مستند به camelCase TypeScript-safe تبدیل شده‌اند؛ ساختار URL تغییری نمی‌کند:

- `:order-number` → `:orderNumber`
- `:return-number` → `:returnNumber`
- `:claim-number` → `:claimNumber`

## RTL / i18n

- root: `lang="fa-IR"`, `dir="rtl"`
- locale پیش‌فرض و تنها locale فعلی: `fa-IR`
- پیام‌های Shell در `app/i18n/fa-IR.ts`
- lookup در `app/i18n/index.ts`
- هیچ auto-detection یا locale switcher بدون Product contract ایجاد نشده است
- CSS shell از logical properties استفاده می‌کند
- شناسه‌های route/debug با `dir="ltr"` و bidi isolation نمایش داده می‌شوند

## Design-token bridge

فایل `app/styles/tokens.css` exact copy از generated Canonical Step 54 token CSS است. `shell:verify` byte-for-byte equality را بررسی می‌کند؛ بنابراین drift دستی بین app token و source design-system Gate را می‌شکند.

رنگ‌های Shell از semantic tokenهای Canonical استفاده می‌کنند. Brown palette وارد نشده است.

## Responsive / Accessibility

Baseline:

- verification widths: `320, 360, 600, 840, 1200, 1440`
- content max: `1280px`
- minimum target: `44×44 CSS px`
- visible `:focus-visible`
- skip link قبل از Header
- semantic landmarks
- exactly one H1 در هر placeholder
- reduced-motion
- no physical left/right layout declarations
- no fixed page width
- compact disclosure navigation

Stage G همچنان مالک browser-level accessibility/responsive quality gate کامل است؛ Stage C فقط shell-specific deterministic + SSR smoke verification را اضافه می‌کند و ادعای WCAG conformance نمی‌کند.

## Verification

`apps/storefront/scripts/verify-shell.mjs` بعد از build:

- token bridge exactness
- route registration
- inherited media-query contracts
- logical-direction CSS
- visible focus/reduced-motion/min-target markers
- startup of built SSR server
- HTTP 200 روی همه route exampleها
- root `fa-IR/rtl`
- skip link
- one main landmark
- one H1
- header/nav/footer

را بررسی می‌کند.

## Explicit non-scope

- Homepage commercial implementation
- product/category/search feature data
- Compare/Wishlist business behavior
- Cart/Checkout/payment logic
- Account/Wholesale behavior
- Articles/content data
- API client/cache
- Auth/session
- Loading/Error/Offline state framework
- Admin frontend
- backend/API/database/migration changes
- Step 59 implementation
- visual lock نهایی
- paid service/dependency

## Definition of Done

Stage C فقط پس از این موارد Canonical بسته می‌شود:

1. frozen install PASS.
2. typecheck/static-quality/build PASS.
3. shell deterministic + SSR verification PASS.
4. root `pnpm verify` و Backend regression PASS.
5. exact scope Task Contract PASS.
6. MEDIUM artifact-bound REVIEW و ACTIVE LOCK معتبر.
7. exact-head `verify`, `phase-a`, `merge-policy` PASS.
8. protected Merge Policy merge.
9. exact-SHA postmerge `pnpm verify` و Phase-A PASS.
10. Stage D و Step 59 تا closure Stage C شروع نشوند.

## Gate verdict before transport

`IMPLEMENTATION READY / CANONICAL GATE PENDING`
