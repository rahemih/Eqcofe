# Item 9 — Calibration per Risk Class

## وضعیت

- Item 9: **IN PROGRESS**
- Stage A — Evidence & Sample Sufficiency Baseline: **IMPLEMENTED / PENDING CANONICAL MERGE**
- Stage B — Deterministic Calibration Engine: **NOT_STARTED**
- Stage C — Risk-Class Recommendations: **NOT_STARTED**
- Stage D — Final Verification & Canonical Closure: **NOT_STARTED**

این سند شروع رسمی Item 9 را پس از تکمیل Pilotهای واقعی LOW، MEDIUM و HIGH ثبت می‌کند. هدف Stage A تغییر سیاست نیست؛ هدف، تعیین وضعیت واقعی داده و جلوگیری از هر نوع کالیبراسیون حدسی است.

## پیش‌شرط‌های Canonical

| Risk Class | Pilot | Canonical state | Merge SHA |
| --- | --- | --- | --- |
| LOW | `MA-PILOT-LOW-001` | CANONICAL COMPLETE | `ce0ee9382f3b07f3a35d2f1a99601f7857e35869` |
| MEDIUM | `MA-PILOT-MEDIUM-001` | CANONICAL COMPLETE | `4cfdf4a075e8838c35b5dd2b14836fdbd5b2ad34` |
| HIGH | `MA-PILOT-HIGH-001` | CANONICAL COMPLETE | `be5c819a414b96fa5ba2f4ba1927831c76be20da` |

Pilot HIGH از مسیر protected Merge Policy ادغام شد و exact-SHA post-merge verification روی merge SHA بالا PASS شد. بنابراین ترتیب فریز‌شده‌ی Governance اجازه‌ی ورود به Item 9 را می‌دهد.

## قاعده‌ی داده

مرجع `TOKEN-TELEMETRY.md` صراحتاً می‌گوید فقط usage صریح با provenance معتبر قابل استفاده است. داده‌ی مفقود نباید به‌صورت estimate، synthetic event یا provider-authoritative جعلی بازسازی شود.

در baseline فعلی `main`، مسیر canonical زیر وجود ندارد:

`.eqcofe/telemetry/`

پس هیچ Telemetry Record ذخیره‌شده‌ای برای تشکیل primary calibration sample در دسترس نیست.

## ماتریس Sample Sufficiency

| Risk | Pilot budget (expected / soft / hard) | Canonical telemetry | Primary samples | Stage A disposition |
| --- | ---: | --- | ---: | --- |
| LOW | 8000 / 12000 / 25000 | MISSING | 0 | INSUFFICIENT_CANONICAL_TELEMETRY |
| MEDIUM | 15000 / 25000 / 50000 | MISSING | 0 | INSUFFICIENT_CANONICAL_TELEMETRY |
| HIGH | 18000 / 30000 / 60000 | MISSING | 0 | INSUFFICIENT_CANONICAL_TELEMETRY |

این اعداد فقط budgetهای Task Contractهای Pilot هستند و **نتیجه‌ی Calibration نیستند**.

## تصمیم Stage A

هیچ budget عددی جدیدی پیشنهاد یا اعمال نمی‌شود. Risk classification، Verification Policy، Human Gate، Security Gate، Review requirement، retry limits و Merge Policy نیز در Stage A تغییر نمی‌کنند.

نبود Telemetry به معنی شکست Item 9 نیست؛ به معنی این است که بخش numerical calibration باید fail closed و با وضعیت `INSUFFICIENT_CANONICAL_TELEMETRY` ثبت شود تا داده‌ی واقعی کافی جمع شود.

## شواهد عملیاتی غیرتوکنی Pilotها

این شواهد برای تحلیل فرایند مفیدند اما جای Telemetry را نمی‌گیرند:

- LOW ثابت کرد مسیر کم‌ریسک می‌تواند بدون Human Gate و بدون تغییر runtime به closure برسد.
- MEDIUM کنترل verified telemetry readback را اضافه کرد و tampered aggregate را fail closed می‌کند، اما usage واقعی تولید نکرد.
- HIGH نشان داد stale artifact evidence، canonical-base drift، Lock mismatch و Human Gate exact-artifact باید fail closed باقی بمانند.
- در HIGH، `LOCK_ID_NOT_REQUESTED` واقعاً توسط Merge Policy مسدود شد و پس از اصلاح Lock ID مجاز، `merge_eligible=true` شد.
- HIGH با merge SHA `be5c819a414b96fa5ba2f4ba1927831c76be20da` ادغام و exact-SHA post-merge verification با 913/913 runtime tests PASS شد.
- هم‌زمانی Step 58-B/C/D با HIGH چند بار canonical base را جلو برد؛ این یک سیگنال فرایندی برای Stage C است، اما به‌تنهایی مجوز کاهش یا افزایش Risk Class نیست.

## مسیر فریز‌شده‌ی Item 9

### Stage A — Evidence & Sample Sufficiency Baseline
ثبت dependencyهای سه Pilot، inventory داده‌ی canonical، sample matrix و وضعیت insufficient-data بدون mutation سیاست.

### Stage B — Deterministic Calibration Engine
تعریف و تست الگوریتم deterministic برای grouping بر اساس LOW/MEDIUM/HIGH، validation provenance، eligibility و sample sufficiency. این Stage باید صریحاً ثابت کند داده‌ی مفقود یا tampered باعث recommendation جعلی نمی‌شود.

### Stage C — Risk-Class Recommendations
فقط بر اساس evidence معتبر، recommendation برای token budget، retry/repair envelope و process friction تولید می‌شود. Gate یا risk floor فقط با شواهد کافی و task مستقل قابل تغییر است؛ single-pilot anecdote مجوز downgrade نیست.

### Stage D — Final Verification & Canonical Closure
اجرای regression کامل، بررسی drift، Review نهایی، protected merge و exact-SHA post-merge verification. Item 10 فقط بعد از closure واقعی Item 9 مجاز است.

## Guardrails

- `NOT_EXECUTED != PASS`
- missing telemetry != zero token usage
- pilot budget != calibrated budget
- operational anecdote != quantitative sample
- هیچ Calibration نباید حساسیت Pricing/Auth/Payment/Inventory/Migration را بدون evidence مستقل کاهش دهد.
- Item 9 هیچ مجوزی برای bypass کردن Scope/Lock/Review/Security/Human/Merge Policy ایجاد نمی‌کند.
