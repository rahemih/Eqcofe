# SF-C-04 — مقایسه آسیاب‌های دستی

**Gate:** 55-C

**Fidelity:** structural low-fidelity

**Route intent:** `/compare`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **مقایسه ویژگی‌های هم‌معنا و بازگشت به محصول مناسب**. اقدام اصلی «مشاهده محصول منتخب» است و بازیابی bounded با «حذف مورد ناسازگار و اعتبارسنجی دوباره» پایان می‌یابد. اولویت محتوا به‌ترتیب عنوان و تعداد ← نام محصول‌ها ← قیمت و موجودی جاری ← ویژگی‌های هم‌معنا ← اختلاف‌ها ← حذف/بازگشت است و collapse responsive این ترتیب را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55، دقیقاً یک main/H1 و placeholder خنثی رسانه استفاده می‌کند. حقیقت قیمت، موجودی و Variant از محصول جاری می‌آید؛ اقدام‌های علاقه‌مندی/هشدار مالک حساب‌اند و مقایسه فقط مجموعه هم‌دسته حداکثر چهارتایی را می‌پذیرد.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `initial` | مقایسه ۲ محصول آماده است | قیمت، موجودی، جنس تیغه، ظرفیت و وزن با header association و کارت معادل compact نمایش داده می‌شوند. | مشاهده E-Q40 |
| `first-use` | هنوز محصولی برای مقایسه انتخاب نشده است | از یک دسته حداقل دو محصول انتخاب کنید؛ محدودیت چهار مورد پیش از افزودن توضیح داده می‌شود. | رفتن به آسیاب‌های دستی |
| `conflict` | یکی از محصولات دیگر با این مقایسه سازگار نیست | محصول ناسازگار مشخص شده است؛ موردهای معتبر و جای focus حفظ می‌شوند و refresh بی‌صدا حذف نمی‌کند. | حذف مورد ناسازگار |

قیمت/موجودی stale بی‌صدا معتبر نمی‌ماند. Disabled علت متنی دارد. Mutation و ورود intent امن را حفظ می‌کنند. رسانه ناموجود با مشخصات متنی جایگزین می‌شود و مقایسه ناسازگار انتخاب‌های معتبر را حذف نمی‌کند.

## رفتار responsive و focus

| عرض | تصمیم layout | ترتیب focus/عملیات |
|---:|---|---|
| 320px | کارت ویژگی عمودی؛ بدون جدول دوبعدی | H1 → product cards → attribute lists → remove/view actions |
| 360px | کارت محصول با حذف مستقیم و شمارش ۴تایی | H1 → product cards → attribute lists → remove/view actions |
| 600px | دو کارت در هر ردیف؛ ویژگی‌ها در list متناظر | H1 → product cards → attribute lists → remove/view actions |
| 840px | جدول با ستون عنوان sticky و scroll افقی bounded | H1 → table caption/headers → cells by row → remove/view actions |
| 1200px | حداکثر چهار ستون محصول؛ عنوان ویژگی sticky | H1 → table caption/headers → cells by row → remove/view actions |
| 1440px | چهار محصول در محدوده 1280؛ کارت جایگزین همچنان موجود | H1 → table caption/headers → cells by row → remove/view actions |

در 400% zoom صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی صفحه دارد. هدف تعاملی حداقل 44×44px است؛ جدول مقایسه کارت/list معادل و رسانه کنترل قبلی/بعدی دارد. تغییر Variant، شمار مقایسه و نتیجه اقدام با status announcement بیان می‌شوند.

## ردیابی

Journeyها: `SJ-02`. قابلیت‌ها: `POST /compare/validate`، `POST /compare`. Componentها: `DataTable`، `Card`، `Button`، `StatePanel`. این‌ها capability موجودند و وعده Runtime تازه نیستند.

## Artifactها

- `SF-C-04--320--initial--v1.svg`
- `SF-C-04--1440--initial--v1.svg`
- `SF-C-04--320--first-use--v1.svg`
- `SF-C-04--320--conflict--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش قرارداد JSON است.
