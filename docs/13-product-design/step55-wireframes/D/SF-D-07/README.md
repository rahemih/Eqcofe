# SF-D-07 — نتیجه سفارش

**Gate:** 55-D

**Fidelity:** structural low-fidelity

**Route intent:** `/order/:order-number/outcome`

**Actors:** retail، wholesale

## هدف

کار اصلی **نمایش نتیجه authoritative سفارش و مسیر بعد** است. اقدام اصلی «مشاهده جزئیات سفارش» و بازیابی bounded «بازگشت به وضعیت پرداخت یا پشتیبانی با مرجع» است. اولویت محتوا نتیجه ← شماره سفارش ← پرداخت ثبت‌شده ← timeline ← اقدام بعد ← پشتیبانی می‌ماند و reflow ترتیب معنایی را تغییر نمی‌دهد.

## ساختار و مالکیت

صفحه از shell مشترک Step 55، یک H1، progress متنی checkout و status قابل اعلام استفاده می‌کند. Quote، stock، shipping، Session، Address، Payment و Order هرکدام از منبع authoritative خود خوانده می‌شوند؛ UI منبع تازه‌ای نمی‌سازد و callback را نتیجه نهایی فرض نمی‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `success` | سفارش با موفقیت ثبت و پرداخت شد | سفارش EQ-14052 و پرداخت تأییدشده‌اند؛ فاکتور و timeline از جزئیات سفارش در دسترس‌اند. | مشاهده جزئیات سفارش |
| `failed` | پرداخت تأیید نشد | سفارش بدون پرداخت موفق باقی مانده است؛ علت امن نمایش داده می‌شود و retry فقط پس از status check مجاز است. | بررسی گزینه‌های پرداخت |
| `idempotent-replay` | این نتیجه قبلاً ثبت شده است | callback تکراری سفارش یا پرداخت دیگری نساخت؛ همان نتیجه authoritative نمایش داده می‌شود. | مشاهده همان سفارش |

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

Journeyها: `SJ-05`، `SJ-07`. قابلیت‌ها: `GET /customer/orders/{order_number}`، `GET /customer/orders/{order_number}/timeline`، `GET /customer/payments/{payment_id}/status`. Componentها: `StatePanel`، `Alert`، `Button`. این ارجاع‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-D-07--320--success--v1.svg`
- `SF-D-07--1440--success--v1.svg`
- `SF-D-07--320--failed--v1.svg`
- `SF-D-07--320--idempotent-replay--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی هستند و مستقیماً ویرایش نمی‌شوند.
