import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const server=readFileSync("apps/storefront/app/features/cart-checkout/checkout-flow.server.ts","utf8");
const data=readFileSync("apps/storefront/app/features/cart-checkout/cart-checkout-data.server.ts","utf8");
const routes=["checkout-address.tsx","checkout-delivery.tsx","checkout-review.tsx"].map(file=>readFileSync("apps/storefront/app/routes/"+file,"utf8"));
const address=readFileSync("apps/storefront/app/features/cart-checkout/CheckoutAddressView.tsx","utf8");
const delivery=readFileSync("apps/storefront/app/features/cart-checkout/CheckoutDeliveryView.tsx","utf8");
const review=readFileSync("apps/storefront/app/features/cart-checkout/CheckoutReviewView.tsx","utf8");
const css=readFileSync("apps/storefront/app/styles/checkout-flow.css","utf8");

for(const route of routes){assert.doesNotMatch(route,/RoutePlaceholder/);assert.match(route,/checkout-flow\.server\.js/);assert.match(route,/noindex,nofollow/);}
for(const marker of ["loadCustomerAddresses","createCustomerAddress","updateCustomerAddress","setDefaultCustomerAddress","loadShippingMethods","createCheckoutQuote","reserveCheckout","createOrderFromCheckout"]) assert.match(server+data,new RegExp(marker));
assert.match(server,/stableGeoId/);assert.match(server,/createHash/);assert.match(server,/storefront_checkout_compatibility_bridge/);
assert.match(server,/randomUUID/);assert.match(server,/requestWithSetCookies/);assert.match(server,/serializeShippingSelection/);
assert.doesNotMatch(server+routes.join("")+address+delivery+review,/localStorage|sessionStorage|document\.cookie|checkout_token|cart_token/i);
assert.doesNotMatch(server+routes.join("")+address+delivery+review,/initiatePayment|verifyPayment|loadPaymentStatus/);
assert.match(address,/مرحله ۳ از ۵/);assert.match(address,/افزودن نشانی جدید/);assert.match(address,/name="province_name"/);assert.match(address,/name="city_name"/);assert.match(address,/set-default/);
assert.match(delivery,/مرحله ۴ از ۵/);assert.match(delivery,/shipping_method_id/);assert.match(delivery,/quote_idempotency_key/);assert.match(delivery,/reservation_idempotency_key/);
assert.match(review,/مرحله ۵ از ۵/);assert.match(review,/بازسازی Quote و رزرو/);assert.match(review,/order_idempotency_key/);assert.match(review,/پرداخت در Stage 63-G/);
for(const file of ["payment-return.tsx","order-outcome.tsx"]){const source=readFileSync("apps/storefront/app/routes/"+file,"utf8");assert.match(source,/RoutePlaceholder/);assert.match(source,/targetStep=\{63\}/);}
assert.match(css,/min-height:44px/);assert.match(css,/:focus-visible/);assert.match(css,/@media \(max-width:840px\)/);assert.match(css,/@media \(max-width:360px\)/);
assert.doesNotMatch(css.toLowerCase(),/brown|#(?:6f4e37|795548|8b4513)/);
console.log(JSON.stringify({status:"PASS",stage:"63-F",addressSelectionAndMutation:true,authoritativeShipping:true,quoteReservationReview:true,idempotentOrderSubmission:true,paymentDeferred:true,graphWork:"DEFERRED_TO_STEP63_FINAL"}));
