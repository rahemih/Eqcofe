import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  availabilityLabel,
  selectDefaultVariantId,
  variantLabel,
} from "../app/features/product-detail/product-variant-selection.js";
import { loadProductDetailFoundation } from "../app/features/product-detail/product-detail-data.server.js";
import type { ProductVariant } from "../app/features/product-detail/product-detail-contract.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const repoRoot = resolve(storefrontRoot, "../..");

const routeSource = readFileSync(resolve(storefrontRoot, "app/routes/product.tsx"), "utf8");
const experienceSource = readFileSync(
  resolve(storefrontRoot, "app/features/product-detail/ProductDetailExperience.tsx"),
  "utf8",
);
const dataSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/product-detail-data.server.ts"), "utf8");
const selectorSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/ProductVariantSelector.tsx"), "utf8");
const selectionSource = readFileSync(
  resolve(storefrontRoot, "app/features/product-detail/product-variant-selection.ts"),
  "utf8",
);
const openApi = readFileSync(resolve(repoRoot, "src/generated/openapi.ts"), "utf8");

assert.match(routeSource, /loadProductDetailFoundation/);
assert.match(routeSource, /ProductDetailExperience/);
assert.match(experienceSource, /ProductVariantSelector/);
assert.match(routeSource, /appendCustomerSessionSetCookies/);
assert.equal(routeSource.includes("RoutePlaceholder"), false, "STEP61_D_ROUTE_STILL_PLACEHOLDER");
assert.match(dataSource, /"\/products\/\{slug\}\/variants"/);
assert.match(dataSource, /pathParams: \{ slug \}/);
assert.match(selectionSource, /availability\.in_stock/);
assert.match(selectionSource, /availability\.available_quantity/);
assert.match(selectorSource, /price\.current_toman/);
assert.match(selectorSource, /price\.old_toman/);
assert.equal(/localStorage|sessionStorage|document\.cookie|fetch\(/.test(selectorSource), false, "STEP61_D_CLIENT_AUTHORITY_FORBIDDEN");
assert.equal(/POST|PATCH|PUT|DELETE/.test(dataSource), false, "STEP61_D_MUTATION_FORBIDDEN");
assert.equal(routeSource.includes("add-to-cart"), false, "STEP61_D_CART_SCOPE_LEAK");
assert.equal(selectorSource.includes("media"), false, "STEP61_D_MEDIA_SCOPE_LEAK");
assert.match(openApi, /PublicVariantResponse:/);
assert.match(openApi, /getProductsSlugVariants:/);

const sampleVariants: ProductVariant[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    product_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    sku: "EQ-SOLDOUT",
    name_suffix: "مدل ناموجود",
    status: "active",
    sales_enabled: true,
    attributes: [],
    price: { current_toman: 900000 },
    availability: { sales_enabled: true, in_stock: false, available_quantity: 0 },
    version: 1,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    product_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    sku: "EQ-READY",
    name_suffix: "مدل موجود",
    status: "active",
    sales_enabled: true,
    attributes: [],
    price: { current_toman: 1250000, old_toman: 1400000, discount_percent: 11 },
    availability: { sales_enabled: true, in_stock: true, available_quantity: 4 },
    version: 1,
  },
];

assert.equal(selectDefaultVariantId(sampleVariants), "22222222-2222-2222-2222-222222222222");
assert.equal(availabilityLabel(sampleVariants[0]!), "ناموجود");
assert.equal(availabilityLabel(sampleVariants[1]!), "۴ عدد باقی مانده");
assert.equal(variantLabel(sampleVariants[1]!), "مدل موجود");

const hits: string[] = [];
const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  hits.push(url.pathname);

  if (request.method !== "GET") {
    response.statusCode = 405;
    response.end();
    return;
  }

  if (url.pathname === "/products/sample-product") {
    sendJson(response, 200, {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name_fa: "محصول نمونه",
      slug: "sample-product",
      primary_category: { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", slug: "tools", name_fa: "ابزار" },
      additional_categories: [],
      sales_enabled: true,
      price: { current_toman: 900000 },
      primary_image: null,
      media: [],
      specifications: [],
      variants: sampleVariants,
      version: 1,
      published_at: null,
      updated_at: "2026-09-29T00:00:00.000Z",
    });
    return;
  }

  if (url.pathname === "/products/sample-product/variants") {
    sendJson(response, 200, sampleVariants);
    return;
  }

  response.statusCode = 404;
  response.end();
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
  assert.equal(result.data.variants.status, "ready");
  assert.deepEqual(hits, ["/products/sample-product", "/products/sample-product/variants"]);
  assert.equal(result.data.contract.authority, "backend");
  assert.equal(result.data.contract.variants.authority, "backend");

  console.log(JSON.stringify({
    status: "PASS",
    stage: "61-D",
    route: "/product/:slug",
    contracts: ["GET /products/{slug}", "GET /products/{slug}/variants"],
    authoritative: ["variant-price", "sales-enabled", "in-stock", "available-quantity"],
    deferred: ["rich-media", "specifications", "related-content", "cart-mutation", "final-seo-state-hardening"],
  }, null, 2));
} finally {
  await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
}

function sendJson(response: http.ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}
