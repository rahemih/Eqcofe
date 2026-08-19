# EQCOFE — Master Execution Roadmap

**Roadmap version:** 2.0 — Canonical post-Step-44 execution plan  
**Effective date:** 2026-08-19  
**Canonical repository:** `rahemih/Eqcofe`  
**Canonical branch:** `main`  
**Verified code baseline:** `b239dfe825b615f36caf2e26cc7abc80c70d349c`  
**Trusted-state document:** `docs/12-current-state/CURRENT-STATE.md`

---

## 1. Purpose

This document is the canonical execution roadmap for continuing EQCOFE from the verified Step-44 baseline through MVP launch and post-launch development.

It replaces the earlier coarse post-Step-44 roadmap with a professional, dependency-aware plan separated into Backend, UI/UX, Storefront Frontend, Admin Frontend, Integrations, Platform/Security/QA, Data/Content and Launch tracks.

Historical step attribution before Step 28 remains governed by `COMPLETENESS-MATRIX.md` and is not retroactively invented.

---

## 2. Roadmap rules

1. `main` is the source of truth.
2. Step 44 remains the frozen verified baseline. New work begins at Step 45.
3. A Step may be marked `COMPLETE` only when its implementation, tests, documentation and relevant CI gates pass.
4. A Step that changes an HTTP contract must update OpenAPI and generated types.
5. A Step that changes durable state must include migration/recovery considerations and concurrency/idempotency review where applicable.
6. Security-sensitive admin operations must preserve RBAC, Step-Up, idempotency and audit conventions.
7. Financial values remain integer **Toman**. Wallet functionality must not be reintroduced.
8. No live external provider may fabricate success when credentials or connectivity are unavailable.
9. New non-critical scope defaults to Post-Launch unless it is required for MVP safety, compliance, usability or revenue.
10. Each Step closes with a small, traceable Git commit/PR and an update to `CURRENT-STATE.md` or its linked evidence.

---

## 3. Status legend

- `COMPLETE` — implemented and verified.
- `NEXT` — next approved execution step.
- `PLANNED` — accepted roadmap scope, not started.
- `BLOCKED` — cannot proceed until a named dependency is resolved.
- `POST-LAUNCH` — intentionally excluded from MVP launch scope.
- `UNVERIFIED-HISTORY` — historical attribution not proven; do not infer completion from step number alone.

---

# PHASE 0 — Verified Baseline and Historical Recovery

## Steps 1–27 — Historical foundation
**Track:** Historical / Recovery  
**Status:** `UNVERIFIED-HISTORY`

Historical project decisions and implementation lineage exist indirectly, but exact step-by-step attribution is not reconstructed as fact. Preserve evidence; do not spend launch-critical time recreating historical labels unless needed for a concrete dependency.

## Step 28 — Contract lineage
**Track:** Backend / Contract  
**Status:** `PARTIAL-HISTORY`

OpenAPI lineage is retained; exact historical closure remains partial.

## Steps 29–44 — Verified backend evolution
**Track:** Backend / Platform  
**Status:** `COMPLETE`

Canonical source and audits cover the implemented backend foundation through:

- platform architecture and project policies;
- identity/admin security;
- catalog and variants;
- pricing;
- inventory;
- procurement;
- cart/checkout/orders;
- payments;
- fulfillment;
- returns/warranty/after-sales;
- finance;
- customer/addresses/wishlist/wholesale;
- central store configuration;
- comprehensive notifications.

### Step 44 closure gate — PASS
- canonical tracked files: 782
- OpenAPI: PASS
- architecture: PASS
- project policies: PASS
- TypeScript build: PASS
- tests: 127/127 PASS
- canonical CI: PASS

---

# PHASE 1 — Backend Feature Completion

Goal: complete all launch-relevant backend capabilities that are still placeholders or planned modules before frontend feature work depends on them.

## Step 45 — Content, Articles & SEO Backend
**Track:** Backend / Content / SEO  
**Status:** `NEXT`

