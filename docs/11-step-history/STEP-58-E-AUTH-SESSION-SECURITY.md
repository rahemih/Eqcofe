# Step 58-E — Auth / Session / Security Boundary

**وضعیت در زمان ایجاد PR: IMPLEMENTED / CANONICAL TRANSPORT PENDING**

## هدف

Stage 58-E مرز امن Auth/Session فروشگاه را بر اساس Backend موجود پیاده‌سازی می‌کند، بدون اینکه Frontend به authority احراز هویت یا permission تبدیل شود. این Stage هیچ UI ورود، صفحهٔ حساب واقعی یا Feature مربوط به Step 59–66 را تکمیل نمی‌کند.

## Canonical base

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Stage 58-D merge: `51252043799ee5f8a3fa427d668f66b7c60bebad`
- Stage 58-E canonical base after drift reconciliation: `be5c819a414b96fa5ba2f4ba1927831c76be20da`
- Drift source: protected merge of PR #186 (`MA-PILOT-HIGH-001`); no Auth/session business overlap, but Task Catalog/canonical base were reconciled before transport
- Stage A/B/C/D: `CLOSED / CANONICAL PASS`
- Stage E: `IN_PROGRESS`
- Stage F: `NOT_STARTED`
- Step 59: `NOT_STARTED`
- Linear: `HOS-14`

## Backend evidence

OpenAPI و implementation فعلی Backend به‌صورت مستقل بررسی شدند:

- `customerSession` یک `apiKey` در cookie با نام `eqcofe_session` است.
- Backend در Secure mode نام `__Host-eqcofe_session` را استفاده می‌کند.
- Customer session cookie توسط Backend با `HttpOnly`, `Path=/`, `SameSite=Lax` ساخته می‌شود؛ Secure mode نیز `Secure` دارد.
- `/auth/otp/request` و `/auth/otp/verify` public هستند.
- `/auth/session`, `/auth/logout`, `/auth/logout-all` با customerSession محافظت می‌شوند.
- Session token در Backend hash می‌شود و sessionهای revoked/expired یا account/customer غیرفعال resolve نمی‌شوند.
- `/auth/session` actor را از Backend می‌گیرد؛ Frontend permission/customer identity را مستقل بازسازی نمی‌کند.

## Server-only cookie bridge

`apps/storefront/app/platform/auth/session-cookie.server.ts` تنها bridge session مشتری است.

Inbound:

- فقط `__Host-eqcofe_session` یا `eqcofe_session` پذیرفته می‌شود.
- در صورت وجود Secure host cookie، اولویت با `__Host-` است.
- duplicate یا control/unsafe cookie value fail-closed است.
- analytics، admin session و سایر cookieها به Backend customer request forward نمی‌شوند.
- Authorization/Proxy-Authorization از wrapper پاک می‌شوند تا customer session flow به Bearer authority تبدیل نشود.

Outbound:

- Backend Set-Cookie فقط در bridge server-side مشاهده می‌شود.
- general API response metadata دیگر `set-cookie`, `cookie`, `authorization`, `proxy-authorization` را expose نمی‌کند.
- قبل از relay، cookie باید customer-session name معتبر، `HttpOnly`, `Path=/`, `SameSite=Lax`, بدون Domain باشد.
- `__Host-` حتماً باید `Secure` باشد.
- logout clearing cookie با `Max-Age=0` مجاز است.
- cookie value در log یا client state ذخیره نمی‌شود.

## Session state

`probeCustomerSession`:

- cookie ندارد → `unauthenticated` و Backend call انجام نمی‌شود.
- session endpoint موفق → `authenticated`.
- cookie موجود + 401 → `expired`.
- 403 → `forbidden`.
- network/timeout/config/unexpected → `recovery`.

Frontend فقط این stateها را نمایندگی می‌کند. هیچ permission list یا authorization decision سمت client ساخته نشده است.

## Protected-route representation

Foundation پنج outcome دارد:

- `allowed`
- `login_required`
- `session_expired`
- `forbidden`
- `recovery`

Stage E عمداً redirect loop یا login route اختراع نمی‌کند، چون wireframe contract صفحهٔ مستقل login route تعریف نکرده است. Feature stageهای بعدی می‌توانند state مناسب را داخل route موجود نمایش دهند.

## Security decisions

- no localStorage/sessionStorage auth token
- no document.cookie access
- no customer Bearer/JWT invention
- no token parsing in browser
- no client-side permission invention
- no admin cookie forwarding through customer bridge
- no broad browser cookie forwarding
- no Set-Cookie exposure in generic API result
- no invented CSRF token/header because current contract چنین schemeای تعریف نکرده است
- Backend session validation remains authoritative and fail-closed

## Verification

`apps/storefront/scripts/verify-auth-boundary.ts` با HTTP server واقعی Verify می‌کند:

1. no-cookie short-circuit بدون Backend call
2. valid customer cookie session probe
3. stripping unrelated/admin cookies
4. expired 401 state
5. forbidden 403 state
6. recovery/network state
7. protected-route mapping
8. OTP verify Set-Cookie capture بدون leak به API metadata
9. logout clearing cookie capture
10. rejection of missing HttpOnly
11. rejection of SameSite=None
12. rejection of Domain attribute
13. `__Host-` requires Secure
14. absence of client token-storage authority

Storefront `verify` از این Stage به بعد `auth:verify` را اجرا می‌کند.

## Explicit non-scope

- login/OTP form UI
- actual account data loaders
- route redirects not present in contract
- admin auth/FIDO2 frontend
- customer permission derivation
- token refresh mechanism not present in API contract
- CSRF mechanism not present in API contract
- business operations
- backend/OpenAPI/database/migration changes
- Stage F state UI framework
- Step 59 implementation
- paid dependency/service

## Risk and gates

این Stage به دلیل تغییر Auth/Session boundary عمداً `HIGH` است.

Canonical closure requires:

1. frozen install PASS.
2. storefront typecheck/static-quality/build PASS.
3. shell/API/auth verification PASS.
4. root `pnpm verify` و Phase-A PASS.
5. exact scope PASS.
6. artifact-bound REVIEW PASS.
7. artifact-bound SECURITY PASS.
8. artifact-bound ACTIVE LOCK.
9. explicit Project Owner HUMAN PASS روی exact artifact.
10. exact-head `verify`, `phase-a`, `merge-policy` PASS.
11. protected Merge Policy workflow_dispatch merge.
12. exact-SHA postmerge `pnpm verify` و Phase-A PASS.
13. Stage F و Step 59 تا closure Stage E شروع نشوند.

## Gate verdict before transport

`IMPLEMENTATION READY / HIGH-RISK CANONICAL GATES PENDING`
