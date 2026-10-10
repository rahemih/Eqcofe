# EQCOFE — Step 66-A Canonical Handoff, Live Guard & Content/SEO/Policy Scope Freeze

## Verdict

Step 66 — Content, SEO & Policy Frontend is authorized to begin at Stage 66-A.

Stage 66-A is documentation/governance-only. Runtime, router, API/OpenAPI, database, dependency, SEO-business-rule and policy-content mutation remain forbidden until this stage itself completes canonical transport.

## Fresh live guard

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Live main SHA before Stage-A write: `e6a2c96fca940f3cd0c641d7d1b21af74df568c3`
- Step 65: **CLOSED / FINAL CANONICAL PASS**
- Step 65 terminal PR: **#339 merged**
- Step 65 terminal Lock: **RELEASED** in PR #339 comment `6097295499`
- Post-merge Canonical CI: `38050416806` — **SUCCESS**
- Post-merge Phase A: `38050416701` — **SUCCESS**
- Post-merge CodeQL: `38050416522` — **SUCCESS**
- Linear Step 65: `HOS-69 = Done`
- Linear Step 66: `HOS-70 = In Progress`
- Roadmap Step 66 at baseline: **NEXT / NOT_STARTED**
- Competing Step-66 PR before Stage-A write: **NONE OBSERVED**
- Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Product scope frozen for Step 66

### IN

Step 66 owns the production Storefront Content, SEO and Policy experience for:

1. Public published-article listing at `/articles`.
2. Public published-article detail and related-content discovery at `/articles/:slug`.
3. Article page metadata, canonical URL, indexability and later structured-data presentation only from authoritative backend/content facts.
4. Storefront sitemap/robots consumption or resource output only after a canonical public boundary is defined.
5. Approved static About and FAQ content without fabricated claims.
6. Approved Terms and Returns/Warranty policy presentation without inventing business rules or customer-specific eligibility.
7. Contact/support presentation using only approved channels; no successful Runtime submission may be claimed without an approved public mutation.
8. Archive/stop-sale Storefront views only after their public read semantics and routes are explicitly defined by canonical contract.
9. Persian RTL, responsive/reflow, accessibility, loading/empty/not-found/error/recovery and safe bidi behavior for all Step-66 surfaces.
10. Integrated production/browser/SEO acceptance and final canonical closure.

### OUT / RESERVED

- Article authoring, review, scheduling, publish/unpublish and content administration → later Admin scope, especially Step 72.
- Admin archive/unarchive and stop/resume mutations.
- Inventing a public archive or stopped-sale collection by filtering data the backend does not expose for that purpose.
- Inventing legal terms, return/warranty eligibility, shipping/payment rules or policy effective dates.
- Inventing partners, certifications, statistics, support channels, response hours or SLAs.
- A working Contact submission endpoint until a canonical public mutation exists.
- Draft, in-review, scheduled, unpublished or archived article exposure in the public Storefront.
- Browser-local content authority, canonical URLs or robots/indexability truth.
- Real email/SMS support-provider integration → Step 75.
- Admin content editorial UI → Step 72.
- Final cross-site SEO/accessibility audit → Step 83.
- Graph/Graphify; it remains retired.
- Wallet; Wallet remains prohibited.

## Current Storefront placeholders

Canonical router currently registers exactly seven Step-66 design surfaces and all seven remain `RoutePlaceholder targetStep={66}`:

| Screen | Route |
| --- | --- |
| SF-F-01 | `/articles` |
| SF-F-02 | `/articles/:slug` |
| SF-F-03 | `/about` |
| SF-F-04 | `/contact` |
| SF-F-05 | `/faq` |
| SF-F-06 | `/policies/terms` |
| SF-F-07 | `/policies/returns-warranty` |

No `archive` or `stop-sale` Storefront route is registered on the Stage-A baseline. Their Roadmap wording therefore does not authorize Stage A to invent a route shape.

## Public article runtime authority

Current runtime exposes three public Content reads:

- `GET /articles`
  - published public listing;
  - default limit 20, maximum 100;
  - opaque cursor derived from `published_at + id`.
- `GET /articles/:slug`
  - normalized lower-case ASCII slug;
  - invalid, absent or non-public article fails as not found.
- `GET /articles/:slug/related`
  - resolves the public source article first;
  - default limit 6, maximum 20.

The runtime summary exposes article identity/title/publication data plus backend-derived SEO metadata. Detail adds the body and content version. Public repository reads exclude unpublished lifecycle states.

### Article OpenAPI/generated-contract gap

The existing OpenAPI declares all three Article paths, but each 200 response currently has only a description and no typed JSON response schema.

This is a **contract-readiness gap**, not a missing runtime implementation.

Stage 66-B must reconcile runtime, OpenAPI and generated TypeScript before production Storefront Article code consumes these endpoints. Frontend-local untyped article response models are forbidden as a substitute.

