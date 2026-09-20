import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { HomeProductList } from "../app/features/home/home-data.server.js";
import {
  deriveHomeMerchandising,
  formatToman,
  productMerchandisingHref,
} from "../app/features/home/home-merchandising.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");

const projectionSource = readFileSync(resolve(storefrontRoot, "app/features/home/home-merchandising.ts"), "utf8");
const componentSource = readFileSync(resolve(storefrontRoot, "app/features/home/HomeMerchandising.tsx"), "utf8");
const homeRouteSource = readFileSync(resolve(storefrontRoot, "app/routes/home.tsx"), "utf8");
const productRouteSource = readFileSync(resolve(storefrontRoot, "app/routes/product.tsx"), "utf8");
const articlesRouteSource = readFileSync(resolve(storefrontRoot, "app/routes/articles.tsx"), "utf8");
const wholesaleRouteSource = readFileSync(resolve(storefrontRoot, "app/routes/wholesale.tsx"), "utf8");
const css = readFileSync(resolve(storefrontRoot, "app/styles/home.css"), "utf8");
const messages = readFileSync(resolve(storefrontRoot, "app/i18n/fa-IR.ts"), "utf8");

const products = {
  items: [
    product("product-1", "محصول یک", 1250000, true, true, 1),
    {
      ...product("invalid-price", "محصول نامعتبر", 2000000, true, true, 2),
      price: { current_toman: Number.NaN },
    },
    product("product-3", "محصول سه", 2350000, true, false, 3),
    product("product-4", "محصول چهار", 3450000, false, true, 4),
    product("product-5", "محصول پنج", 4550000, true, true, 5),
    product("product-6", "محصول شش", 5650000, true, true, 6),
    product("product-7", "محصول هفت", 6750000, true, true, 7),
    product("product-8", "محصول هشت", 7850000, true, true, 8),
  ],
  pagination: { next_cursor: null, has_more: false },
} as HomeProductList;

const merchandising = deriveHomeMerchandising(products);
assert.deepEqual(
  merchandising.map((item) => item.slug),
  ["product-1", "product-3", "product-4", "product-5", "product-6", "product-7"],
  "STEP59_E_AUTHORITATIVE_ORDER_OR_LIMIT_INVALID",
);
assert.equal(merchandising.length, 6, "STEP59_E_PRODUCT_LIMIT_INVALID");
assert.equal(
  productMerchandisingHref({ slug: "coffee tool" }),
  "/product/coffee%20tool",
  "STEP59_E_PRODUCT_HREF_INVALID",
);
assert.equal(formatToman(1250000), "۱٬۲۵۰٬۰۰۰ تومان", "STEP59_E_TOMAN_FORMAT_INVALID");

for (const forbidden of [
  "sort(",
  ".sort(",
  "rank",
  "score",
  "recommendation",
  "recommended",
]) {
  assert.equal(
    projectionSource.toLowerCase().includes(forbidden.toLowerCase()),
    false,
    "STEP59_E_CLIENT_RANKING_FORBIDDEN:" + forbidden,
  );
}

for (const forbidden of [
  'request("get"',
  "fetch(",
  "<img",
  "<picture",
  "src=",
]) {
  assert.equal(
    componentSource.includes(forbidden),
    false,
    "STEP59_E_UNBOUNDED_COMPONENT_BEHAVIOR:" + forbidden,
  );
}

assert.match(componentSource, /productMediaPlaceholder/);
assert.match(componentSource, /currentToman/);
assert.match(componentSource, /salesEnabled/);
assert.match(componentSource, /inStock/);
assert.match(componentSource, /to="\/articles"/);
assert.match(componentSource, /to="\/wholesale"/);
assert.match(homeRouteSource, /<HomeMerchandising/);

for (const phrase of [
  "محصول‌هایی برای شروع",
  "رسانه محصول",
  "تومان",
  "موجود",
  "ناموجود",
  "فروش این محصول فعلاً متوقف است",
  "راهنمای خرید تجهیزات",
  "خرید عمده برای کافه و کسب‌وکار",
]) {
  assert(messages.includes(phrase), "STEP59_E_MESSAGE_MISSING:" + phrase);
}

for (const forbiddenPhrase of ["جشنواره", "خرید اول", "اولین خرید", "کیف پول", "٪"]) {
  assert.equal(
    messages.includes(forbiddenPhrase),
    false,
    "STEP59_E_UNVERIFIED_PROMOTION_OR_WALLET_FOUND:" + forbiddenPhrase,
  );
}

assert.match(productRouteSource, /targetStep=\{61\}/);
assert.match(articlesRouteSource, /targetStep=\{66\}/);
assert.match(wholesaleRouteSource, /targetStep=\{65\}/);

for (const token of [
  ".home-merchandising",
  ".home-product-grid",
  ".home-product-card",
  ".home-product-card__media",
  ".home-promotions",
  ".home-promotion-grid",
  "min-block-size: var(--eq-size-touch-min)",
  "min-inline-size: var(--eq-size-touch-min)",
  "@media (min-width: 600px)",
  "@media (min-width: 840px)",
]) {
  assert(css.includes(token), "STEP59_E_CSS_CONTRACT_MISSING:" + token);
}
assert.equal(/\bbrown\b/i.test(css), false, "STEP59_E_BROWN_FORBIDDEN");
assert.equal(
  /(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css),
  false,
  "STEP59_E_PHYSICAL_RTL_PROPERTY_FOUND",
);
assert.equal(/flex-direction\s*:\s*row-reverse/i.test(css), false, "STEP59_E_ROW_REVERSE_FORBIDDEN");

