# Step 58-F — State / Errors / Loading / Offline-Recovery Foundation

**وضعیت در زمان ایجاد PR: IMPLEMENTED / CANONICAL TRANSPORT PENDING**

## هدف

Stage 58-F یک Foundation مشترک برای نمایش و مدیریت stateهای async می‌سازد تا Featureهای بعدی بدون اختراع رفتار متفاوت بتوانند Loading، Empty، Error، Forbidden، Offline و Recovery را به‌صورت فارسی، RTL، قابل‌دسترسی و fail-closed نمایش دهند.

این Stage هیچ Store سراسری Business، Feature loader واقعی، optimistic update، offline queue یا Service Worker ایجاد نمی‌کند.

## Canonical base

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Stage 58-E merge/base: `020a7e39c953749af1e75331202143164572f166`
- Stage A/B/C/D/E: `CLOSED / CANONICAL PASS`
- Stage F: `IN_PROGRESS`
- Stage G/H: `NOT_STARTED`
- Step 59: `NOT_STARTED`
- Linear: `HOS-14`

## Inherited state vocabulary

Step 55 state contract همچنان منبع واژگان state است. Stage F فقط foundation مشترک و غیرتجاری را runtime می‌کند:

### Load

- `initial`
- `progressive`
- `refresh`

### Empty

- `first-use`
- `filtered`
- `no-result`

### Standard surface outcomes

- `error`
- `forbidden`
- `offline`
- `recovery`

Input validation، mutation lifecycle، stock/price state، payment unknown-result و سایر stateهای Business در Stage F تصمیم‌گیری نمی‌شوند؛ فقط primitive بازیابی لازم را می‌گیرند.

## Context preservation

`AsyncSurfaceState<T>` اجازه می‌دهد Loading refresh، Offline، Error، Forbidden و Recovery در صورت وجود، `previous` data تأییدشده را حفظ کنند. این رفتار از blanking غیرضروری صفحه جلوگیری می‌کند، اما دادهٔ قدیمی را به‌عنوان تازه یا authoritative معرفی نمی‌کند.

## Public problem boundary

`toPublicProblem` خطا را به دادهٔ قابل‌نمایش حداقلی تبدیل می‌کند:

- kind
- requestId
- status
- retryable

Raw backend/transport `message`، stack، response body یا credential وارد state نمایشی نمی‌شود.

## Connectivity hint

`navigator.onLine` فقط یک hint مرورگر است:

- `unknown` در SSR
- `online` وقتی مرورگر شبکه را online گزارش می‌کند
- `offline` وقتی مرورگر قطع شبکه را گزارش می‌کند

این hint هرگز API health یا server reachability را اثبات نمی‌کند.

`useConnectivityHint` با `useSyncExternalStore` ساخته می‌شود و SSR snapshot آن `unknown` است.

## Recovery policy

Stage F هیچ auto-recovery loop ندارد:

- no timer
- no interval
- no polling
- no automatic UI retry

GET/HEAD retryable failure می‌تواند فقط action دستی `retry-read` پیشنهاد دهد.

Mutationها به‌صورت خودکار retry نمی‌شوند. اگر نتیجهٔ mutation نامشخص باشد، `check-authoritative-status` فقط وقتی مجاز است که Feature آینده صریحاً وجود یک status capability معتبر را اعلام کند. در غیر این صورت action = `none`.

این policy از duplicate payment/order/return یا سایر mutationهای کنترل‌نشده جلوگیری می‌کند.

## StatePanel

`StatePanel` presentation مشترک برای:

- loading
- empty
- error
- forbidden
- offline
- recovery

ویژگی‌ها:

- متن پیش‌فرض فارسی
- logical RTL CSS
- `role=status` و `aria-live=polite` در حالت عادی
- `aria-busy=true` برای Loading
- `role=alert` فقط اگر caller حالت urgent را صریحاً تعیین کند
- request-id با `bdi dir=ltr`
- Action اختیاری؛ Foundation action جدید اختراع نمی‌کند
- target حداقل 44×44px
- رنگ فقط semantic tokenهای Step 54

## Verification

`apps/storefront/scripts/verify-state-foundation.ts` موارد زیر را Verify می‌کند:

1. state stylesheet در Root بارگذاری می‌شود.
2. recovery policy هیچ timer/poll/auto retry ندارد.
3. logical RTL و 44px target.
4. tri-state connectivity hint.
5. loading/ready/empty state constructors.
6. previous-context preservation.
7. public problem raw message را حذف می‌کند.
8. safe-read فقط manual retry می‌گیرد.
9. mutation auto-retry ندارد.
10. unknown mutation فقط با capability صریح status-check می‌گیرد.
11. 403، offline، recovery و generic error متمایزند.
12. StatePanel markup برای status/busy/Persian/request-id درست است.
13. بدون caller action هیچ button ساختگی تولید نمی‌شود.
14. Step 55 state vocabulary trace می‌شود.

Storefront `verify` اکنون `state:verify` را نیز اجرا می‌کند.

## Explicit non-scope

- product/category/search loader
- cart/checkout/payment/account implementation
- global state library
- business cache or TTL
- optimistic mutation
- offline mutation queue
- service worker/PWA offline write
- automatic polling
- authorization/permission changes
- Auth/session changes
- backend/OpenAPI/database/migration changes
- Stage G quality expansion
- Step 59 implementation
- paid dependency/service

## Risk and gates

Stage F = `MEDIUM`.

Canonical closure requires:

1. frozen install PASS.
2. storefront typecheck/static-quality/build PASS.
3. shell/API/auth/state verification PASS.
4. root `pnpm verify` و Phase-A PASS.
5. exact scope PASS.
6. artifact-bound REVIEW PASS.
7. exact Task Contract ACTIVE LOCK.
8. exact-head `verify`, `phase-a`, `merge-policy` PASS.
9. protected Merge Policy workflow_dispatch merge.
10. exact-SHA postmerge `pnpm verify` و Phase-A PASS.
11. Stage G و Step 59 تا closure Stage F شروع نشوند.

## Gate verdict before transport

`IMPLEMENTATION READY / CANONICAL GATE PENDING`
