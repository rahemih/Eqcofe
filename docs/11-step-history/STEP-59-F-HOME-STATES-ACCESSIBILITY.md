# Step 59-F — Home States, Accessibility & Responsive Hardening

## هدف

Stage 59-F شکاف بین state foundation عمومی Step 58 و صفحه Home واقعی Step 59 را می‌بندد. Backend همچنان منبع حقیقت است و Browser هیچ موفقیت، موجودی، قیمت یا دادهٔ محصولی را اختراع نمی‌کند.

## Canonical baseline

- Stage 59-E merge/main: `814cb7e56d927716f3c101771fa9b56b511181e8`
- protected merge + exact-SHA postmerge: PASS
- Stage 59-E Lock: RELEASED
- initial Stage-F branch was created before Agent Layer Phase A PR #241 opened. Shared-writer guard then stopped before Task Catalog mutation.
- PR #241 merged canonically as `de453f004cb910b88eea2ef28a3ae4b97e0b9ec2` with postmerge PASS and Lock RELEASED.
- Stage-F was reconciled onto fresh R2 branch from canonical main `de453f004cb910b88eea2ef28a3ae4b97e0b9ec2`.
- fresh open PRs before R2 branch creation: 0

## State contract

Home از `AsyncSurfaceState<HomeProductList>` استفاده می‌کند.

رفتار Stage F:
- `ready`: بدون StatePanel اضافی؛ دادهٔ معتبر نمایش داده می‌شود.
- `loading`: پیام Home-specific با `status` و `aria-busy`.
- `empty`: پیام روشن بدون موفقیت ساختگی؛ مسیر جست‌وجو به‌عنوان handoff باقی می‌ماند.
- `recovery`: failure پنهان نمی‌شود؛ retry فقط دستی و bounded است.
- `error`: پیام urgent و request ID معتبر در صورت وجود.
- `forbidden`: مجوز جدید در UI ساخته نمی‌شود؛ وضعیت سرور صریح نمایش داده می‌شود.
- `offline`: وضعیت شبکه با متن، نه فقط رنگ، بیان می‌شود.

اگر state به‌طور صریح `previous` داشته باشد، همان دادهٔ معتبر قبلی برای جلوگیری از جابه‌جایی/خالی‌شدن ناگهانی حفظ می‌شود. بدون `previous` هیچ دادهٔ مصنوعی ساخته نمی‌شود.

## Accessibility

- یک H1 Home حفظ می‌شود.
- StatePanel موجود reuse می‌شود؛ shared component تغییر نمی‌کند.
- error/forbidden = `alert`.
- loading/empty/recovery/offline = `status`.
- request ID از Bidi isolation موجود StatePanel عبور می‌کند.
- Actionها حداقل 44×44px و keyboard-accessible هستند.
- متن بلند فارسی wrap می‌شود و کارت‌ها `min-inline-size: 0` می‌گیرند.
- physical left/right و `row-reverse` اضافه نمی‌شود.

## Responsive

Canonical review widths: 320 / 360 / 600 / 840 / 1200 / 1440 و reflow تا 400%.

Stage F layout را content-driven نگه می‌دارد و Gridها در Compact به یک ستون collapse می‌شوند.

## Explicit non-scope

- Search results / filters / listing implementation (Step 60)
- Product Detail (Step 61)
- Compare / Wishlist (Step 62)
- Cart / Checkout (Step 63)
- Account / After-sales (Step 64)
- Wholesale implementation (Step 65)
- Full articles/content implementation (Step 66)
- shared StatePanel redesign
- backend/API/OpenAPI/database changes
- automatic retry loops
- Wallet
- invented imagery or campaigns

## Definition of Done

- deterministic state projection tests PASS;
- SSR empty/recovery state evidence PASS;
- long Persian/RTL/touch/reflow static assertions PASS;
- Storefront full verify PASS;
- Browser Quality PASS;
- Canonical CI + Phase A PASS;
- exact-artifact Review/Lock PASS;
- protected merge + exact-SHA postmerge PASS;
- only then Stage 59-G may start.

```text
STEP_59_E = CLOSED_CANONICAL_PASS
STEP_59_F = IN_PROGRESS
STEP_59_G = BLOCKED
STEP_60 = NOT_STARTED
```

## Inherited Stage-D regression maintenance

Stage 59-F introduces `selectHomeProducts(...)` so Home can preserve explicitly provided authoritative `previous` data during loading/recovery states. The inherited Stage-59-D discovery verifier originally required direct `loaderData.productPreview.data` wiring, which became obsolete. Its assertion was updated only after the Stage-F Task Contract explicitly added the verifier to write scope. Category/Search Step-60 placeholder guards remain unchanged.
