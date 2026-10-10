import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const appPort = 41763;
const origin = `http://127.0.0.1:${appPort}`;

const cartId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const checkoutId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const itemId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const variantId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const addressId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const provinceId = "14040000-0000-5001-8000-000000000002";
const cityId = "14040000-0000-5005-8000-000000004501";
const shippingId = "33333333-3333-4333-8333-333333333333";
const reservationId = "44444444-4444-4444-8444-444444444444";
const orderId = "55555555-5555-4555-8555-555555555555";
const paymentId = "66666666-6666-4666-8666-666666666666";
const sessionId = "77777777-7777-4777-8777-777777777777";
const newAddressId = "88888888-8888-4888-8888-888888888888";
const challengeId = "99999999-9999-4999-8999-999999999999";
const customerSession = "session-" + "s".repeat(48);
const cartToken = "cart-token-" + "x".repeat(48);
const checkoutToken = "checkout-token-" + "y".repeat(48);
const orderNumber = "EQ-63H-0001";
const now = new Date();
const expiresAt = new Date(now.getTime() + 10 * 60_000).toISOString();
const createdAt = now.toISOString();
const observed = [];
let paymentStatus = "pending";

const address = {
  id: addressId,
  recipient_name: "حسین رحیمی",
  recipient_mobile: "09123456789",
  province_id: provinceId,
  city_id: cityId,
  postal_code: "1234567890",
  address_line: "تهران، نشانی نمونه پذیرش یکپارچه",
  building_no: "12",
  unit_no: "3",
  location_metadata: {},
  is_default: true,
  created_at: createdAt,
  updated_at: createdAt,
};
let customerAddresses = [address];

const cartUnitToman = 750000;
const cart = {
  id: cartId,
  customer_id: null,
  customer_type: "retail",
  status: "active",
  version: 1,
  expires_at: new Date(now.getTime() + 24 * 60 * 60_000).toISOString(),
  items: [{
    id: itemId,
    product_id: productId,
    variant_id: variantId,
    sku: "EQ-63H-SKU",
    product_name: "آسیاب تست پذیرش",
    quantity: 2,
    price: {
      unit_base_toman: cartUnitToman,
      unit_final_toman: cartUnitToman,
      discount_toman: 0,
      line_total_toman: cartUnitToman * 2,
    },
    availability: {
      sales_enabled: true,
      in_stock: true,
      available_quantity: 20,
    },
  }],
  pricing: {
    subtotal_toman: cartUnitToman * 2,
    discount_toman: 0,
    total_toman: cartUnitToman * 2,
  },
  requires_revalidation: false,
};

const shipping = {
  id: shippingId,
  code: "standard",
  name_fa: "ارسال استاندارد",
  fee_toman: 45000,
};

const reviewSnapshot = {
  v: 1,
  checkoutId,
  addressId,
  shipping: { id: shipping.id, code: shipping.code, nameFa: shipping.name_fa, feeToman: shipping.fee_toman },
  customerType: "retail",
  subtotalToman: 1500000,
  pricingDiscountToman: 100000,
  marketingDiscountToman: 0,
  discountToman: 100000,
  shippingToman: shipping.fee_toman,
  taxToman: 0,
  totalToman: 1445000,
  expiresAt,
};

function order() {
  return {
    order_id: orderId,
    order_number: orderNumber,
    customer_type: "retail",
    order_status: "pending_confirmation",
    payment_status: paymentStatus === "paid" ? "paid" : "pending",
    fulfillment_status: "unfulfilled",
    return_status: "none",
    grand_total_toman: reviewSnapshot.totalToman,
    created_at: createdAt,
  };
}

function payment() {
  return {
    payment_id: paymentId,
    order_id: orderId,
    order_number: orderNumber,
    provider_key: "disabled",
    amount_toman: reviewSnapshot.totalToman,
    status: paymentStatus,
    redirect_url: null,
    expires_at: expiresAt,
    provider_reference: paymentStatus === "paid" ? "REF-63H" : null,
    paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
    reconciliation_required: false,
    created_at: createdAt,
    updated_at: new Date().toISOString(),
    manual_review_required: false,
  };
}

function envelope(data) {
  return { success: true, data, meta: { request_id: "step63-h", timestamp: new Date().toISOString() } };
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-request-id": "step63-h" });
  response.end(JSON.stringify(body));
}

