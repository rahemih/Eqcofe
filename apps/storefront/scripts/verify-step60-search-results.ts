import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSearchRouteData,
  type SearchRouteDataResult,
} from "../app/features/search/search-data.server.js";
import {
  describeSearchState,
  selectSearchResults,
} from "../app/features/search/search-state.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const routeSource = readFileSync(resolve(storefrontRoot, "app/routes/search.tsx"), "utf8");
const dataSource = readFileSync(resolve(storefrontRoot, "app/features/search/search-data.server.ts"), "utf8");
const stateSource = readFileSync(resolve(storefrontRoot, "app/features/search/search-state.ts"), "utf8");
const stateComponentSource = readFileSync(resolve(storefrontRoot, "app/features/search/SearchState.tsx"), "utf8");
const css = readFileSync(resolve(storefrontRoot, "app/styles/search.css"), "utf8");
const messages = readFileSync(resolve(storefrontRoot, "app/i18n/fa-IR.ts"), "utf8");
const categoryRoute = readFileSync(resolve(storefrontRoot, "app/routes/category.tsx"), "utf8");

let fetchCalls = 0;
const ready = await loadSearchRouteData(
  new Request("https://store.example/search?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8&cursor=opaque-token&limit=25"),
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async (input) => {
      fetchCalls += 1;
      const url = new URL(String(input));
      assert.equal(url.pathname, "/search");
      assert.equal(url.searchParams.get("q"), "آسیاب");
      assert.equal(url.searchParams.get("cursor"), "opaque-token");
      assert.equal(url.searchParams.get("limit"), "25");
      return jsonResponse(200, searchPayload("آسیاب", 1));
    },
  },
);
assert.equal(fetchCalls, 1);
assert.equal(ready.data.queryIssue, null);
assert.equal(ready.data.canonicalSearch, "q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8&cursor=opaque-token&limit=25");
assert.equal(ready.data.results.status, "ready");
assert.equal(selectSearchResults(ready.data.results)?.items.length, 1);
assert.equal(describeSearchState(ready.data.results, null, ready.data.query), null);

fetchCalls = 0;
const missing = await loadSearchRouteData(
  new Request("https://store.example/search"),
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("MISSING_QUERY_MUST_NOT_FETCH");
    },
  },
);
assert.equal(fetchCalls, 0);
assert.equal(missing.data.queryIssue, "missing");
assert.equal(missing.data.results.status, "empty");
assert.equal(describeSearchState(missing.data.results, "missing", null)?.variant, "empty");

fetchCalls = 0;
const invalid = await loadSearchRouteData(
  new Request("https://store.example/search?q=test&sort=price"),
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("INVALID_QUERY_MUST_NOT_FETCH");
    },
  },
);
assert.equal(fetchCalls, 0);
assert.equal(invalid.data.queryIssue, "invalid");
assert.equal(invalid.data.results.status, "empty");
assert.equal(describeSearchState(invalid.data.results, "invalid", null)?.variant, "empty");

fetchCalls = 0;
const empty = await loadSearchRouteData(
  new Request("https://store.example/search?q=%D8%AA%D9%85%D9%BE%D8%B1"),
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async () => {
      fetchCalls += 1;
      return jsonResponse(200, searchPayload("تمپر", 0));
    },
  },
);
assert.equal(fetchCalls, 1);
assert.equal(empty.data.results.status, "empty");
assert.equal(describeSearchState(empty.data.results, null, "تمپر")?.title, "نتیجه‌ای پیدا نشد");

fetchCalls = 0;
const recovery = await loadSearchRouteData(
  new Request("https://store.example/search?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8"),
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async () => {
      fetchCalls += 1;
      return jsonResponse(503, { error: "temporary" }, { "x-request-id": "REQ-60-D-503" });
    },
  },
);
assert.equal(fetchCalls, 2, "STEP60_D_SAFE_READ_RETRY_MUST_BE_BOUNDED_TO_EXISTING_POLICY");
assert.equal(recovery.data.results.status, "recovery");
const recoveryView = describeSearchState(recovery.data.results, null, "آسیاب");
assert.equal(recoveryView?.retryAllowed, true);
assert.equal(recoveryView?.requestId, "REQ-60-D-503");