### Scope
- Article/category/tag domain model.
- Draft/review/publish/archive workflow.
- Persian slug and canonical URL rules.
- SEO metadata: title, description, canonical, robots directives.
- Structured content blocks where needed.
- Product/content internal-link relationships.
- Sitemap data source and publish timestamps.
- Admin-safe create/update/publish APIs.
- Audit/outbox events for important publication changes.

### Definition of Done
- migrations complete;
- service/domain invariants tested;
- OpenAPI updated;
- publish permissions and Step-Up policy defined where appropriate;
- sitemap/SEO read models exposed;
- CI green.

## Step 46 — Marketing, Promotions & Customer Club Backend
**Track:** Backend / Marketing  
**Status:** `PLANNED`

### Scope
- campaigns and promotion lifecycle;
- first-purchase/festival promotion support;
- coupon/promotion eligibility without violating Pricing ownership;
- customer points/club ledger if retained for MVP;
- campaign scheduling and activation windows;
- no Wallet semantics;
- auditable admin operations.

### Gate
Promotion logic must compose with Pricing and Orders deterministically and be covered by conflict/stacking tests.

## Step 47 — External Integration Foundation
**Track:** Backend / Integrations  
**Status:** `PLANNED`

### Scope
- provider abstraction and configuration model for FX, SMS, email, shipping and payment-related auxiliary services;
- health/status model for providers;
- retries, timeouts, circuit/fail-closed behavior;
- secret ownership through environment/secret manager only;
- configurable automatic USD/FX source;
- preview of affected products before applying FX-linked price changes;
- integration audit logs and operator-visible error state.

### Gate
No external-provider failure may corrupt core transactional state or fabricate delivery/success.

## Step 48 — EQCOFE AI Backend Foundation
**Track:** Backend / AI  
**Status:** `PLANNED`

### MVP scope
- provider-agnostic AI port;
- prompt/config governance;
- product Q&A/read-only assistant foundation;
- draft article/product-content generation only;
- human approval before publication;
- rate/cost controls and observability;
- prompt-injection/data-boundary review.

### Not launch-blocking unless approved
Advanced personalization, autonomous marketing and recommendation optimization move to Post-Launch.

## Step 49 — Physical Store / POS Backend
**Track:** Backend / POS / Inventory  
**Status:** `PLANNED`

### Scope
- physical-sale transaction model;
- barcode/SKU lookup;
- physical-store stock consumption integrated with Inventory;
- physical/online reserve rules;
- offline-safe sync strategy definition;
- reconciliation and conflict handling;
- role and audit controls.

## Step 50 — Excel Product & Pricing Management Backend
**Track:** Backend / Operations  
**Status:** `PLANNED`

### Scope
- template export;
- product/variant import;
- validation and dry-run preview;
- pricing update preview/apply;
- row-level error report;
- idempotent re-import behavior;
- audit trail and rollback/recovery strategy;
- no silent overwrite of protected fields.

## Step 51 — Analytics & Management Read Models
**Track:** Backend / Analytics  
**Status:** `PLANNED`

### Scope
- sales/order/revenue/COGS/profit read models;
- inventory and low-stock metrics;
- wholesale/customer metrics;
- campaign/content metrics interfaces;
- admin dashboard query endpoints;
- export/report contracts;
- performance-conscious aggregation strategy.

## Step 52 — Backend Final Closure
**Track:** Backend / Architecture / QA  
**Status:** `PLANNED`

### Gate
No new launch feature begins in backend after this step except severity-1/2 fixes.

### Required checks
- all launch backend modules non-placeholder;
- complete migration chain verified on clean PostgreSQL;
- OpenAPI generation/validation green;
- architecture and policy checks green;
- unit/integration/regression suite green;
- idempotency/concurrency audit for critical mutations;
- error model consistency;
- security/RBAC/Step-Up matrix audit;
- operational configuration documented;
- backup/restore and migration rollback procedure documented.

---

# PHASE 2 — Product UX & Design System

