# Step 54 — RTL Design System Foundation

**Status:** COMPLETE / FINAL GATE PASS / MERGED

## مرز و منبع حقیقت

این Foundation از Product Vision، Business Rules، IA و Journeyهای Step 53 و قرارداد HTTP فعلی مشتق شده است. Repository مرجع Canonical توکن‌ها و قراردادهاست؛ Figma نمایش قابل‌ویرایش همان قرارداد است. در تعارض، مقدار ماشین‌خوان `step54-design-system-contract.json` تا زمان اصلاح رسمی مرجع است.

Step 54 شامل Token، Typography، Color، Spacing، RTL، Responsive، Component contract و Accessibility target است. Storefront/Admin wireframe، صفحهٔ High-fidelity، Prototype، Frontend code و تغییر Backend خارج Scope هستند.

## اصول طراحی

1. **اعتماد پیش از تزئین:** قیمت، موجودی، Permission و Status فقط از وضعیت authoritative نمایش داده می‌شوند؛ unknown-result موفقیت نیست.
2. **فارسی در سطح انسان، شناسه دقیق در سطح ماشین:** متن و عدد مشتری فارسی است؛ شناسه‌ای که باید Copy شود می‌تواند Latin و LTR-isolated بماند.
3. **RTL منطقی:** ترتیب DOM و Focus معنی را حفظ می‌کند؛ آیکون و جهت حرکت بر اساس inline-start/end تعریف می‌شود.
4. **رنگ مکمل معناست:** Status همیشه Label و در صورت نیاز Icon/Description دارد.
5. **عملیات حساس صریح است:** Action خطرناک نام نتیجه را می‌گوید و Preview/Confirmation/Step-Up را از Execute جدا می‌کند.
6. **چگالی کنترل‌شده:** Storefront به‌صورت comfortable و Admin data surfaces با compact opt-in کار می‌کنند؛ Touch target کوچک نمی‌شود.
7. **بدون Brown:** خانواده‌های Brown/coffee-brown وارد Brand یا Semantic palette نمی‌شوند. هویت برند با Teal، Blue و Neutral ساخته می‌شود.

## معماری Token

| لایه | هدف | Mode |
|---|---|---|
| Primitives | مقدار خام Color | Value |
| Semantic Color | نقش UI با Alias به Primitive | Light |
| Spacing & Size | فاصله، Radius، Border، Icon و Control | Value |
| Typography styles | نقش متن فارسی | مستقل از Mode |
| Effect styles | Elevation و Focus | مستقل از Mode |

نام‌ها slash-separated و CSS syntax با پیشوند `--eq` تعریف می‌شوند. Componentها PascalCase و Variantها با `Property=Value` ثبت می‌شوند. Primitiveها مستقیماً در Component مصرف نمی‌شوند؛ Component باید به Semantic token متصل باشد.

## رنگ و کنتراست

- Brand primary: Teal 700 در Light.
- Focus: Blue 700 در Light.
- Neutralها از Slate-derived values تشکیل می‌شوند و Brown نیستند.
- متن عادی حداقل 4.5:1، متن بزرگ 3:1 و مرز/Focus تعاملی 3:1 را هدف می‌گیرد.
- وضعیت‌های Info/Success/Warning/Danger/Special علاوه بر رنگ، Label مستقل دارند.

## مقیاس‌های ثابت

- Base unit: `4px`؛ فاصله‌های اصلی: 4، 8، 12، 16، 20، 24، 32، 40، 48، 64 و 80.
- Control: 36/44/52px؛ اندازه 36 فقط وقتی ناحیه تعامل همچنان 44px باشد.
- Radius: 4/8/12/16/24/full؛ Radius نباید معنای وضعیت بسازد.
- Border: 1px عادی، 2px قوی، 3px Focus.
- Motion: 120/200/320ms؛ reduced-motion همه حرکت غیرضروری را صفر می‌کند.
- Elevation فقط برای ترتیب لایه و Overlay است، نه تزئین عمومی.

## Iconography

Iconها باید از یک کتابخانهٔ برداری استاندارد با مجوز روشن انتخاب شوند؛ ساخت Icon با Text/Emoji یا SVG تقریبی ممنوع است. Icon جهت‌دار برای RTL mirror می‌شود، اما آیکون‌های فیزیکی/برندی/Playback بدون دلیل mirror نمی‌شوند. Icon-only control نام قابل‌دسترسی اجباری دارد.

## تم‌ها

Light تم Canonical Step 54 است. Dark mode در Roadmap الزام نشده و Plan فعلی Figma فقط یک Mode در هر Collection می‌پذیرد؛ بنابراین Dark به‌جای شبیه‌سازی ناقص، صریحاً Future enhancement است. افزودن آن بعداً باید Aliasهای Semantic کامل، بررسی کنتراست مستقل و Plan سازگار داشته باشد.

## Gate A1 تا A10

| Gate | خروجی | نتیجه |
|---|---|---|
| A1 | Canonical handoff، Gap audit، Scope freeze | PASS |
| A2 | Naming و Token architecture | PASS |
| A3 | Typography، Numeral و Content rules | PASS |
| A4 | Color، Contrast و Semantic roles | PASS |
| A5 | Spacing، Size، Radius، Elevation و Icon rules | PASS |
| A6 | RTL، Grid و Responsive rules | PASS |
| A7 | Navigation/Surface/Feedback contracts | PASS |
| A8 | Forms/Validation/Data-entry contracts | PASS |
| A9 | Commerce/Admin state و Data-display patterns | PASS |
| A10 | Accessibility target و Acceptance matrix | PASS |

## Gate A11 و A12

| Gate | خروجی | نتیجه |
|---|---|---|
| A11 | کتابخانهٔ Canonical رایگان در Repository شامل CSS Tokenها، Manifest ماشین‌خوان و کاتالوگ فارسی؛ Figma فقط Mirror اختیاری `PARTIAL_FREE_TIER` | PASS / PR #134 MERGED |
| A12 | Full verification، exact-head Canonical CI، Merge و Canonical state sync | PASS / PR #135 MERGED |

Repository منبع Canonical کتابخانهٔ Design System است و هیچ سرویس یا Plan پولی برای مصرف آن لازم نیست. Figma یک Mirror اختیاری `PARTIAL_FREE_TIER` است؛ Metric variable، Text/Effect style، Component set و Visual QA ناقص آن به‌عنوان خروجی کامل ادعا نمی‌شوند. A12 با exact head `99d2b5d2c49f395bd4e490384e8dd5baa292cdc7`، Canonical CI `33237793475`، Verify job `99061721464` و Merge commit `065cf9a66e5a84b570994085454dc4554b81e2b9` بسته شد.
