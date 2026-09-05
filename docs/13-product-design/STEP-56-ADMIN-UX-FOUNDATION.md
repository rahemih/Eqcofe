# Step 56-A — Admin UX Foundation and Scope Candidate

**Verdict: FOUNDATION CANDIDATE / FINAL GATE BLOCKED.**

This is the complete recovered scope proposal for 56-A, not an approved final freeze. Exact permissions and executable capability cannot be certified for the unresolved source gaps below. No page wireframe is created. Step 56-B and every later gate remain **NOT_STARTED**. A green structural validator or Canonical CI must not be read as permission to merge this candidate.

## Canonical handoff

Official repository: `rahemih/Eqcofe`; branch: `main`; starting SHA: `8e7eb050785fb7d284e33398045372162998e33d`.

At that exact baseline, MASTER-ROADMAP version 3.40 and CURRENT-STATE record Step 55 **CLOSED / FINAL GATE PASS**, active step **NONE**, and Step 56 **NEXT**. Step 55's machine contract and final audit independently record closure. The original conversation is supporting context only.

Some older Step 55 prose still says final transport checks remain. Current GitHub resolves that stale wording: PR #151 is merged; final head `842703ba37546ad553bfa0bb876ba04c7694434f` passed Canonical CI `33949227612`; merge `b5891d4e901814fbb3d1ea1cb17f0073232644e1` passed post-merge CI `33949283677`. The later Phase A closure at the starting SHA preserves this execution position. Historical Step 55 evidence is not rewritten in this candidate.

The machine contract's `sources` array pins normalized UTF-8/LF SHA-256 for the recovered Roadmap, Current State, handoff, product vision, business rules, Step 53 IA/journeys/state/admin docs and contract, Step 54 contract/component/accessibility/responsive/typography docs and generated library, Step 55 contracts and closure history, HTTP contracts, controller/module inventory and security conventions. `sources` is a baseline evidence inventory, not a claim that historical implementation attribution has been recovered.

## Scope and counts

| Inventory | Count | Meaning |
|---|---:|---|
| Admin experience actors | 3 | staff, approver, operator; not new backend role types |
| Inherited admin journeys | 12 | AJ-01 through AJ-12 unchanged from Step 53 |
| Task and surface obligations | 97 each | 93 domain/auth workspaces plus 4 shared surface obligations |
| Screen–journey links | 111 | Each task has an explicit inherited journey |
| Backend modules | 28 | Including integration-only after-sales ownership |
| Assembled admin OpenAPI operations | 507 | 601 total operations, including 94 non-admin operations |
| Source admin controller routes | 376 | 351 match assembled OpenAPI; 25 do not |
| Union of admin operations | 532 | Every operation assigned one owning surface |
| Explicit permission keys | 118 | Recovered from controller metadata or explicit OpenAPI extension |
| Unresolved permission operations | 151 | No guessed permission or role assignment |

A surface obligation means the task's entry, read/detail context, supported actions, review and result/recovery facets. It is not a one-endpoint screen or a promise of exactly 97 URL pages. Later B–G may split a workspace into linked frames while retaining its stable obligation ID and every assigned operation. They cannot discard a facet, operation or state to reduce the count. The generated inventory and JSON traceability make all assignments reviewable.

Included domains cover authentication and permission discovery; catalog, variants, attributes, brands, categories, media and sales control; prices/FX, inventory, warehouses, reservations, procurement and Excel; orders, payment/refund, fulfillment/shipping, POS, returns and warranty; customers, wholesale, loyalty, reviews, content, campaigns/coupons/promotions, notifications and AI; finance/profit/tax, reports/analytics/exports, configuration/flags/providers, staff/RBAC/approval, security, operations, data quality/reconciliation/retention. AI remains a governed draft/research aid, never an authority for product or financial facts. Accounting accounts are not a customer Wallet.

Excluded: runtime/frontend/backend implementation, real routes, migrations, HTTP contract changes, dependencies, business rules, permission changes, actual uploads/provider actions, invented brand assets, paid services, high-fidelity/prototype work and any 56-B execution.

## Actors, roles and permission boundaries

The three Step 53 personas describe work. Approver and operator remain staff; their names do not grant permissions. Actual roles are active server-managed records joined to explicit permissions with assignment expiry. No role seed or role-to-permission matrix is invented. Guest/customer/service/system actors do not gain interactive admin access. Login and FIDO challenges are specific pre-session entry points, not an unauthenticated admin shell.

Every operation row carries source, controller/handler/line where present, permission keys, permission source migrations, Step-Up decorator evidence and contract audit hints. Surface permission arrays are a union for discoverability, never an all-or-any access check. PermissionsGuard requires every permission specified on an operation. Session and StaffOnly boundaries remain separate. Backend owner services and ScopePolicy remain authoritative for entity/store/warehouse scope. In particular, the current ScopePolicy treats no entries for a scope type as unrestricted for staff; design must not silently replace this with a new deny/grant model.

Missing permission evidence is **UNRESOLVED_NOT_GRANTED**. Unknown capabilities stay unavailable. Hiding navigation does not prove authorization; deep links, cached content and action availability must recheck session, permission and scope. Denied states must not leak object existence, row counts, personal data or secret metadata. Role changes, staff disable and session revocation require clear session-expiry/re-entry behavior.

