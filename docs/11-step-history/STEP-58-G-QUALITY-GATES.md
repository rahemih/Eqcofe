# Step 58-G — Testing / Accessibility / Responsive / Quality Gates

**وضعیت در زمان ایجاد PR: IMPLEMENTED / HIGH-RISK QUALITY GATES PENDING**

## هدف

Stage 58-G کیفیت Foundation ساخته‌شده در A تا F را به Gateهای قابل تکرار تبدیل می‌کند. این Stage Feature جدید نمی‌سازد؛ فقط implementation موجود را در سطح source، SSR و browser واقعی کنترل و سه نقص foundation را اصلاح می‌کند:

1. Quick access از `div aria-label` به `nav aria-label` تبدیل می‌شود.
2. Focus ring از فقط link/button به form controls، summary و `[tabindex]` نیز تعمیم پیدا می‌کند.
3. Breadcrumb/Footer linkها حداقل target صریح 44×44 می‌گیرند.

## Canonical base

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Stage 58-F merge: `735c69f6e2eac30f5fa1c1c4012e709e15972451`
- Stage 58-G canonical base after protected-main drift reconciliation: `00a1bd3498f4e044cabdbbabceb2dd57f2d5e3d2`
- Base includes protected PR #195 / Item 9 Stage B and protected PR #196 / Item 9 Stage C.
- Stage A..F: `CLOSED / CANONICAL PASS`
- Stage G: `IN_PROGRESS`
- Stage H: `NOT_STARTED`
- Step 59: `NOT_STARTED`
- Linear: `HOS-14`

## Drift reconciliation

- Original PR #197 reached HIGH-risk Human Gate readiness on base `e79d7397d54545a8c3620961df4cc0df666ff9d5`.
- Before the Project Owner approval could be registered, protected PR #196 canonically advanced `main` to `00a1bd3498f4e044cabdbbabceb2dd57f2d5e3d2`.
- The only overlapping path is `docs/14-multi-agent/generated/TASK-CATALOG.md`; no storefront runtime, browser-quality workflow or Stage-G verifier file overlaps.
- The approval for PR #197 head/hash is intentionally not reused because artifact-bound HUMAN evidence cannot transfer across a base/artifact change.
- Replacement branch/PR rebuilds Stage G from exact current `main` and preserves the Item 9 Stage C catalog row.
- REVIEW, SECURITY, HUMAN and LOCK evidence from PR #197 are stale for the replacement artifact and must be recreated.

## Gate architecture

Stage G دو Gate مکمل دارد.

### 1. Static + SSR gate

`apps/storefront/scripts/verify-quality-static.mjs` داخل storefront `verify` اجرا می‌شود و بنابراین در Canonical CI، root `pnpm verify` و postmerge verification حضور دارد.

این Gate موارد زیر را fail-closed می‌کند:

- viewport meta
- Persian RTL document
- semantic quick-access nav
- main programmatic focus target
- navigation disclosure ARIA
- async live-region baseline
- request-id bidi isolation
- positive tabindex
- autofocus
- non-semantic click handler
- dangerouslySetInnerHTML
- physical left/right CSS
- row-reverse
- CSS direction override
- focus outline removal
- overflow-hidden/nowrap/text-overflow/line-clamp hazards
- fixed pixel block-size
- Brown token naming
- canonical responsive breakpoints
- reduced-motion resets
- 44px touch token
- 3px focus token
- 1280px content max
- long technical text wrapping
- Step 54 accessibility/responsive trace
- all 32 SSR route examples
- one main and one H1
- unique IDs
- valid aria-controls targets
- interactive accessible names
- image alt contract

### 2. Real-browser gate

Workflow `.github/workflows/step58-storefront-quality.yml` روی PR و push به main اجرا می‌شود.

Runner:

- Ubuntu GitHub Actions
- Playwright `1.55.0`
- axe-core `4.10.3`
- Chromium headless
- tools به‌صورت pinned و no-save نصب می‌شوند؛ هیچ package/lockfile authority جدید ایجاد نمی‌شود
- همان نسخه‌ها قبلاً در Step 57 browser audit استفاده شده‌اند

