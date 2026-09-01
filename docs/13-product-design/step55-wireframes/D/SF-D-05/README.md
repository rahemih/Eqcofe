# SF-D-05 — بازبینی و ثبت سفارش

**Gate:** 55-D

**Fidelity:** structural low-fidelity

**Route intent:** `/checkout/review`

**Actors:** retail، wholesale

## هدف

کار اصلی **تأیید حقیقت نهایی سفارش و ثبت idempotent** است. اقدام اصلی «ثبت سفارش و رفتن به پرداخت» و بازیابی bounded «بازسازی quote/reservation یا بازگشت به مرحله مرتبط» است. اولویت محتوا کالاها ← نوع مشتری ← نشانی/ارسال ← جمع تومان ← انقضا ← ثبت سفارش می‌ماند و reflow ترتیب معنایی را تغییر نمی‌دهد.

## ساختار و مالکیت

صفحه از shell مشترک Step 55، یک H1، progress متنی checkout و status قابل اعلام استفاده می‌کند. Quote، stock، shipping، Session، Address، Payment و Order هرکدام از منبع authoritative خود خوانده می‌شوند؛ UI منبع تازه‌ای نمی‌سازد و callback را نتیجه نهایی فرض نمی‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `price-changed` | جمع سفارش تغییر کرده است | quote تازه ۱۰٬۳۵۰٬۰۰۰ تومان است؛ مبلغ قبلی مبنای ثبت سفارش نیست. | تأیید جمع تازه |
| `expired` | رزرو checkout منقضی شده است | مهلت ۱۵ دقیقه‌ای پایان یافته؛ موجودی و قیمت دوباره بررسی می‌شوند و سفارش تکراری ساخته نمی‌شود. | بازسازی رزرو |
| `submitting` | در حال ثبت سفارش | درخواست با کلید idempotency در حال پردازش است؛ دکمه دوباره فعال نمی‌شود. | لطفاً منتظر بمانید |

ورودی امن و context معتبر در خطا حفظ می‌شود. Disabled علت دارد، submitting از تکرار جلوگیری می‌کند، expiry مسیر بازسازی می‌دهد و unknown-result فقط status check ارائه می‌کند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | هر مرحله یک task؛ اقدام زیر محتوای مرتبط | H1 → items → address/shipping → totals/expiry → primary |
| 360px | ورودی‌ها تمام‌عرض؛ progress متنی | H1 → items → address/shipping → totals/expiry → primary |
| 600px | فرم 6 ستون با راهنمای 2 ستون | H1 → items → address/shipping → totals/expiry → primary |
| 840px | فرم 7 ستون و خلاصه پنج ستون | H1 → review regions → authoritative summary → expiry/status → primary |
| 1200px | step content و order summary هم‌زمان | H1 → review regions → authoritative summary → expiry/status → primary |
| 1440px | نسبت‌ها ثابت و whitespace در gutter | H1 → review regions → authoritative summary → expiry/status → primary |

در 400% zoom صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px هستند؛ error summary به field مربوط است؛ تغییر جمع، انقضا و نتیجه پرداخت announce می‌شود.

## ردیابی

Journeyها: `SJ-04`، `SJ-11`. قابلیت‌ها: `POST /cart/{id}/quote`، `POST /checkout/{id}/reserve`، `POST /checkout/{id}/order`، `GET /auth/session`. Componentها: `Card`، `Alert`، `Button`، `Dialog`. این ارجاع‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-D-05--320--price-changed--v1.svg`
- `SF-D-05--1440--price-changed--v1.svg`
- `SF-D-05--320--expired--v1.svg`
- `SF-D-05--320--submitting--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی هستند و مستقیماً ویرایش نمی‌شوند.
