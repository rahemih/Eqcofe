# EQCOFE — Step 66-H Integrated Content / SEO / Policy Acceptance

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `51f976ccb125540ef08aed8d9a9727794884f3e7`  
Linear: `HOS-70`  
Risk: **MEDIUM**  
Human Gate: **NOT REQUIRED**

## Goal

Prove the Step-66 Storefront as an integrated production-build experience without creating new runtime authority.

The acceptance gate covers:

- Article list + detail/related;
- backend-owned SEO metadata and Article JSON-LD;
- sitemap.xml + robots.txt;
- approved About / FAQ / Terms / Returns-Warranty;
- fail-closed Contact/support;
- public Archive + Stop-Sale views.

## Acceptance model

An isolated authoritative API fixture supplies published Article, sitemap, archived-product and stopped-sale responses. The production Storefront is started against that fixture.

The gate verifies ready, empty, failure, invalid-cursor and partial-related-failure behavior, SEO and privacy boundaries, and GET-only public authority. When browser QA tools are present, Chromium runs all nine Step-66 HTML surfaces at 320px and 1200px with RTL, overflow, one-H1, keyboard/focus, minimum target and axe checks.

## Authority boundaries

- no runtime application mutation is planned;
- no Backend/OpenAPI/database/dependency change;
- no generated types are edited;
- no Product Design or Current-State document mutation;
- no raw Article HTML execution;
- no archive private/admin state exposure;
- no stop-sale inference from inventory;
- no Contact submission or external channel is invented.

Final canonical closure remains Stage 66-I.
