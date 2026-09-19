import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ApiClientError } from "../app/platform/api/errors.js";
import { createApiClient } from "../app/platform/api/request.js";
import { SERVER_DATA_POLICY } from "../app/platform/api/data-policy.js";
import { readServerApiConfig } from "../app/platform/config/api.server.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const contractSource = readFileSync(resolve(storefrontRoot, "app/platform/api/contract.ts"), "utf8");
const requestSource = readFileSync(resolve(storefrontRoot, "app/platform/api/request.ts"), "utf8");
const configSource = readFileSync(resolve(storefrontRoot, "app/platform/config/api.server.ts"), "utf8");

assert.match(contractSource, /src\/generated\/openapi\.js/);
assert.equal(requestSource.includes("Authorization"), false);
assert.equal(requestSource.includes("credentials:"), false);
assert.equal(configSource.includes("process.env"), true);
assert.equal(SERVER_DATA_POLICY.cacheMode, "no-store");
assert.equal(SERVER_DATA_POLICY.automaticMutationRetry, false);
assert.deepEqual(SERVER_DATA_POLICY.safeRetry.retryableStatuses, [502, 503, 504]);
assert.equal(SERVER_DATA_POLICY.safeRetry.maxAttempts, 2);

let productAttempts = 0;
let compareAttempts = 0;
let encodedSlug: string | null = null;

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (request.method === "GET" && url.pathname === "/products") {
    productAttempts += 1;
    assert.equal(url.searchParams.get("limit"), "2");

    if (productAttempts === 1) {
      sendJson(response, 503, {
        success: false,
        error: { code: "TEMP_UNAVAILABLE", message: "temporary" },
        meta: { request_id: "req-retry" },
      });
      return;
    }

    response.setHeader("x-request-id", "req-products");
    sendJson(response, 200, {
      items: [],
      pagination: { has_more: false },
    });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/products/")) {
    encodedSlug = decodeURIComponent(url.pathname.slice("/products/".length));
    sendJson(response, 404, {
      success: false,
      error: { code: "PRODUCT_NOT_FOUND", message: "not found" },
      meta: { request_id: "req-not-found" },
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/compare") {
    compareAttempts += 1;
    await readBody(request);
    sendJson(response, 503, {
      success: false,
      error: { code: "COMPARE_UNAVAILABLE", message: "temporary" },
      meta: { request_id: "req-compare" },
    });
    return;
  }

  sendJson(response, 404, {
    success: false,
    error: { code: "UNEXPECTED_ROUTE", message: "unexpected" },
    meta: { request_id: "req-unexpected" },
  });
});

await new Promise<void>((resolvePromise, rejectPromise) => {
  server.once("error", rejectPromise);
  server.listen(0, "127.0.0.1", resolvePromise);
});

try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const config = readServerApiConfig({
    EQCOFE_API_BASE_URL: baseUrl,
    EQCOFE_API_TIMEOUT_MS: "2500",
  });
  assert.equal(config.baseUrl, baseUrl);
  assert.equal(config.timeoutMs, 2500);

  assert.throws(
    () => readServerApiConfig({ EQCOFE_API_BASE_URL: "http://user:pass@example.test" }),
    (error: unknown) => error instanceof ApiClientError && error.code === "API_BASE_URL_INVALID",
  );

  const client = createApiClient({
    baseUrl,
    timeoutMs: 2500,
  });

  const products = await client.request("get", "/products", {
    query: { limit: 2 },
  });
  assert.equal(productAttempts, 2);
  assert.equal(products.status, 200);
  assert.equal(products.requestId, "req-products");
  assert.deepEqual(products.data, {
    items: [],
    pagination: { has_more: false },
  });

  await assert.rejects(
    () => client.request("get", "/products/{slug}", {
      pathParams: { slug: "قهوه ساز" },
    }),
    (error: unknown) => error instanceof ApiClientError
      && error.kind === "http"
      && error.status === 404
      && error.code === "PRODUCT_NOT_FOUND"
      && error.requestId === "req-not-found",
  );
  assert.equal(encodedSlug, "قهوه ساز");

  await assert.rejects(
    () => client.request("post", "/compare", {
      body: {
        product_ids: [
          "11111111-1111-1111-1111-111111111111",
          "22222222-2222-2222-2222-222222222222",
        ],
      },
    }),
    (error: unknown) => error instanceof ApiClientError
      && error.kind === "http"
      && error.status === 503
      && error.code === "COMPARE_UNAVAILABLE",
  );
  assert.equal(compareAttempts, 1);

  assert.throws(
    () => createApiClient({ baseUrl: "ftp://example.test" }),
    (error: unknown) => error instanceof ApiClientError && error.code === "API_BASE_URL_INVALID",
  );

  console.log(JSON.stringify({
    status: "PASS",
    stage: "58-D",
    contractAuthority: "src/generated/openapi.ts",
    serverOnlyBaseUrl: "EQCOFE_API_BASE_URL",
    cacheMode: SERVER_DATA_POLICY.cacheMode,
    safeRetry: {
      methods: ["GET", "HEAD"],
      maxAttempts: SERVER_DATA_POLICY.safeRetry.maxAttempts,
      statuses: SERVER_DATA_POLICY.safeRetry.retryableStatuses,
    },
    verified: {
      typedQuery: true,
      encodedPathParam: true,
      structuredHttpError: true,
      safeGetRetry: true,
      mutationRetryDisabled: true,
      credentialInjectionAbsent: true,
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

function readBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => resolvePromise(body));
    request.on("error", rejectPromise);
  });
}