Goal: define the user experience before large-scale frontend implementation to avoid coding screens without a coherent system.

## Step 53 — Information Architecture & User Journeys
**Track:** UX / Product Design  
**Status:** `PLANNED`

### Journeys
- browse/search/filter;
- product discovery and comparison;
- product detail with image/video/3D support;
- cart/checkout/payment;
- account/orders/invoices/addresses;
- returns/warranty;
- wholesale registration/approval/pricing;
- blog/content discovery;
- admin operational flows.

### Deliverables
Sitemap, navigation model, core user flows, error/empty/loading states and mobile-first priorities.

## Step 54 — Persian RTL Design System
**Track:** UI / Design System  
**Status:** `PLANNED`

### Deliverables
- typography tokens;
- spacing/grid;
- color system consistent with approved EQCOFE brand direction;
- buttons, inputs, selects, tables, cards, tabs, dialogs, drawers, toast/alerts;
- price/Toman formatting;
- RTL patterns;
- responsive breakpoints;
- accessibility states;
- iconography and media aspect-ratio rules.

## Step 55 — Storefront Wireframes
**Track:** UX / Storefront  
**Status:** `PLANNED`

Wireframe responsive layouts for Home, Category/PLP, Search, Product Detail, Compare, Cart, Checkout, Account, Orders, Wholesale, Blog, Article, FAQ/About/Contact/Terms/Returns/Warranty and Archive/Unavailable states.

## Step 56 — Admin UX Architecture
**Track:** UX / Admin  
**Status:** `PLANNED`

Define navigation, dashboards, dense tables, bulk operations, product editor, pricing preview, FX apply, stock, orders, after-sales, customers/wholesale, content, notifications, configuration, reports and audit logs.

## Step 57 — Visual Design & Prototype Approval
**Track:** UI / UX  
**Status:** `PLANNED`

High-fidelity responsive prototypes for critical revenue and admin flows. Frontend implementation begins only after design tokens and core interaction patterns are stable.

---

# PHASE 3 — Storefront Frontend

Goal: production-grade Persian RTL customer experience connected to canonical APIs.

## Step 58 — Frontend Application Foundation
**Track:** Frontend / Platform  
**Status:** `PLANNED`

- framework/project setup;
- routing/layouts;
- design-system implementation;
- API client generated/aligned from OpenAPI;
- auth/session handling;
- error boundaries;
- analytics hooks;
- environment/config boundaries;
- RTL/i18n foundation.

## Step 59 — Home & Global Navigation
**Track:** Frontend / Storefront  
**Status:** `PLANNED`

Home hero, categories, promotional surfaces, wholesale CTA, search entry, responsive header/footer and campaign slots.

## Step 60 — Catalog, Search & Filters
**Track:** Frontend / Storefront  
**Status:** `PLANNED`

Category/brand/search pages, pagination, filters, sorting, stock state, low-stock display, SEO-friendly URLs and robust empty/error/loading states.

## Step 61 — Product Detail & Rich Media
**Track:** Frontend / Storefront  
**Status:** `PLANNED`

Variants, pricing, stock, media gallery, video, optional 3D/360 viewer, product specifications, related content, shipping/availability information and structured data hooks.

## Step 62 — Compare & Wishlist
**Track:** Frontend / Storefront  
**Status:** `PLANNED`

Maximum four products, same-category compatibility, useful comparison attributes, wishlist state and authenticated/guest behavior rules.

## Step 63 — Cart & Checkout
**Track:** Frontend / Commerce  
**Status:** `PLANNED`

Cart, quantity validation, pricing summary, address, shipping, payment initiation, guest/customer flow, concurrency/expired-checkout handling and recoverable failure UX.

## Step 64 — Customer Account & After-Sales
**Track:** Frontend / Account  
**Status:** `PLANNED`

Profile, addresses, orders, invoices, order detail, returns, warranty, notification inbox and saved/wishlist surfaces.

## Step 65 — Wholesale Experience
**Track:** Frontend / B2B  
**Status:** `PLANNED`