async function bodyJson(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const api = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const record = {
    method: request.method,
    path: url.pathname,
    search: url.search,
    checkoutToken: String(request.headers["x-checkout-token"] ?? ""),
    cartToken: String(request.headers["x-cart-token"] ?? ""),
    idempotencyKey: String(request.headers["idempotency-key"] ?? ""),
    body: null,
  };

  if (request.method === "GET" && url.pathname === `/cart/${cartId}`) {
    observed.push(record);
    return json(response, 200, envelope(cart));
  }

  if (request.method === "PATCH" && url.pathname === `/cart/${cartId}/items/${itemId}`) {
    record.body = await bodyJson(request);
    observed.push(record);
    assert.equal(record.cartToken, cartToken, "STEP63_H_CART_TOKEN_TRANSPORT");
    cart.items[0].quantity = Number(record.body.quantity);
    cart.items[0].price.line_total_toman = cartUnitToman * cart.items[0].quantity;
    cart.pricing.subtotal_toman = cart.items[0].price.line_total_toman;
    cart.pricing.total_toman = cart.items[0].price.line_total_toman;
    return json(response, 200, envelope(cart));
  }

  if (request.method === "DELETE" && url.pathname === `/cart/${cartId}/items/${itemId}`) {
    observed.push(record);
    assert.equal(record.cartToken, cartToken, "STEP63_H_CART_TOKEN_DELETE_TRANSPORT");
    return json(response, 200, envelope(cart));
  }

  if (request.method === "POST" && url.pathname === "/auth/otp/request") {
    record.body = await bodyJson(request);
    observed.push(record);
    assert.equal(record.body?.mobile, "09123456789", "STEP63_H_OTP_REQUEST_MOBILE");
    return json(response, 201, envelope({ challenge_id: challengeId, expires_at: expiresAt }));
  }

  if (request.method === "POST" && url.pathname === "/auth/otp/verify") {
    record.body = await bodyJson(request);
    observed.push(record);
    assert.equal(record.body?.challenge_id, challengeId, "STEP63_H_OTP_VERIFY_CHALLENGE");
    assert.equal(record.body?.code, "123456", "STEP63_H_OTP_VERIFY_CODE");
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "x-request-id": "step63-h",
      "set-cookie": `eqcofe_session=${customerSession}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900`,
    });
    response.end(JSON.stringify(envelope({ session_id: sessionId, expires_at: expiresAt })));
    return;
  }

  if (request.method === "POST" && url.pathname === "/customer/cart/merge") {
    record.body = await bodyJson(request);
    observed.push(record);
    assert(String(request.headers.cookie ?? "").includes(`eqcofe_session=${customerSession}`), "STEP63_H_SESSION_COOKIE_TRANSPORT");
    assert.equal(record.body?.source_cart_id, cartId, "STEP63_H_MERGE_CART_ID");
    assert.equal(record.body?.source_cart_token, cartToken, "STEP63_H_MERGE_CART_TOKEN");
    return json(response, 200, envelope({ cart, cart_token: cartToken }));
  }

  if (request.method === "GET" && url.pathname === "/customer/addresses") {
    observed.push(record);
    return json(response, 200, envelope(customerAddresses));
  }

  if (request.method === "POST" && url.pathname === "/customer/addresses") {
    record.body = await bodyJson(request);
    observed.push(record);
    assert(record.idempotencyKey, "STEP63_H_ADDRESS_CREATE_IDEMPOTENCY");
    const created = {
      ...address,
      ...record.body,
      id: newAddressId,
      is_default: Boolean(record.body?.is_default),
      created_at: createdAt,
      updated_at: new Date().toISOString(),
    };
    customerAddresses = [...customerAddresses, created];
    return json(response, 201, envelope(created));
  }

  if (request.method === "PATCH" && url.pathname === `/customer/addresses/${addressId}`) {
    record.body = await bodyJson(request);
    observed.push(record);
    assert(record.idempotencyKey, "STEP63_H_ADDRESS_UPDATE_IDEMPOTENCY");
    const updated = { ...customerAddresses[0], ...record.body, updated_at: new Date().toISOString() };
    customerAddresses = [updated, ...customerAddresses.slice(1)];
    return json(response, 200, envelope(updated));
  }

  if (request.method === "GET" && url.pathname === "/shipping-methods") {
    observed.push(record);
    return json(response, 200, envelope([shipping]));
  }

  if (request.method === "POST" && url.pathname === `/checkout/${checkoutId}/reserve`) {
    observed.push(record);
    assert.equal(record.checkoutToken, checkoutToken, "STEP63_H_RESERVE_CHECKOUT_TOKEN");
    assert(record.idempotencyKey, "STEP63_H_RESERVE_IDEMPOTENCY_MISSING");
    return json(response, 200, envelope({ checkout_id: checkoutId, reservation_id: reservationId, status: "reserved", expires_at: expiresAt }));
  }

  if (request.method === "POST" && url.pathname === `/checkout/${checkoutId}/order`) {
    record.body = await bodyJson(request);
    observed.push(record);
    assert.equal(record.checkoutToken, checkoutToken, "STEP63_H_ORDER_CHECKOUT_TOKEN");
    assert(record.idempotencyKey, "STEP63_H_ORDER_IDEMPOTENCY_MISSING");
    assert.equal(record.body?.address?.postal_code, address.postal_code, "STEP63_H_ORDER_ADDRESS_SNAPSHOT");
    return json(response, 201, envelope(order()));
  }

  if (request.method === "POST" && url.pathname === `/orders/${orderNumber}/payments`) {
    observed.push(record);
    assert.equal(record.checkoutToken, checkoutToken, "STEP63_H_PAYMENT_CHECKOUT_TOKEN");
    assert(record.idempotencyKey, "STEP63_H_PAYMENT_IDEMPOTENCY_MISSING");
    paymentStatus = "pending";
    return json(response, 200, envelope(payment()));
  }

  if (request.method === "GET" && url.pathname === `/payments/${paymentId}/status`) {
    observed.push(record);
    assert.equal(record.checkoutToken, checkoutToken, "STEP63_H_STATUS_CHECKOUT_TOKEN");
    return json(response, 200, envelope({
      payment_id: paymentId,
      status: paymentStatus,
      reconciliation_required: false,
      updated_at: new Date().toISOString(),
    }));
  }

  if (request.method === "POST" && url.pathname === `/payments/${paymentId}/verify`) {
    observed.push(record);
    assert.equal(record.checkoutToken, checkoutToken, "STEP63_H_VERIFY_CHECKOUT_TOKEN");
    paymentStatus = "paid";
    return json(response, 200, envelope(payment()));
  }

  if (request.method === "POST" && url.pathname === `/payments/${paymentId}/callback`) {
    observed.push(record);
    assert(url.searchParams.get("state")?.startsWith("callback-state-"), "STEP63_H_CALLBACK_STATE_SERVER_SIDE");
    response.writeHead(200, { "content-length": "0" });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === `/orders/${orderNumber}`) {
    observed.push(record);
    assert.equal(record.checkoutToken, checkoutToken, "STEP63_H_ORDER_READ_CHECKOUT_TOKEN");
    return json(response, 200, envelope(order()));
  }

  if (request.method === "GET" && url.pathname === `/orders/${orderNumber}/payments/${paymentId}`) {
    observed.push(record);
    assert.equal(record.checkoutToken, checkoutToken, "STEP63_H_PAYMENT_READ_CHECKOUT_TOKEN");
    return json(response, 200, envelope(payment()));
  }

  observed.push(record);
  return json(response, 404, { error: { code: "NOT_FOUND", message: "not found", field_errors: [] }, meta: { request_id: "step63-h" } });
});

