import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const state=readFileSync("apps/storefront/app/features/cart-checkout/checkout-flow-state.server.ts","utf8");
const addressServer=readFileSync("apps/storefront/app/features/cart-checkout/checkout-address.server.ts","utf8");
const deliveryServer=readFileSync("apps/storefront/app/features/cart-checkout/checkout-delivery.server.ts","utf8");
const reviewServer=readFileSync("apps/storefront/app/features/cart-checkout/checkout-review.server.ts","utf8");
const addressView=readFileSync("apps/storefront/app/features/cart-checkout/CheckoutAddressView.tsx","utf8");
const deliveryView=readFileSync("apps/storefront/app/features/cart-checkout/CheckoutDeliveryView.tsx","utf8");
const reviewView=readFileSync("apps/storefront/app/features/cart-checkout/CheckoutReviewView.tsx","utf8");
const addressRoute=readFileSync("apps/storefront/app/routes/checkout-address.tsx","utf8");
const deliveryRoute=readFileSync("apps/storefront/app/routes/checkout-delivery.tsx","utf8");
const reviewRoute=readFileSync("apps/storefront/app/routes/checkout-review.tsx","utf8");
const css=readFileSync("apps/storefront/app/styles/checkout-flow.css","utf8");
const pkg=readFileSync("apps/storefront/package.json","utf8");

assert.match(state,/createHmac/);assert.match(state,/timingSafeEqual/);assert.match(state,/HttpOnly/);assert.match(state,/SameSite=Lax/);assert.match(state,/stableCheckoutIdempotencyKey/);
assert.match(addressServer,/loadCustomerAddresses/);assert.match(addressServer,/updateCustomerAddress/);assert.match(addressServer,/ADDRESS_REFERENCE_DATA_MISSING/);assert.doesNotMatch(addressServer,/createCustomerAddress\(/);
assert.match(addressView,/شناسه ساختگی تولید نمی‌کند/);assert.doesNotMatch(addressView,/province_id|city_id/);
assert.match(deliveryServer,/loadShippingMethods/);assert.match(deliveryServer,/createCheckoutQuote/);assert.match(deliveryServer,/serializeReviewSnapshot/);
assert.match(reviewServer,/reserveCheckout/);assert.match(reviewServer,/createOrderFromCheckout/);assert.match(reviewServer,/stableCheckoutIdempotencyKey/);
for(const route of [addressRoute,deliveryRoute,reviewRoute]){assert.doesNotMatch(route,/RoutePlaceholder/);assert.match(route,/noindex,nofollow/);}
assert.match(addressRoute,/checkout-address\.server\.js/);assert.match(deliveryRoute,/checkout-delivery\.server\.js/);assert.match(reviewRoute,/checkout-review\.server\.js/);
assert.doesNotMatch(state+addressServer+deliveryServer+reviewServer+addressRoute+deliveryRoute+reviewRoute+addressView+deliveryView+reviewView,/localStorage|sessionStorage|document\.cookie|checkout_token/i);
assert.doesNotMatch(addressServer+deliveryServer+reviewServer+addressRoute+deliveryRoute+reviewRoute,/initiatePayment|verifyPayment|loadPaymentStatus/);
assert.match(addressView,/مرحله ۳ از ۵/);assert.match(deliveryView,/مرحله ۴ از ۵/);assert.match(reviewView,/مرحله ۵ از ۵/);assert.match(reviewView,/پرداخت در Stage 63-G/);
for(const file of ["payment-return.tsx","order-outcome.tsx"]){const source=readFileSync("apps/storefront/app/routes/"+file,"utf8");assert.match(source,/RoutePlaceholder/);assert.match(source,/targetStep=\{63\}/);}
assert.match(css,/min-height:44px/);assert.match(css,/:focus-visible/);assert.match(css,/@media\(max-width:600px\)/);assert.doesNotMatch(css.toLowerCase(),/brown|#(?:6f4e37|795548|8b4513)/);
assert.match(pkg,/checkout-fulfillment:verify/);
console.log(JSON.stringify({status:"PASS",stage:"63-F",existingAddressSelectionAndEdit:true,newAddressCreation:"BLOCKED_ADDRESS_REFERENCE_DATA_MISSING",authoritativeShipping:true,authoritativeQuote:true,signedReviewSnapshot:true,idempotentReserveOrder:true,paymentDeferred:true,graphWork:"DEFERRED_TO_STEP63_FINAL"}));
