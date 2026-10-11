# EQCOFE — Step 66-D Article Detail, SEO, Sitemap & Robots

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `f52fa97d8718763c7432e0bd408103a3cc9b06f0`

## Goal

Productionize SF-F-02 `/articles/:slug`, consume backend-owned public SEO metadata, render safe structured data, and expose Storefront-owned `/sitemap.xml` and `/robots.txt`.

## Authority boundaries

- Article detail: `GET /articles/{slug}`.
- Related: `GET /articles/{slug}/related`, bounded.
- SEO title/description/canonical/robots: backend `seo` object from public Article response.
- Sitemap entries: `GET /content/sitemap/articles`.
- Storefront owns the web resource boundary for `sitemap.xml` and `robots.txt`.
- Article body is displayed as text content; no raw HTML execution is introduced.
- About/FAQ/Terms/Returns-Warranty → 66-E; Contact → 66-F; Archive/Stop-sale → 66-G.