## State and dangerous-action contract

Global families explicitly cover loading, empty, error, success, disabled/read-only, permission/session/scope denial, recovery, conflict/stale data and dangerous actions. Each surface inherits all global state obligations plus its journey lifecycle states. Later design must show applicability evidence for each; a generic happy-path frame is insufficient.

An action follows: resolve session/permission/scope → read current bounded context → inspect allowed actions → review impact/preview → source-required approval/Step-Up → submit → authoritative outcome or status check. A timeout is not success or permission to replay a financial mutation. Stale version/hash or changed impact returns to refreshed context and renewed review. Terminal decisions/history remain immutable. Safe retry uses the existing idempotency scope and retry rules; partial success is shown only when the owner actually supports it.

Destructive confirmation names the actual action, entity, affected scope, consequence, reversibility and reason if required by source. Initial focus is safe cancel. Persian labels should say «توقف فروش»، «برگشت سند» or «ابطال نشست», not a vague «مطمئنید؟». Step-Up is authentication bound to account/session, not a substitute for permission, approval or confirmation. No blanket Step-Up rule is asserted from HTTP verb: decorator absence means owner policy still requires review. Contract audit hints are not proof of emitted audit records; later actionable flow acceptance must cite the owner service and tests for audit/approval/conditional guards.

## Inherited layout, Persian and accessibility

Step 54 remains the token/component authority: Persian-first RTL, Vazirmatn, light theme, Teal/Blue/Neutral with semantic status colors and no Brown. Integer Toman is stored and displayed without monetary decimals; display uses grouped Persian digits and «تومان». Exact SKU/hash/URL/identifier copy uses isolated Latin runs. No Wallet is introduced, including through loyalty or account terminology.

Grid remains 4/8/12 columns; margins 16/24/32px; gutters 16/24/24px; content maximum 1280px. Verification widths are 320, 360, 600, 840, 1200 and 1440px, plus 400% zoom and long Persian/text-spacing review. B will design geometry; A only reserves inline-start navigation, header, breadcrumb, main content and feedback obligations. Compact navigation becomes disclosure. Tables retain equivalent card/list or bounded scroll with row context, selection and keyboard action alternatives. Compact density cannot shrink the 44×44px interaction target.

RTL source and focus order follow meaning. Directional navigation follows reading direction; playback/download/brand marks do not blindly mirror. Error summary links to fields; visible labels, help and errors have programmatic associations. Async status uses appropriate live announcements without unnecessary focus theft. Dialog/drawer has labelled title/description, focus containment, explicit Escape policy and return to a valid trigger. Sticky UI cannot fully obscure focus. Keyboard reaches every action; dragging has a single-pointer alternative. Reduced motion preserves all information. Authentication must support a non-cognitive alternative.

Step 54's WCAG 2.2 AA target is not a conformance claim. The 44px target and 3px focus ring are project requirements. The installed UI/UX Pro Max focus guidance was cross-checked: AA focus-not-obscured minimum and enhanced AAA criteria must not be conflated. No new palette, logo or font decision was taken from a plugin.

## Repository organization and optional Figma

Canonical input: `step56-admin-ux-contract.json`; stable IDs: `AD-{B..G}-{NN}` and linked `AT-{B..G}-{NN}` tasks. Supporting docs use `STEP-56-*.md`. A outputs live in `step56-foundation/A/`, generated by `scripts/generate-step56-admin-foundation.mjs`; generated artifacts are not manually edited. Manifest hashes bind input and outputs. There are zero SVG/PNG/HTML page frames.

Future B–G should follow the Step 55 pattern: gate contract, repository-native low-fidelity frames, README, traceability/acceptance companions and a deterministic manifest. This names later obligations only; those directories and frames are not created now. Figma is an optional, non-blocking mirror of repository-approved artifacts; the incomplete free-tier Step 54 mirror is not claimed complete. No paid capacity is required.

## Blocking source discrepancies

GAP-01: 156 assembled admin operations have no matching source controller. Examples include `/admin/dashboard`, admin order actions, AI jobs and operational recovery. OperationsModule and SecurityModule are empty module declarations at this baseline; security session/FIDO routes elsewhere are separately traced. A contract path is not proof of a usable capability.

GAP-02: 151 of those operations also lack an explicit permission key. Their complete permission boundary cannot be truthfully frozen. Naming a plausible permission would change the meaning of this task.

GAP-03: 25 implemented admin routes are outside the canonical OpenAPI assembly. Some POS routes have `contracts/http/step49-pos-a9.yaml`, which the canonical OpenAPI validator does not assemble. Runtime-only marketing/loyalty routes are also preserved explicitly. Supplemental evidence does not silently become canonical assembled API.

The source gap register lists every affected operation and surface. These are blocked scope findings, not authorized remediations or automatic deferrals. 56-A cannot be FINAL GATE PASS or merged until separate authorized canonical reconciliation or explicit approved scope deferral resolves them. B remains not started. Existing Roadmap/Current State closure claims are not rewritten as new backend verification.
