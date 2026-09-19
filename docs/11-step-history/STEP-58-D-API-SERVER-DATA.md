# Step 58-D — API Client & Server Data Foundation

**وضعیت در زمان ایجاد PR: IMPLEMENTED / CANONICAL TRANSPORT PENDING**

## هدف

Stage 58-D لایهٔ پایهٔ ارتباط Storefront با API را می‌سازد، بدون اینکه هنوز هیچ Route تجاری را به دادهٔ واقعی متصل کند. منبع حقیقت Typeها همان OpenAPI موجود Backend است و Frontend حق ساخت DTO موازی یا تفسیر مستقل Business Rule را ندارد.

## Canonical base

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Stage 58-C merge / base: `d1e3f41d49e7a7d70c5c1e94c8e7bc9b1fa6d3c6`
- Stage A/B/C: `CLOSED / CANONICAL PASS`
- Stage D: `IN_PROGRESS`
- Stage E: `NOT_STARTED`
- Step 59: `NOT_STARTED`
- Linear: `HOS-14`

## Contract authority

- Source contract: `contracts/http/openapi.yaml`
- Generated TypeScript: `src/generated/openapi.ts`
- Storefront bridge: `apps/storefront/app/platform/api/contract.ts`

Storefront فقط typeها را از generated contract import می‌کند. هیچ interface/type دستی برای Product، Customer، Order، Payment، Cart یا سایر DTOهای Backend در Stage D ایجاد نشده است.

## Request foundation

`createApiClient` یک transport عمومی type-safe فراهم می‌کند:

- method و path فقط از ترکیب‌های موجود در OpenAPI پذیرفته می‌شوند
- path/query/header/request body از همان Operation type مشتق می‌شوند
- path parameterها URL-encode می‌شوند
- query فقط primitive یا primitive array می‌پذیرد
- JSON request body و Accept header استاندارد هستند
- پاسخ موفق status، request-id، response headers و data typed را برمی‌گرداند
- raw error body در error object نگهداری نمی‌شود

## Error model

`ApiClientError` پنج دسته دارد:

- `configuration`
- `network`
- `timeout`
- `aborted`
- `http`

برای ErrorResponse استاندارد Backend، code/message/request_id/field_errors استخراج می‌شوند. اگر پاسخ خطا با envelope استاندارد مطابقت نداشته باشد، fallback فقط status عمومی را نگه می‌دارد.

## Server configuration boundary

تنها فایل `apps/storefront/app/platform/config/api.server.ts` حق خواندن `process.env` را دارد؛ این با Policy Canonical Repository سازگار است.

متغیرها:

- `EQCOFE_API_BASE_URL` — اجباری
- `EQCOFE_API_TIMEOUT_MS` — اختیاری، پیش‌فرض 10000ms

هیچ Base URL واقعی یا credential داخل Repository hard-code نشده است. URL باید HTTP(S) باشد و username/password/query/hash ندارد.

## Data/cache policy

Stage D عمداً cache semantics تجاری را حدس نمی‌زند:

- baseline transport: `no-store`
- stale-on-error: خاموش
- هیچ in-memory global cache ایجاد نشده است
- هر cache policy آینده باید در Stage/Feature مربوطه صریح و Evidence-based اضافه شود

## Safe retry

Automatic retry فقط برای methodهای safe یعنی GET/HEAD فعال است:

- حداکثر 2 attempt
- network/timeout failure
- HTTP 502/503/504
- delay پایه 100ms

POST/PUT/PATCH/DELETE به‌صورت خودکار retry نمی‌شوند. حتی وجود Idempotency-Key در بعضی endpointهای OpenAPI به Stage D اجازه نمی‌دهد semantics mutation retry را اختراع کند.

## Auth/security boundary

Stage D:

- Authorization header تزریق نمی‌کند
- credential mode را تغییر نمی‌دهد
- cookie/session semantics تعریف نمی‌کند
- token storage ندارد
- protected route تصمیم‌گیری نمی‌کند

این موارد متعلق به Stage 58-E هستند.

## Verification

`apps/storefront/scripts/verify-api-foundation.ts` با mock HTTP server واقعی موارد زیر را Verify می‌کند:

1. generated OpenAPI bridge وجود دارد
2. server config boundary
3. GET typed query
4. retry یک GET از 503 به 200
5. UTF-8 path parameter encoding
6. canonical HTTP error parsing
7. POST 503 فقط یک بار اجرا می‌شود و retry نمی‌شود
8. invalid base URL fail-closed است
9. transport هیچ Authorization/credentials injection داخلی ندارد
10. cache baseline = no-store

Storefront `verify` اکنون `api:verify` را هم اجرا می‌کند.

## Explicit non-scope

- اتصال Routeهای Step 59–66 به API
- Auth/session/cookie/token implementation
- protected-route behavior
- mutation idempotency orchestration
- optimistic updates
- business cache TTL
- offline state framework
- global client state
- backend/API contract/database/migration changes
- Admin frontend
- Step 59 implementation
- paid service/dependency

## Definition of Done

Stage D فقط پس از موارد زیر Canonical بسته می‌شود:

1. frozen install PASS.
2. storefront typecheck/static-quality/build PASS.
3. shell verification همچنان PASS.
4. API foundation verification PASS.
5. root `pnpm verify` و Backend regression PASS.
6. exact scope Task Contract PASS.
7. MEDIUM artifact-bound REVIEW و ACTIVE LOCK معتبر.
8. exact-head `verify`, `phase-a`, `merge-policy` PASS.
9. protected Merge Policy merge.
10. exact-SHA postmerge `pnpm verify` و Phase-A PASS.
11. Stage E و Step 59 تا closure Stage D شروع نشوند.

## Gate verdict before transport

`IMPLEMENTATION READY / CANONICAL GATE PENDING`
