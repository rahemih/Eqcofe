import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { HomeProductList } from "../app/features/home/home-data.server.js";
import {
  brandDiscoveryHref,
  categoryDiscoveryHref,
  deriveHomeDiscovery,
} from "../app/features/home/home-discovery.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");

const projectionSource = readFileSync(resolve(storefrontRoot, "app/features/home/home-discovery.ts"), "utf8");
const componentSource = readFileSync(resolve(storefrontRoot, "app/features/home/HomeDiscovery.tsx"), "utf8");
const homeRouteSource = readFileSync(resolve(storefrontRoot, "app/routes/home.tsx"), "utf8");
const categoryRouteSource = readFileSync(resolve(storefrontRoot, "app/routes/category.tsx"), "utf8");
const searchRouteSource = readFileSync(resolve(storefrontRoot, "app/routes/search.tsx"), "utf8");
const css = readFileSync(resolve(storefrontRoot, "app/styles/home.css"), "utf8");
const messages = readFileSync(resolve(storefrontRoot, "app/i18n/fa-IR.ts"), "utf8");

const products = {
  items: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      slug: "sample-one",
      name: "نمونه یک",
      brand: { id: "brand-1", name_fa: "برند آلفا", slug: "alpha" },
      primary_category: { id: "category-1", name_fa: "ابزار دم‌آوری", slug: "brewing-tools" },
      price: { current_toman: 1250000 },
      availability: { sales_enabled: true, in_stock: false },
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      slug: "sample-two",
      name: "نمونه دو",
      brand: { id: "brand-1", name_fa: "برند آلفا", slug: "alpha" },
      primary_category: { id: "category-2", name_fa: "آسیاب", slug: "grinders" },
      price: { current_toman: 2250000 },
      availability: { sales_enabled: true, in_stock: true },
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      slug: "sample-three",
      name: "نمونه سه",
      brand: { id: "brand-2", name_fa: "برند بتا", slug: "beta" },
      primary_category: { id: "category-1", name_fa: "ابزار دم‌آوری", slug: "brewing-tools" },
      price: { current_toman: 3250000 },
      availability: { sales_enabled: true, in_stock: true },
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      slug: "sample-four",
      name: "نمونه چهار",
      brand: { id: "", name_fa: "ناقص", slug: "broken" },
      primary_category: { id: "broken-category", name_fa: "", slug: "broken" },
      price: { current_toman: 4250000 },
      availability: { sales_enabled: true, in_stock: true },
    },
  ],
  pagination: { next_cursor: null, has_more: false },
} as HomeProductList;

const projection = deriveHomeDiscovery(products);
assert.deepEqual(
  projection.categories.map((item) => [item.id, item.nameFa, item.slug]),
  [
    ["category-1", "ابزار دم‌آوری", "brewing-tools"],
    ["category-2", "آسیاب", "grinders"],
  ],
  "STEP59_D_CATEGORY_PROJECTION_INVALID",
);
assert.deepEqual(
  projection.brands.map((item) => [item.id, item.nameFa, item.slug]),
  [
    ["brand-1", "برند آلفا", "alpha"],
    ["brand-2", "برند بتا", "beta"],
  ],
  "STEP59_D_BRAND_PROJECTION_INVALID",
);
assert.equal(
  categoryDiscoveryHref({ id: "c", nameFa: "تست", slug: "brewing tools" }),
  "/category/brewing%20tools",
);
assert.equal(
  brandDiscoveryHref({ id: "b", nameFa: "برند آلفا", slug: "alpha" }),
  "/search?q=%D8%A8%D8%B1%D9%86%D8%AF%20%D8%A2%D9%84%D9%81%D8%A7",
);

for (const forbidden of [
  'request("get", "/categories"',
  'request("get", "/brands"',
  'fetch("/categories',
  'fetch("/brands',
]) {
  assert.equal(projectionSource.includes(forbidden), false, "STEP59_D_DIRECT_TAXONOMY_API_FORBIDDEN:" + forbidden);
  assert.equal(componentSource.includes(forbidden), false, "STEP59_D_COMPONENT_API_FORBIDDEN:" + forbidden);
}
assert.match(projectionSource, /typeof value === "object"/);
assert.match(projectionSource, /value\.name_fa/);
assert.match(projectionSource, /new Set<string>\(\)/);
assert.equal(/rank|score|recommended|recommendation/i.test(projectionSource), false, "STEP59_D_CLIENT_RANKING_FORBIDDEN");

