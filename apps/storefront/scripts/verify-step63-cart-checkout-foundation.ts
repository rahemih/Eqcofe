import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  readCartCredentials,
  readCheckoutCredentials,
  serializeCartCredentials,
  serializeCheckoutCredentials,
} from "../app/features/cart-checkout/cart-checkout-session.server.js";

const contract = readFileSync("apps/storefront/app/features/cart-checkout/cart-checkout-contract.ts", "utf8");
const data = readFileSync("apps/storefront/app/features/cart-checkout/cart-checkout-data.server.ts", "utf8");
const state = readFileSync("apps/storefront/app/features/cart-checkout/cart-checkout-state.ts", "utf8");
const productCart = readFileSync("apps/storefront/app/features/product-detail/product-detail-cart.server.ts", "utf8");

for (const marker of [
  'ApiRequestInput<"get", "/cart/{id}">',
  'ApiRequestInput<"post", "/cart/{id}/quote">',
  'ApiRequestInput<"post", "/checkout/{id}/reserve">',
  'ApiRequestInput<"post", "/checkout/{id}/order">',
  'ApiRequestInput<"get", "/customer/addresses">',
  'ApiRequestInput<"get", "/shipping-methods">',
  'ApiRequestInput<"post", "/orders/{order_number}/payments">',
  'ApiRequestInput<"get", "/payments/{payment_id}/status">',
  'ApiRequestInput<"post", "/payments/{payment_id}/verify">',
]) {
  assert.ok(contract.includes(marker), "Missing generated-contract alias: " + marker);
}

assert.match(data, /createCustomerSessionBridge/);
assert.match(data, /X-Cart-Token/);
assert.match(data, /X-Checkout-Token/);
assert.match(data, /Idempotency-Key/);
assert.match(data, /headers\.delete\("authorization"\)/);
assert.match(data, /headers\.delete\("cookie"\)/);
assert.doesNotMatch(data, /console\.(log|info|debug|warn|error)/);

assert.match(state, /AsyncSurfaceState/);
assert.match(state, /paymentReturnAuthority: "backend-status-or-verify"/);
assert.match(state, /unknownResult: "recovery-not-success"/);
assert.match(state, /unsafeMutationRetry: "never-without-authoritative-status"/);

assert.match(productCart, /cart-checkout-session\.server\.js/);
assert.doesNotMatch(productCart, /const CART_ID_COOKIE/);
assert.doesNotMatch(productCart, /function parseCookieHeader/);
assert.doesNotMatch(productCart, /function isSafeToken/);

const cartId = "11111111-1111-4111-8111-111111111111";
const checkoutId = "22222222-2222-4222-8222-222222222222";
const cartToken = "c".repeat(40);
const checkoutToken = "x".repeat(40);

const httpRequest = new Request("http://localhost/cart");
const secureRequest = new Request("https://eqcofe.com/cart");

const cartCookies = serializeCartCredentials(httpRequest, cartId, cartToken);
assert.equal(cartCookies.length, 2);
for (const cookie of cartCookies) {
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=604800/);
  assert.doesNotMatch(cookie, /; Secure/);
}

const secureCartCookies = serializeCartCredentials(secureRequest, cartId, cartToken);
assert.match(secureCartCookies[0] ?? "", /^__Host-eqcofe_cart_id=/);
assert.match(secureCartCookies[0] ?? "", /; Secure/);

const checkoutCookies = serializeCheckoutCredentials(secureRequest, checkoutId, checkoutToken);
assert.equal(checkoutCookies.length, 2);
for (const cookie of checkoutCookies) {
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=900/);
  assert.match(cookie, /; Secure/);
}

const inboundCookie = "__Host-eqcofe_cart_id=" + cartId
  + "; __Host-eqcofe_cart_token=" + cartToken
  + "; __Host-eqcofe_checkout_id=" + checkoutId
  + "; __Host-eqcofe_checkout_token=" + checkoutToken;
const inbound = new Request("https://eqcofe.com/cart", {
  headers: { cookie: inboundCookie },
});
assert.deepEqual(readCartCredentials(inbound), { cartId, cartToken });
assert.deepEqual(readCheckoutCredentials(inbound), { checkoutId, checkoutToken });

const duplicateCookie = "eqcofe_cart_id=" + cartId
  + "; eqcofe_cart_id=" + cartId
  + "; eqcofe_cart_token=" + cartToken;
assert.throws(
  () => readCartCredentials(new Request("http://localhost/cart", {
    headers: { cookie: duplicateCookie },
  })),
  /Duplicate Cart\/Checkout credential cookie was rejected/,
);

const cartRoute = readFileSync("apps/storefront/app/routes/cart.tsx", "utf8");
if (/RoutePlaceholder/.test(cartRoute)) {
  assert.match(cartRoute, /targetStep=\{63\}/);
} else {
  assert.match(cartRoute, /loadCartRouteData/);
  assert.match(cartRoute, /mutateCartRoute/);
}

const identityRoute = readFileSync("apps/storefront/app/routes/checkout-identity.tsx", "utf8");
assert.doesNotMatch(identityRoute, /RoutePlaceholder/);
assert.match(identityRoute, /loadCheckoutIdentity/);
assert.match(identityRoute, /handleCheckoutIdentityAction/);

const fulfillmentRoutes = [
  ["checkout-address.tsx", /checkout-address\\.server\\.js/],
  ["checkout-delivery.tsx", /checkout-delivery\\.server\\.js/],
  ["checkout-review.tsx", /checkout-review\\.server\\.js/],
] as const;
for (const [file, serverImport] of fulfillmentRoutes) {
  const source = readFileSync("apps/storefront/app/routes/" + file, "utf8");
  assert.doesNotMatch(source, /RoutePlaceholder/);
  assert.match(source, serverImport);
}
for (const file of ["payment-return.tsx", "order-outcome.tsx"]) {
  const source = readFileSync("apps/storefront/app/routes/" + file, "utf8");
  assert.match(source, /RoutePlaceholder/);
  assert.match(source, /targetStep=\{63\}/);
}

console.log(JSON.stringify({
  verifier: "step63-cart-checkout-foundation",
  status: "PASS",
  generatedContractAliases: true,
  serverOnlyCredentialBoundary: true,
  authoritativeState: true,
  productDetailCredentialReuse: true,
  cartRouteStageAware: true,
  checkoutIdentityStageAware: true,
  checkoutFulfillmentStageAware: true,
  paymentOutcomeRoutesDeferred: true,
}));
