# EQCOFE — Step 65-E Approved Wholesale Product / Cart Commerce Context

## Status

`STEP_65_D = CANONICAL_COMPLETE`

`STEP_65_E = IN_PROGRESS / HIGH_RISK`

Canonical baseline: `66b7e5cce0b854a76f243d4b9ad7fca5ccfb98dd`

Task: `EQCOFE-STEP65-E-WHOLESALE-PRODUCT-CART-001`

Linear: `HOS-69`

Graph/Graphify: **RETIRED / OUT OF SCOPE**

## Purpose

Stage 65-E productionizes SF-E-10 inside the existing Product and Cart experience for an already-authoritative Wholesale customer.

SF-E-10 is **not** a new route and is **not** a separate B2B Cart.

The stage must make approved-wholesale quantity/pricing state visible without duplicating Pricing, Customer, Inventory, Cart or Checkout authority.

## Discovery and authority decision

Fresh audit found two important facts:

1. Public Catalog Product/Variant pricing calls Pricing with its current default context (`quantity=1`, `customerType=retail`). Therefore a Product price may be shown as the catalog price but **must not be relabeled as wholesale**.
2. Checkout Quote already resolves the cart owner's authoritative customer type and current quantity through `CustomerCommercePort + PricingQuotePort`, but the pre-checkout `CartView` contract historically exposed only identity + quantity.

To satisfy SF-E-10 without inventing pricing, Stage 65-E closes that Cart presentation gap using the same existing authorities.

## Cart presentation contract

`CartView` is enriched with:

- authoritative `customer_type: retail | wholesale` resolved from the cart owner;
- a nullable current pricing summary:
  - `subtotal_toman`
  - `discount_toman`
  - `total_toman`
- `requires_revalidation`;
- per-line:
  - authoritative quantity;
  - nullable `unit_base_toman`, `unit_final_toman`, line discount and line total;
  - authoritative current availability.

No pricing rule, threshold or percentage becomes Cart-owned.

### Fail-closed pricing

If a line cannot produce a current valid price:

- Cart remains readable;
- that line's pricing is `null`;
- the aggregate pricing summary is `null`;
- `requires_revalidation=true`;
- Checkout navigation is not presented as ready;
- no zero/fallback/fabricated price is invented.

## Backend ownership preserved

`CartService` reuses only injected ports already canonical in Cart:

- `CustomerCommercePort.getCustomerType(customerId)`
- `PricingQuotePort.quoteVariant({ variantId, quantity, customerType })`
- `InventoryAvailabilityPort.getOnlineSellableQuantity(variantId)`
- `MoneyToman` invariants

Cart does **not** read Pricing, Customer or Inventory persistence directly.

Guest Cart resolves as retail through the existing Customer commerce port.

## Product integration

The Product loader probes `GET /customer/profile` through the existing server-only customer-session bridge.

The resulting `customer_type` is used only as presentation/Cart-routing context.

The current Product/Variant `price` remains the public catalog price and is explicitly described as such for Wholesale customers.

The browser does not:

- convert that price into wholesale;
- calculate a discount;
- read the governed wholesale minimum quantity;
- hardcode 11 or any other wholesale threshold.

## Product quantity and Cart ownership

For an authoritative `customer_type=wholesale` session:

1. Product add-to-cart accepts a bounded integer quantity.
2. If a guest Cart already exists, the existing customer-cart merge boundary is reused.
3. Otherwise the existing customer-cart access boundary is reused.
4. The authoritative customer Cart token is serialized only into the existing HttpOnly/SameSite cart cookie boundary.
5. Add-to-cart uses the same `POST /cart/{id}/items` command.
6. Cart response pricing is then calculated for the cart owner's Wholesale type and current line quantity.

Retail/guest Product add-to-cart remains supported and retains the existing guest Cart behavior.

## Storefront Cart UX

The existing `/cart` route now renders the authoritative Cart presentation:

- non-color Wholesale account badge/context;
- unit final price;
- base price only when a real server discount exists;
- line savings only when positive;
- line total;
- stock/sales state;
- low-stock count when the server provides current quantity;
- current base subtotal;
- current Pricing discount;
- current item total;
- bounded quantity update and automatic server repricing on reload.

Shipping, tax, Checkout marketing discount and final order total remain deferred to the authoritative Checkout Quote.

## Explicit non-scope

- new wholesale pricing rules;
- Storefront wholesale minimum threshold;
- frontend discount calculations;
- customer promotion or approval;
- Inventory rule mutation;
- separate Wholesale Cart/Checkout/Order;
- Checkout/Reservation/Order lifecycle changes;
- payment/provider changes;
- database/migrations;
- dependencies;
- Product Design mutation;
- Current State / Master Roadmap mutation;
- Graph/Graphify;
- Wallet.

## Exit gate

65-E is HIGH risk and remains non-canonical until:

1. exact-head Canonical CI PASS;
2. exact-head Phase A PASS;
3. Storefront Quality PASS;
4. applicable CodeQL/Security PASS;
5. deterministic Review PASS;
6. exact-artifact ACTIVE Lock;
7. Project Owner Human Gate APPROVED for exact Head/Artifact;
8. protected merge;
9. exact-SHA postmerge verification PASS;
10. terminal Lock RELEASED;
11. Linear HOS-69 reconciliation.

Until then:

`STEP_65_E = IN_PROGRESS / NOT_CANONICAL`

`STEP_65_F = BLOCKED_FROM_MUTATION`
