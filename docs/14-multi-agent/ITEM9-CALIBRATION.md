# Item 9 — Calibration per Risk Class

## وضعیت

- Item 9: **IN PROGRESS**
- Stage A — Evidence & Sample Sufficiency Baseline: **CANONICAL COMPLETE**
- Stage B — Deterministic Calibration Engine: **CANONICAL COMPLETE**
- Stage C — Risk-Class Recommendations: **IMPLEMENTED / PENDING CANONICAL MERGE**
- Stage D — Final Verification & Canonical Closure: **NOT_STARTED**

## Closure قطعی Stage A

Stage A با PR #193 از مسیر protected Merge Policy ادغام شد.

- Stage A head: `cef527969d4bcdd3b59d2747f37dbc342bb348c6`
- Stage A artifact hash: `5dda5b0583df7c85c09a6f6e9af43f7ef07f1e1e10cd29a53cedc82392684504`
- Canonical merge SHA: `5db790c74f601c23819df943beffbff7f106f9d3`
- Protected merge run: `35435491785`
- exact-SHA post-merge verification: PASS
- full runtime regression: 913 / 913 PASS

## Closure قطعی Stage B

Stage B با PR #195 از مسیر protected Merge Policy ادغام شد.

- reviewed head: `0271ee2ad2ef3e123f71a216e813d28552a3a255`
- artifact hash: `04cbc77de47e77730aabc99594d8514d25c7769dc5d594c02da94163ffee06d8`
- Protected merge run: `35437490690`
- Canonical merge SHA: `e79d7397d54545a8c3620961df4cc0df666ff9d5`
- exact-SHA checkout: PASS
- postmerge canonical verify: PASS
- postmerge Phase A verify: PASS
- multi-agent tests: 131 / 131 PASS
- full runtime regression: 913 / 913 PASS
- Phase A database integrity and Steps 01–28: PASS

## پیش‌شرط‌های Canonical

| Risk Class | Pilot | Canonical state | Merge SHA |
| --- | --- | --- | --- |
| LOW | `MA-PILOT-LOW-001` | CANONICAL COMPLETE | `ce0ee9382f3b07f3a35d2f1a99601f7857e35869` |
| MEDIUM | `MA-PILOT-MEDIUM-001` | CANONICAL COMPLETE | `4cfdf4a075e8838c35b5dd2b14836fdbd5b2ad34` |
| HIGH | `MA-PILOT-HIGH-001` | CANONICAL COMPLETE | `be5c819a414b96fa5ba2f4ba1927831c76be20da` |

## Stage A — Sample Sufficiency Baseline

مرجع `TOKEN-TELEMETRY.md` فقط usage صریح با provenance معتبر را مجاز می‌داند. داده‌ی مفقود estimate یا zero usage فرض نمی‌شود.

| Risk | Pilot budget (expected / soft / hard) | Canonical telemetry | Primary samples | Disposition |
| --- | ---: | --- | ---: | --- |
| LOW | 8000 / 12000 / 25000 | MISSING | 0 | INSUFFICIENT_CANONICAL_TELEMETRY |
| MEDIUM | 15000 / 25000 / 50000 | MISSING | 0 | INSUFFICIENT_CANONICAL_TELEMETRY |
| HIGH | 18000 / 30000 / 60000 | MISSING | 0 | INSUFFICIENT_CANONICAL_TELEMETRY |

این اعداد budgetهای Task Contractهای Pilot هستند، نه نتیجه‌ی Calibration.

## Stage B — Deterministic Calibration Engine

Stage B موتور canonical-readback را اضافه کرد:

- مسیر production-level فقط `calibrateCanonicalRiskClasses` است؛
- هر Task فقط از `.eqcofe/telemetry/<task_id>.json` و با `readTelemetryRecord` خوانده می‌شود؛
- فقط `ENOENT` به missing telemetry تبدیل می‌شود؛
- invalid JSON، provenance نامعتبر، task mismatch، token-budget mismatch و tampered aggregate fail closed هستند؛
- فقط `MERGED` و non-human-rejected primary sample است؛
- duplicate task id رد می‌شود؛
- کمتر از 10 primary sample در هر کلاس => `INSUFFICIENT_CANONICAL_TELEMETRY` و `token_quantiles=null`;
- از 10 sample به بالا => nearest-rank min/P50/P75/P90/max؛
- `policy_mutation_allowed=false`.

حداقل 10 sample یک **operational floor محافظه‌کارانه** است و ادعای confidence آماری نیست.

## Stage C — Risk-Class Recommendations

Task: `MA-ITEM9-CALIBRATION-C-001`

Canonical base:
`e79d7397d54545a8c3620961df4cc0df666ff9d5`

