# EQCOFE — Step 66-B Content / SEO / Sitemap / Public Catalog-State Contract Readiness

## Scope
Stage 66-B closes only the contract/readiness gaps proven by 66-A. Storefront pages, legal copy, Contact submission and editorial administration remain out of scope.

## Article
The existing published-only public runtime at GET /articles, GET /articles/{slug} and GET /articles/{slug}/related now has explicit OpenAPI/generated response types for identity, title, publication timestamp, nullable SEO fields, backend-owned SEO metadata, detail body/content version and related items. Cursor input is bounded before decode.

## Sitemap and robots
GET /content/sitemap/articles exposes the existing ArticleSitemapService loc/lastmod authority with bounded cursor/limit. No backend robots endpoint is added. robots.txt remains a Storefront-owned resource for Stage 66-D.

## Archive
GET /catalog/archive exposes only records with status=archived, published_at IS NOT NULL and archived_at IS NOT NULL. It returns a minimal historical card and excludes archive_reason, price, availability, inventory, variants and admin state. Never-published archived records remain private.

## Stop-sale
GET /catalog/stop-sale exposes only currently published products where the existing effective sales authority is false. Inventory-only out-of-stock does not qualify as stop-sale. No internal stop scope/reason is returned.

## Boundary
No database migration, dependency, Pricing, Cart/Checkout, Customer, Order, Storefront, Contact mutation, policy/legal rule, admin command or Current-State mutation is introduced.

## Gate
66-B is HIGH risk. Autonomous work may proceed through verification, Security, Review and exact-artifact Lock. Protected merge requires Project Owner approval bound to the final exact Head + Artifact. 66-C remains blocked until terminal post-merge verification and Lock release.
