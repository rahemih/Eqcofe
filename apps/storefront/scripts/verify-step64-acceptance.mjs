import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const appPort = 41764;
const origin = `http://127.0.0.1:${appPort}`;
const customerId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const addressId = "33333333-3333-4333-8333-333333333333";
const orderId = "44444444-4444-4444-8444-444444444444";
const orderItemId = "55555555-5555-4555-8555-555555555555";
const productId = "66666666-6666-4666-8666-666666666666";
const variantId = "77777777-7777-4777-8777-777777777777";
const notificationId = "88888888-8888-4888-8888-888888888888";
const returnId = "99999999-9999-4999-8999-999999999999";
const warrantyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const provinceId = "14040000-0000-5001-8000-000000000002";
const cityId = "14040000-0000-5005-8000-000000004501";
const session = "step64-h-session-" + "s".repeat(32);
const orderNumber = "EQ-64H-0001";
const returnNumber = "RET-64H-001";
const claimNumber = "WAR-64H-001";
const createdAt = "2026-10-06T12:00:00.000Z";
const observed = [];
let failOverviewNotifications = false;
let returnStatus = "requested";

const profile = {
  id: customerId,
  customer_type: "retail",
  first_name: "حسین",
  last_name: "رحیمی",
  mobile: "09123456789",
  email: "hossein@example.test",
  status: "active",
  created_at: createdAt,
};

const address = {
  id: addressId,
  recipient_name: "حسین رحیمی",
  recipient_mobile: "09123456789",
  province_id: provinceId,
  city_id: cityId,
  postal_code: "1234567890",
  address_line: "تهران، نشانی نمونه پذیرش حساب کاربری",
  building_no: "12",
  unit_no: "3",
  location_metadata: {},
  is_default: true,
  created_at: createdAt,
  updated_at: createdAt,
};

const orderItem = {
  id: orderItemId,
  product_id: productId,
  variant_id: variantId,
  product_name: "آسیاب نمونه حساب",
  sku: "EQ-64H-SKU",
  quantity: 1,
  unit_base_toman: 1250000,
  unit_final_toman: 1200000,
  discount_toman: 50000,
  tax_toman: 0,
  line_total_toman: 1200000,
  pricing_snapshot: {},
};

