import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const openapi = readFileSync("contracts/http/openapi.yaml", "utf8");
const generated = readFileSync("src/generated/openapi.ts", "utf8");
const stageB = readFileSync("docs/11-step-history/STEP-64-B-CONTRACT-READINESS.md", "utf8");
const server = readFileSync("apps/storefront/app/features/account/account-tools.server.ts", "utf8");
const view = readFileSync("apps/storefront/app/features/account/AccountToolsView.tsx", "utf8");
const route = readFileSync("apps/storefront/app/routes/account-tools.tsx", "utf8");

test("Stage 64-F consumes only customer-tool authority proven by Stage 64-B", () => {
  assert.match(stageB, /Wishlist is authorized/);
  assert.match(stageB, /customer in-app notifications are repaired/);
  assert.match(stageB, /Product Alerts\/Loyalty\/Reviews remain NO_ACTION/);

  for (const path of [
    "  /customer/wishlist:",
    "  /customer/wishlist/{product_id}:",
    "  /customer/notifications:",
    "  /customer/notifications/{id}/read:",
    "  /customer/notifications/{id}/acknowledge:",
  ]) assert.ok(openapi.includes(path), path);
});

test("generated contracts require idempotency for Stage 64-F mutations", () => {
  for (const operation of [
    "deleteCustomerWishlistProductId:",
    "patchCustomerNotificationsIdRead:",
    "postCustomerNotificationsIdAcknowledge:",
  ]) {
    const start = generated.indexOf(operation);
    assert.ok(start >= 0, operation);
    const block = generated.slice(start, start + 1800);
    assert.match(block, /"Idempotency-Key"/);
  }
});

test("account tools keep Wishlist and notifications independently recoverable", () => {
  assert.match(server, /Promise\.allSettled/);
  assert.match(server, /wishlistResult\.status === "fulfilled"/);
  assert.match(server, /notificationResult\.status === "fulfilled"/);
  assert.match(server, /status: "unavailable", items: \[\]/);
  assert.match(view, /علاقه‌مندی‌ها موقتاً دریافت نشدند/);
  assert.match(view, /اعلان‌ها موقتاً دریافت نشدند/);
});

test("account tools do not call OpenAPI-only legacy customer operations", () => {
  for (const unsupported of [
    "/customer/product-alerts",
    "/customer/loyalty",
    "/customer/products/{product_id}/reviews",
  ]) {
    assert.ok(!server.includes(unsupported), unsupported);
  }
  assert.match(view, /فعلاً فعال نیست/);
});

test("notification payload is not rendered and mutations fail closed", () => {
  assert.doesNotMatch(view, /\.payload/);
  assert.match(server, /error\.status === 403 \|\| error\.status === 404/);
  assert.match(server, /نتیجه عملیات قطعی نشد/);
  assert.match(server, /"Idempotency-Key"/);
  assert.doesNotMatch(server, /localStorage|sessionStorage/);
});

test("SF-E-06 route is productionized", () => {
  assert.doesNotMatch(route, /RoutePlaceholder/);
  assert.match(route, /loadAccountTools/);
  assert.match(route, /mutateAccountTools/);
  assert.match(view, /SF-E-06/);
});
