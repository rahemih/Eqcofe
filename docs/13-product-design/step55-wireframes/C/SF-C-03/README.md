# SF-C-03 — انتخاب برای مقایسه

**Gate:** 55-C

**Fidelity:** structural low-fidelity

**Route intent:** `compare-selection-state`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **ساخت مجموعه حداکثر چهارتایی از محصولات هم‌دسته**. اقدام اصلی «مقایسه ۲ محصول» است و بازیابی bounded با «حذف مورد ناسازگار یا یکی از چهار انتخاب» پایان می‌یابد. اولویت محتوا به‌ترتیب شمار انتخاب ← نام دسته مشترک ← محصول‌های انتخاب‌شده ← دلیل محدودیت ← حذف مورد ← شروع مقایسه است و collapse responsive این ترتیب را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55، دقیقاً یک main/H1 و placeholder خنثی رسانه استفاده می‌کند. حقیقت قیمت، موجودی و Variant از محصول جاری می‌آید؛ اقدام‌های علاقه‌مندی/هشدار مالک حساب‌اند و مقایسه فقط مجموعه هم‌دسته حداکثر چهارتایی را می‌پذیرد.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `enabled` | ۲ از ۴ محصول انتخاب شده است | هر دو محصول از دسته آسیاب دستی‌اند و آماده اعتبارسنجی نهایی مقایسه هستند. | مقایسه ۲ محصول |
| `disabled-with-reason` | سقف چهار محصول تکمیل است | برای افزودن محصول پنجم ابتدا یکی از چهار مورد فعلی را حذف کنید؛ انتخاب‌های معتبر حفظ می‌شوند. | مدیریت چهار انتخاب |
| `validation` | این محصول از دسته سازگار نیست | محصول ابزار دم‌آوری به مجموعه آسیاب دستی افزوده نشد؛ دو انتخاب قبلی بدون تغییر باقی ماند. | بازگشت به آسیاب‌های دستی |

قیمت/موجودی stale بی‌صدا معتبر نمی‌ماند. Disabled علت متنی دارد. Mutation و ورود intent امن را حفظ می‌کنند. رسانه ناموجود با مشخصات متنی جایگزین می‌شود و مقایسه ناسازگار انتخاب‌های معتبر را حذف نمی‌کند.

## رفتار responsive و focus

| عرض | تصمیم layout | ترتیب focus/عملیات |
|---:|---|---|
| 320px | کارت ویژگی عمودی؛ بدون جدول دوبعدی | H1 → count/status → selected products → remove actions → validate/compare |
| 360px | کارت محصول با حذف مستقیم و شمارش ۴تایی | H1 → count/status → selected products → remove actions → validate/compare |
| 600px | دو کارت در هر ردیف؛ ویژگی‌ها در list متناظر | H1 → count/status → selected products → remove actions → validate/compare |
| 840px | جدول با ستون عنوان sticky و scroll افقی bounded | H1 → count/status → selected products → remove actions → validate/compare |
| 1200px | حداکثر چهار ستون محصول؛ عنوان ویژگی sticky | H1 → count/status → selected products → remove actions → validate/compare |
| 1440px | چهار محصول در محدوده 1280؛ کارت جایگزین همچنان موجود | H1 → count/status → selected products → remove actions → validate/compare |

در 400% zoom صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی صفحه دارد. هدف تعاملی حداقل 44×44px است؛ جدول مقایسه کارت/list معادل و رسانه کنترل قبلی/بعدی دارد. تغییر Variant، شمار مقایسه و نتیجه اقدام با status announcement بیان می‌شوند.

## ردیابی

Journeyها: `SJ-02`. قابلیت‌ها: `POST /compare/validate`. Componentها: `ChoiceControl`، `Alert`، `Button`. این‌ها capability موجودند و وعده Runtime تازه نیستند.

## Artifactها

- `SF-C-03--320--enabled--v1.svg`
- `SF-C-03--1440--enabled--v1.svg`
- `SF-C-03--320--disabled-with-reason--v1.svg`
- `SF-C-03--320--validation--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش قرارداد JSON است.
