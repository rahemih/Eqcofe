# SF-D-06 — بررسی نتیجه پرداخت

**Gate:** 55-D

**Fidelity:** structural low-fidelity

**Route intent:** `/payment/return`

**Actors:** retail، wholesale

## هدف

کار اصلی **تعیین نتیجه پرداخت فقط از status/verify authoritative** است. اقدام اصلی «بررسی وضعیت پرداخت» و بازیابی bounded «تلاش کنترل‌شده یا بازگشت به سفارش» است. اولویت محتوا وضعیت غیرقطعی ← شماره سفارش ← شناسه پرداخت ← status check ← verify ← retry-safe recovery می‌ماند و reflow ترتیب معنایی را تغییر نمی‌دهد.

## ساختار و مالکیت

صفحه از shell مشترک Step 55، یک H1، progress متنی checkout و status قابل اعلام استفاده می‌کند. Quote، stock، shipping، Session، Address، Payment و Order هرکدام از منبع authoritative خود خوانده می‌شوند؛ UI منبع تازه‌ای نمی‌سازد و callback را نتیجه نهایی فرض نمی‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `progressive` | در حال بررسی نتیجه پرداخت | بازگشت از درگاه دریافت شد؛ نتیجه نهایی از سرویس پرداخت و سفارش استعلام می‌شود. | بررسی خودکار وضعیت |
| `unknown-result` | نتیجه پرداخت هنوز مشخص نیست | موفقیت یا شکست اعلام نمی‌شود؛ شماره سفارش EQ-14052 حفظ شده و status check امن است. | بررسی دوباره وضعیت |
| `timeout` | پاسخ بررسی پرداخت دیر رسید | درخواست قبلی ممکن است پردازش شده باشد؛ پرداخت تازه پیش از استعلام دوباره ساخته نمی‌شود. | استعلام وضعیت پرداخت |

ورودی امن و context معتبر در خطا حفظ می‌شود. Disabled علت دارد، submitting از تکرار جلوگیری می‌کند، expiry مسیر بازسازی می‌دهد و unknown-result فقط status check ارائه می‌کند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | StatePanel تک‌ستونه با مرجع قابل کپی | H1 → state heading → order/payment references → status detail → primary recovery → support |
| 360px | اقدام اصلی و status check پشت‌سرهم | H1 → state heading → order/payment references → status detail → primary recovery → support |
| 600px | پنل وضعیت حداکثر 6 ستون | H1 → state heading → order/payment references → status detail → primary recovery → support |
| 840px | وضعیت 8 ستون و خلاصه سفارش چهار ستون | H1 → state heading → order/payment references → status detail → primary recovery → support |
| 1200px | مرجع، timeline و recovery کنار خلاصه | H1 → state heading → order/payment references → status detail → primary recovery → support |
| 1440px | پنل اصلی حداکثر 820px؛ خلاصه 436px | H1 → state heading → order/payment references → status detail → primary recovery → support |

در 400% zoom صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px هستند؛ error summary به field مربوط است؛ تغییر جمع، انقضا و نتیجه پرداخت announce می‌شود.

## ردیابی

Journeyها: `SJ-05`. قابلیت‌ها: `GET /customer/orders/{order_number}/payments/{payment_id}`، `GET /customer/payments/{payment_id}/status`، `POST /customer/payments/{payment_id}/verify`. Componentها: `StatePanel`، `Alert`، `Button`. این ارجاع‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-D-06--320--progressive--v1.svg`
- `SF-D-06--1440--progressive--v1.svg`
- `SF-D-06--320--unknown-result--v1.svg`
- `SF-D-06--320--timeout--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی هستند و مستقیماً ویرایش نمی‌شوند.
