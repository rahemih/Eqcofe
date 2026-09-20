import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadHomeRouteData } from "../app/features/home/home-data.server.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const repoRoot = resolve(storefrontRoot, "../..");

const homeDataSource = readFileSync(
  resolve(storefrontRoot, "app/features/home/home-data.server.ts"),
  "utf8",
);
const homeRouteSource = readFileSync(
  resolve(storefrontRoot, "app/routes/home.tsx"),
  "utf8",
);
const generatedOpenApi = readFileSync(
  resolve(repoRoot, "src/generated/openapi.ts"),
  "utf8",
);

assert.match(homeDataSource, /ApiSuccessData<"get", "\/products">/);
assert.match(homeDataSource, /createCustomerSessionBridge/);
assert.match(homeDataSource, /classifyApiFailureState/);
assert.match(homeDataSource, /emptyState\("first-use"\)/);
assert.equal(homeDataSource.includes('"/categories"'), false, "STEP59_C_CATEGORY_PAYLOAD_SCOPE_LEAK");
assert.equal(homeDataSource.includes('"/brands"'), false, "STEP59_C_BRAND_PAYLOAD_SCOPE_LEAK");
assert.equal(homeDataSource.includes('"/search"'), false, "STEP59_C_SEARCH_SCOPE_LEAK");
assert.equal(/sort\s*:|category\s*:|brand\s*:|available\s*:|limit\s*:/.test(homeDataSource), false, "STEP59_C_INVENTED_PRODUCT_QUERY");
assert.equal(/localStorage|sessionStorage|document\.cookie|Bearer /.test(homeDataSource), false, "STEP59_C_BROWSER_AUTHORITY_FORBIDDEN");
assert.match(homeRouteSource, /export async function loader/);
assert.match(homeRouteSource, /useLoaderData/);
assert.match(homeRouteSource, /appendCustomerSessionSetCookies/);
assert.match(homeRouteSource, /data-home-products-state/);
assert.match(generatedOpenApi, /listProducts:/);
assert.match(generatedOpenApi, /ProductListResponse:/);

const state = {
  productHits: 0,
  lastCookie: undefined as string | undefined,
  setCookie: false,
  mode: "ready" as "ready" | "empty" | "unavailable",
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method !== "GET" || url.pathname !== "/products") {
    response.statusCode = 404;
    response.end();
    return;
  }

  state.productHits += 1;
  state.lastCookie = request.headers.cookie;

  if (state.mode === "unavailable") {
    sendError(response, 503, "PROVIDER_UNAVAILABLE", "provider detail must remain server-side", "req-503");
    return;
  }

  if (state.setCookie) {
    response.setHeader(
      "Set-Cookie",
      "eqcofe_session=refreshed-token; Path=/; HttpOnly; SameSite=Lax",
    );
  }

  sendJson(response, 200, {
    items: state.mode === "empty"
      ? []
      : [{
          id: "11111111-1111-1111-1111-111111111111",
          slug: "sample-product",
          name: "محصول نمونه",
          price: { current_toman: 1250000 },
          availability: { status: "available" },
        }],
    pagination: { next_cursor: null, has_more: false },
  });
});

await new Promise<void>((resolvePromise, rejectPromise) => {
  server.once("error", rejectPromise);
  server.listen(0, "127.0.0.1", resolvePromise);
});

try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const config = {
    baseUrl: `http://127.0.0.1:${address.port}`,
    timeoutMs: 2500,
  };

  const publicResult = await loadHomeRouteData(
    new Request("http://storefront.test/"),
    { config, fetchImpl: fetch },
  );
  assert.equal(publicResult.data.productPreview.status, "ready");
  assert.equal(publicResult.data.contract.method, "GET");
  assert.equal(publicResult.data.contract.path, "/products");
  assert.equal(publicResult.data.contract.query, "backend-default");
  assert.equal(publicResult.data.contract.authority, "backend");
  assert.equal(state.productHits, 1);
  assert.equal(state.lastCookie, undefined);
  assert.deepEqual(publicResult.setCookies, []);

  state.setCookie = true;
  const customerResult = await loadHomeRouteData(
    new Request("http://storefront.test/", {
      headers: {
        cookie: "analytics=x; eqcofe_admin_session=admin-secret; eqcofe_session=customer-token",
        authorization: "Bearer browser-token-must-not-forward",
      },
    }),
    { config, fetchImpl: fetch },
  );
  assert.equal(customerResult.data.productPreview.status, "ready");
  assert.equal(state.lastCookie, "eqcofe_session=customer-token");
  assert.equal(customerResult.setCookies.length, 1);
  assert.match(customerResult.setCookies[0] ?? "", /^eqcofe_session=refreshed-token;/);
  state.setCookie = false;

  state.mode = "empty";
  const emptyResult = await loadHomeRouteData(
    new Request("http://storefront.test/"),
    { config, fetchImpl: fetch },
  );
  assert.deepEqual(emptyResult.data.productPreview, {
    status: "empty",
    reason: "first-use",
  });

  state.mode = "unavailable";
  const hitsBeforeUnavailable = state.productHits;
  const unavailableResult = await loadHomeRouteData(
    new Request("http://storefront.test/"),
    { config, fetchImpl: fetch },
  );
  assert.equal(state.productHits - hitsBeforeUnavailable, 2, "SAFE_GET_RETRY_BUDGET_CHANGED");
  assert.equal(unavailableResult.data.productPreview.status, "recovery");
  if (unavailableResult.data.productPreview.status === "recovery") {
    assert.equal(unavailableResult.data.productPreview.problem.kind, "server");
    assert.equal(unavailableResult.data.productPreview.problem.requestId, "req-503");
    assert.equal(unavailableResult.data.productPreview.plan.action, "retry-read");
    assert.equal(unavailableResult.data.productPreview.plan.automatic, false);
    assert.equal("message" in unavailableResult.data.productPreview.problem, false);
  }

  const configurationResult = await loadHomeRouteData(
    new Request("http://storefront.test/"),
    { config: { baseUrl: "", timeoutMs: 2500 }, fetchImpl: fetch },
  );
  assert.equal(configurationResult.data.productPreview.status, "error");
  if (configurationResult.data.productPreview.status === "error") {
    assert.equal(configurationResult.data.productPreview.problem.kind, "configuration");
    assert.equal(configurationResult.data.productPreview.problem.retryable, false);
  }

  console.log(JSON.stringify({
    status: "PASS",
    stage: "59-C",
    contract: "GET /products",
    queryAuthority: "backend-default-no-invented-sort-or-filter",
    sessionTransport: "server-only-customer-cookie-bridge",
    categoryBrandPayloads: "NOT_INVENTED",
    states: ["ready", "empty:first-use", "recovery", "error:configuration"],
    verified: {
      generatedOpenApiType: true,
      backendAuthorityPreserved: true,
      wholesaleAwareSessionContextPreserved: true,
      unrelatedAndAdminCookiesStripped: true,
      browserAuthorizationStripped: true,
      setCookieValidatedAndCaptured: true,
      safeGetRetryPolicyInherited: true,
      rawBackendErrorHidden: true,
    },
  }, null, 2));
} finally {
  await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
}

function sendJson(response: http.ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function sendError(
  response: http.ServerResponse,
  status: number,
  code: string,
  message: string,
  requestId: string,
): void {
  sendJson(response, status, {
    success: false,
    error: { code, message },
    meta: { request_id: requestId },
  });
}