Wholesale landing, application lifecycle, approval state, wholesale pricing visibility and quantity-discount presentation.

## Step 66 — Content & SEO Frontend
**Track:** Frontend / Content  
**Status:** `PLANNED`

Blog/articles, category/tag pages, article rendering, metadata, canonical URLs, structured data, breadcrumbs, sitemap/robots integration and internal linking.

---

# PHASE 4 — Admin Frontend

Goal: make the platform operational without direct database edits.

## Step 67 — Admin Shell, Auth & RBAC UX
**Track:** Frontend / Admin  
**Status:** `PLANNED`

Secure login/session, Step-Up UX, role-aware navigation, permission-denied states, audit-conscious mutation patterns.

## Step 68 — Catalog & Media Administration
**Track:** Frontend / Admin  
**Status:** `PLANNED`

Products, variants, SKU/barcode, category/brand, images/video/3D, archive/reactivation and global/category/brand stop-sale controls.

## Step 69 — Pricing, FX & Excel Administration
**Track:** Frontend / Admin  
**Status:** `PLANNED`

Retail/wholesale prices, quantity discounts, bulk %, brand/category %, FX source/rate, affected-product preview, confirmation/apply, price history, Excel dry-run/import/export and error reports.

## Step 70 — Inventory, Procurement & POS Administration
**Track:** Frontend / Admin  
**Status:** `PLANNED`

Stock/variants, low stock, warehouse/physical reserve, transfers, procurement, goods receipt, cost lineage, POS/reconciliation operational screens.

## Step 71 — Orders, Payments, Fulfillment & After-Sales Admin
**Track:** Frontend / Admin  
**Status:** `PLANNED`

Order timeline, payment status/reconciliation, fulfillment/shipment, return/warranty/refund/replacement workflows and operator actions.

## Step 72 — Customer, Wholesale, Marketing & Content Admin
**Track:** Frontend / Admin  
**Status:** `PLANNED`

Customer profile/read models, wholesale approvals, campaigns/customer-club operations, articles/SEO publishing and AI-draft review where enabled.

## Step 73 — Configuration, Notifications, Analytics & Audit Admin
**Track:** Frontend / Admin  
**Status:** `PLANNED`

Central configuration, feature flags, notification templates/delivery/dead-letter, provider health, analytics dashboards, reports, audit trail and system operations overview.

---

# PHASE 5 — Real Integrations & Operational Readiness

## Step 74 — Production Payment Gateway Readiness
**Track:** Integrations / Payments  
**Status:** `PLANNED`

Validate ZarinPal production configuration and callback/reconciliation behavior. Additional gateways are optional unless required for launch resilience.

## Step 75 — SMS & Email Providers
**Track:** Integrations / Notifications  
**Status:** `PLANNED`

Wire real providers, sender/domain verification, retry/dead-letter behavior, templates, opt-out/legal requirements where applicable and delivery observability.

## Step 76 — FX Source & Pricing Automation
**Track:** Integrations / Pricing  
**Status:** `PLANNED`

Configure real reference source, parser/adapter, freshness/error detection, operator preview, approval and safe apply workflow.

## Step 77 — Shipping / Courier Integration
**Track:** Integrations / Fulfillment  
**Status:** `PLANNED`

Shipping quote/estimator strategy, courier/tracking integration where available, manual fallback and store pickup.

## Step 78 — Media/Object Storage & CDN
**Track:** Platform / Media  
**Status:** `PLANNED`

Production storage, signed uploads, media validation, image derivatives/optimization, video/3D strategy, CDN/cache rules and backup/lifecycle policies.

---

# PHASE 6 — Security, Quality, Performance & Production Engineering

## Step 79 — Security Hardening Audit
**Track:** Security  
**Status:** `PLANNED`

- auth/session/cookie review;
- admin 2FA/WebAuthn/Step-Up review;
- RBAC matrix;
- CSP/security headers;
- CSRF/origin protections;
- SQL injection/query-boundary review;
- rate limiting/brute-force controls;
- secret/config scan;
- upload/media security;
- dependency vulnerability review;
- audit-log integrity.

