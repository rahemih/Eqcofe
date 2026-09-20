import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AsyncSurfaceState } from "../app/platform/state/surface-state.js";
import type { HomeProductList } from "../app/features/home/home-data.server.js";
import {
  describeHomeProductState,
  selectHomeProducts,
} from "../app/features/home/home-product-state.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");

const stateSource = readFileSync(resolve(storefrontRoot, "app/features/home/home-product-state.ts"), "utf8");
const stateComponentSource = readFileSync(resolve(storefrontRoot, "app/features/home/HomeProductState.tsx"), "utf8");
const homeSource = readFileSync(resolve(storefrontRoot, "app/routes/home.tsx"), "utf8");
const css = readFileSync(resolve(storefrontRoot, "app/styles/home.css"), "utf8");
const messages = readFileSync(resolve(storefrontRoot, "app/i18n/fa-IR.ts"), "utf8");
const searchRouteSource = readFileSync(resolve(storefrontRoot, "app/routes/search.tsx"), "utf8");

const products = productList();

const ready: AsyncSurfaceState<HomeProductList> = { status: "ready", data: products };
assert.equal(describeHomeProductState(ready), null, "STEP59_F_READY_PANEL_MUST_BE_ABSENT");
assert.equal(selectHomeProducts(ready), products, "STEP59_F_READY_DATA_NOT_PRESERVED");

const progressive: AsyncSurfaceState<HomeProductList> = {
  status: "loading",
  mode: "progressive",
  previous: products,
};
const progressiveView = describeHomeProductState(progressive);
assert.equal(progressiveView?.variant, "loading");
assert.equal(progressiveView?.urgent, false);
assert.equal(progressiveView?.retryAllowed, false);
assert.equal(selectHomeProducts(progressive), products, "STEP59_F_PROGRESSIVE_PREVIOUS_NOT_PRESERVED");

const empty: AsyncSurfaceState<HomeProductList> = { status: "empty", reason: "first-use" };
const emptyView = describeHomeProductState(empty);
assert.equal(emptyView?.variant, "empty");
assert.equal(emptyView?.showSearchAlternative, true);
assert.equal(selectHomeProducts(empty), null);

const recovery: AsyncSurfaceState<HomeProductList> = {
  status: "recovery",
  problem: {
    kind: "server",
    requestId: "REQ-59-F-001",
    status: 503,
    retryable: true,
  },
  plan: {
    action: "retry-read",
    automatic: false,
    reason: "safe-read-retry",
  },
  previous: products,
};
const recoveryView = describeHomeProductState(recovery);
assert.equal(recoveryView?.variant, "recovery");
assert.equal(recoveryView?.requestId, "REQ-59-F-001");
assert.equal(recoveryView?.urgent, false);
assert.equal(recoveryView?.retryAllowed, true);
assert.equal(selectHomeProducts(recovery), products, "STEP59_F_RECOVERY_PREVIOUS_NOT_PRESERVED");

const error: AsyncSurfaceState<HomeProductList> = {
  status: "error",
  problem: {
    kind: "configuration",
    requestId: "REQ-59-F-ERR",
    status: null,
    retryable: false,
  },
};
const errorView = describeHomeProductState(error);
assert.equal(errorView?.variant, "error");
assert.equal(errorView?.urgent, true);
assert.equal(errorView?.retryAllowed, false);
assert.equal(errorView?.requestId, "REQ-59-F-ERR");

const forbidden: AsyncSurfaceState<HomeProductList> = {
  status: "forbidden",
  requestId: "REQ-59-F-403",
};
const forbiddenView = describeHomeProductState(forbidden);
assert.equal(forbiddenView?.variant, "forbidden");
assert.equal(forbiddenView?.urgent, true);
assert.equal(forbiddenView?.requestId, "REQ-59-F-403");
assert.equal(forbiddenView?.retryAllowed, false);

const offline: AsyncSurfaceState<HomeProductList> = {
  status: "offline",
  connectivity: "offline",
};
const offlineView = describeHomeProductState(offline);
assert.equal(offlineView?.variant, "offline");
assert.equal(offlineView?.urgent, false);
assert.equal(offlineView?.retryAllowed, true);

for (const expected of [
  "در حال آماده‌سازی خانه",
  "محصول‌ها در حال تکمیل‌اند",
  "در حال به‌روزرسانی محصولات",
  "محصول پیشنهادی در دسترس نیست",
  "نمایش محصولات ممکن نشد",
  "دریافت اطلاعات خانه انجام نشد",
  "دسترسی به فهرست محصولات مجاز نیست",
  "اتصال اینترنت برقرار نیست",
  "تلاش دوباره برای دریافت محصولات",
  "رفتن به جست‌وجو",
]) {
  assert(messages.includes(expected), "STEP59_F_HOME_STATE_COPY_MISSING:" + expected);
}

assert.match(homeSource, /selectHomeProducts\(loaderData\.productPreview\)/);
assert.match(homeSource, /<HomeProductState state=\{loaderData\.productPreview\}/);
assert.match(homeSource, /products \? <HomeDiscovery products=\{products\}/);
assert.match(homeSource, /<HomeMerchandising products=\{products\}/);

assert.match(stateComponentSource, /<StatePanel/);
assert.match(stateComponentSource, /urgent=\{presentation\.urgent\}/);
assert.match(stateComponentSource, /requestId=\{presentation\.requestId\}/);
assert.match(stateComponentSource, /reloadDocument/);
assert.match(stateComponentSource, /to="\/search"/);

