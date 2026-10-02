import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const appPort = 41762;
const origin = `http://127.0.0.1:${appPort}`;
const categoryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherCategoryId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const p1 = "11111111-1111-4111-8111-111111111111";
const p2 = "22222222-2222-4222-8222-222222222222";
const p3 = "33333333-3333-4333-8333-333333333333";
const p4 = "44444444-4444-4444-8444-444444444444";
const observed = [];
const wishlist = new Set();

const products = [
  card(p1, "آسیاب یک", "grinder-one", categoryId, "آسیاب", 910000),
  card(p2, "آسیاب دو", "grinder-two", categoryId, "آسیاب", 1140000),
  card(p3, "آسیاب سه", "grinder-three", categoryId, "آسیاب", 1280000),
  card(p4, "کمکس نمونه", "chemex-sample", otherCategoryId, "دم‌آوری", 760000),
];

const facets = {
  filtering_available: true,
  disabled_reason: null,
  brands: [],
  price_range: { min_toman: 760000, max_toman: 1280000 },
  availability: { in_stock_count: 4, out_of_stock_count: 0 },
};

function card(id, name, slug, primaryCategoryId, categoryName, price) {
  return {
    id,
    slug,
    name,
    brand: null,
    primary_category: { id: primaryCategoryId, name_fa: categoryName, slug: primaryCategoryId === categoryId ? "grinders" : "brewing" },
    primary_image: null,
    price: { current_toman: price },
    availability: { sales_enabled: true, in_stock: true },
  };
}