## Step 80 — Database & Migration Production Gate
**Track:** Database / Reliability  
**Status:** `PLANNED`

Clean migration from zero, upgrade path, indexes/query plans, transaction/concurrency tests, backup/restore rehearsal, PITR strategy if supported, retention and disaster-recovery runbook.

## Step 81 — End-to-End Commerce QA
**Track:** QA  
**Status:** `PLANNED`

Realistic flows for retail, wholesale, guest/customer, price changes, inventory reservation, payment success/failure/reconciliation, fulfillment, cancellation, returns/refunds/warranty and notifications.

## Step 82 — Frontend Accessibility & Browser QA
**Track:** QA / Accessibility  
**Status:** `PLANNED`

Keyboard navigation, focus, contrast, labels, RTL rendering, screen-size matrix, modern browser coverage and mobile-device verification.

## Step 83 — Performance & Core Web Vitals
**Track:** Performance  
**Status:** `PLANNED`

Bundle/image optimization, cache strategy, lazy loading, API latency review, DB slow queries, CDN, target Web Vitals and load tests for launch-critical endpoints.

## Step 84 — SEO Technical Closure
**Track:** SEO / QA  
**Status:** `PLANNED`

Indexability, canonical URLs, sitemap, robots, metadata, schema.org/structured data, pagination/filter crawling strategy, redirects, 404/410/archive behavior and content quality checks.

## Step 85 — Observability & Operations
**Track:** DevOps / Operations  
**Status:** `PLANNED`

Structured logs, error tracking, metrics, health checks, alerting, job/queue visibility, provider health, audit access and incident runbooks.

## Step 86 — Production Infrastructure & CI/CD
**Track:** DevOps  
**Status:** `PLANNED`

Production environments, secrets, database/Redis, build/deploy pipeline, migration release procedure, rollback, domain/DNS/SSL, backups, branch protections and release tagging.

---

# PHASE 7 — Real Data, Content & Release Candidate

## Step 87 — Product Data Model Validation with Real Samples
**Track:** Data / Catalog  
**Status:** `PLANNED`

Validate real attributes, variants, units, brands/categories, pricing, tax/shipping needs and media requirements before bulk import.

## Step 88 — Initial Catalog Import (~200 Products)
**Track:** Data / Operations  
**Status:** `PLANNED`

Import validated products/variants/prices/stock using controlled Excel/admin pipeline with dry-run and reconciliation.

## Step 89 — Product Photography & Media Completion
**Track:** Content / Media  
**Status:** `PLANNED`

Real product photography, optimized images, alt text, video/3D assets where justified, naming/metadata and quality review.

## Step 90 — Commercial Content & Policy Pages
**Track:** Content / Legal / UX  
**Status:** `PLANNED`

About, Contact, FAQ, Terms, Privacy where applicable, shipping, returns, warranty, wholesale information, launch campaign copy and initial editorial content.

## Step 91 — Full Store Acceptance QA
**Track:** QA / UAT  
**Status:** `PLANNED`

Cross-functional acceptance using real catalog and configured services; no seeded/demo assumptions allowed to pass as production readiness.

## Step 92 — Release Candidate & Launch Freeze
**Track:** Release Engineering  
**Status:** `PLANNED`

Create RC tag, freeze features, triage only release blockers, final security/performance regression, backup verification and rollback rehearsal.

---

# PHASE 8 — Launch

## Step 93 — Soft Launch
**Track:** Launch / Operations  
**Status:** `PLANNED`

Limited audience/order volume, real payment/shipping/notification monitoring, support workflow, inventory reconciliation and rapid blocker fixes.

### Exit criteria
- no unresolved severity-1 issue;
- payment and order accounting reconcile;
- inventory remains consistent;
- backups confirmed;
- operational alerts usable;
- customer support process functioning.

## Step 94 — Public MVP Launch
**Track:** Launch  
**Status:** `PLANNED`

