# Item 9 — Calibration per Risk Class

## وضعیت

- Item 9: **IN PROGRESS**
- Stage A — Evidence & Sample Sufficiency Baseline: **CANONICAL COMPLETE**
- Stage B — Deterministic Calibration Engine: **IMPLEMENTED / PENDING CANONICAL MERGE**
- Stage C — Risk-Class Recommendations: **NOT_STARTED**
- Stage D — Final Verification & Canonical Closure: **NOT_STARTED**

## Closure قطعی Stage A

Stage A با PR #193 از مسیر protected Merge Policy ادغام شد.

- Stage A head: `cef527969d4bcdd3b59d2747f37dbc342bb348c6`
- Stage A artifact hash: `5dda5b0583df7c85c09a6f6e9af43f7ef07f1e1e10cd29a53cedc82392684504`
- Canonical merge SHA: `5db790c74f601c23819df943beffbff7f106f9d3`
- Protected merge run: `35435491785`
- merge job: PASS
- resolved exact merge SHA: PASS
- exact-SHA checkout: PASS
- postmerge canonical verify: PASS
- postmerge Phase A verify: PASS
- full runtime regression: 913 / 913 PASS

دو workflow_dispatch بعدی پس از بسته‌شدن PR #193 شکست خوردند؛ آن‌ها اجرای تکراری روی PR ادغام‌شده بودند و جایگزین evidence اجرای موفق بالا نیستند.

## پیش‌شرط‌های Canonical

| Risk Class | Pilot | Canonical state | Merge SHA |
| --- | --- | --- | --- |
| LOW | `MA-PILOT-LOW-001` | CANONICAL COMPLETE | `ce0ee9382f3b07f3a35d2f1a99601f7857e35869` |
| MEDIUM | `MA-PILOT-MEDIUM-001` | CANONICAL COMPLETE | `4cfdf4a075e8838c35b5dd2b14836fdbd5b2ad34` |
| HIGH | `MA-PILOT-HIGH-001` | CANONICAL COMPLETE | `be5c819a414b96fa5ba2f4ba1927831c76be20da` |

## قاعده‌ی داده

مرجع `TOKEN-TELEMETRY.md` فقط usage صریح با provenance معتبر را مجاز می‌داند. داده‌ی مفقود نباید estimate، synthetic event یا provider-authoritative جعلی شود.

در baseline Stage A مسیر `.eqcofe/telemetry/` وجود نداشت. بنابراین برای سه Pilot، canonical primary sample برابر صفر بود و نبود telemetry به معنی zero usage نیست.

## Stage A — Sample Sufficiency Baseline

| Risk | Pilot budget (expected / soft / hard) | Canonical telemetry | Primary samples | Disposition |
| --- | ---: | --- | ---: | --- |
| LOW | 8000 / 12000 / 25000 | MISSING | 0 | INSUFFICIENT_CANONICAL_TELEMETRY |
| MEDIUM | 15000 / 25000 / 50000 | MISSING | 0 | INSUFFICIENT_CANONICAL_TELEMETRY |
| HIGH | 18000 / 30000 / 60000 | MISSING | 0 | INSUFFICIENT_CANONICAL_TELEMETRY |

این اعداد budgetهای Task Contractهای Pilot هستند، نه نتیجه‌ی Calibration.

## Stage B — Deterministic Calibration Engine

Task: `MA-ITEM9-CALIBRATION-B-001`

Canonical base این Stage:
`735c69f6e2eac30f5fa1c1c4012e709e15972451`

Stage B یک موتور deterministic و library-driven اضافه می‌کند که:

