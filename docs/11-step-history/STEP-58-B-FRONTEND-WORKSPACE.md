# Step 58-B — Frontend Workspace & Build Foundation

**وضعیت در زمان ایجاد PR: IMPLEMENTED / CANONICAL TRANSPORT PENDING**

## خلاصه ساده

Stage 58-B اولین پایهٔ اجرایی Frontend فروشگاه EQCOFE را ایجاد می‌کند، اما عمداً هنوز هیچ صفحهٔ تجاری، Homepage، Product، Cart، Checkout، Account، Admin یا قابلیت Step 59 را پیاده‌سازی نمی‌کند. هدف این Stage فقط ساخت یک workspace واقعی، type-safe، قابل Build و قابل کنترل در Canonical CI است.

## مبنای Canonical

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Stage A canonical merge: `a81fe76943698c0f77022f8a4c379eb7b8529425`
- Stage A: `CLOSED / CANONICAL PASS`
- Stage B: `IN_PROGRESS`
- Stage C: `NOT_STARTED`
- Step 59: `NOT_STARTED`
- Linear: `HOS-14`

## معماری و نسخه‌های اجرایی

Storefront در `apps/storefront` و به‌صورت workspace جدا ایجاد شده است:

- React Router Framework Mode: `8.4.0`
- React / React DOM: `19.3.0`
- Vite: `8.3.0`
- TypeScript: `6.0.3`
- ESLint: `10.10.0`
- typescript-eslint: `8.70.0`
- eslint-plugin-react-hooks: `7.1.1`
- isbot: `5.2.2`
- Node: `24.18.1`
- pnpm: `11.21.0`
- SSR: `true`

Versionهای Frontend در این foundation به‌صورت exact pin ثبت شده‌اند تا dependency graph deterministic بماند.

## Workspace و Canonical verification

`pnpm-workspace.yaml` اکنون `apps/*` را می‌شناسد. Storefront scriptهای `dev`, `build`, `start`, `typecheck`, `static-quality`, `verify` دارد.

Root package نیز scriptهای `frontend:*` را اضافه کرده و `pnpm verify` اکنون `frontend:verify` را قبل از build/test Backend اجرا می‌کند. بنابراین Canonical CI از این Stage به بعد خرابی Frontend را نادیده نمی‌گیرد.

## Type safety و Static Quality

`typecheck` ابتدا React Router type generation را اجرا می‌کند و سپس TypeScript را با `strict: true` و `noEmit: true` بررسی می‌کند.

Stage A صریحاً lint واقعی را `NOT_CONFIGURED` ثبت کرده بود. Stage B این Gap را با ESLint واقعی می‌بندد. `static-quality` source/configهای Storefront را بررسی می‌کند و generated/build output را lint نمی‌کند.

## SSR Foundation

`react-router.config.ts` دارای `ssr: true` است و `vite.config.ts` از plugin رسمی React Router استفاده می‌کند. `app/routes.ts` عمداً خالی است؛ هیچ route تجاری یا feature route در Stage B ساخته نشده است.

## Environment / Secret Boundary

- Environmentهای Storefront server-only هستند مگر اینکه عمداً public تعریف شوند.
- هر `VITE_*` آینده browser-visible است و نباید secret، credential، token، private key یا authoritative business configuration داشته باشد.
- Stage B هیچ API endpoint یا credential واقعی تعریف نمی‌کند.
- API transport configuration متعلق به Stage 58-D است.
- Frontend هیچ‌وقت authority برای authorization، payment result، pricing/discount/profit، inventory truth/reservation یا business lifecycle نیست.

## Bootstrap verification evidence

برای اینکه `pnpm-lock.yaml` حدس زده یا دستی ساخته نشود، dependency resolution در branch موقت غیرCanonical و توسط GitHub Actions انجام شد. آن workflow وارد PR نهایی نشده است.

- Bootstrap run `35424022470`: lock generation و frozen install PASS؛ typecheck وابستگی implicit `isbot@5` را آشکار کرد.
- Remediation: `isbot@5.2.2` explicit pin شد، `@eslint/js@10.0.1` مستقیم اضافه شد و `@types/node@24.13.3` انتخاب شد.
- Bootstrap run `35424062217`: frozen install، typecheck، static-quality و SSR build همگی PASS.
- Artifact `10578366454`, digest `sha256:cdff6679b4a40bbc7453c92f2f32e96e6f73ff08b41ba59bcc4b91ef20695252`.
- Materialization run `35424142023`: generation، frozen install، typecheck، static-quality، build و lockfile materialization همگی PASS.
- Lockfile نهایی بدون ویرایش دستی از bootstrap branch به branch Stage B منتقل شد.

Resolver یک warning عمومی peer-dependency و warning قدیمی `cron-parser@4.9.0` نشان داد، ولی frozen-install/typecheck/lint/build سبز ماندند؛ این warningها پنهان نشده‌اند.

## Explicit non-scope

- Homepage/Header/Hero/Footer تجاری
- Product listing/detail، Compare، Wishlist
- Cart/Checkout/Payment
- Account/Wholesale/Content
- Admin frontend
- API client/cache
- Auth/session
- RTL/i18n shell و design-token composition
- Backend/API/database/migration/business-rule changes
- Step 59
- hosting/vendor commitment
- paid dependency/service

## Definition of Done

Stage B فقط بعد از تمام موارد زیر Canonical بسته می‌شود:

1. exact-artifact frozen install PASS.
2. frontend typecheck PASS.
3. frontend static-quality PASS.
4. frontend SSR build PASS.
5. root `pnpm verify` با Frontend و Backend PASS.
6. Task Contract و scope PASS.
7. MEDIUM artifact-bound REVIEW + ACTIVE LOCK معتبر.
8. `verify`, `phase-a`, `merge-policy` روی exact head PASS.
9. protected Merge Policy merge.
10. exact-SHA post-merge verification PASS.
11. Stage C و Step 59 تا آن زمان NOT_STARTED.

## Gate verdict before transport

`IMPLEMENTATION READY / CANONICAL GATE PENDING`


## Canonical CI remediation

اولین Canonical CI روی PR نهایی، frozen install را PASS کرد اما در `pnpm policy:check` شکست خورد. علت، Frontend source نبود: تابع legacy `filesUnder('apps')` به‌صورت recursive وارد `apps/storefront/node_modules` می‌شد و declarationهای vendor مربوط به Node/Vite/ESLint را به‌اشتباه به‌عنوان source پروژه بررسی می‌کرد.

Remediation محدود Stage B:

- `scripts/check-project-policies.mjs` اکنون directory با نام `node_modules` را در هر عمق نادیده می‌گیرد.
- تمام sourceهای واقعی زیر `src` و `apps` همچنان با همان ruleهای Toman / no-wallet / config-boundary بررسی می‌شوند.
- هیچ policy rule حذف یا ضعیف نشده است.
- تغییر global pnpm linker به `hoisted` عمداً رد شد تا strict isolated dependency layout حفظ شود.
