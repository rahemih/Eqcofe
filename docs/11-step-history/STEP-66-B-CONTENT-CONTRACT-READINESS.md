# EQCOFE — Step 66-B Article Contract Readiness

**Status:** IMPLEMENTED / PRE-HUMAN-GATE VERIFICATION PENDING

Base: `8fba48079fa767955408624539a8a2e8311d6935`  
Risk: **HIGH**  
Human Gate: **REQUIRED**

This stage repairs only the proven OpenAPI/generated typing gap for the already-existing published Article runtime.

- `GET /articles`: published-only list, default 20/max 100, typed SEO metadata.
- `GET /articles/{slug}`: published snapshot with nullable body and content version.
- `GET /articles/{slug}/related`: bounded published related list.
- SEO authority remains `ArticleSeoService`; no frontend SEO truth is invented.
- Sitemap output is reserved for Storefront generation from paginated Article `seo.canonical_url + published_at`.
- `robots.txt` is reserved as a Storefront-owned static resource.
- Archive/stop-sale collection semantics are deferred to Stage 66-G HIGH risk because canonical public collection authority does not yet exist.
- No Content/Catalog runtime, DB, dependency, Storefront or business-rule mutation.
- Step56/57 changes are hash/provenance-only consequences of changing canonical OpenAPI.

Final exact artifact must pass Canonical CI, Phase A, CodeQL/Security, deterministic Review and ACTIVE Lock before Project Owner Human approval.
