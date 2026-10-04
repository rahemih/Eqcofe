import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("apps/storefront/app/routes/checkout-identity.tsx", "utf8");
const server = readFileSync("apps/storefront/app/features/cart-checkout/checkout-identity.server.ts", "utf8");
const view = readFileSync("apps/storefront/app/features/cart-checkout/CheckoutIdentityView.tsx", "utf8");
const data = readFileSync("apps/storefront/app/features/cart-checkout/cart-checkout-data.server.ts", "utf8");
const contract = readFileSync("apps/storefront/app/features/cart-checkout/cart-checkout-contract.ts", "utf8");
const css = readFileSync("apps/storefront/app/styles/checkout-identity.css", "utf8");

assert.doesNotMatch(route, /RoutePlaceholder/);
assert.match(route, /loadCheckoutIdentity/);
assert.match(route, /handleCheckoutIdentityAction/);
assert.match(route, /appendCustomerSessionSetCookies/);
assert.match(route, /appendCartCheckoutSetCookies/);
assert.match(route, /redirect\(result\.location/);

assert.match(contract, /ApiRequestInput<"post", "\/auth\/otp\/request">/);
assert.match(contract, /ApiSuccessData<"post", "\/auth\/otp\/verify">/);
assert.match(data, /createCustomerSessionBridge/);
assert.match(data, /"\/auth\/otp\/request"/);
assert.match(data, /"\/auth\/otp\/verify"/);
assert.match(data, /"\/customer\/cart\/access"/);
assert.match(data, /"\/customer\/cart\/merge"/);

assert.match(server, /probeCustomerSession/);
assert.match(server, /requestWithFreshCustomerSession/);
assert.match(server, /SESSION_COOKIE_MISSING_AFTER_OTP/);
assert.match(server, /mergeGuestCartIntoCustomer/);
assert.match(server, /accessCustomerCart/);
assert.match(server, /serializeCartCredentials/);
assert.match(server, /CART_NOT_GUEST/);
assert.match(server, /CART_ALREADY_IN_CHECKOUT/);
assert.doesNotMatch(server + route + view, /localStorage|sessionStorage|document\.cookie|Bearer\s/i);
assert.doesNotMatch(server + route + view, /session_token/);
assert.doesNotMatch(server + route + view, /payment\/|createOrder|reserveCheckout|checkout\/review/);

assert.match(view, /مرحله ۲ از ۵/);
assert.match(view, /name="mobile"/);
assert.match(view, /autoComplete="one-time-code"/);
assert.match(view, /pattern="\[0-9\]\{6\}"/);
assert.match(view, /name="challenge_id"/);
assert.match(view, /continue-authenticated/);
assert.match(view, /بازگشت به سبد خرید/);
assert.match(view, /role="status"/);
assert.match(view, /role=\{actionData\.status === "otp-requested" \? "status" : "alert"\}/);

assert.match(css, /min-height:\s*44px/);
assert.match(css, /:focus-visible/);
assert.match(css, /@media \(max-width: 600px\)/);
assert.match(css, /@media \(max-width: 360px\)/);
assert.doesNotMatch(css.toLowerCase(), /brown|#(?:6f4e37|795548|8b4513)/);

const identityPaymentReturn = readFileSync("apps/storefront/app/routes/payment-return.tsx", "utf8");
const identityOrderOutcome = readFileSync("apps/storefront/app/routes/order-outcome.tsx", "utf8");
const identityPaymentDeferred = /RoutePlaceholder/.test(identityPaymentReturn);
assert.equal(
  identityPaymentDeferred,
  /RoutePlaceholder/.test(identityOrderOutcome),
  "63-G payment/outcome transition must be atomic",
);
if (identityPaymentDeferred) {
  assert.match(identityPaymentReturn, /targetStep=\{63\}/);
  assert.match(identityOrderOutcome, /targetStep=\{63\}/);
} else {
  assert.match(identityPaymentReturn, /loadPaymentReturn/);
  assert.match(identityOrderOutcome, /loadOrderOutcome/);
}

console.log(JSON.stringify({
  status: "PASS",
  stage: "63-E",
  route: "/checkout/identity",
  serverOnlySessionBridge: true,
  explicitGuestCartMerge: true,
  unknownOutcomeFailClosed: true,
  paymentAndOutcomeStagesDeferred: identityPaymentDeferred,
  paymentOutcomeSuccessorActive: !identityPaymentDeferred,
  graphWork: "DEFERRED_TO_STEP63_FINAL"
}));