Stage C یک Recommendation Engine جدا از Stage B اضافه می‌کند. این موتور **advisory-only** است:

- `automatic_apply=false`
- `policy_mutation_allowed=false`
- هر policy change نیازمند Task حاکمیتی جداگانه است.
- Stage C هرگز Risk Class، Risk Floor، Review، Security، Human Gate یا Merge Policy را کاهش نمی‌دهد.

### وضعیت واقعی داده در baseline Stage C

در canonical tree روی `e79d7397d54545a8c3620961df4cc0df666ff9d5` هیچ مسیر commit‌شده‌ای زیر `.eqcofe/telemetry/` وجود ندارد.

بنابراین وضعیت واقعی فعلی:

| Risk | Primary samples | Minimum | Token-budget recommendation | Retry/repair recommendation | Risk/Gates |
| --- | ---: | ---: | --- | --- | --- |
| LOW | 0 | 10 | NO_NUMERIC_RECOMMENDATION | NO_NUMERIC_RECOMMENDATION | NO_CHANGE |
| MEDIUM | 0 | 10 | NO_NUMERIC_RECOMMENDATION | NO_NUMERIC_RECOMMENDATION | NO_CHANGE |
| HIGH | 0 | 10 | NO_NUMERIC_RECOMMENDATION | NO_NUMERIC_RECOMMENDATION | NO_CHANGE |

نتیجه فعلی Item 9 هیچ مجوزی برای تغییر budget یا policy ایجاد نمی‌کند.

### Token Budget Recommendation Rule

اگر یک کلاس هنوز `INSUFFICIENT_CANONICAL_TELEMETRY` باشد:

- هیچ عددی پیشنهاد نمی‌شود؛
- sample gap گزارش می‌شود؛
- مسیر پیشنهادی فقط جمع‌آوری canonical primary samples است.

اگر یک کلاس به `SUFFICIENT_CANONICAL_TELEMETRY` برسد، Stage C می‌تواند فقط یک candidate مشورتی بسازد:

- `expected_max = P75`
- `soft_alert = max(P90, expected_max + 1)`
- `hard_cap = max(MAX + 1, soft_alert + 1)`

این candidate خودکار اعمال نمی‌شود و حتی با evidence کافی نیز برای تغییر policy به Task جداگانه نیاز دارد.

### Retry / Repair Recommendation Rule

Stage B در خروجی calibration فعلی distribution مستقل retry/repair منتشر نمی‌کند. بنابراین Stage C حق ساخت عدد مصنوعی برای retry یا repair ندارد.

نتیجه:

`NO_NUMERIC_RECOMMENDATION / RETRY_REPAIR_DISTRIBUTION_NOT_IN_CALIBRATION_REPORT`

برای عددی شدن این بخش، ابتدا باید telemetry و calibration canonical مربوط به retry/repair به‌صورت صریح طراحی و اثبات شود.

### Process Friction Recommendations

فقط سیگنال‌های قابل مشاهده مجاز هستند:

- sample gap > 0 => `COLLECT_CANONICAL_PRIMARY_SAMPLES`
- missing telemetry > 0 => `CAPTURE_EXPLICIT_TELEMETRY`
- excluded samples > 0 => `REVIEW_EXCLUSION_CAUSES`
- evidence کافی => `REVIEW_TOKEN_CANDIDATE_IN_SEPARATE_GOVERNANCE_TASK`
- همیشه => `KEEP_EXISTING_RISK_AND_GATE_POLICY`

Anecdoteهای Pilot به numeric calibration تبدیل نمی‌شوند.

## مسیر فریز‌شده‌ی Item 9

### Stage A — Evidence & Sample Sufficiency Baseline
**CANONICAL COMPLETE**

### Stage B — Deterministic Calibration Engine
**CANONICAL COMPLETE**

### Stage C — Risk-Class Recommendations
**IMPLEMENTED / PENDING CANONICAL MERGE**

### Stage D — Final Verification & Canonical Closure
بعد از closure واقعی Stage C: regression کامل، drift check، نهایی‌سازی evidence، Review، protected merge و exact-SHA post-merge verification.

Item 10 فقط بعد از Closure واقعی Stage D مجاز است.

## Guardrails

- `NOT_EXECUTED != PASS`
- `SKIPPED != PASS`
- missing telemetry != zero token usage
- pilot budget != calibrated budget
- operational anecdote != quantitative sample
- one pilot != sufficient calibration
- sufficient telemetry != automatic policy mutation
- retry metric unavailable != guessed retry recommendation
- Stage C cannot relax risk or verification gates
- هر تغییر واقعی policy نیازمند Task مستقل و governance کامل است.
