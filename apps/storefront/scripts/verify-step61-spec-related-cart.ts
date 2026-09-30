import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { addProductVariantToCart } from "../app/features/product-detail/product-detail-cart.server.js";
import { canAddVariantToCart } from "../app/features/product-detail/product-detail-cart.js";
import type { ProductVariant } from "../app/features/product-detail/product-detail-contract.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");

const routeSource = readFileSync(resolve(storefrontRoot, "app/routes/product.tsx"), "utf8");
const experienceSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/ProductDetailExperience.tsx"), "utf8");
const dataSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/product-detail-data.server.ts"), "utf8");
const cartServerSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/product-detail-cart.server.ts"), "utf8");
const cartSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/product-detail-cart.ts"), "utf8");
const cartComponentSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/ProductAddToCart.tsx"), "utf8");
const specSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/ProductSpecifications.tsx"), "utf8");
const relatedSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/ProductRelated.tsx"), "utf8");

assert.match(routeSource, /export async function action/);
assert.match(routeSource, /addProductVariantToCart/);
assert.match(experienceSource, /ProductAddToCart/);
assert.match(experienceSource, /ProductSpecifications/);
assert.match(experienceSource, /ProductRelated/);
assert.match(dataSource, /"\/categories\/\{slug\}\/products"/);
assert.equal(dataSource.includes('"/products/{slug}/related"'), false);
assert.equal(dataSource.includes('"/products/{slug}/recommendations"'), false);
assert.match(relatedSource, /ListingGrid/);
assert.match(specSource, /name_fa/);
assert.match(specSource, /value_numeric/);
assert.match(specSource, /value_boolean/);
assert.match(cartServerSource, /"X-Cart-Token"/);
assert.match(cartServerSource, /HttpOnly/);
assert.match(cartServerSource, /SameSite=Lax/);
assert.match(cartServerSource, /quantity: 1/);
assert.equal(/localStorage|sessionStorage|document\.cookie/.test(cartServerSource + cartSource + cartComponentSource), false);
assert.equal(/cart_token/.test(cartComponentSource), false);

const availableVariant: ProductVariant = {
  id: "22222222-2222-4222-8222-222222222222",
  product_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  sku: "EQ-READY",
  name_suffix: "مدل موجود",
  status: "active",
  sales_enabled: true,
  attributes: [],
  price: { current_toman: 1250000 },
  availability: { sales_enabled: true, in_stock: true, available_quantity: 4 },
  version: 1,
};
assert.equal(canAddVariantToCart(availableVariant), true);
assert.equal(canAddVariantToCart({
  ...availableVariant,
  availability: { sales_enabled: true, in_stock: false, available_quantity: 0 },
}), false);

const cartId = "33333333-3333-4333-8333-333333333333";
const cartToken = "safe-cart-token_123";
let createHits = 0;
let addHits = 0;
const observedBodies: unknown[] = [];
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method === "POST" && url.pathname === "/cart") {
    createHits += 1;
    sendJson(response, 201, {
      success: true,
      data: { cart_id: cartId, cart_token: cartToken },
      meta: { request_id: "req-create" },
    });
    return;
  }

  if (request.method === "POST" && url.pathname === `/cart/${cartId}/items`) {
    addHits += 1;
    assert.equal(request.headers["x-cart-token"], cartToken);
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    observedBodies.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    sendJson(response, 200, {
      success: true,
      data: {
        id: cartId,
        customer_id: null,
        status: "active",
        version: addHits,
        expires_at: "2026-10-06T00:00:00.000Z",
        items: [{
          id: "44444444-4444-4444-8444-444444444444",
          product_id: availableVariant.product_id,
          variant_id: availableVariant.id,
          sku: availableVariant.sku,
          product_name: "محصول نمونه",
          quantity: addHits,
        }],
      },
      meta: { request_id: `req-add-${addHits}` },
    });
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
  const config = { baseUrl: `http://127.0.0.1:${address.port}`, timeoutMs: 2500 };

  const first = await addProductVariantToCart(
    new Request("https://storefront.test/product/sample-product"),
    availableVariant.id,
    { config, fetchImpl: fetch },
  );
  assert.equal(first.itemCount, 1);
  assert.equal(first.setCookies.length, 2);
  assert.equal(first.setCookies.every((cookie) => cookie.includes("HttpOnly")), true);
  assert.equal(first.setCookies.every((cookie) => cookie.includes("SameSite=Lax")), true);
  assert.equal(first.setCookies.every((cookie) => cookie.includes("Secure")), true);
  assert.equal(createHits, 1);
  assert.equal(addHits, 1);
  assert.deepEqual(observedBodies[0], { variant_id: availableVariant.id, quantity: 1 });

  const cookieHeader = first.setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
  const second = await addProductVariantToCart(
    new Request("https://storefront.test/product/sample-product", {
      headers: { Cookie: cookieHeader },
    }),
    availableVariant.id,
    { config, fetchImpl: fetch },
  );
  assert.equal(second.setCookies.length, 0);
  assert.equal(createHits, 1);
  assert.equal(addHits, 2);

  console.log(JSON.stringify({
    status: "PASS",
    stage: "61-F",
    specifications: "canonical ProductSpecificationView",
    related: "typed primary-category ProductCard listing",
    placeholderRelatedConsumed: false,
    cart: "POST /cart + POST /cart/{id}/items",
    cartTokenClientVisible: false,
    guestCartCookie: ["HttpOnly", "SameSite=Lax", "Secure-on-https"],
    quantity: 1,
  }, null, 2));
} finally {
  await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
}

function sendJson(response: http.ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}