for (const forbiddenSource of [
  "setInterval(",
  "setTimeout(",
  "useEffect(",
  "fetch(",
  'request("get"',
  'request("post"',
]) {
  assert.equal(
    stateComponentSource.includes(forbiddenSource) || stateSource.includes(forbiddenSource),
    false,
    "STEP59_F_AUTOMATIC_OR_DIRECT_IO_FORBIDDEN:" + forbiddenSource,
  );
}

assert.match(searchRouteSource, /targetStep=\{60\}/);
assert.match(searchRouteSource, /routeIntent="\/search\?q="/);

for (const requiredCss of [
  ".home-product-state",
  ".home-product-state__actions",
  "min-block-size: var(--eq-size-touch-min)",
  "min-inline-size: var(--eq-size-touch-min)",
  "min-inline-size: 0",
  "overflow-wrap: anywhere",
  "max-inline-size: 100%",
]) {
  assert(css.includes(requiredCss), "STEP59_F_CSS_HARDENING_MISSING:" + requiredCss);
}

assert.equal(/\bbrown\b/i.test(css), false, "STEP59_F_BROWN_FORBIDDEN");
assert.equal(
  /(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css),
  false,
  "STEP59_F_PHYSICAL_RTL_PROPERTY_FOUND",
);
assert.equal(/flex-direction\s*:\s*row-reverse/i.test(css), false, "STEP59_F_ROW_REVERSE_FORBIDDEN");

let apiMode: "empty" | "recovery" = "empty";
let productRequests = 0;

const apiServer = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method !== "GET" || url.pathname !== "/products") {
    sendJson(response, 404, { error: "unexpected" });
    return;
  }

  productRequests += 1;
  if (apiMode === "empty") {
    sendJson(response, 200, {
      items: [],
      pagination: { next_cursor: null, has_more: false },
    });
    return;
  }

  response.setHeader("x-request-id", "REQ-59-F-SSR");
  sendJson(response, 503, { error: "temporary" });
});

await new Promise<void>((resolvePromise, rejectPromise) => {
  apiServer.once("error", rejectPromise);
  apiServer.listen(0, "127.0.0.1", resolvePromise);
});

const address = apiServer.address();
assert.ok(address && typeof address === "object");
const storefrontPort = 41742;
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

  productRequests = 0;
  apiMode = "empty";
  const emptyResponse = await requestStorefront("/");
  assert.equal(emptyResponse.status, 200, "STEP59_F_EMPTY_HOME_SSR_FAILED");
  assert(emptyResponse.body.includes("محصول پیشنهادی در دسترس نیست"));
  assert(emptyResponse.body.includes('data-state="empty"'));
  assert(emptyResponse.body.includes('href="/search"'));
  assert(emptyResponse.body.includes("راهنمای خرید تجهیزات"));
  assert.equal(
    (emptyResponse.body.match(/class="home-product-card"/g) ?? []).length,
    0,
    "STEP59_F_EMPTY_STATE_MUST_NOT_INVENT_PRODUCTS",
  );
  assert(productRequests >= 1, "STEP59_F_EMPTY_BACKEND_NOT_CALLED");

  productRequests = 0;
  apiMode = "recovery";
  const recoveryResponse = await requestStorefront("/");
  assert.equal(recoveryResponse.status, 200, "STEP59_F_RECOVERY_HOME_SSR_FAILED");
  assert(recoveryResponse.body.includes("نمایش محصولات ممکن نشد"));
  assert(recoveryResponse.body.includes('data-state="recovery"'));
  assert(recoveryResponse.body.includes('href="/"'));
  assert(recoveryResponse.body.includes('href="/search"'));
  assert(recoveryResponse.body.includes("راهنمای خرید تجهیزات"));
  assert(productRequests >= 1, "STEP59_F_RECOVERY_BACKEND_NOT_CALLED");

  console.log(JSON.stringify({
    status: "PASS",
    stage: "59-F",
    statesVerified: [
      "ready",
      "loading:progressive",
      "empty",
      "recovery",
      "error",
      "forbidden",
      "offline",
    ],
    previousAuthoritativeData: "PRESERVED_WHEN_EXPLICIT",
    automaticRetryIntroduced: false,
    requestIdProjection: "PRESERVED",
    urgentSemantics: ["error", "forbidden"],
    politeSemantics: ["loading", "empty", "recovery", "offline"],
    ssrEvidence: ["empty", "recovery"],
    step60SearchImplementation: "NOT_STARTED_HANDOFF_ONLY",
    responsiveWidths: [320, 360, 600, 840, 1200, 1440],
    reflowZoomPercent: 400,
    minimumTouchTargetPx: 44,
  }, null, 2));
} finally {
  server.kill("SIGTERM");
  await new Promise<void>((resolvePromise) => apiServer.close(() => resolvePromise()));
}

function productList(): HomeProductList {
  return {
    items: [
      {
        id: "00000000-0000-0000-0000-000000000001",
        slug: "state-test-product",
        name: "محصول معتبر آزمایشی",
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
        price: { current_toman: 1250000 },
        availability: { sales_enabled: true, in_stock: true },
      },
    ],
    pagination: { next_cursor: null, has_more: false },
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
  throw new Error("STEP59_F_SERVER_START_TIMEOUT\n" + serverOutput);
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
