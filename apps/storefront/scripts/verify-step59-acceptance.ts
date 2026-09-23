import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const repoRoot = resolve(storefrontRoot, "../..");

const pkg = JSON.parse(readFileSync(resolve(storefrontRoot, "package.json"), "utf8"));
const home = readFileSync(resolve(storefrontRoot, "app/routes/home.tsx"), "utf8");
const search = readFileSync(resolve(storefrontRoot, "app/routes/search.tsx"), "utf8");
const searchProductionized = search.includes("loadSearchRouteData") && search.includes("<ListingGrid");
const category = readFileSync(resolve(storefrontRoot, "app/routes/category.tsx"), "utf8");
const categoryProductionized = category.includes("loadCategoryRouteData") && category.includes("<ListingGrid");
const product = readFileSync(resolve(storefrontRoot, "app/routes/product.tsx"), "utf8");
const wholesale = readFileSync(resolve(storefrontRoot, "app/routes/wholesale.tsx"), "utf8");
const articles = readFileSync(resolve(storefrontRoot, "app/routes/articles.tsx"), "utf8");
const shell = readFileSync(resolve(storefrontRoot, "app/shell/AppShell.tsx"), "utf8");
const searchEntry = readFileSync(resolve(storefrontRoot, "app/shell/SearchEntry.tsx"), "utf8");
const homeCss = readFileSync(resolve(storefrontRoot, "app/styles/home.css"), "utf8");
const lockfile = readFileSync(resolve(repoRoot, "pnpm-lock.yaml"), "utf8");

for (const stageScript of [
  "navigation:verify",
  "home-data:verify",
  "discovery:verify",
  "merchandising:verify",
  "home-state:verify",
  "step59:acceptance",
  "api:verify",
  "auth:verify",
  "state:verify",
  "quality:static",
]) {
  assert.equal(typeof pkg.scripts[stageScript], "string", "STEP59_G_VERIFY_SCRIPT_MISSING:" + stageScript);
  assert(pkg.scripts.verify.includes(`pnpm ${stageScript}`), "STEP59_G_VERIFY_CHAIN_MISSING:" + stageScript);
}

assert.match(shell, /<SearchEntry \/>/);
assert.match(searchEntry, /action="\/search"/);
assert.match(searchEntry, /method="get"/);
assert.match(searchEntry, /name="q"/);
assert.match(home, /<h1 id="home-title">/);
assert.equal((home.match(/<h1\b/g) ?? []).length, 1, "STEP59_G_HOME_H1_INVALID");
assert.equal(home.includes("RoutePlaceholder"), false, "STEP59_G_HOME_REGRESSED_TO_PLACEHOLDER");

assert(searchProductionized || /targetStep=\{60\}/.test(search), "STEP59_G_SEARCH_HANDOFF_INVALID");
assert(categoryProductionized || /targetStep=\{60\}/.test(category), "STEP59_G_CATEGORY_HANDOFF_INVALID");
assert.match(product, /targetStep=\{61\}/);
assert.match(wholesale, /targetStep=\{65\}/);
assert.match(articles, /targetStep=\{66\}/);

