# SF-D-04 — روش ارسال

**Gate:** 55-D

**Fidelity:** structural low-fidelity

**Route intent:** `/checkout/delivery`

**Actors:** retail، wholesale

## هدف

کار اصلی **انتخاب روش ارسال معتبر برای سبد و نشانی جاری** است. اقدام اصلی «انتخاب ارسال و ادامه» و بازیابی bounded «تغییر نشانی یا دریافت روش‌ها دوباره» است. اولویت محتوا مرحله checkout ← نشانی خلاصه ← روش‌ها ← هزینه تومان ← بازه تحویل ← دلیل عدم دسترسی می‌ماند و reflow ترتیب معنایی را تغییر نمی‌دهد.

## ساختار و مالکیت

صفحه از shell مشترک Step 55، یک H1، progress متنی checkout و status قابل اعلام استفاده می‌کند. Quote، stock، shipping، Session، Address، Payment و Order هرکدام از منبع authoritative خود خوانده می‌شوند؛ UI منبع تازه‌ای نمی‌سازد و callback را نتیجه نهایی فرض نمی‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `initial` | روش‌های ارسال آماده‌اند | ارسال استاندارد و تحویل حضوری از پاسخ authoritative برای نشانی جاری نمایش داده می‌شوند. | انتخاب ارسال استاندارد |
| `unavailable` | برای این نشانی روش ارسال موجود نیست | هیچ Provider یا هزینه‌ای حدس زده نمی‌شود؛ تغییر نشانی و بررسی دوباره در دسترس است. | تغییر نشانی |
| `disabled-with-reason` | تحویل سریع برای این سبد غیرفعال است | وزن سبد از محدوده این روش بیشتر است؛ سایر روش‌های معتبر بدون تغییر باقی می‌مانند. | انتخاب روش دیگر |

ورودی امن و context معتبر در خطا حفظ می‌شود. Disabled علت دارد، submitting از تکرار جلوگیری می‌کند، expiry مسیر بازسازی می‌دهد و unknown-result فقط status check ارائه می‌کند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | هر مرحله یک task؛ اقدام زیر محتوای مرتبط | H1 → progress → address summary → shipping choices → reason/status → primary |
| 360px | ورودی‌ها تمام‌عرض؛ progress متنی | H1 → progress → address summary → shipping choices → reason/status → primary |
| 600px | فرم 6 ستون با راهنمای 2 ستون | H1 → progress → address summary → shipping choices → reason/status → primary |
| 840px | فرم 7 ستون و خلاصه پنج ستون | H1 → progress → address summary → shipping choices → reason/status → primary |
| 1200px | step content و order summary هم‌زمان | H1 → progress → address summary → shipping choices → reason/status → primary |
| 1440px | نسبت‌ها ثابت و whitespace در gutter | H1 → progress → address summary → shipping choices → reason/status → primary |

در 400% zoom صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px هستند؛ error summary به field مربوط است؛ تغییر جمع، انقضا و نتیجه پرداخت announce می‌شود.

## ردیابی

Journeyها: `SJ-04`. قابلیت‌ها: `GET /shipping-methods`، `POST /cart/{id}/quote`. Componentها: `ChoiceControl`، `Alert`، `Button`. این ارجاع‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-D-04--320--initial--v1.svg`
- `SF-D-04--1440--initial--v1.svg`
- `SF-D-04--320--unavailable--v1.svg`
- `SF-D-04--320--disabled-with-reason--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی هستند و مستقیماً ویرایش نمی‌شوند.
