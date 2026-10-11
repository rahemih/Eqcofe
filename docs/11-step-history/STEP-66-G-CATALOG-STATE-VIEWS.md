# EQCOFE — Step 66-G Public Archive & Stop-Sale Storefront Views

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `5250b513c4ef028b1b2b6ba2e010602b51e66123`.

## Route boundary

Stage 66-G explicitly defines the smallest public Storefront route shapes:
- `/archive`
- `/stop-sale`

These routes are frontend presentation boundaries only. Their data semantics remain entirely owned by the Step-66-B public Catalog contracts.

## Privacy / authority

Archive is historical identity only: no price, inventory, availability, archive reason, variants or management state.

Stop-sale is sourced only from `GET /catalog/stop-sale`. Out-of-stock alone is never converted into stop-sale by the browser, and no internal stop reason/scope is shown.

Both pages are `noindex,follow` and intentionally excluded from sitemap.

## Gate

Risk is HIGH. No merge is authorized until exact-artifact Review, Security, ACTIVE Lock and Project Owner Human Gate all pass.