await new Promise((done) => api.listen(0, "127.0.0.1", done));
const apiOrigin = `http://127.0.0.1:${api.address().port}`;
const server = spawn("pnpm", ["exec", "react-router-serve", "./build/server/index.js"], {
  cwd: root,
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(appPort),
    NODE_ENV: "production",
    EQCOFE_API_BASE_URL: apiOrigin,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk; });
server.stderr.on("data", (chunk) => { logs += chunk; });

const reviewCookie = signedCookie("eqcofe_checkout_review", reviewSnapshot);
const paymentCookie = signedCookie("eqcofe_checkout_payment", {
  v: 1,
  checkoutId,
  orderNumber,
  paymentId,
  createdAt,
  expiresAt,
});
const baseCookies = [
  `eqcofe_cart_id=${cartId}`,
  `eqcofe_cart_token=${cartToken}`,
  `eqcofe_checkout_id=${checkoutId}`,
  `eqcofe_checkout_token=${checkoutToken}`,
];
const reviewCookies = [...baseCookies, reviewCookie];
const paymentCookies = [...baseCookies, paymentCookie];

try {
  await waitForServer();

  const quantityMutation = await fetch(origin + "/cart", {
    method: "POST",
    headers: {
      cookie: baseCookies.join("; "),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ intent: "quantity", item_id: itemId, quantity: "3" }),
    redirect: "manual",
  });
  assert.equal(quantityMutation.status, 200, "STEP63_H_CART_QUANTITY_ACTION_STATUS");
  assert.equal(cart.items[0].quantity, 3, "STEP63_H_CART_QUANTITY_MUTATED");

  const removeMutation = await fetch(origin + "/cart", {
    method: "POST",
    headers: {
      cookie: baseCookies.join("; "),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ intent: "remove", item_id: itemId }),
    redirect: "manual",
  });
  assert.equal(removeMutation.status, 200, "STEP63_H_CART_REMOVE_ACTION_STATUS");

  const otpRequest = await fetch(origin + "/checkout/identity", {
    method: "POST",
    headers: {
      cookie: baseCookies.join("; "),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ intent: "request-otp", mobile: "09123456789" }),
    redirect: "manual",
  });
  assert.equal(otpRequest.status, 200, "STEP63_H_OTP_REQUEST_ACTION_STATUS");

  const otpVerify = await fetch(origin + "/checkout/identity", {
    method: "POST",
    headers: {
      cookie: baseCookies.join("; "),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ intent: "verify-otp", challenge_id: challengeId, code: "123456" }),
    redirect: "manual",
  });
  assert.equal(otpVerify.status, 302, "STEP63_H_OTP_VERIFY_ACTION_STATUS");
  assert.equal(otpVerify.headers.get("location"), "/checkout/address", "STEP63_H_OTP_VERIFY_REDIRECT");
  const authCookies = typeof otpVerify.headers.getSetCookie === "function"
    ? otpVerify.headers.getSetCookie().map((value) => value.split(";", 1)[0])
    : [];
  assert(authCookies.some((value) => value.startsWith("eqcofe_session=")), "STEP63_H_SESSION_COOKIE_REISSUED");

  const authenticatedCookieHeader = authCookies.join("; ");
  const selectAddress = await fetch(origin + "/checkout/address", {
    method: "POST",
    headers: {
      cookie: authenticatedCookieHeader,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ intent: "select-address", address_id: addressId }),
    redirect: "manual",
  });
  assert.equal(selectAddress.status, 302, "STEP63_H_ADDRESS_SELECT_STATUS");
  assert.equal(selectAddress.headers.get("location"), "/checkout/delivery", "STEP63_H_ADDRESS_SELECT_REDIRECT");

  const updateAddress = await fetch(origin + "/checkout/address", {
    method: "POST",
    headers: {
      cookie: authenticatedCookieHeader,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      intent: "update-address",
      address_id: addressId,
      recipient_name: address.recipient_name,
      recipient_mobile: address.recipient_mobile,
      postal_code: address.postal_code,
      address_line: address.address_line + " ویرایش‌شده",
      building_no: address.building_no,
      unit_no: address.unit_no,
    }),
    redirect: "manual",
  });
  assert.equal(updateAddress.status, 302, "STEP63_H_ADDRESS_UPDATE_STATUS");
  assert.equal(updateAddress.headers.get("location"), "/checkout/delivery", "STEP63_H_ADDRESS_UPDATE_REDIRECT");

  const createAddress = await fetch(origin + "/checkout/address", {
    method: "POST",
    headers: {
      cookie: authenticatedCookieHeader,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      intent: "create-address",
      province_id: provinceId,
      city_id: cityId,
      recipient_name: "گیرنده جدید",
      recipient_mobile: "09123456789",
      postal_code: "1234567890",
      address_line: "نشانی جدید تست پذیرش",
      building_no: "21",
      unit_no: "4",
      is_default: "on",
    }),
    redirect: "manual",
  });
  assert.equal(createAddress.status, 302, "STEP63_H_ADDRESS_CREATE_STATUS");
  assert.equal(createAddress.headers.get("location"), "/checkout/delivery", "STEP63_H_ADDRESS_CREATE_REDIRECT");

  const cartResponse = await fetch(origin + "/cart", { headers: { cookie: baseCookies.join("; ") } });
  assert.equal(cartResponse.status, 200, "STEP63_H_CART_STATUS");
  const cartHtml = await cartResponse.text();
  assert(cartHtml.includes("آسیاب تست پذیرش"), "STEP63_H_CART_CONTENT");
  assert(cartHtml.includes("ادامه تسویه‌حساب"), "STEP63_H_CART_CTA");

  const identityResponse = await fetch(origin + "/checkout/identity", { headers: { cookie: baseCookies.join("; ") } });
  assert.equal(identityResponse.status, 200, "STEP63_H_IDENTITY_STATUS");
  assert((await identityResponse.text()).includes("دریافت کد ورود"), "STEP63_H_IDENTITY_GUEST_STATE");

  const addressResponse = await fetch(origin + "/checkout/address", { headers: { cookie: baseCookies.join("; ") } });
  assert.equal(addressResponse.status, 200, "STEP63_H_ADDRESS_STATUS");
  assert((await addressResponse.text()).includes(address.recipient_name), "STEP63_H_ADDRESS_CONTENT");

  const selectedCookies = [...baseCookies, `eqcofe_checkout_address_id=${addressId}`];
  const deliveryResponse = await fetch(origin + "/checkout/delivery", { headers: { cookie: selectedCookies.join("; ") } });
  assert.equal(deliveryResponse.status, 200, "STEP63_H_DELIVERY_STATUS");
  assert((await deliveryResponse.text()).includes(shipping.name_fa), "STEP63_H_DELIVERY_CONTENT");

  const reviewResponse = await fetch(origin + "/checkout/review", { headers: { cookie: reviewCookies.join("; ") } });
  assert.equal(reviewResponse.status, 200, "STEP63_H_REVIEW_STATUS");
  const reviewHtml = await reviewResponse.text();
  assert(reviewHtml.includes("بازبینی و ثبت سفارش"), "STEP63_H_REVIEW_CONTENT");
  assert(reviewHtml.includes("ثبت سفارش و رفتن به پرداخت"), "STEP63_H_REVIEW_PAYMENT_CTA");

  const submitOrder = await fetch(origin + "/checkout/review", {
    method: "POST",
    headers: {
      cookie: reviewCookies.join("; "),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ intent: "submit-order" }),
    redirect: "manual",
  });
  assert.equal(submitOrder.status, 302, "STEP63_H_REVIEW_SUBMIT_STATUS");
  const submitLocation = submitOrder.headers.get("location") ?? "";
  assert(submitLocation.startsWith("/payment/return?payment_id="), "STEP63_H_REVIEW_PAYMENT_HANDOFF_REDIRECT");

  const callbackState = "callback-state-" + "z".repeat(40);
  const callback = await fetch(origin + `/payments/${paymentId}/callback?state=${encodeURIComponent(callbackState)}`, {
    redirect: "manual",
  });
  assert.equal(callback.status, 302, "STEP63_H_CALLBACK_REDIRECT_STATUS");
  const callbackLocation = callback.headers.get("location") ?? "";
  assert(callbackLocation.includes(`payment_id=${paymentId}`), "STEP63_H_CALLBACK_PAYMENT_ID");
  assert(!callbackLocation.includes("state="), "STEP63_H_CALLBACK_STATE_LEAK");

  const returnResponse = await fetch(origin + `/payment/return?payment_id=${paymentId}`, { headers: { cookie: paymentCookies.join("; ") } });
  assert.equal(returnResponse.status, 200, "STEP63_H_PAYMENT_RETURN_STATUS");
  const returnHtml = await returnResponse.text();
  assert(returnHtml.includes("بررسی نتیجه پرداخت"), "STEP63_H_PAYMENT_RETURN_CONTENT");
  assert(returnHtml.includes("pending"), "STEP63_H_PENDING_AUTHORITATIVE_STATE");

  const outcomeResponse = await fetch(origin + `/order/${orderNumber}/outcome`, { headers: { cookie: paymentCookies.join("; ") } });
  assert.equal(outcomeResponse.status, 200, "STEP63_H_OUTCOME_STATUS");
  assert((await outcomeResponse.text()).includes("نتیجه سفارش هنوز قطعی نیست"), "STEP63_H_OUTCOME_PENDING_CONTENT");

  const verifyResponse = await fetch(origin + "/payment/return", {
    method: "POST",
    headers: {
      cookie: paymentCookies.join("; "),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ intent: "verify-payment" }),
    redirect: "manual",
  });
  assert.equal(verifyResponse.status, 302, "STEP63_H_VERIFY_ACTION_STATUS");
  assert.equal(verifyResponse.headers.get("location"), `/order/${orderNumber}/outcome`, "STEP63_H_VERIFY_ACTION_REDIRECT");

  let browserVerified = false;
  let axeRuns = 0;
  if (process.env.EQCOFE_BROWSER_QA_ROOT) {
    const qaRequire = createRequire(resolve(process.env.EQCOFE_BROWSER_QA_ROOT, "package.json"));
    const { chromium } = qaRequire("playwright");
    const axe = qaRequire("axe-core");
    const browser = await chromium.launch({ headless: true });
    try {
      paymentStatus = "pending";
      const mobile = await browser.newContext({ viewport: { width: 320, height: 900 }, locale: "fa-IR" });
      await mobile.addCookies(browserCookies(reviewCookies));
      const page = await mobile.newPage();
      await page.goto(origin + "/checkout/review", { waitUntil: "networkidle" });
      await assertPageBasics(page, "review-320");
      await runAxe(page, axe, "review-320");
      axeRuns += 1;

      const submit = page.getByRole("button", { name: "ثبت سفارش و رفتن به پرداخت" });
      await assertTarget(submit, "review-submit");
      await submit.focus();
      assert(await submit.evaluate((element) => document.activeElement === element), "STEP63_H_REVIEW_FOCUS");
      await submit.click();
      await page.waitForURL((url) => url.pathname === "/payment/return");
      assert(!page.url().includes("state="), "STEP63_H_BROWSER_CALLBACK_STATE_LEAK");
      await page.getByRole("heading", { name: "بررسی نتیجه پرداخت", exact: true }).waitFor();
      await page.getByText("pending", { exact: true }).waitFor();
      await assertPageBasics(page, "payment-return-320");
      await runAxe(page, axe, "payment-return-320");
      axeRuns += 1;

      const verify = page.getByRole("button", { name: "تأیید با درگاه" });
      await assertTarget(verify, "verify-payment");
      await verify.click();
      await page.waitForURL((url) => url.pathname === `/order/${orderNumber}/outcome`);
      await page.getByRole("heading", { name: "سفارش ثبت و پرداخت تأیید شد" }).waitFor();
      await assertPageBasics(page, "order-outcome-320");
      await runAxe(page, axe, "order-outcome-320");
      axeRuns += 1;
      await mobile.close();

      const desktop = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: "fa-IR" });
      await desktop.addCookies(browserCookies([...baseCookies, `eqcofe_checkout_address_id=${addressId}`]));
      const wide = await desktop.newPage();
      await wide.goto(origin + "/cart", { waitUntil: "networkidle" });
      await wide.getByRole("heading", { name: "سبد خرید" }).waitFor();
      await assertPageBasics(wide, "cart-1200");
      await runAxe(wide, axe, "cart-1200");
      axeRuns += 1;

      const checkoutLink = wide.getByRole("link", { name: "ادامه تسویه‌حساب" });
      await assertTarget(checkoutLink, "cart-checkout-link");
      await checkoutLink.click();
      await wide.waitForURL((url) => url.pathname === "/checkout/identity");
      await wide.getByRole("heading", { name: "ورود و هویت تسویه‌حساب" }).waitFor();
      await assertPageBasics(wide, "identity-1200");

      await wide.goto(origin + "/checkout/address", { waitUntil: "networkidle" });
      await wide.getByRole("heading", { name: "انتخاب نشانی تحویل" }).waitFor();
      await assertPageBasics(wide, "address-1200");
      await runAxe(wide, axe, "address-1200");
      axeRuns += 1;

      await wide.goto(origin + "/checkout/delivery", { waitUntil: "networkidle" });
      await wide.getByRole("heading", { name: "روش تحویل و محاسبه مبلغ نهایی" }).waitFor();
      await assertPageBasics(wide, "delivery-1200");
      await runAxe(wide, axe, "delivery-1200");
      axeRuns += 1;
      await desktop.close();

      browserVerified = true;
    } finally {
      await browser.close();
    }
  }

  const paths = observed.map((item) => `${item.method} ${item.path}`);
  for (const required of [
    `GET /cart/${cartId}`,
    `PATCH /cart/${cartId}/items/${itemId}`,
    `DELETE /cart/${cartId}/items/${itemId}`,
    "POST /auth/otp/request",
    "POST /auth/otp/verify",
    "POST /customer/cart/merge",
    "GET /customer/addresses",
    "POST /customer/addresses",
    `PATCH /customer/addresses/${addressId}`,
    "GET /shipping-methods",
    `POST /checkout/${checkoutId}/reserve`,
    `POST /checkout/${checkoutId}/order`,
    `POST /orders/${orderNumber}/payments`,
    `GET /payments/${paymentId}/status`,
    `POST /payments/${paymentId}/verify`,
    `POST /payments/${paymentId}/callback`,
    `GET /orders/${orderNumber}`,
    `GET /orders/${orderNumber}/payments/${paymentId}`,
  ]) {
    assert(paths.includes(required), "STEP63_H_BACKEND_AUTHORITY_MISSING:" + required);
  }

  console.log(JSON.stringify({
    status: "PASS",
    stage: "63-H",
    integrated: [
      "cart-ready-state",
      "cart-quantity-and-remove-mutations",
      "checkout-identity-guest-boundary",
      "checkout-otp-session-and-cart-merge",
      "authoritative-customer-address",
      "address-select-update-create",
      "authoritative-shipping-method",
      "signed-review-snapshot",
      "idempotent-reservation-and-order",
      "signed-payment-handoff",
      "provider-callback-state-server-only",
      "authoritative-payment-status",
      "authoritative-payment-verify",
      "authoritative-order-outcome",
      "rtl",
      "responsive-reflow",
      "44px-targets",
      "keyboard-focus",
      "axe-wcag",
    ],
    ssrApiAcceptance: true,
    browser: browserVerified,
    browserWidths: browserVerified ? [320, 1200] : [],
    axeRuns,
    callbackStateLeaked: false,
    backendAuthorityPreserved: true,
    productionProviderActivation: "DEFERRED_TO_STEP74",
    graphWork: "DEFERRED_TO_STEP63_I_FINAL",
    finalClosureDeferredTo63I: true,
  }, null, 2));
} finally {
  server.kill("SIGTERM");
  await new Promise((done) => api.close(done));
}

