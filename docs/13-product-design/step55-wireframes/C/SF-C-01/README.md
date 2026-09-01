# SF-C-01 — آسیاب دستی حرفه‌ای مدل E-Q40

**Gate:** 55-C

**Fidelity:** structural low-fidelity

**Route intent:** `/product/:slug`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **ارزیابی محصول و انتخاب Variant بر اساس حقیقت جاری**. اقدام اصلی «انتخاب مدل و ادامه» است و بازیابی bounded با «بازخوانی قیمت و موجودی» پایان می‌یابد. اولویت محتوا به‌ترتیب عنوان و دسته ← رسانه ← قیمت و موجودی ← Variant ← ویژگی‌های کلیدی ← مقایسه و اقدام‌های شخصی است و collapse responsive این ترتیب را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55، دقیقاً یک main/H1 و placeholder خنثی رسانه استفاده می‌کند. حقیقت قیمت، موجودی و Variant از محصول جاری می‌آید؛ اقدام‌های علاقه‌مندی/هشدار مالک حساب‌اند و مقایسه فقط مجموعه هم‌دسته حداکثر چهارتایی را می‌پذیرد.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `initial` | جزئیات محصول آماده است | مدل استیل، موجودی ۸ عدد و قیمت جاری ۴٬۸۹۰٬۰۰۰ تومان از منبع authoritative نمایش داده می‌شود. | انتخاب مدل استیل |
| `out-of-stock` | مدل مشکی فعلاً ناموجود است | سایر Variantها تغییر نکرده‌اند؛ ادامه خرید برای این مدل غیرفعال است و هشدار موجودی در دسترس قرار می‌گیرد. | ساخت هشدار موجودی |
| `price-changed` | قیمت مدل انتخابی به‌روز شد | قیمت تازه ۵٬۰۵۰٬۰۰۰ تومان است؛ قیمت قبلی مبنای ادامه نیست و انتخاب پس از تأیید حفظ می‌شود. | تأیید قیمت تازه |

قیمت/موجودی stale بی‌صدا معتبر نمی‌ماند. Disabled علت متنی دارد. Mutation و ورود intent امن را حفظ می‌کنند. رسانه ناموجود با مشخصات متنی جایگزین می‌شود و مقایسه ناسازگار انتخاب‌های معتبر را حذف نمی‌کند.

## رفتار responsive و focus

| عرض | تصمیم layout | ترتیب focus/عملیات |
|---:|---|---|
| 320px | رسانه، عنوان، حقیقت تجاری و Variant به‌ترتیب عمودی | H1 → media → price/stock → Variant → primary → compare/actions |
| 360px | همان ترتیب 320 با فضای متن بیشتر و اقدام sticky بدون پوشاندن focus | H1 → media → price/stock → Variant → primary → compare/actions |
| 600px | رسانه بالا و پنل اطلاعات دو ناحیه زیر آن | H1 → media → price/stock → Variant → primary → compare/actions |
| 840px | رسانه ۷ ستون و اطلاعات/Variant پنج ستون | H1 → media controls → product facts → Variant → primary → compare/actions |
| 1200px | رسانه ۷ ستون و اطلاعات پنج ستون با خلاصه اقدام | H1 → media controls → product facts → Variant → primary → compare/actions |
| 1440px | محتوا در 1280px مرکزی؛ نسبت 7/5 حفظ می‌شود | H1 → media controls → product facts → Variant → primary → compare/actions |

در 400% zoom صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی صفحه دارد. هدف تعاملی حداقل 44×44px است؛ جدول مقایسه کارت/list معادل و رسانه کنترل قبلی/بعدی دارد. تغییر Variant، شمار مقایسه و نتیجه اقدام با status announcement بیان می‌شوند.

## ردیابی

Journeyها: `SJ-01`، `SJ-02`، `SJ-11`، `SJ-12`. قابلیت‌ها: `GET /products/{slug}`، `GET /auth/session`. Componentها: `Card`، `Badge`، `Select`، `Button`، `StatePanel`. این‌ها capability موجودند و وعده Runtime تازه نیستند.

## Artifactها

- `SF-C-01--320--initial--v1.svg`
- `SF-C-01--1440--initial--v1.svg`
- `SF-C-01--320--out-of-stock--v1.svg`
- `SF-C-01--320--price-changed--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش قرارداد JSON است.