function comparisonProduct(item) {
  return {
    id: item.id,
    name_fa: item.name,
    slug: item.slug,
    primary_category_id: item.primary_category.id,
    category_name: item.primary_category.name_fa,
    variants: [],
    price: item.price,
    specifications: [
      {
        attribute_id: "99999999-9999-4999-8999-999999999999",
        key: "material",
        name_fa: "جنس",
        unit: null,
        data_type: "text",
        is_filterable: true,
        is_comparable: true,
        attribute_value_id: item.id,
        value_text: item.id === p1 ? "استیل" : "آلومینیوم",
        value_numeric: null,
        value_boolean: null,
        normalized_value: item.id === p1 ? "steel" : "aluminium",
      },
    ],
  };
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function bodyJson(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function isAuthenticated(request) {
  return String(request.headers.cookie ?? "").includes("eqcofe_session=auth-session");
}

const api = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const record = {
    method: request.method,
    path: url.pathname,
    search: url.search,
    cookie: String(request.headers.cookie ?? ""),
    idempotencyKey: String(request.headers["idempotency-key"] ?? ""),
    body: null,
  };

  if (request.method === "GET" && url.pathname === "/search") {
    observed.push(record);
    return json(response, 200, {
      query: url.searchParams.get("q"),
      items: products,
      pagination: { next_cursor: null, has_more: false },
      facets,
    });
  }

  if (request.method === "POST" && (url.pathname === "/compare/validate" || url.pathname === "/compare")) {
    record.body = await bodyJson(request);
    observed.push(record);
    const ids = record.body.product_ids ?? [];
    const selected = ids.map((id) => products.find((item) => item.id === id)).filter(Boolean);
    const sameCategory = selected.length === ids.length
      && selected.every((item) => item.primary_category.id === selected[0]?.primary_category.id);
    if (!sameCategory) return json(response, 422, { code: "COMPARE_CATEGORY_MISMATCH", message: "mismatch" });
    if (url.pathname === "/compare/validate") {
      return json(response, 200, { valid: true, primary_category_id: selected[0].primary_category.id });
    }
    return json(response, 200, {
      primary_category_id: selected[0].primary_category.id,
      products: selected.map(comparisonProduct),
    });
  }

  if (url.pathname === "/customer/wishlist") {
    if (request.method === "GET") {
      observed.push(record);
      if (!isAuthenticated(request)) return json(response, 401, { code: "UNAUTHORIZED", message: "unauthorized" });
      return json(response, 200, {
        items: [...wishlist].map((product_id) => ({ product_id, added_at: "2026-10-02T00:00:00.000Z" })),
      });
    }
  }

  const wishlistMatch = url.pathname.match(/^\/customer\/wishlist\/([0-9a-f-]+)$/i);
  if (wishlistMatch && (request.method === "POST" || request.method === "DELETE")) {
    record.body = await bodyJson(request).catch(() => ({}));
    observed.push(record);
    if (!isAuthenticated(request)) return json(response, 401, { code: "UNAUTHORIZED", message: "unauthorized" });
    assert(record.idempotencyKey, "STEP62_H_IDEMPOTENCY_KEY_MISSING");
    const productId = wishlistMatch[1];
    if (request.method === "POST") {
      const already = wishlist.has(productId);
      wishlist.add(productId);
      return json(response, 200, { added: true, product_id: productId, already_present: already });
    }
    wishlist.delete(productId);
    response.writeHead(204);
    response.end();
    return;
  }

  observed.push(record);
  return json(response, 404, { code: "NOT_FOUND", message: "not found" });
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

try {
  await waitForServer();

  const searchPath = "/search?q=" + encodeURIComponent("آسیاب");
  const search = await fetch(origin + searchPath);
  assert.equal(search.status, 200, "STEP62_H_SEARCH_STATUS");
  const searchHtml = await search.text();
  for (const fragment of ["آسیاب یک", "آسیاب دو", "کمکس نمونه", "انتخاب برای مقایسه", "افزودن به علاقه‌مندی‌ها"]) {
    assert(searchHtml.includes(fragment), `STEP62_H_SEARCH_CONTENT:${fragment}`);
  }

  const validComparePath = `/compare?product=${p1}&product=${p2}`;
  const compareStart = observed.length;
  const compare = await fetch(origin + validComparePath);
  assert.equal(compare.status, 200, "STEP62_H_COMPARE_STATUS");
  const compareHtml = await compare.text();
  for (const fragment of ["ویژگی‌های قابل مقایسه و قیمت فعلی محصولات", "آسیاب یک", "آسیاب دو", "جنس", "قیمت فعلی"]) {
    assert(compareHtml.includes(fragment), `STEP62_H_COMPARE_CONTENT:${fragment}`);
  }
  const compareCalls = observed.slice(compareStart).filter((item) => item.path.startsWith("/compare"));
  assert.deepEqual(compareCalls.map((item) => `${item.method} ${item.path}`), ["POST /compare/validate", "POST /compare"]);
  assert.deepEqual(compareCalls[0].body.product_ids, [p1, p2]);

  const invalidStart = observed.length;
  const invalid = await fetch(origin + `/compare?product=${p1}&product=${p1}`);
  assert.equal(invalid.status, 200, "STEP62_H_INVALID_COMPARE_STATUS");
  const invalidHtml = await invalid.text();
  assert(invalidHtml.includes("نشانی مقایسه معتبر نیست"), "STEP62_H_INVALID_COMPARE_STATE");
  assert.equal(
    observed.slice(invalidStart).filter((item) => item.path.startsWith("/compare")).length,
    0,
    "STEP62_H_INVALID_COMPARE_SHOULD_NOT_CALL_BACKEND",
  );

  const guestWishlist = await fetch(origin + "/actions/wishlist");
  assert.equal(guestWishlist.status, 200, "STEP62_H_GUEST_WISHLIST_LOADER_STATUS");
  assert((await guestWishlist.text()).includes("unauthenticated"), "STEP62_H_GUEST_WISHLIST_STATE");

  const guestMutation = await fetch(origin + "/actions/wishlist", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ intent: "wishlist-add", product_id: p1, current_wishlisted: "0" }),
  });
  assert.equal(guestMutation.status, 401, "STEP62_H_GUEST_WISHLIST_MUTATION_STATUS");
  assert((await guestMutation.text()).includes("وارد حساب مشتری"), "STEP62_H_GUEST_WISHLIST_FEEDBACK");

  const authHeaders = { cookie: "eqcofe_session=auth-session" };
  const authSnapshot = await fetch(origin + "/actions/wishlist", { headers: authHeaders });
  assert.equal(authSnapshot.status, 200, "STEP62_H_AUTH_WISHLIST_LOADER_STATUS");
  assert((await authSnapshot.text()).includes('"status":"ready"'), "STEP62_H_AUTH_WISHLIST_READY");

  const authAdd = await fetch(origin + "/actions/wishlist", {
    method: "POST",
    headers: { ...authHeaders, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ intent: "wishlist-add", product_id: p1, current_wishlisted: "0" }),
  });
  assert.equal(authAdd.status, 200, "STEP62_H_AUTH_WISHLIST_ADD_STATUS");
  assert((await authAdd.text()).includes("محصول به علاقه‌مندی‌های شما افزوده شد"), "STEP62_H_AUTH_WISHLIST_ADD_FEEDBACK");

  const authRemove = await fetch(origin + "/actions/wishlist", {
    method: "POST",
    headers: { ...authHeaders, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ intent: "wishlist-remove", product_id: p1, current_wishlisted: "1" }),
  });
  assert.equal(authRemove.status, 200, "STEP62_H_AUTH_WISHLIST_REMOVE_STATUS");
  assert((await authRemove.text()).includes("محصول از علاقه‌مندی‌های شما حذف شد"), "STEP62_H_AUTH_WISHLIST_REMOVE_FEEDBACK");

  const mutationCalls = observed.filter((item) =>
    (item.method === "POST" || item.method === "DELETE")
    && item.path.startsWith("/customer/wishlist/")
  );
  assert(mutationCalls.length >= 3, "STEP62_H_WISHLIST_MUTATION_CALLS_MISSING");
  assert(mutationCalls.filter((item) => item.cookie.includes("eqcofe_session=auth-session")).every((item) => item.idempotencyKey), "STEP62_H_AUTH_IDEMPOTENCY_TRANSPORT");

  wishlist.clear();

  let browserVerified = false;
  let axeRuns = 0;
  if (process.env.EQCOFE_BROWSER_QA_ROOT) {
    const qaRequire = createRequire(resolve(process.env.EQCOFE_BROWSER_QA_ROOT, "package.json"));
    const { chromium } = qaRequire("playwright");
    const axe = qaRequire("axe-core");
    const browser = await chromium.launch({ headless: true });
    try {
      const guestContext = await browser.newContext({ viewport: { width: 320, height: 900 }, locale: "fa-IR" });
      const guestPage = await guestContext.newPage();
      await guestPage.goto(origin + searchPath, { waitUntil: "networkidle" });
      assert.equal(await guestPage.locator("html").getAttribute("dir"), "rtl");
      await runAxe(guestPage, axe, "guest-search");
      axeRuns += 1;

      const firstCard = guestPage.locator(".listing-card").filter({ hasText: "آسیاب یک" });
      const secondCard = guestPage.locator(".listing-card").filter({ hasText: "آسیاب دو" });
      const otherCard = guestPage.locator(".listing-card").filter({ hasText: "کمکس نمونه" });

      const guestWishButton = firstCard.getByRole("button", { name: "افزودن به علاقه‌مندی‌ها" });
      await guestWishButton.click();
      await firstCard.getByText("برای ذخیره یا حذف محصول از علاقه‌مندی‌ها باید وارد حساب مشتری شوید.").waitFor();
      assert.equal(await guestWishButton.getAttribute("aria-pressed"), "false");

      await secondCard.getByRole("button", { name: "انتخاب برای مقایسه" }).click();
      const blocked = otherCard.getByRole("button", { name: "انتخاب برای مقایسه" });
      assert.equal(await blocked.getAttribute("aria-disabled"), "true", "STEP62_H_MISMATCH_ARIA_DISABLED");
      const reasonId = await blocked.getAttribute("aria-describedby");
      assert(reasonId, "STEP62_H_MISMATCH_REASON_ID_MISSING");
      assert.equal(
        await guestPage.locator(`#${reasonId}`).textContent(),
        "این محصول با دسته انتخاب‌های فعلی سازگار نیست.",
        "STEP62_H_MISMATCH_REASON_TEXT",
      );
      await blocked.focus();
      assert(await blocked.evaluate((element) => document.activeElement === element), "STEP62_H_ARIA_DISABLED_NOT_FOCUSABLE");

      await firstCard.getByRole("button", { name: "انتخاب برای مقایسه" }).click();
      await guestPage.getByText("۲ از ۴ محصول انتخاب شده است.").waitFor();
      const compareLink = guestPage.getByRole("link", { name: "مقایسه ۲ محصول" });
      await compareLink.click();
      await guestPage.waitForURL((url) =>
        url.pathname === "/compare"
        && url.searchParams.getAll("product").join(",") === [p1, p2].join(",")
      );
      await guestPage.getByRole("heading", { name: /مقایسه .* محصول/ }).waitFor();
      const region = guestPage.locator(".compare-table-wrap");
      assert.equal(await region.getAttribute("tabindex"), "0", "STEP62_H_COMPARE_REGION_FOCUSABLE");
      await region.focus();
      assert(await region.evaluate((element) => document.activeElement === element), "STEP62_H_COMPARE_REGION_FOCUS_FAILED");
      const overflow = await region.evaluate((element) => ({
        scroll: element.scrollWidth,
        client: element.clientWidth,
        root: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      assert(overflow.scroll > overflow.client, "STEP62_H_COMPARE_REGION_NOT_SCROLLABLE_320");
      assert(overflow.root <= overflow.viewport + 1, "STEP62_H_ROOT_HORIZONTAL_OVERFLOW_320");
      await runAxe(guestPage, axe, "compare-320");
      axeRuns += 1;

      const compareBackendBeforeRemove = observed.filter((item) => item.path.startsWith("/compare")).length;
      await guestPage.getByRole("link", { name: "حذف آسیاب یک از مقایسه" }).click();
      await guestPage.getByText("هنوز محصول کافی برای مقایسه انتخاب نشده است").waitFor();
      const compareBackendAfterRemove = observed.filter((item) => item.path.startsWith("/compare")).length;
      assert.equal(compareBackendAfterRemove, compareBackendBeforeRemove, "STEP62_H_SINGLE_COMPARE_SHOULD_NOT_CALL_BACKEND");
      await guestContext.close();

      const authContext = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: "fa-IR" });
      await authContext.addCookies([{
        name: "eqcofe_session",
        value: "auth-session",
        url: origin,
        httpOnly: true,
        sameSite: "Lax",
      }]);
      const authPage = await authContext.newPage();
      await authPage.goto(origin + searchPath, { waitUntil: "networkidle" });
      const authFirst = authPage.locator(".listing-card").filter({ hasText: "آسیاب یک" });
      const actionButton = authFirst.locator(".wishlist-action__button");
      assert.equal((await actionButton.textContent())?.trim(), "افزودن به علاقه‌مندی‌ها");
      await actionButton.click();
      await authFirst.getByText("محصول به علاقه‌مندی‌های شما افزوده شد.").waitFor();
      assert.equal(await actionButton.getAttribute("aria-pressed"), "true");
      assert.equal((await actionButton.textContent())?.trim(), "حذف از علاقه‌مندی‌ها");

      await actionButton.click();
      await authFirst.getByText("محصول از علاقه‌مندی‌های شما حذف شد.").waitFor();
      assert.equal(await actionButton.getAttribute("aria-pressed"), "false");
      assert.equal((await actionButton.textContent())?.trim(), "افزودن به علاقه‌مندی‌ها");

      await actionButton.click();
      await authFirst.getByText("محصول به علاقه‌مندی‌های شما افزوده شد.").waitFor();
      await authPage.reload({ waitUntil: "networkidle" });
      const reloadedFirst = authPage.locator(".listing-card").filter({ hasText: "آسیاب یک" });
      await reloadedFirst.getByRole("button", { name: "حذف از علاقه‌مندی‌ها" }).waitFor();
      assert.equal(await reloadedFirst.getByRole("button", { name: "حذف از علاقه‌مندی‌ها" }).getAttribute("aria-pressed"), "true");
      assert((await authPage.evaluate(() => ({
        root: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }))).root <= 1201, "STEP62_H_ROOT_HORIZONTAL_OVERFLOW_1200");
      await runAxe(authPage, axe, "authenticated-wishlist");
      axeRuns += 1;
      await authContext.close();

      browserVerified = true;
    } finally {
      await browser.close();
    }
  }

  assert(observed.some((item) => item.path === "/compare/validate"), "STEP62_H_VALIDATE_NOT_OBSERVED");
  assert(observed.some((item) => item.path === "/compare"), "STEP62_H_COMPARE_NOT_OBSERVED");
  assert(observed.some((item) => item.path === "/customer/wishlist" && item.method === "GET"), "STEP62_H_WISHLIST_GET_NOT_OBSERVED");
  assert(observed.some((item) => item.path === `/customer/wishlist/${p1}` && item.method === "POST"), "STEP62_H_WISHLIST_ADD_NOT_OBSERVED");
  assert(observed.some((item) => item.path === `/customer/wishlist/${p1}` && item.method === "DELETE"), "STEP62_H_WISHLIST_REMOVE_NOT_OBSERVED");

  console.log(JSON.stringify({
    status: "PASS",
    stage: "62-H",
    integrated: [
      "listing-compare-selection",
      "same-category-local-guard",
      "deterministic-compare-url",
      "backend-compare-validation",
      "compare-result-table",
      "compare-remove-to-empty",
      "guest-wishlist-auth-boundary",
      "authenticated-wishlist-membership",
      "wishlist-add-remove-idempotency",
      "wishlist-reload-authority",
      "rtl",
      "responsive-reflow",
      "keyboard-scroll-region",
      "axe-wcag",
    ],
    ssrApiAcceptance: true,
    browser: browserVerified,
    browserWidths: browserVerified ? [320, 1200] : [],
    axeRuns,
    backendAuthorityPreserved: true,
    browserAuthAuthorityInvented: false,
    finalClosureDeferredTo62I: true,
  }));
} finally {
  server.kill("SIGTERM");
  await new Promise((done) => api.close(done));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(origin, { headers: { accept: "text/html" } });
      if (response.ok) return;
    } catch {}
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error("STEP62_H_SERVER_START_FAILED\n" + logs.slice(-2000));
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
  assert.equal(violations.length, 0, "STEP62_H_AXE:" + label + ":" + JSON.stringify(violations));
}