function signedCookie(name, value) {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  const signature = createHmac("sha256", checkoutToken).update(payload).digest("base64url");
  return `${name}=${payload}.${signature}`;
}

function browserCookies(values) {
  return values.map((pair) => {
    const index = pair.indexOf("=");
    return {
      name: pair.slice(0, index),
      value: pair.slice(index + 1),
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    };
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {
      // keep polling
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error("STEP63_H_STOREFRONT_START_TIMEOUT\n" + logs);
}

async function assertPageBasics(page, label) {
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl", "STEP63_H_RTL:" + label);
  const overflow = await page.evaluate(() => ({ root: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert(overflow.root <= overflow.viewport + 1, "STEP63_H_ROOT_OVERFLOW:" + label + ":" + JSON.stringify(overflow));
}

async function assertTarget(locator, label) {
  const box = await locator.boundingBox();
  assert(box && box.height >= 44, "STEP63_H_TARGET_44:" + label + ":" + JSON.stringify(box));
}

async function runAxe(page, axe, label) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const result = await globalThis.axe.run(document, { resultTypes: ["violations"] });
    return result.violations
      .filter((violation) => violation.tags.some((tag) => tag.startsWith("wcag")))
      .map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map((node) => node.target) }));
  });
  assert.equal(violations.length, 0, "STEP63_H_AXE:" + label + ":" + JSON.stringify(violations));
}
