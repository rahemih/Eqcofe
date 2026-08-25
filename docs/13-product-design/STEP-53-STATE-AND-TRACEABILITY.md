# Step 53 — State, Accessibility & Traceability

**Status:** COMPLETE / TRACEABILITY GATE PASS

## State vocabulary

هر Screen/Flow در مراحل بعد باید Stateهای مرتبط را از واژگان زیر انتخاب کند و فقط Happy path نسازد:

| خانواده | Stateهای لازم | انتظار تجربه |
|---|---|---|
| Load | initial، progressive، refresh | حفظ Context، اعلام پیشرفت، جلوگیری از duplicate action |
| Empty | first-use، filtered، no-result | علت روشن و اقدام بعدی مرتبط |
| Input | validation، server-validation، conflict | Summary و اتصال خطا به Field/Action |
| Access | unauthenticated، denied، scope-filtered، step-up | تفکیک ورود، مجوز، دامنه و احراز مجدد |
| Network/provider | offline، timeout، unavailable، unknown-result | عدم موفقیت جعلی و مسیر safe retry/status check |
| Mutation | submitting، idempotent-replay، partial، success، failed | Action lock، reference، حفظ داده واردشده |
| Lifecycle | pending، active، terminal، expired، reversed | وضعیت authoritative و Action مجاز |
| Operations | healthy، degraded، alerting، recovering | timestamp، impact، owner و action bounded |

## Accessibility handoff to Step 54

Step 53 ادعای انطباق WCAG ندارد؛ هنوز Screen قابل تست وجود ندارد. با این حال قرارداد Journey موارد زیر را برای Design System اجباری می‌کند:

1. ترتیب خواندن و Focus منطقی در RTL؛ ترتیب DOM صرفاً با جابه‌جایی بصری معکوس نشود.
2. Navigation و Actionهای اصلی با Keyboard قابل دسترسی باشند و Focus visible داشته باشند.
3. Status فقط با رنگ منتقل نشود؛ Label/Text/Icon accessible همراه آن باشد.
4. Label فارسی با نام machine-readable، Help و Error association حفظ شود.
5. خطای Form هم Summary و هم پیام مرتبط با Field داشته باشد.
6. تغییرات async مهم مانند Payment verify، Upload، Export و Approval برای assistive technology اعلام شوند.
7. Motion مسیر ضروری برای فهم نباشد و reduced-motion در Step 54 تعریف شود.
8. اولویت محتوا و Touch target در Responsive design بعدی حفظ شود.

## Business-rule traceability

| Rule canonical | Journeyها | نتیجه طراحی |
|---|---|---|
| واحد پول Toman و Wallet ممنوع | SJ-04، SJ-05، AJ-02، AJ-05، AJ-09 | نمایش Toman؛ Loyalty هرگز balance نقدی نیست |
| مقایسه حداکثر ۴ محصول هم‌دسته | SJ-02 | validation پیش از ورود به Compare |
| عمده فقط پس از Approval | SJ-10، SJ-11، AJ-07 | type از Session/API؛ self-selection وجود ندارد |
| یک نشانی پیش‌فرض | SJ-06 | set-default نتیجه authoritative و conflict-aware |
| Payment/Refund idempotent و fail-closed | SJ-05، AJ-05 | unknown موفقیت نیست؛ retry کنترل‌شده است |
| تاریخچه After-sales immutable | SJ-08، SJ-09، AJ-06 | Timeline و terminal decision قابل بازنویسی نیست |
| Preview پیش از تغییر مالی/Config | AJ-02، AJ-09، AJ-12 | Preview/approval از Execute جداست |
| RBAC/Scope/Step-Up/Audit | Admin حساس | Navigation hint است؛ Server authority باقی می‌ماند |

## API traceability

Contract ماشین‌خوان ۲۴ Journey را به عملیات واقعی OpenAPI متصل می‌کند. Validator این Referenceها را پس از merge کردن overlayهای OpenAPI بررسی می‌کند؛ حذف یا تغییر path بدون اصلاح Journey باعث شکست `pnpm design:validate` و `pnpm verify` می‌شود. این اتصال «قابلیت Backend» را ثابت می‌کند، نه اینکه frontend route یا screen از قبل پیاده شده باشد.

## Gap register

| Gap | وضعیت Step 53 | مالک مرحله بعد |
|---|---|---|
| UI/Frontend موجود نیست | Expected؛ Audit تصویری ممکن نیست | Steps 55–78 |
| Design token/component/accessibility target نهایی نشده | خارج Scope | Step 54 |
| Storefront/Admin wireframe وجود ندارد | خارج Scope | Steps 55–56 |
| Prototype و usability evidence وجود ندارد | خارج Scope | Step 57 |
| Production OTP/SMS/email/shipping/payment config | وابستگی Launch و fail-closed؛ IA موفقیت جعلی نمی‌کند | Steps 74–78/86 |
| Frontend analytics events تعریف نشده | Journey IDs مبنا هستند؛ event contract بعداً ساخته می‌شود | Step 79 |

## Automated acceptance

`scripts/validate-step53-experience.mjs` موارد زیر را enforce می‌کند:

- فارسی/RTL بودن Contract.
- وجود پنج Artifact اصلی.
- یکتایی Actor، Navigation و Journey ID.
- حداقل ۱۲ Journey مشتری و ۱۲ Journey Admin.
- وجود Actor، Entry، Success، State و Operation برای هر Journey.
- وجود تمام Method/Pathهای ارجاع‌شده در OpenAPI canonical + overlays.
- پوشش Journeyهای حساس در Business-rule traceability.
- حداقل واژگان State و Accessibility handoff.

## Closure condition

Step 53 فقط پس از PASS شدن `design:validate`، کل `pnpm verify`، `git diff --check`، CI exact-head، merge و همگام‌سازی Roadmap/Current State/Linear بسته می‌شود. Figma یا Mermaid Artifact مکمل دیداری است؛ Contract داخل Repository مرجع canonical باقی می‌ماند.