Open public traffic, enable approved campaign/SEO surfaces, monitor conversion/performance/errors/orders and maintain launch war-room checklist.

---

# PHASE 9 — Post-Launch Growth

## Step 95+ — Growth backlog
**Track:** Post-Launch  
**Status:** `POST-LAUNCH`

Candidate streams, prioritized by measured business value:

- Digikala/Basalam/Divar/Torob/Emalls or other marketplace integrations;
- advanced AI product assistant;
- personalization/recommendations;
- advanced customer club/loyalty;
- behavioral analytics;
- marketing automation;
- advanced SEO/content automation;
- additional payment/shipping providers;
- operational optimization and cost reduction;
- experimentation/A-B testing;
- mobile/PWA enhancements beyond launch baseline.

---

# 4. Track Summary

| Track | Steps | Launch role |
|---|---:|---|
| Verified Backend Baseline | 29–44 | COMPLETE |
| Backend Completion | 45–52 | Required before backend freeze |
| UI/UX & Design System | 53–57 | Required before broad frontend implementation |
| Storefront Frontend | 58–66 | MVP critical |
| Admin Frontend | 67–73 | Operations critical |
| Real Integrations | 74–78 | Launch-critical subset |
| Security / QA / Performance / DevOps | 79–86 | Launch gate |
| Real Data / Content / RC | 87–92 | Launch gate |
| Launch | 93–94 | Soft launch → Public MVP |
| Growth | 95+ | Post-launch |

---

# 5. Milestones

## Milestone M1 — Backend Feature Complete
Ends at **Step 52**.

## Milestone M2 — UX/UI Approved
Ends at **Step 57**.

## Milestone M3 — Customer Storefront Feature Complete
Ends at **Step 66**.

## Milestone M4 — Admin Operations Feature Complete
Ends at **Step 73**.

## Milestone M5 — External Services Operational
Ends at **Step 78**.

## Milestone M6 — Production Ready
Ends at **Step 86**.

## Milestone M7 — Release Candidate
Ends at **Step 92**.

## Milestone M8 — Soft Launch Complete
Ends at **Step 93**.

## Milestone M9 — Public MVP Launch
Ends at **Step 94**.

---

# 6. Mandatory Definition of Done for every Step

A Step is not `COMPLETE` merely because code exists.

Minimum closure requirements, where applicable:

1. Scope and acceptance criteria are explicit.
2. Implementation is committed to the canonical repository.
3. Tests are added/updated and pass.
4. `pnpm verify` passes for code changes.
5. OpenAPI/generated types are synchronized for HTTP changes.
6. Database migration and rollback/recovery implications are reviewed for schema changes.
7. Security/RBAC/idempotency/audit implications are reviewed for sensitive mutations.
8. UX states include loading, empty, error, disabled and permission-denied where relevant.
9. Documentation and `CURRENT-STATE.md` are updated.
10. No new unresolved launch blocker is introduced.

---

# 7. Critical-path execution order

The default sequence from the current state is:

`45 → 46 → 47 → 48 → 49 → 50 → 51 → 52 → 53 → 54 → 55 → 56 → 57 → 58 → ... → 94`

Parallel execution is allowed only when dependencies are clear. Recommended safe parallelism after Backend APIs stabilize:

- UI/UX Steps 53–57 can overlap late backend work without changing backend ownership.
- Storefront and Admin implementation may run in parallel after design system + relevant API contracts stabilize.
- Data/media preparation can begin before Step 87 operationally, but production import occurs only after the Excel/admin pipeline and schema are frozen.
- Security, accessibility and performance reviews should run continuously, with final closure in Steps 79–86.

---

# 8. Immediate next action

**Start Step 45 — Content, Articles & SEO Backend.**

Before implementation, create the Step-45 sub-plan and acceptance criteria against the current canonical source, then proceed in small reviewed substeps. No Step-46 implementation starts until Step 45 closure evidence is recorded, unless an explicitly approved parallel track has no shared dependency.