let unexpectedApiPaths: string[] = [];
const apiServer = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/products") {
    sendJson(response, 200, products);
    return;
  }
  unexpectedApiPaths.push(`${request.method ?? "UNKNOWN"} ${url.pathname}`);
  sendJson(response, 404, { error: "unexpected" });
});

await new Promise<void>((resolvePromise, rejectPromise) => {
  apiServer.once("error", rejectPromise);
  apiServer.listen(0, "127.0.0.1", resolvePromise);
});

const address = apiServer.address();
assert.ok(address && typeof address === "object");
const storefrontPort = 41741;
const apiBaseUrl = `http://127.0.0.1:${address.port}`;
const server = process.platform === "win32"
  ? spawn(
      "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        [
          'set "HOST=127.0.0.1"',
          `set "PORT=${storefrontPort}"`,
          'set "NODE_ENV=production"',
          `set "EQCOFE_API_BASE_URL=${apiBaseUrl}"`,
          'set "EQCOFE_API_TIMEOUT_MS=2500"',
          "pnpm exec react-router-serve ./build/server/index.js",
        ].join("&&"),
      ],
      { cwd: storefrontRoot, stdio: ["ignore", "pipe", "pipe"] },
    )
  : spawn(
      "env",
      [
        "HOST=127.0.0.1",
        `PORT=${storefrontPort}`,
        "NODE_ENV=production",
        `EQCOFE_API_BASE_URL=${apiBaseUrl}`,
        "EQCOFE_API_TIMEOUT_MS=2500",
        "pnpm",
        "exec",
        "react-router-serve",
        "./build/server/index.js",
      ],
      { cwd: storefrontRoot, stdio: ["ignore", "pipe", "pipe"] },
    );

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

try {
  await waitForStorefront();
  const response = await requestStorefront("/");
  assert.equal(response.status, 200, "STEP59_E_HOME_SSR_FAILED");

  const html = response.body;
  for (const expected of [
    "محصول‌هایی برای شروع",
    "محصول یک",
    "محصول سه",
    "محصول چهار",
    "محصول پنج",
    "محصول شش",
    "محصول هفت",
    "رسانه محصول",
    "تومان",
    "موجود",
    "ناموجود",
    "فروش این محصول فعلاً متوقف است",
    "راهنمای خرید تجهیزات",
    "خرید عمده برای کافه و کسب‌وکار",
    'href="/product/product-1"',
    'href="/product/product-7"',
    'href="/articles"',
    'href="/wholesale"',
  ]) {
    assert(html.includes(expected), "STEP59_E_RENDERED_CONTENT_MISSING:" + expected);
  }

  assert.equal(html.includes("محصول نامعتبر"), false, "STEP59_E_INVALID_PRODUCT_RENDERED");
  assert.equal(html.includes("محصول هشت"), false, "STEP59_E_LIMIT_NOT_ENFORCED");
  assert.equal(html.includes("جشنواره"), false, "STEP59_E_UNVERIFIED_CAMPAIGN_RENDERED");
  assert.equal(html.includes("خرید اول"), false, "STEP59_E_FIRST_PURCHASE_RENDERED");
  assert.deepEqual(unexpectedApiPaths, [], "STEP59_E_UNEXPECTED_API_CALLS");

  console.log(JSON.stringify({
    status: "PASS",
    stage: "59-E",
    merchandisingSource: "authoritative_GET_products_ready_state",
    renderedProductCount: merchandising.length,
    responseOrderPreserved: true,
    clientRanking: "ABSENT",
    priceUnit: "TOMAN",
    inventedMedia: "ABSENT",
    promotionalEntries: ["/articles", "/wholesale"],
    firstPurchaseCampaign: "NOT_IMPLEMENTED_NO_CANONICAL_EVIDENCE",
    downstreamBoundaries: {
      product: "STEP_61_PLACEHOLDER",
      wholesale: "STEP_65_PLACEHOLDER",
      articles: "STEP_66_PLACEHOLDER",
    },
  }, null, 2));
} finally {
  server.kill("SIGTERM");
  await new Promise<void>((resolvePromise) => apiServer.close(() => resolvePromise()));
}

function product(
  slug: string,
  name: string,
  currentToman: number,
  salesEnabled: boolean,
  inStock: boolean,
  index: number,
) {
  return {
    id: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
    slug,
    name,
    brand: { id: `brand-${index}`, name_fa: `برند ${index}`, slug: `brand-${index}` },
    primary_category: {
      id: `category-${index}`,
      name_fa: `دسته ${index}`,
      slug: `category-${index}`,
    },
    price: { current_toman: currentToman },
    availability: { sales_enabled: salesEnabled, in_stock: inStock },
  };
}

async function waitForStorefront() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await requestStorefront("/");
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error("STEP59_E_SERVER_START_TIMEOUT\n" + serverOutput);
}

function requestStorefront(pathname: string) {
  return new Promise<{ status: number; body: string }>((resolvePromise, rejectPromise) => {
    const url = new URL(pathname, `http://127.0.0.1:${storefrontPort}`);
    const req = http.get(url, { headers: { accept: "text/html" } }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolvePromise({ status: response.statusCode ?? 0, body }));
    });
    req.on("error", rejectPromise);
  });
}

function sendJson(response: http.ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}