assert.match(homeRouteSource, /<h1 id="home-title">/);
assert.equal((homeRouteSource.match(/<h1\b/g) ?? []).length, 1, "STEP59_D_HOME_H1_INVALID");
assert.equal(homeRouteSource.includes("RoutePlaceholder"), false, "STEP59_D_HOME_PLACEHOLDER_STILL_ACTIVE");
assert.match(homeRouteSource, /const products = selectHomeProducts\(loaderData\.productPreview\)/);
assert.match(homeRouteSource, /products \? <HomeDiscovery products=\{products\}/);
assert.match(categoryRouteSource, /targetStep=\{60\}/);
assert.match(searchRouteSource, /targetStep=\{60\}/);

for (const token of [
  ".home-page",
  ".home-discovery",
  ".home-discovery__list",
  "min-block-size: var(--eq-size-touch-min)",
  "min-inline-size: var(--eq-size-touch-min)",
  "@media (min-width: 600px)",
  "@media (min-width: 840px)",
]) {
  assert(css.includes(token), "STEP59_D_CSS_CONTRACT_MISSING:" + token);
}
assert.equal(/\bbrown\b/i.test(css), false, "STEP59_D_BROWN_FORBIDDEN");
assert.equal(/(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css), false, "STEP59_D_PHYSICAL_RTL_PROPERTY_FOUND");
assert.equal(/flex-direction\s*:\s*row-reverse/i.test(css), false, "STEP59_D_ROW_REVERSE_FORBIDDEN");

for (const phrase of [
  "دسته‌های قابل مرور",
  "برندهای قابل جست‌وجو",
  "رتبه‌بندی یا پیشنهاد ساختگی",
]) {
  assert(messages.includes(phrase), "STEP59_D_MESSAGE_MISSING:" + phrase);
}

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
const storefrontPort = 41739;
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
      {
        cwd: storefrontRoot,
        stdio: ["ignore", "pipe", "pipe"],
      },
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
      {
        cwd: storefrontRoot,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

try {
  await waitForStorefront();

  const response = await requestStorefront("/");
  assert.equal(response.status, 200, "STEP59_D_HOME_SSR_FAILED");
  assert.equal((response.body.match(/<h1\b/g) ?? []).length, 1, "STEP59_D_RENDERED_H1_INVALID");
  assert(response.body.includes("دسته‌های قابل مرور"), "STEP59_D_RENDERED_CATEGORIES_MISSING");
  assert(response.body.includes("برندهای قابل جست‌وجو"), "STEP59_D_RENDERED_BRANDS_MISSING");
  assert(response.body.includes('href="/category/brewing-tools"'), "STEP59_D_CATEGORY_LINK_MISSING");
  assert(response.body.includes('href="/search?q='), "STEP59_D_BRAND_SEARCH_LINK_MISSING");
  assert.equal(response.body.includes("زیرساخت مسیر آماده است"), false, "STEP59_D_HOME_PLACEHOLDER_RENDERED");
  assert.deepEqual(unexpectedApiPaths, [], "STEP59_D_UNEXPECTED_API_CALLS");

  console.log(JSON.stringify({
    status: "PASS",
    stage: "59-D",
    discoverySource: "authoritative_GET_products_projection",
    categories: projection.categories.length,
    brands: projection.brands.length,
    directTaxonomyListApiCalls: 0,
    clientRanking: "ABSENT",
    destinations: {
      category: "/category/:slug",
      brand: "/search?q=<name_fa>",
    },
    verified: {
      malformedUnknownRefsIgnoredFailClosed: true,
      duplicateRefsRemovedById: true,
      authoritativeFirstOccurrencePreserved: true,
      homePlaceholderRemoved: true,
      oneHomeH1: true,
      rtlLogicalCss: true,
      touchTargetMinimum: true,
      step60RoutesRemainPlaceholders: true,
    },
  }, null, 2));
} finally {
  server.kill("SIGTERM");
  await new Promise<void>((resolvePromise) => apiServer.close(() => resolvePromise()));
}

async function waitForStorefront() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await requestStorefront("/");
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error("STEP59_D_SERVER_START_TIMEOUT\n" + serverOutput);
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