Browser evidence:

- widths: 320 / 360 / 600 / 840 / 1200 / 1440
- no horizontal overflow
- body direction = RTL
- visible interactive target >= 44×44
- first keyboard focus = skip link
- skip-link keyboard activation → `#main-content` + programmatic focus
- focus ring >= 3px
- compact disclosure keyboard open/close
- WCAG-tagged axe violations = zero on six representative routes at 320 and 1440
- prescribed text-spacing stress
- long Persian copy stress
- reduced-motion runtime duration = zero
- 400% reflow proxy = 320 CSS px for a 1280px reference width

## WCAG statement

Step 54 هدف WCAG 2.2 AA را تعریف کرده است. Stage G **ادعای conformance کامل محصول نمی‌کند**؛ screen featureهای واقعی هنوز در Steps 59–66 ساخته نشده‌اند. Evidence این Stage فقط نشان می‌دهد Foundation فعلی و placeholder shell از automated/source/browser gates تعیین‌شده عبور می‌کند.

## Security / supply-chain boundary

Browser quality workflow:

- `permissions: contents: read`
- secret یا write token مصرف نمی‌کند
- روی PR code با privilege نوشتن اجرا نمی‌شود
- Playwright/axe version pinned هستند
- هیچ SaaS یا browser provider پولی استفاده نمی‌شود
- screenshot/upload خارجی ندارد
- browser فقط localhost storefront را audit می‌کند

## Explicit non-scope

- Feature UI implementation
- product/category/cart/checkout/account business behavior
- real forms owned by later Steps
- admin frontend
- backend/OpenAPI/database changes
- pricing/inventory/payment authority
- visual redesign
- Figma mutation
- Stage H canonical closure
- Step 59 implementation
- paid tools/services

## Risk and gates

به‌دلیل افزودن CI workflow، Stage G عمداً `HIGH` ثبت می‌شود.

Closure requires:

1. frozen install PASS.
2. storefront typecheck/static-quality/build PASS.
3. shell/API/auth/state/static-quality gates PASS.
4. dedicated browser-quality workflow PASS on exact head.
5. root `pnpm verify` PASS.
6. Phase-A PASS.
7. exact Task Contract scope PASS.
8. artifact-bound REVIEW PASS.
9. artifact-bound SECURITY PASS for workflow/supply-chain boundary.
10. explicit Project Owner HUMAN approval on exact artifact.
11. exact ACTIVE LOCK.
12. Merge Policy PASS.
13. protected workflow_dispatch merge.
14. exact-SHA postmerge `pnpm verify` + Phase-A PASS.
15. browser-quality workflow PASS on merged main.
16. Stage H and Step 59 remain NOT_STARTED until canonical closure.

## Gate verdict before transport

`IMPLEMENTATION READY / HIGH-RISK QUALITY GATES PENDING`


## Post-merge browser-quality trigger remediation

PR #198 merged canonically at `fc601866f21c3e5efc8067ddc00e8898f3c42848` and protected Merge Policy Run #195 completed with merge + exact-SHA postmerge `pnpm verify` + Phase-A PASS.

However, the dedicated `Step 58 Storefront Quality` workflow did not start from the merge push. This is an expected GitHub Actions anti-recursion behavior when the push is created by a workflow using `GITHUB_TOKEN`: a workflow-created push does not trigger another workflow chain.

Stage G therefore remains open. The closure rule is not weakened.

Remediation:
- add `workflow_dispatch` to `.github/workflows/step58-storefront-quality.yml`;
- canonically merge this remediation through the same HIGH-risk policy;
- explicitly dispatch Browser Quality against final `main`;
- require PASS on that exact final main SHA before declaring Stage G closed.

No storefront runtime, product feature, backend/OpenAPI/database, Stage H or Step59 implementation is added by this remediation.
