# SF-D-03 — انتخاب نشانی تحویل

**Gate:** 55-D

**Fidelity:** structural low-fidelity

**Route intent:** `/checkout/address`

**Actors:** retail، wholesale

## هدف

کار اصلی **انتخاب یا ثبت نشانی customer-owned معتبر** است. اقدام اصلی «انتخاب نشانی و ادامه» و بازیابی bounded «اصلاح نشانی یا بازگشت به هویت» است. اولویت محتوا مرحله checkout ← نشانی‌ها ← پیش‌فرض ← گیرنده/تماس ← اعتبارسنجی ← افزودن/ویرایش می‌ماند و reflow ترتیب معنایی را تغییر نمی‌دهد.

## ساختار و مالکیت

صفحه از shell مشترک Step 55، یک H1، progress متنی checkout و status قابل اعلام استفاده می‌کند. Quote، stock، shipping، Session، Address، Payment و Order هرکدام از منبع authoritative خود خوانده می‌شوند؛ UI منبع تازه‌ای نمی‌سازد و callback را نتیجه نهایی فرض نمی‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `first-use` | هنوز نشانی ثبت نشده است | برای محاسبه روش ارسال یک نشانی معتبر ثبت کنید؛ quote کالاها حفظ می‌شود. | افزودن نشانی |
| `validation` | اطلاعات نشانی کامل نیست | استان، شهر، کدپستی و نشانی دقیق را تکمیل کنید؛ خطاها کنار field و در summary هستند. | تکمیل موارد مشخص‌شده |
| `conflict` | این نشانی هم‌زمان تغییر کرده است | نسخه تازه نشانی نمایش داده شد؛ انتخاب قبلی بدون تأیید دوباره استفاده نمی‌شود. | بازبینی نسخه تازه |

ورودی امن و context معتبر در خطا حفظ می‌شود. Disabled علت دارد، submitting از تکرار جلوگیری می‌کند، expiry مسیر بازسازی می‌دهد و unknown-result فقط status check ارائه می‌کند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | هر مرحله یک task؛ اقدام زیر محتوای مرتبط | H1 → progress → address cards → add/edit → primary |
| 360px | ورودی‌ها تمام‌عرض؛ progress متنی | H1 → progress → address cards → add/edit → primary |
| 600px | فرم 6 ستون با راهنمای 2 ستون | H1 → progress → address cards → add/edit → primary |
| 840px | فرم 7 ستون و خلاصه پنج ستون | H1 → progress → address list → form/dialog → summary → primary |
| 1200px | step content و order summary هم‌زمان | H1 → progress → address list → form/dialog → summary → primary |
| 1440px | نسبت‌ها ثابت و whitespace در gutter | H1 → progress → address list → form/dialog → summary → primary |

در 400% zoom صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px هستند؛ error summary به field مربوط است؛ تغییر جمع، انقضا و نتیجه پرداخت announce می‌شود.

## ردیابی

Journeyها: `SJ-04`، `SJ-06`. قابلیت‌ها: `GET /customer/addresses`، `POST /customer/addresses`، `PATCH /customer/addresses/{id}`، `POST /customer/addresses/{id}/set-default`. Componentها: `ChoiceControl`، `Dialog`، `Button`، `Alert`. این ارجاع‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-D-03--320--first-use--v1.svg`
- `SF-D-03--1440--first-use--v1.svg`
- `SF-D-03--320--validation--v1.svg`
- `SF-D-03--320--conflict--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی هستند و مستقیماً ویرایش نمی‌شوند.
