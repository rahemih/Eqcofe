# Step 70-I — Integrated Inventory / Procurement / POS Administration acceptance

Task: `EQCOFE-STEP70-I-INTEGRATED-ACCEPTANCE-001` (MEDIUM), QUALITY_ENGINEERING.
Canonical base after Step70-H2B: `2a7a0151af2bc4f1aa29c61f8c2511a36f761ca0`.
Dependency: PR #437 protected merge and exact-merge postmerge run #46143278986 succeeded; terminal LOCK:RELEASED #7239160315.

## Source authority and scope
Stage70-I adds **only** integrated acceptance, no new business route or Backend contract. The 13 Inventory/Procurement surfaces AD-D-06..18 and source-backed POS AD-E-10/11 cover 16 implemented SSR paths (AD-E-11 includes separate offline and reconciliation routes). Design-only AD-E-09 store/register/shift APIs remain NO_ACTION; none is fabricated.

The production-build acceptance script tests all 16 production routes through the existing server-only Admin API bridge and isolated mock backend with authoritative permission/session GETs. It proves unauthenticated redirect, permission denial for POS, invalid reconciliation inputs, cross-origin POST rejection, Persian fa-IR/RTL, a single H1 and no backend mutations. Mock replies deliberately never authorize modifying stock, sale, invoice, payment, offline commands or reconciliation.

With existing `EQCOFE_BROWSER_QA_ROOT`, the same test additionally uses pinned free Playwright Chromium and Axe from Step58 to check 320/360/600/840/1200/1440 px, horizontal reflow, 44px targets, WCAG-tagged violations and browser storage secrets. SSR/mock verification always runs in Admin Canonical CI; the optional browser suite runs in Step58 via the existing Storefront quality chain, activated by editing only `apps/storefront/package.json` with no new dependencies or workflow mutation.

## Fail-closed exclusions
- No production backend auth/authorization assumptions from mock responses; hardware-backed WebAuthn not represented as tested.
- No destructive Apply, stock movement, supplier settlement, POS order, recovery, retry/abandon, Step-Up verification, or simulated successful financial transaction.
- No `.github`, top-level dependencies, Backend, OpenAPI, database, generated contract, Product Design or Current State mutation.
- Not a Step70-J final closure and **no Step71**.

## Exit gate — not preattested
- Local static and production SSR QA PASS; Stage58 Chromium/Axe QA must be SUCCESS on exact HEAD.
- Exact-head Canonical CI, Phase A/PostgreSQL, Step57, CodeQL and three provider analyzers PASS.
- Deterministic Merge Policy REVIEW:PASS and actual Scope Lock ACTIVE with exact Task/HEAD/Artifact.
- Risk floor MEDIUM; if classifier escalates, apply required separate owner security/risk/Human gates. No invented approvals.
- Official protected GitHub workflow_dispatch only, exact merge SHA and postmerge verification SUCCESS, three provider CodeQL checks on merge SHA, terminal LOCK:RELEASED, then and only then Stage70-J handoff.

State: **IMPLEMENTATION CANDIDATE / NOT_CANONICAL**. Step70 remains OPEN.

## 2026-11-28 — test-first real mobile accessibility finding and bounded remedy

The first Stage-I source-backed browser-quality run [#46145909238](https://github.com/rahemih/Eqcofe/actions/runs/46145909238), job #140981816062, failed at `STEP70_I_TARGET_44:320:/inventory/overview`. All three `pricing-actions` navigation anchors measured exactly 288×19 CSS pixels. This is an actual accessibility problem; it is **not** waived by changing the test or reducing the 44px threshold.

Before any Scope Lock was posted, the Task Contract write allowlist was amended to add only `apps/admin/app/styles/pricing.css` for CSS presentation hardening. The new selector `.pricing-actions > a` has 44px minimum height and keyboard focus-visible ring. No route, permission, business logic, Backend, data model, API or dependency is changed; the existing strict browser test remains intact. No other Admin app file is granted write authority.

The earlier CSRF test now explicitly accepts either 400 (framework pre-action rejection) or 403 (route rejection) only for untrusted Origin, while asserting zero Backend mutations. All 16 SSR routes and eight negative tests passed in Canonical CI at prior HEAD `31977c3fc484f57888a76754097fdb47a37486a6`; Phase A and CodeQL also passed there. **Those old-HEAD passes are historical and MUST NOT be reused for this CSS-amended HEAD.** Full Stage58 browser/Axe suite must pass on final new HEAD before any Lock/Review/Merge; Step57 remains independently required.

State remains DRAFT / NOT_CANONICAL. Step70-J and Step71 forbidden.

## 2026-11-28 — second real responsive finding and bounded reflow correction

Step58 [run #46146310838](https://github.com/rahemih/Eqcofe/actions/runs/46146310838), job #140983032582, proved the previous 44px touch target fix by proceeding to `/inventory-flows/reservations`; at 320px this route has 332px `documentElement.scrollWidth` and body width (12px horizontal overflow). The source-backed `ReadProof` includes the long `/admin/inventory/reservations` endpoint and the reservation form contains intrinsic string/input widths; do not claim a single unproven node as root cause. Instead CSS now constrains intrinsic grid/form widths (`minmax(0,1fr)`, `min-inline-size:0`) and makes source endpoint identifiers wrap with `overflow-wrap:anywhere`, **never** masks overflow with `overflow-x:hidden`. The strict assertion is unchanged; only useful element geometry diagnostics were added if the next run fails. This change remains in the existing single CSS file and already-approved exact seven-path Task Contract scope, with no Backend/API/mutation change. Current HEAD must be retested; prior green Canonical/PhaseA and failed browser checks are not transferable.

## 2026-11-28 — inherited Step69-H checkbox regression prevented

The previous experimental CSS rule had overridden the dedicated 44px FX checkbox target in the inherited Step69-H browser gate: [run #46146831383](https://github.com/rahemih/Eqcofe/actions/runs/46146831383) failed `STEP69_H_TARGET_44:320:/pricing/fx` with two 13×44px inputs. The source regression was caused by overly broad Stage70-I `.pricing-form input { min-inline-size:0 }`, so the selector is narrowed to `input:not([type="checkbox"]):not([type="radio"])`. This preserves existing accessible checkbox and radio sizes without disabling tests or masking horizontal overflow. The next exact-head runs must independently confirm both inherited Stage69-H and new 70-I pass.

## 2026-11-28 — third real touch target finding (supplier receipt page)

Step58 browser-quality is intentionally not relied upon for this note; authoritative job #140985647424 on exact preceding HEAD `904c326cffdccb665c810420c8fde3b29490ae1d` failed strict `STEP70_I_TARGET_44:320:/procurement-settlement/receipts`. Actual computed heights were input 24px, select 21px, textarea 42px and multiple submit controls 25px. These are actual touch accessibility defects in preexisting source, not a reason to lower the validator. CSS now provides at least the existing Step54 touch token `--eq-size-touch-min` to `.pricing-page` visible inputs/selects/textareas/buttons; hidden fields excluded. The existing historical FX checkbox 44px width remains intact because we did not touch min-inline-size on checkboxes. The known inline navigation link on POS offline page is likewise given a 44px height and keyboard focus ring, limited to direct paragraph links. The strict browser QA still runs on all 16 paths and widths without assertions changing. Independent new-head verification required, no merge/Lock PASS claimed.