function order() {
  return {
    id: orderId,
    order_number: orderNumber,
    customer_id: customerId,
    order_status: "pending_confirmation",
    payment_status: "pending",
    fulfillment_status: "unfulfilled",
    return_status: "none",
    items: [orderItem],
    subtotal_toman: 1250000,
    discount_total_toman: 50000,
    tax_total_toman: 0,
    shipping_charge_toman: 45000,
    grand_total_toman: 1245000,
    allowed_actions: ["cancel_order"],
    confirmation_expires_at: "2026-10-06T13:00:00.000Z",
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function customerReturn() {
  return {
    id: returnId,
    return_number: returnNumber,
    order_id: orderId,
    order_number: orderNumber,
    status: returnStatus,
    requested_at: createdAt,
  };
}

const warranty = {
  id: warrantyId,
  claim_number: claimNumber,
  order_id: orderId,
  order_item_id: orderItemId,
  order_number: orderNumber,
  status: "requested",
  issue_type: "motor_noise",
  issue_description: "صدای غیرعادی هنگام روشن شدن دستگاه",
  requested_at: createdAt,
};

const notification = {
  id: notificationId,
  title: "به‌روزرسانی سفارش",
  body: "وضعیت سفارش شما به‌روزرسانی شده است.",
  notification_kind: "order",
  read_at: null,
  acknowledged_at: null,
  created_at: createdAt,
  updated_at: createdAt,
};

function meta(extra = {}) {
  return { request_id: "step64-h", timestamp: new Date().toISOString(), ...extra };
}

function envelope(data, extraMeta = {}) {
  return { success: true, data, meta: meta(extraMeta) };
}

function errorEnvelope(code, message) {
  return { success: false, error: { code, message, field_errors: [] }, meta: { request_id: "step64-h" } };
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-request-id": "step64-h" });
  response.end(JSON.stringify(body));
}

async function bodyJson(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function authenticated(request) {
  return String(request.headers.cookie ?? "").includes(`eqcofe_session=${session}`);
}

function recordRequest(request, url, body = null) {
  const record = {
    method: request.method,
    path: url.pathname,
    search: url.search,
    cookie: String(request.headers.cookie ?? ""),
    idempotencyKey: String(request.headers["idempotency-key"] ?? ""),
    body,
  };
  observed.push(record);
  return record;
}

const api = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if ((url.pathname === "/auth/session" || url.pathname.startsWith("/customer/")) && !authenticated(request)) {
    recordRequest(request, url);
    return json(response, 401, errorEnvelope("UNAUTHORIZED", "unauthorized"));
  }

  if (request.method === "GET" && url.pathname === "/auth/session") {
    recordRequest(request, url);
    return json(response, 200, envelope({
      actor: { type: "customer", id: customerId, accountId },
    }));
  }

  if (request.method === "GET" && url.pathname === "/customer/profile") {
    recordRequest(request, url);
    return json(response, 200, profile);
  }

  if (request.method === "PATCH" && url.pathname === "/customer/profile") {
    const body = await bodyJson(request);
    const record = recordRequest(request, url, body);
    assert(record.idempotencyKey, "STEP64_H_PROFILE_IDEMPOTENCY");
    return json(response, 200, { ...profile, ...body });
  }

  if (request.method === "GET" && url.pathname === "/customer/addresses") {
    recordRequest(request, url);
    return json(response, 200, envelope([address]));
  }

  if (request.method === "POST" && url.pathname === `/customer/addresses/${addressId}/set-default`) {
    const record = recordRequest(request, url);
    assert(record.idempotencyKey, "STEP64_H_ADDRESS_DEFAULT_IDEMPOTENCY");
    return json(response, 200, envelope(address));
  }

  if (request.method === "GET" && url.pathname === "/customer/orders") {
    recordRequest(request, url);
    return json(response, 200, envelope({
      items: [{
        order_number: orderNumber,
        status: "pending_confirmation",
        total_toman: 1245000,
        created_at: createdAt,
        updated_at: createdAt,
      }],
    }, { pagination: { next_cursor: null, has_more: false } }));
  }

  if (request.method === "GET" && url.pathname === `/customer/orders/${orderNumber}`) {
    recordRequest(request, url);
    return json(response, 200, envelope(order()));
  }

  if (request.method === "GET" && url.pathname === `/customer/orders/${orderNumber}/timeline`) {
    recordRequest(request, url);
    return json(response, 200, envelope({
      order_number: orderNumber,
      timeline: [{ from_status: null, to_status: "pending_confirmation", reason: null, created_at: createdAt }],
    }));
  }

  if (request.method === "GET" && url.pathname === `/customer/orders/${orderNumber}/invoice`) {
    recordRequest(request, url);
    return json(response, 200, envelope({
      invoice_number: "INV-64H-0001",
      issued_at: createdAt,
      order: order(),
    }));
  }

  if (request.method === "POST" && url.pathname === `/customer/orders/${orderNumber}/cancel`) {
    const body = await bodyJson(request);
    const record = recordRequest(request, url, body);
    assert(record.idempotencyKey, "STEP64_H_ORDER_CANCEL_IDEMPOTENCY");
    return json(response, 200, envelope({ cancelled: true }));
  }

  if (request.method === "GET" && url.pathname === "/customer/wishlist") {
    recordRequest(request, url);
    return json(response, 200, { items: [{ product_id: productId, added_at: createdAt }] });
  }

  if (request.method === "DELETE" && url.pathname === `/customer/wishlist/${productId}`) {
    const record = recordRequest(request, url);
    assert(record.idempotencyKey, "STEP64_H_WISHLIST_IDEMPOTENCY");
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/customer/notifications") {
    recordRequest(request, url);
    if (failOverviewNotifications) return json(response, 503, errorEnvelope("TEMPORARY", "temporary"));
    return json(response, 200, envelope({ items: [notification] }));
  }

  if (request.method === "PATCH" && url.pathname === `/customer/notifications/${notificationId}/read`) {
    const record = recordRequest(request, url);
    assert(record.idempotencyKey, "STEP64_H_NOTIFICATION_IDEMPOTENCY");
    return json(response, 200, envelope({ ...notification, read_at: new Date().toISOString() }));
  }

  if (request.method === "GET" && url.pathname === "/customer/returns") {
    recordRequest(request, url);
    return json(response, 200, envelope([customerReturn()]));
  }

  if (request.method === "GET" && url.pathname === `/customer/returns/${returnNumber}`) {
    recordRequest(request, url);
    return json(response, 200, envelope(customerReturn()));
  }

  if (request.method === "GET" && url.pathname === `/customer/returns/${returnNumber}/timeline`) {
    recordRequest(request, url);
    return json(response, 200, envelope({
      timeline: [{ from_status: null, status: returnStatus, reason: null, created_at: createdAt }],
    }));
  }

  if (request.method === "POST" && url.pathname === `/customer/returns/${returnNumber}/cancel`) {
    const body = await bodyJson(request);
    const record = recordRequest(request, url, body);
    assert(record.idempotencyKey, "STEP64_H_RETURN_CANCEL_IDEMPOTENCY");
    returnStatus = "cancelled";
    return json(response, 200, envelope(customerReturn()));
  }

  if (request.method === "GET" && url.pathname === "/customer/warranty/claims") {
    recordRequest(request, url);
    return json(response, 200, envelope([warranty]));
  }

  if (request.method === "GET" && url.pathname === `/customer/warranty/claims/${claimNumber}`) {
    recordRequest(request, url);
    return json(response, 200, envelope(warranty));
  }

  if (request.method === "GET" && url.pathname === `/customer/warranty/claims/${claimNumber}/timeline`) {
    recordRequest(request, url);
    return json(response, 200, envelope({
      timeline: [{ from_status: null, status: "requested", reason: null, created_at: createdAt }],
    }));
  }

  if (request.method === "POST" && url.pathname === "/customer/warranty/claims") {
    const body = await bodyJson(request);
    const record = recordRequest(request, url, body);
    assert(record.idempotencyKey, "STEP64_H_WARRANTY_CREATE_IDEMPOTENCY");
    return json(response, 201, envelope(warranty));
  }

  recordRequest(request, url);
  return json(response, 404, errorEnvelope("NOT_FOUND", "not found"));
});

await new Promise((done) => api.listen(0, "127.0.0.1", done));
const apiOrigin = `http://127.0.0.1:${api.address().port}`;
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const server = spawn(command, ["exec", "react-router-serve", "./build/server/index.js"], {
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
server.stdout.on("data", (chunk) => { logs += chunk.toString(); });
server.stderr.on("data", (chunk) => { logs += chunk.toString(); });

const authHeader = { cookie: `eqcofe_session=${session}` };
let browserVerified = false;
let axeRuns = 0;

try {
  await waitForServer();

  const readyRoutes = [
    ["/account", "حساب من"],
    ["/account/profile", "پروفایل و امنیت"],
    ["/account/addresses", "نشانی‌های من"],
    ["/account/orders", "سفارش‌های من"],
    [`/account/orders/${orderNumber}`, "جزئیات سفارش"],
    ["/account/tools", "ابزارهای مشتری"],
    ["/account/returns", "مرجوعی‌های من"],
    [`/account/returns/${returnNumber}`, returnNumber],
    ["/account/warranty", "پرونده‌های گارانتی من"],
    [`/account/warranty/${claimNumber}`, claimNumber],
  ];

  for (const [pathname, fragment] of readyRoutes) {
    const response = await fetch(origin + pathname, { headers: authHeader });
    assert.equal(response.status, 200, "STEP64_H_READY_STATUS:" + pathname);
    const html = await response.text();
    assert(html.includes(fragment), "STEP64_H_READY_CONTENT:" + pathname + ":" + fragment);
    assert(html.includes('dir="rtl"'), "STEP64_H_READY_RTL:" + pathname);
  }

  const guest = await fetch(origin + "/account");
  assert.equal(guest.status, 200, "STEP64_H_GUEST_STATUS");
  const guestHtml = await guest.text();
  assert(guestHtml.includes("نشست شما پایان یافته است"), "STEP64_H_GUEST_FAIL_CLOSED");
  assert(!guestHtml.includes(orderNumber), "STEP64_H_GUEST_PERSONAL_DATA_LEAK");

  failOverviewNotifications = true;
  const partial = await fetch(origin + "/account", { headers: authHeader });
  assert.equal(partial.status, 200, "STEP64_H_PARTIAL_STATUS");
  const partialHtml = await partial.text();
  assert(partialHtml.includes("بخشی از اطلاعات موقتاً در دسترس نیست"), "STEP64_H_PARTIAL_RECOVERY");
  failOverviewNotifications = false;

  const invalidCursor = await fetch(origin + "/account/orders?cursor=bad!", { headers: authHeader });
  assert.equal(invalidCursor.status, 200, "STEP64_H_INVALID_CURSOR_STATUS");
  assert((await invalidCursor.text()).includes("صفحه درخواستی معتبر نیست"), "STEP64_H_INVALID_CURSOR_RECOVERY");

  await postForm("/account/profile", {
    intent: "update-profile",
    first_name: "حسین",
    last_name: "رحیمی",
    email: "hossein@example.test",
  }, "STEP64_H_PROFILE_MUTATION");

  await postForm("/account/addresses", {
    intent: "set-default-address",
    address_id: addressId,
  }, "STEP64_H_ADDRESS_MUTATION");

  await postForm(`/account/orders/${orderNumber}`, {
    intent: "cancel-order",
    reason_code: "customer_request",
    note: "لغو در پذیرش یکپارچه",
  }, "STEP64_H_ORDER_MUTATION");

  await postForm("/account/tools", {
    intent: "wishlist-remove",
    product_id: productId,
  }, "STEP64_H_WISHLIST_MUTATION");

  await postForm("/account/tools", {
    intent: "notification-read",
    notification_id: notificationId,
  }, "STEP64_H_NOTIFICATION_MUTATION");

  await postForm(`/account/returns/${returnNumber}`, {
    intent: "cancel-return",
    reason: "لغو توسط مشتری در تست پذیرش",
  }, "STEP64_H_RETURN_MUTATION");

  await postForm("/account/warranty", {
    intent: "create-warranty",
    order_item_id: orderItemId,
    issue_type: "motor_noise",
    issue_description: "شرح ایراد تست پذیرش یکپارچه",
    preferred_resolution: "inspection",
  }, "STEP64_H_WARRANTY_MUTATION");

  const qaRoot = process.env.EQCOFE_BROWSER_QA_ROOT;
  if (qaRoot) {
    const qaRequire = createRequire(resolve(qaRoot, "package.json"));
    const axe = qaRequire("axe-core");
    const { chromium } = qaRequire("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      for (const width of [320, 1200]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: "fa-IR" });
        await context.addCookies([{
          name: "eqcofe_session",
          value: session,
          url: origin,
          httpOnly: true,
          sameSite: "Lax",
        }]);
        const page = await context.newPage();

        for (const [pathname] of readyRoutes) {
          await page.goto(origin + pathname, { waitUntil: "networkidle" });
          await assertPageBasics(page, width + ":" + pathname);
          await runAxe(page, axe, width + ":" + pathname);
          axeRuns += 1;
        }

        await page.goto(origin + "/account/profile", { waitUntil: "networkidle" });
        await page.keyboard.press("Tab");
        const focus = await page.evaluate(() => ({
          tag: document.activeElement?.tagName ?? "",
          outlineWidth: Number.parseFloat(getComputedStyle(document.activeElement).outlineWidth || "0"),
          outlineStyle: getComputedStyle(document.activeElement).outlineStyle,
        }));
        assert(focus.outlineStyle !== "none" && focus.outlineWidth >= 3, "STEP64_H_VISIBLE_KEYBOARD_FOCUS:" + JSON.stringify(focus));

        const target = page.locator("main a[href], main button, main input, main select, main textarea").filter({ visible: true }).first();
        const box = await target.boundingBox();
        assert(box && box.height >= 44, "STEP64_H_TARGET_HEIGHT_44:" + JSON.stringify(box));

        await context.close();
      }
      browserVerified = true;
    } finally {
      await browser.close();
    }
  }

  const paths = observed.map((item) => `${item.method} ${item.path}`);
  for (const required of [
    "GET /auth/session",
    "GET /customer/profile",
    "GET /customer/addresses",
    "GET /customer/orders",
    `GET /customer/orders/${orderNumber}`,
    `GET /customer/orders/${orderNumber}/timeline`,
    `GET /customer/orders/${orderNumber}/invoice`,
    "GET /customer/wishlist",
    "GET /customer/notifications",
    "GET /customer/returns",
    `GET /customer/returns/${returnNumber}`,
    `GET /customer/returns/${returnNumber}/timeline`,
    "GET /customer/warranty/claims",
    `GET /customer/warranty/claims/${claimNumber}`,
    `GET /customer/warranty/claims/${claimNumber}/timeline`,
  ]) assert(paths.includes(required), "STEP64_H_AUTHORITY_MISSING:" + required);

  console.log(JSON.stringify({
    status: "PASS",
    stage: "64-H",
    gate: "integrated-account-acceptance",
    readyRouteUrls: readyRoutes.map(([pathname]) => pathname),
    failClosedUnauthenticated: true,
    partialFailureRecovery: true,
    invalidCursorRecovery: true,
    representativeMutations: [
      "profile-update",
      "address-set-default",
      "order-cancel",
      "wishlist-remove",
      "notification-read",
      "return-cancel",
      "warranty-create",
    ],
    mutationIdempotencyObserved: true,
    browser: browserVerified,
    browserWidths: browserVerified ? [320, 1200] : [],
    axeRuns,
    rtl: true,
    reflow400EquivalentCssWidth: 320,
    runtimeMutation: false,
    graphWork: "RETIRED_AND_OUT_OF_SCOPE",
    finalClosureDeferredTo64I: true,
  }, null, 2));
} finally {
  server.kill("SIGTERM");
  await new Promise((done) => api.close(done));
}

async function postForm(pathname, values, label) {
  const response = await fetch(origin + pathname, {
    method: "POST",
    headers: {
      ...authHeader,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(values),
    redirect: "manual",
  });
  assert(response.status >= 200 && response.status < 400, label + "_STATUS:" + response.status);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error("STEP64_H_STOREFRONT_START_TIMEOUT\n" + logs);
}

async function assertPageBasics(page, label) {
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl", "STEP64_H_RTL:" + label);
  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    root: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert(metrics.root <= metrics.viewport + 1, "STEP64_H_ROOT_OVERFLOW:" + label + ":" + JSON.stringify(metrics));
  assert(metrics.body <= metrics.viewport + 1, "STEP64_H_BODY_OVERFLOW:" + label + ":" + JSON.stringify(metrics));
  await page.locator("main h1").first().waitFor();
}

async function runAxe(page, axe, label) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const result = await globalThis.axe.run(document, { resultTypes: ["violations"] });
    return result.violations
      .filter((violation) => violation.tags.some((tag) => tag.startsWith("wcag")))
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => node.target),
      }));
  });
  assert.equal(violations.length, 0, "STEP64_H_AXE:" + label + ":" + JSON.stringify(violations));
}