assert.equal(/\bbrown\b/i.test(homeCss), false, "STEP59_G_BROWN_FORBIDDEN");
assert.equal(/flex-direction\s*:\s*row-reverse/i.test(homeCss), false, "STEP59_G_ROW_REVERSE_FORBIDDEN");
assert.equal(
  /(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(homeCss),
  false,
  "STEP59_G_PHYSICAL_RTL_PROPERTY_FOUND",
);

for (const dependency of [
  "@react-router/node",
  "@react-router/serve",
  "react",
  "react-dom",
  "react-router",
  "isbot",
]) {
  assert.equal(typeof pkg.dependencies[dependency], "string", "STEP59_G_BASE_DEPENDENCY_MISSING:" + dependency);
}
assert(lockfile.includes("lockfileVersion:"), "STEP59_G_LOCKFILE_INVALID");

const products = {
  items: Array.from({ length: 7 }, (_, index) => {
    const n = index + 1;
    return {
      id: `10000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
      slug: `acceptance-product-${n}`,
      name: `محصول پذیرش ${n}`,
      brand: {
        id: `brand-${n}`,
        name_fa: `برند پذیرش ${n}`,
        slug: `acceptance-brand-${n}`,
      },
      primary_category: {
        id: `category-${n}`,
        name_fa: `دسته پذیرش ${n}`,
        slug: `acceptance-category-${n}`,
      },
      price: { current_toman: 1000000 + n * 100000 },
      availability: { sales_enabled: true, in_stock: n !== 2 },
    };
  }),
  pagination: { next_cursor: null, has_more: false },
};

const unexpectedApiPaths: string[] = [];
const apiServer = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/products") {
    sendJson(response, 200, products);
    return;
  }
  if (request.method === "GET" && url.pathname === "/search" && searchProductionized) {
    sendJson(response, 200, {
      query: url.searchParams.get("q") ?? "",
      items: products.items.slice(0, 1),
      pagination: { next_cursor: null, has_more: false },
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/categories/acceptance-category-1" && categoryProductionized) {
    sendJson(response, 200, {
      id: "category-1",
      parent_id: null,
      name_fa: "دسته پذیرش 1",
      slug: "acceptance-category-1",
      description: "شرح دسته پذیرش",
      status: "active",
      sales_enabled: true,
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/categories/acceptance-category-1/products" && categoryProductionized) {
    sendJson(response, 200, {
      items: products.items.slice(0, 2),
      pagination: { next_cursor: null, has_more: false },
    });
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
const port = 41743;
const apiBaseUrl = `http://127.0.0.1:${address.port}`;
const server = process.platform === "win32"
  ? spawn(
      "cmd.exe",
      ["/d", "/s", "/c", [
        'set "HOST=127.0.0.1"',
        `set "PORT=${port}"`,
        'set "NODE_ENV=production"',
        `set "EQCOFE_API_BASE_URL=${apiBaseUrl}"`,
        'set "EQCOFE_API_TIMEOUT_MS=2500"',
        "pnpm exec react-router-serve ./build/server/index.js",
      ].join("&&")],
      { cwd: storefrontRoot, stdio: ["ignore", "pipe", "pipe"] },
    )
  : spawn(
      "env",
      [
        "HOST=127.0.0.1",
        `PORT=${port}`,
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
  await waitForServer();

  const response = await request("/");
  assert.equal(response.status, 200, "STEP59_G_HOME_SSR_FAILED");
  const html = response.body;

  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, "STEP59_G_RENDERED_H1_INVALID");
  assert(html.includes('role="search"'), "STEP59_G_RENDERED_SEARCH_MISSING");
  assert(html.includes('action="/search"'), "STEP59_G_RENDERED_SEARCH_ACTION_INVALID");
  assert(html.includes('name="q"'), "STEP59_G_RENDERED_SEARCH_QUERY_INVALID");
  assert(html.includes('href="/category/acceptance-category-1"'), "STEP59_G_CATEGORY_HANDOFF_MISSING");
  assert(html.includes('href="/search?q='), "STEP59_G_BRAND_HANDOFF_MISSING");
  assert(html.includes('href="/product/acceptance-product-1"'), "STEP59_G_PRODUCT_HANDOFF_MISSING");
  assert(html.includes('href="/articles"'), "STEP59_G_BUYING_GUIDE_HANDOFF_MISSING");
  assert(html.includes('href="/wholesale"'), "STEP59_G_WHOLESALE_HANDOFF_MISSING");
  assert(html.includes("تومان"), "STEP59_G_TOMAN_MISSING");
  assert.equal(
    (html.match(/class="home-product-card"/g) ?? []).length,
    6,
    "STEP59_G_PRODUCT_CARD_LIMIT_INVALID",
  );
  assert.equal(html.includes('href="/product/acceptance-product-7"'), false, "STEP59_G_PRODUCT_LIMIT_NOT_ENFORCED");
  assert.deepEqual(unexpectedApiPaths, [], "STEP59_G_UNEXPECTED_API_CALLS");

  const searchDownstream = await request("/search?q=آسیاب");
  assert.equal(searchDownstream.status, 200, "STEP59_G_DOWNSTREAM_ROUTE_FAILED:/search");
  if (searchProductionized) {
    assert(searchDownstream.body.includes("نتایج جست‌وجو"), "STEP59_G_SEARCH_60D_PRODUCTION_HANDOFF_MISSING");
    assert(searchDownstream.body.includes("محصول پذیرش 1"), "STEP59_G_SEARCH_60D_AUTHORITATIVE_RESULT_MISSING");
  } else {
    assert(searchDownstream.body.includes("SF-B-03"), "STEP59_G_SEARCH_PLACEHOLDER_LOST");
  }

  const categoryDownstream = await request("/category/acceptance-category-1");
  assert.equal(categoryDownstream.status, 200, "STEP59_G_DOWNSTREAM_ROUTE_FAILED:/category");
  if (categoryProductionized) {
    assert(categoryDownstream.body.includes("دسته پذیرش 1"), "STEP59_G_CATEGORY_60E_CONTEXT_MISSING");
    assert(categoryDownstream.body.includes("محصول پذیرش 1"), "STEP59_G_CATEGORY_60E_PRODUCT_MISSING");
  } else {
    assert(categoryDownstream.body.includes("SF-B-02"), "STEP59_G_CATEGORY_PLACEHOLDER_LOST");
  }

  for (const [path, screenId] of [
    ["/product/acceptance-product-1", "SF-C-01"],
    ["/wholesale", "SF-E-07"],
    ["/articles", "SF-F-01"],
  ] as const) {
    const downstream = await request(path);
    assert.equal(downstream.status, 200, "STEP59_G_DOWNSTREAM_ROUTE_FAILED:" + path);
    assert(downstream.body.includes(screenId), "STEP59_G_DOWNSTREAM_PLACEHOLDER_LOST:" + path);
  }

  console.log(JSON.stringify({
    status: "PASS",
    stage: "59-G",
    mode: "FULL_STEP59_ACCEPTANCE",
    integratedHomeSSR: true,
    unexpectedApiCalls: 0,
    oneHomeH1: true,
    semanticSearchEntry: true,
    categoryDiscovery: true,
    brandSearchHandoff: true,
    merchandisingCards: 6,
    priceUnit: "TOMAN",
    downstreamBoundaries: {
      step60: { search: searchProductionized ? "PRODUCTION_60_D" : "PLACEHOLDER", category: categoryProductionized ? "PRODUCTION_60_E" : "PLACEHOLDER" },
      step61: ["product"],
      step65: ["wholesale"],
      step66: ["articles"],
    },
    browserAcceptance: "PROVIDER_WORKFLOW_REQUIRED_ON_EXACT_HEAD",
    runtimeFeatureChanges: 0,
  }, null, 2));
} finally {
  server.kill("SIGTERM");
  await new Promise<void>((resolvePromise) => apiServer.close(() => resolvePromise()));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await request("/");
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error("STEP59_G_SERVER_START_TIMEOUT\n" + serverOutput);
}

function request(pathname: string) {
  return new Promise<{ status: number; body: string }>((resolvePromise, rejectPromise) => {
    const url = new URL(pathname, `http://127.0.0.1:${port}`);
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