for (const required of [
  'request("get", "/search"',
  "parseListingUrlState",
  "serializeListingUrlState",
  "createCustomerSessionBridge",
  "emptyState(\"no-result\")",
  "classifyApiFailureState",
]) {
  assert.ok(dataSource.includes(required), "STEP60_D_DATA_CONTRACT_MISSING:" + required);
}
assert.doesNotMatch(dataSource, /fetch\s*\(/);
assert.doesNotMatch(dataSource, /sort|available|min_price|max_price|attribute/i);

assert.match(routeSource, /useLoaderData<typeof loader>/);
assert.match(routeSource, /<ListingGrid products=\{results\.items\}/);
assert.match(routeSource, /<SearchState/);
assert.doesNotMatch(routeSource, /RoutePlaceholder|targetStep=\{60\}/);
assert.match(categoryRoute, /targetStep=\{60\}/);

assert.match(stateComponentSource, /<StatePanel/);
assert.match(stateComponentSource, /reloadDocument/);
assert.match(stateComponentSource, /retryHref/);
assert.doesNotMatch(stateComponentSource + stateSource, /setInterval\s*\(|setTimeout\s*\(|useEffect\s*\(|fetch\s*\(/);

for (const copy of [
  "نتایج جست‌وجو",
  "عبارت جست‌وجو را وارد کنید",
  "عبارت جست‌وجو معتبر نیست",
  "نتیجه‌ای پیدا نشد",
  "دریافت نتایج کامل نشد",
  "تلاش دوباره برای همین جست‌وجو",
]) {
  assert.ok(messages.includes(copy), "STEP60_D_PERSIAN_COPY_MISSING:" + copy);
}

for (const requiredCss of [
  ".search-page",
  ".search-state__actions",
  "min-block-size: var(--eq-size-touch-min)",
  "min-inline-size: var(--eq-size-touch-min)",
  "overflow-wrap: anywhere",
  "@media (min-width: 600px)",
  "@media (min-width: 840px)",
]) {
  assert.ok(css.includes(requiredCss), "STEP60_D_CSS_CONTRACT_MISSING:" + requiredCss);
}
assert.equal(/\bbrown\b/i.test(css), false, "STEP60_D_BROWN_FORBIDDEN");
assert.equal(
  /(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css),
  false,
  "STEP60_D_PHYSICAL_RTL_PROPERTY_FOUND",
);

let apiMode: "ready" | "empty" | "recovery" = "ready";
let apiRequests = 0;
const apiServer = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method !== "GET" || url.pathname !== "/search") {
    sendJson(response, 404, { error: "unexpected" });
    return;
  }
  apiRequests += 1;
  const q = url.searchParams.get("q") ?? "";
  if (apiMode === "ready") {
    sendJson(response, 200, searchPayload(q, 1));
    return;
  }
  if (apiMode === "empty") {
    sendJson(response, 200, searchPayload(q, 0));
    return;
  }
  response.setHeader("x-request-id", "REQ-60-D-SSR");
  sendJson(response, 503, { error: "temporary" });
});

await new Promise<void>((resolvePromise, rejectPromise) => {
  apiServer.once("error", rejectPromise);
  apiServer.listen(0, "127.0.0.1", resolvePromise);
});
const address = apiServer.address();
assert.ok(address && typeof address === "object");
const storefrontPort = 41743;
const apiBaseUrl = `http://127.0.0.1:${address.port}`;
const server = spawnStorefront(storefrontPort, apiBaseUrl);
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

try {
  await waitForStorefront();

  apiRequests = 0;
  const missingResponse = await requestStorefront("/search");
  assert.equal(missingResponse.status, 200);
  assert(missingResponse.body.includes("عبارت جست‌وجو را وارد کنید"));
  assert.equal(apiRequests, 0, "STEP60_D_MISSING_QUERY_SSR_MUST_NOT_FETCH");

  apiMode = "ready";
  apiRequests = 0;
  const readyResponse = await requestStorefront("/search?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8");
  assert.equal(readyResponse.status, 200);
  assert(readyResponse.body.includes("محصول معتبر جست‌وجو"));
  assert(readyResponse.body.includes("۱٬۲۵۰٬۰۰۰"));
  assert(readyResponse.body.includes("موجود"));
  assert(apiRequests >= 1);

  apiMode = "empty";
  apiRequests = 0;
  const emptyResponse = await requestStorefront("/search?q=%D8%AA%D9%85%D9%BE%D8%B1");
  assert.equal(emptyResponse.status, 200);
  assert(emptyResponse.body.includes("نتیجه‌ای پیدا نشد"));
  assert.equal((emptyResponse.body.match(/class="listing-card"/g) ?? []).length, 0);
  assert(apiRequests >= 1);

  apiMode = "recovery";
  apiRequests = 0;
  const recoveryResponse = await requestStorefront("/search?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8");
  assert.equal(recoveryResponse.status, 200);
  assert(recoveryResponse.body.includes("دریافت نتایج کامل نشد"));
  assert(recoveryResponse.body.includes("تلاش دوباره برای همین جست‌وجو"));
  assert(recoveryResponse.body.includes("REQ-60-D-SSR"));
  assert.equal(apiRequests, 2, "STEP60_D_SSR_RETRY_NOT_BOUNDED");

  console.log(JSON.stringify({
    status: "PASS",
    stage: "60-D",
    surface: "/search",
    authoritativeEndpoint: "GET /search",
    generatedContractAuthority: true,
    queryState: ["q", "cursor", "limit"],
    missingQueryBackendCalls: 0,
    invalidQueryBackendCalls: 0,
    boundedSafeReadAttempts: 2,
    sharedListingFoundationReused: true,
    categoryProductionized: false,
    advancedFiltersSortPaginationControls: false,
    ssrEvidence: ["missing-query", "ready", "no-result", "recovery"],
  }, null, 2));
} finally {
  server.kill("SIGTERM");
  await new Promise<void>((resolvePromise) => apiServer.close(() => resolvePromise()));
}

function searchPayload(query: string, count: number) {
  return {
    query,
    items: count === 0 ? [] : [{
      id: "00000000-0000-0000-0000-000000000001",
      slug: "search-valid-product",
      name: "محصول معتبر جست‌وجو",
      brand: {
        id: "00000000-0000-0000-0000-000000000011",
        name_fa: "برند معتبر",
        slug: "valid-brand",
      },
      primary_category: {
        id: "00000000-0000-0000-0000-000000000021",
        name_fa: "دسته معتبر",
        slug: "valid-category",
      },
      primary_image: null,
      price: { current_toman: 1250000 },
      availability: { sales_enabled: true, in_stock: true },
    }],
    pagination: { next_cursor: null, has_more: false },
  };
}

function jsonResponse(status: number, body: unknown, headers: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function sendJson(response: http.ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function spawnStorefront(port: number, apiBaseUrl: string) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d","/s","/c",[
      'set "HOST=127.0.0.1"',
      `set "PORT=${port}"`,
      'set "NODE_ENV=production"',
      `set "EQCOFE_API_BASE_URL=${apiBaseUrl}"`,
      'set "EQCOFE_API_TIMEOUT_MS=2500"',
      "pnpm exec react-router-serve ./build/server/index.js",
    ].join("&&")], { cwd: storefrontRoot, stdio:["ignore","pipe","pipe"] });
  }
  return spawn("env",[
    "HOST=127.0.0.1",
    `PORT=${port}`,
    "NODE_ENV=production",
    `EQCOFE_API_BASE_URL=${apiBaseUrl}`,
    "EQCOFE_API_TIMEOUT_MS=2500",
    "pnpm","exec","react-router-serve","./build/server/index.js",
  ],{ cwd: storefrontRoot, stdio:["ignore","pipe","pipe"] });
}

async function waitForStorefront() {
  for (let attempt=0; attempt<80; attempt+=1) {
    try {
      const response=await requestStorefront("/search");
      if (response.status===200) return;
    } catch {}
    await new Promise((resolvePromise)=>setTimeout(resolvePromise,250));
  }
  throw new Error("STEP60_D_SERVER_START_TIMEOUT\n"+serverOutput);
}

function requestStorefront(pathname: string) {
  return new Promise<{status:number;body:string}>((resolvePromise,rejectPromise)=>{
    const url=new URL(pathname,`http://127.0.0.1:${storefrontPort}`);
    const req=http.get(url,{headers:{accept:"text/html"}},(response)=>{
      let body="";
      response.setEncoding("utf8");
      response.on("data",(chunk)=>{body+=chunk;});
      response.on("end",()=>resolvePromise({status:response.statusCode??0,body}));
    });
    req.on("error",rejectPromise);
  });
}