- evidence را بر اساس risk متصل به Task Contract به LOW / MEDIUM / HIGH گروه‌بندی می‌کند؛
- مسیر اصلی `calibrateCanonicalRiskClasses` هر Task را فقط از `.eqcofe/telemetry/<task_id>.json` و از طریق `readTelemetryRecord` می‌خواند؛\n- هر Telemetry Record را با `validateTelemetryRecord` بازسازی و integrity آن را بررسی می‌کند؛
- provenance نامعتبر، aggregate دستکاری‌شده، task mismatch و token-budget mismatch را fail closed می‌کند؛
- فقط `terminal_state = MERGED` و `human_rejected = false` را primary sample می‌پذیرد؛
- فقط خطای `ENOENT` را به `MISSING_TELEMETRY` تبدیل می‌کند؛ JSON نامعتبر، task-id نامعتبر، provenance نامعتبر و tamper همگی fail closed باقی می‌مانند؛\n- missing telemetry را `MISSING_TELEMETRY` ثبت می‌کند و هرگز آن را zero usage فرض نمی‌کند؛
- duplicate task id را رد می‌کند تا sample count قابل بادکردن نباشد؛
- خروجی‌ها را defensively frozen می‌کند؛
- `policy_mutation_allowed = false` برمی‌گرداند.

### حداقل Sample Sufficiency

Specification/Governance عدد آماده‌ای برای minimum sample size تعریف نکرده بود. Stage B بنابراین یک rule محافظه‌کارانه و deterministic ثبت می‌کند:

`MIN_PRIMARY_SAMPLES_PER_RISK = 10`

این عدد **ادعای اعتبار آماری یا confidence interval نیست**. یک operational floor است تا یک Pilot یا چند anecdote کم‌تعداد نتوانند P50/P75/P90 تولید کنند.

قاعده:

- اگر primary samples هر کلاس < 10 باشد:
  - disposition = `INSUFFICIENT_CANONICAL_TELEMETRY`
  - `token_quantiles = null`
- اگر primary samples هر کلاس >= 10 باشد:
  - disposition = `SUFFICIENT_CANONICAL_TELEMETRY`
  - quantile method = `NEAREST_RANK`
  - فقط min / P50 / P75 / P90 / max تولید می‌شود.

Stage B هیچ budget، risk floor، retry limit، Review/Security/Human Gate، required CI یا Merge Policy را تغییر نمی‌دهد.

### Canonical Readback Boundary\n\nوجود یک object معتبر در حافظه برای Calibration کافی نیست. مسیر production-level Stage B فقط `calibrateCanonicalRiskClasses` است؛ این entrypoint ابتدا canonical file را با `readTelemetryRecord` می‌خواند و سپس validation و grouping را انجام می‌دهد. بنابراین یک record ساخته‌شده در حافظه، حتی اگر integrity-valid باشد، بدون canonical readback وارد statistics نمی‌شود.\n\n## Stage B Negative Guarantees

- non-canonical in-memory telemetry => not eligible for statistics\n- missing telemetry != zero usage
- invalid provenance => FAIL
- tampered aggregate => FAIL
- task mismatch => FAIL
- token-budget mismatch => FAIL
- duplicate task => FAIL
- human rejected => excluded from primary
- terminal state other than MERGED => excluded from primary
- insufficient sample size => no quantiles
- one successful pilot => insufficient
- numeric output != policy change

## مسیر فریز‌شده‌ی Item 9

### Stage A — Evidence & Sample Sufficiency Baseline
**CANONICAL COMPLETE**

### Stage B — Deterministic Calibration Engine
**IMPLEMENTED / PENDING CANONICAL MERGE**

### Stage C — Risk-Class Recommendations
فقط بعد از canonical closure Stage B شروع می‌شود. Recommendation باید evidence-backed باشد و هیچ policy change را خودکار اعمال نمی‌کند.

### Stage D — Final Verification & Canonical Closure
Regression کامل، drift check، Review نهایی، protected merge و exact-SHA post-merge verification.

Item 10 فقط بعد از Closure واقعی Stage D مجاز است.

## Guardrails

- `NOT_EXECUTED != PASS`
- `SKIPPED != PASS`
- missing telemetry != zero token usage
- pilot budget != calibrated budget
- operational anecdote != quantitative sample
- one pilot != sufficient calibration
- no risk downgrade from a single successful pilot
- هیچ Calibration حق کاهش حساسیت Pricing/Auth/Payment/Inventory/Migration را بدون evidence مستقل و task حاکمیتی جداگانه ندارد.
- Item 9 هیچ bypass برای Scope/Lock/Review/Security/Human/Merge Policy ایجاد نمی‌کند.