## SEO, canonical and sitemap truth

`ArticleSeoService` is current backend authority for Article SEO metadata:

- title comes from approved SEO title or public article title;
- description comes from approved meta description or normalized body fallback;
- public canonical URL is derived from configured `content.public_base_url`, falling back to `https://eqcofe.com`;
- public article indexability is `index,follow`;
- non-published lifecycle content is `noindex,nofollow` and has no canonical URL.

`ArticleSitemapService` already builds bounded published-article `loc + lastmod` records and uses the same canonical URL authority.

However, Stage-A discovery found **no public HTTP controller/resource for sitemap.xml and no robots.txt resource boundary**. Step 66 must not pretend those resources already exist. Their smallest canonical boundary belongs in Stage 66-B before Storefront/resource implementation.

## Static content, policy and Contact truth

Step-55 F remains UX authority for About, Contact, FAQ, Terms and Returns/Warranty, but does not itself create production content or an API.

- About and FAQ: static approved-content intent only.
- Terms and Returns/Warranty: static approved-policy intent only; no new commerce/eligibility rule may be invented.
- Contact: design freezes validation/submitting/failure states, but **no approved public Contact mutation exists**.
- No canonical production copy source for the final static/legal/support text was established by Stage-A discovery.

Therefore later Step-66 implementation must explicitly bind approved content before displaying it as production truth. Missing approved policy/content must fail closed rather than be filled with generated claims.

## Archive and stop-sale truth

Current Catalog public reads expose **published** products. Public cards and Product Detail can expose effective `sales_enabled` / availability facts, but that is not a public archive or stopped-sale collection contract.

Current staff-only Catalog authority owns:

- product archive / unarchive;
- product, variant, brand and category stop-sales / resume-sales;
- governed sales-control operations.

Stage-A discovery found:

- no public endpoint that lists archived products;
- no public endpoint specifically listing stopped-sale products;
- no Storefront archive route;
- no Storefront stop-sale route.

Therefore Step 66 may not derive an archive page from hidden/admin state or define stop-sale semantics from a frontend filter. Stage 66-B must determine the smallest canonical public read boundary, or explicitly defer any view that cannot be supported safely.

## Step-55 design authority retained

The canonical Step-55 F contract remains authoritative for screen intent, state vocabulary and UX obligations, but never overrides current runtime/API truth.

Inherited obligations include:

- only public/published Article content;
- clear initial/empty/no-result/not-found/failed states;
- logical heading hierarchy and meaningful content navigation;
- visible policy version/effective-date structure once approved content exists;
- no fabricated legal/business/support claims;
- no customer-specific return/warranty eligibility promise;
- no OTP/token/secret/payment data collection in Contact;
- 320/360/600/840/1200/1440 responsive behavior and 400% reflow;
- minimum 44×44 targets, visible focus, semantic errors and non-color state cues;
- Persian RTL and stable bidi handling;
- no Brown palette.

## Frozen execution plan

| Stage | Goal | Risk | Human Gate |
| --- | --- | --- | --- |
| 66-A | Canonical handoff, live guard, discovery and Content/SEO/Policy scope freeze | MEDIUM | No |
| 66-B | Backend/OpenAPI/generated-contract readiness for Article responses, sitemap/robots boundary and archive/stop-sale public-read authority | HIGH | Yes |
| 66-C | Shared Content/SEO Storefront foundation and Article listing | MEDIUM | No |
| 66-D | Article detail/related content plus metadata, structured-data and sitemap/robots resource integration | MEDIUM | No |
| 66-E | Approved About/FAQ/Terms/Returns-Warranty content package and production surfaces | HIGH | Yes |
| 66-F | Contact/support presentation with approved channels and fail-closed no-mutation behavior | MEDIUM | No |
| 66-G | Archive/stop-sale Storefront views using only Stage-66-B-authorized public read semantics | HIGH | Yes |
| 66-H | RTL/accessibility/responsive/state hardening and integrated production/browser/SEO acceptance | MEDIUM | No |
| 66-I | Final canonical verification, docs reconciliation and Step 67 handoff | MEDIUM | No |

## Stage 66-A exit gate

66-A is not canonical merely because these documents exist. Before 66-B may mutate Backend/OpenAPI or public resource boundaries:

1. exact-head Canonical CI and Phase A PASS;
2. deterministic scope/risk validation PASS;
3. deterministic REVIEW PASS;
4. exact-artifact Lock ACTIVE;
5. protected merge succeeds;
6. exact-SHA postmerge Canonical CI and Phase A PASS;
7. terminal Lock RELEASED is recorded;
8. Linear HOS-70 reflects the live canonical state.

Until then:

```text
STEP_66_A = IN_PROGRESS / NOT_CANONICAL
STEP_66_B = BLOCKED_FROM_MUTATION
```
