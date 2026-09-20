# Item 9 — Calibration per Risk Class

## وضعیت

- Item 9: **FINAL CLOSURE IN PROGRESS**
- Stage A — Evidence & Sample Sufficiency Baseline: **CANONICAL COMPLETE**
- Stage B — Deterministic Calibration Engine: **CANONICAL COMPLETE**
- Stage C — Risk-Class Recommendations: **CANONICAL COMPLETE**
- Stage D — Final Verification & Canonical Closure: **IMPLEMENTED / PENDING CANONICAL MERGE**

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

## Closure قطعی Stage C

Stage C با PR #196 از مسیر protected Merge Policy ادغام شد.

- reviewed head: `a7d7b53b3c5b375b53d0701af060e6cea3a0963f`
- artifact hash: `168fb7be9e61ff9499083dc1e375796392a3439e44085827070dfad93dfa82d4`
- Protected merge run: `35438559717`
- Canonical merge SHA: `00a1bd3498f4e044cabdbbabceb2dd57f2d5e3d2`
- exact-SHA checkout: PASS
- postmerge canonical verify: PASS
- postmerge Phase A verify: PASS
- multi-agent tests: 141 / 141 PASS
- full runtime regression: 913 / 913 PASS
- Phase A PostgreSQL integrity and Steps 01–28: PASS

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

- production-level entrypoint فقط `calibrateCanonicalRiskClasses` است؛
- هر Task فقط از `.eqcofe/telemetry/<task_id>.json` و با `readTelemetryRecord` خوانده می‌شود؛
- فقط `ENOENT` به missing telemetry تبدیل می‌شود؛
- invalid JSON، provenance نامعتبر، task mismatch، token-budget mismatch و tampered aggregate fail closed هستند؛
- فقط `MERGED` و non-human-rejected primary sample است؛
- duplicate task id رد می‌شود؛
- کمتر از 10 primary sample در هر کلاس => `INSUFFICIENT_CANONICAL_TELEMETRY` و `token_quantiles=null`;
- از 10 sample به بالا => nearest-rank min/P50/P75/P90/max؛
- `policy_mutation_allowed=false`.

حداقل 10 sample یک operational floor محافظه‌کارانه است و ادعای confidence آماری نیست.

## Stage C — Risk-Class Recommendations

Task: `MA-ITEM9-CALIBRATION-C-001`

Stage C advisory-only است:

- `automatic_apply=false`
- `policy_mutation_allowed=false`
- هر policy change نیازمند Task حاکمیتی جداگانه است
- Risk Class، Risk Floor، Review، Security، Human Gate و Merge Policy را کاهش نمی‌دهد

وضعیت canonical فعلی همچنان هیچ مسیر commit‌شده‌ای زیر `.eqcofe/telemetry/` ندارد.

| Risk | Primary samples | Minimum | Token-budget recommendation | Retry/repair recommendation | Risk/Gates |
| --- | ---: | ---: | --- | --- | --- |
| LOW | 0 | 10 | NO_NUMERIC_RECOMMENDATION | NO_NUMERIC_RECOMMENDATION | NO_CHANGE |
| MEDIUM | 0 | 10 | NO_NUMERIC_RECOMMENDATION | NO_NUMERIC_RECOMMENDATION | NO_CHANGE |
| HIGH | 0 | 10 | NO_NUMERIC_RECOMMENDATION | NO_NUMERIC_RECOMMENDATION | NO_CHANGE |

اگر بعداً evidence کافی فراهم شود، Stage C فقط candidate مشورتی token budget را با قاعده‌ی deterministic خود می‌سازد؛ اعمال policy همچنان Task مستقل می‌خواهد.

Stage B هنوز distribution مستقل retry/repair منتشر نمی‌کند؛ بنابراین ساخت عدد retry/repair ممنوع است.

## Stage D — Final Verification & Canonical Closure

Task:
`MA-ITEM9-CALIBRATION-FINAL-CLOSURE-001`

Canonical base:
`b802ad9ddaf47366ab8229c530ce066b803bc16f`

Stage D فقط governance/documentation synchronization است و implementationهای Stage A/B/C را تغییر نمی‌دهد.

Write scope دقیق:

- `docs/14-multi-agent/ITEM9-CANONICAL-CLOSURE.md`
- `docs/14-multi-agent/ITEM9-CALIBRATION.md`
- `docs/14-multi-agent/PROCESS-IMPROVEMENTS.md`
- `docs/14-multi-agent/tasks/MA-ITEM9-CALIBRATION-FINAL-CLOSURE-001.json`
- `docs/14-multi-agent/generated/TASK-CATALOG.md`

Stage D باید قبل از merge:

- Canonical CI PASS
- Phase A PASS
- current Multi-Agent suite PASS
- current full-project regression PASS
- artifact-bound REVIEW PASS
- artifact-bound ACTIVE LOCK
- Merge Policy PASS
- exact five-path scope PASS

و بعد از protected merge:

- exact-SHA postmerge canonical verify PASS
- exact-SHA postmerge Phase A PASS

فقط بعد از آن:

- Item 9 = **CANONICAL COMPLETE**
- Item 10 = **AUTHORIZED / NOT STARTED**

## Calibration follow-up

به‌دلیل نبود canonical primary telemetry کافی، هیچ numeric calibration policy در V1 اعمال نمی‌شود.

Quantitative Calibration V2 / recalibration به V1.1 موکول می‌شود و فقط با evidence واقعی و کافی می‌تواند پیشنهاد عددی بدهد. Missing usage هرگز zero یا estimate فرض نمی‌شود.

## Guardrails

- `NOT_EXECUTED != PASS`
- `SKIPPED != PASS`
- missing telemetry != zero token usage
- pilot budget != calibrated budget
- operational anecdote != quantitative sample
- one pilot != sufficient calibration
- sufficient telemetry != automatic policy mutation
- retry metric unavailable != guessed retry recommendation
- calibration cannot relax risk or verification gates
- هر تغییر واقعی policy نیازمند Task مستقل و governance کامل است
- Item 10 authorization != Item 10 execution
