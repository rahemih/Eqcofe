import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProductDetailFoundation } from "../app/features/product-detail/product-detail-data.server.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const repoRoot = resolve(storefrontRoot, "../..");

const contractSource = readFileSync(
  resolve(storefrontRoot, "app/features/product-detail/product-detail-contract.ts"),
  "utf8",
);
const dataSource = readFileSync(
  resolve(storefrontRoot, "app/features/product-detail/product-detail-data.server.ts"),
  "utf8",
);
const componentSource = readFileSync(
  resolve(storefrontRoot, "app/features/product-detail/ProductDetailSummary.tsx"),
  "utf8",
);
const routeSource = readFileSync(
  resolve(storefrontRoot, "app/routes/product.tsx"),
  "utf8",
);
const generatedOpenApi = readFileSync(
  resolve(repoRoot, "src/generated/openapi.ts"),
  "utf8",
);

assert.match(contractSource, /ApiSuccessData<"get", "\/products\/\{slug\}">/);
assert.match(contractSource, /ApiSuccessData<"get", "\/products\/\{slug\}\/variants">/);
assert.match(contractSource, /schemas"\]\["PublicProductResponse"/);
assert.match(contractSource, /schemas"\]\["PublicVariantResponse"/);
assert.match(contractSource, /schemas"\]\["PublicProductMediaView"/);
assert.match(contractSource, /schemas"\]\["ProductSpecificationView"/);
assert.match(dataSource, /createCustomerSessionBridge/);
assert.match(dataSource, /classifyApiFailureState/);
assert.match(dataSource, /pathParams: \{ slug \}/);
assert.equal(dataSource.includes('"/products/{slug}/variants"'), false, "STEP61_C_VARIANT_REQUEST_EARLY");
assert.equal(/POST|PATCH|PUT|DELETE/.test(dataSource), false, "STEP61_C_MUTATION_FORBIDDEN");
assert.match(componentSource, /name_fa/);
assert.match(componentSource, /primary_category\.name_fa/);
assert.match(componentSource, /price\.current_toman/);
assert.equal(componentSource.includes("availability.status"), false, "STEP61_C_VARIANT_AVAILABILITY_EARLY");
assert.match(routeSource, /RoutePlaceholder/);
assert.match(routeSource, /targetStep=\{61\}/);
assert.equal(routeSource.includes("loadProductDetailFoundation"), false, "STEP61_C_ROUTE_PRODUCTIONIZED_EARLY");
assert.match(generatedOpenApi, /PublicProductResponse:/);
assert.match(generatedOpenApi, /PublicVariantResponse:/);
assert.match(generatedOpenApi, /PublicProductMediaView:/);
assert.match(generatedOpenApi, /ProductSpecificationView:/);

let hits = 0;
let observedPath = "";
const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  observedPath = url.pathname;

  if (request.method !== "GET" || url.pathname !== "/products/sample-product") {
    response.statusCode = 404;
    response.end();
    return;
  }

  hits += 1;
  sendJson(response, 200, {
    id: "11111111-1111-1111-1111-111111111111",
    name_fa: "محصول نمونه",
    name_en: null,
    slug: "sample-product",
    short_description: "توضیح کوتاه",
    description: null,
    brand: null,
    primary_category: { id: "22222222-2222-2222-2222-222222222222", slug: "coffee-tools", name_fa: "ابزار قهوه" },
    additional_categories: [],
    sales_enabled: true,
    price: { current_toman: 1250000 },
    primary_image: null,
    media: [],
    specifications: [],
    variants: [],
    version: 1,
    published_at: null,
    updated_at: "2026-09-29T00:00:00.000Z",
  });
});

await new Promise<void>((resolvePromise, rejectPromise) => {
  server.once("error", rejectPromise);
  server.listen(0, "127.0.0.1", resolvePromise);
});

try {
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const result = await loadProductDetailFoundation(
    new Request("http://storefront.test/product/sample-product"),
    "sample-product",
    {
      config: { baseUrl: `http://127.0.0.1:${address.port}`, timeoutMs: 2500 },
      fetchImpl: fetch,
    },
  );

  assert.equal(result.data.product.status, "ready");
  assert.equal(result.data.contract.method, "GET");
  assert.equal(result.data.contract.path, "/products/{slug}");
  assert.equal(result.data.contract.authority, "backend");
  assert.equal(hits, 1);
  assert.equal(observedPath, "/products/sample-product");
  assert.deepEqual(result.setCookies, []);

  const encoded = await loadProductDetailFoundation(
    new Request("http://storefront.test/product/%D9%82%D9%87%D9%88%D9%87"),
    "قهوه ساز",
    {
      config: { baseUrl: `http://127.0.0.1:${address.port}`, timeoutMs: 2500 },
      fetchImpl: fetch,
    },
  );
  assert.notEqual(encoded.data.product.status, "ready");
  assert.equal(observedPath, "/products/%D9%82%D9%87%D9%88%D9%87%20%D8%B3%D8%A7%D8%B2");

  console.log(JSON.stringify({
    status: "PASS",
    stage: "61-C",
    contract: "GET /products/{slug}",
    foundation: [
      "generated-openapi-types",
      "server-loader",
      "summary-presentation",
      "rtl-responsive-style",
    ],
    deferred: [
      "route-productionization",
      "variant-interaction",
      "variant-endpoint-fetch",
      "rich-media-interaction",
      "cart-mutation",
      "seo-finalization",
    ],
  }, null, 2));
} finally {
  await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
}

function sendJson(response: http.ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}
