# SF-D-01 — سبد خرید

**Gate:** 55-D

**Fidelity:** structural low-fidelity

**Route intent:** `/cart`

**Actors:** guest، retail، wholesale

## هدف

کار اصلی **بازبینی کالا، تعداد و quote جاری پیش از checkout** است. اقدام اصلی «ادامه تسویه‌حساب» و بازیابی bounded «اصلاح تعداد یا دریافت quote تازه» است. اولویت محتوا کالا و Variant ← قیمت/موجودی جاری ← تعداد ← خطای خط ← جمع تومان ← ادامه checkout می‌ماند و reflow ترتیب معنایی را تغییر نمی‌دهد.

## ساختار و مالکیت

صفحه از shell مشترک Step 55، یک H1، progress متنی checkout و status قابل اعلام استفاده می‌کند. Quote، stock، shipping، Session، Address، Payment و Order هرکدام از منبع authoritative خود خوانده می‌شوند؛ UI منبع تازه‌ای نمی‌سازد و callback را نتیجه نهایی فرض نمی‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `first-use` | سبد خرید خالی است | هنوز کالایی برای تسویه‌حساب انتخاب نشده است؛ مسیر بازگشت به محصولات حفظ می‌شود. | مشاهده محصولات |
| `quantity-invalid` | تعداد این کالا معتبر نیست | حداکثر موجودی فعلی ۸ عدد است؛ مقدار قبلی حفظ شده و ادامه تا اصلاح غیرفعال می‌ماند. | تنظیم تعداد روی ۸ |
| `price-changed` | قیمت سبد به‌روز شد | قیمت E-Q40 تغییر کرده است؛ جمع تازه ۱۰٬۱۰۰٬۰۰۰ تومان پیش از ادامه باید تأیید شود. | تأیید quote تازه |

ورودی امن و context معتبر در خطا حفظ می‌شود. Disabled علت دارد، submitting از تکرار جلوگیری می‌کند، expiry مسیر بازسازی می‌دهد و unknown-result فقط status check ارائه می‌کند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | کارت کالا و خلاصه سفارش عمودی | H1 → line status → quantity/remove → totals → primary |
| 360px | کنترل تعداد 44px و جمع بدون تراکم | H1 → line status → quantity/remove → totals → primary |
| 600px | کالاها 5 ستون و خلاصه 3 ستون یا stacked بر اساس محتوا | H1 → line status → quantity/remove → totals → primary |
| 840px | فهرست 8 ستون و خلاصه sticky چهار ستون بدون پوشاندن focus | H1 → cart lines → quantity/remove → sticky summary → primary |
| 1200px | نسبت 8/4 و جمع authoritative | H1 → cart lines → quantity/remove → sticky summary → primary |
| 1440px | محتوا در 1280px مرکزی | H1 → cart lines → quantity/remove → sticky summary → primary |

در 400% zoom صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px هستند؛ error summary به field مربوط است؛ تغییر جمع، انقضا و نتیجه پرداخت announce می‌شود.

## ردیابی

Journeyها: `SJ-03`، `SJ-04`، `SJ-11`. قابلیت‌ها: `POST /cart`، `GET /cart/{id}`، `PATCH /cart/{id}/items/{itemId}`، `DELETE /cart/{id}/items/{itemId}`، `POST /cart/{id}/quote`، `POST /customer/cart/access`، `POST /customer/cart/merge`. Componentها: `Card`، `TextField`، `Alert`، `Button`، `StatePanel`. این ارجاع‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-D-01--320--first-use--v1.svg`
- `SF-D-01--1440--first-use--v1.svg`
- `SF-D-01--320--quantity-invalid--v1.svg`
- `SF-D-01--320--price-changed--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی هستند و مستقیماً ویرایش نمی‌شوند.
