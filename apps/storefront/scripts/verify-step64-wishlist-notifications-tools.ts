import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const contract = read("apps/storefront/app/features/account/account-contract.ts");
const server = read("apps/storefront/app/features/account/account-tools.server.ts");
const view = read("apps/storefront/app/features/account/AccountToolsView.tsx");
const route = read("apps/storefront/app/routes/account-tools.tsx");
const css = read("apps/storefront/app/styles/account.css");
const stageB = read("docs/11-step-history/STEP-64-B-CONTRACT-READINESS.md");
const pkg = read("apps/storefront/package.json");

for (const expected of [
  'ApiRequestInput<"get", "/customer/wishlist">',
  'ApiRequestInput<"delete", "/customer/wishlist/{product_id}">',
  'ApiRequestInput<"get", "/customer/notifications">',
  'ApiRequestInput<"patch", "/customer/notifications/{id}/read">',
  'ApiRequestInput<"post", "/customer/notifications/{id}/acknowledge">',
]) assert.ok(contract.includes(expected), expected);

assert.match(server, /createCustomerSessionBridge/);
assert.match(server, /Promise\.allSettled/);
assert.match(server, /"get", "\/customer\/wishlist"/);
assert.match(server, /"delete", "\/customer\/wishlist\/\{product_id\}"/);
assert.match(server, /"get", "\/customer\/notifications"/);
assert.match(server, /"patch",[\s\S]*"\/customer\/notifications\/\{id\}\/read"/);
assert.match(server, /"post",[\s\S]*"\/customer\/notifications\/\{id\}\/acknowledge"/);
assert.match(server, /"Idempotency-Key"/);
assert.match(server, /stableToolsIdempotencyKey/);
assert.match(server, /status === 403 \|\| error\.status === 404/);
assert.match(server, /موفقیت را فرض نکنید/);
assert.doesNotMatch(server, /localStorage|sessionStorage/);

for (const unsupported of [
  "/customer/product-alerts",
  "/customer/loyalty",
  "/customer/products/{product_id}/reviews",
]) assert.ok(!server.includes(unsupported), unsupported);

assert.match(stageB, /Product Alerts\/Loyalty\/Reviews remain NO_ACTION/);
assert.doesNotMatch(route, /RoutePlaceholder/);
assert.match(route, /loadAccountTools/);
assert.match(route, /mutateAccountTools/);

assert.match(view, /name="intent" value="wishlist-remove"/);
assert.match(view, /name="intent" value="notification-read"/);
assert.match(view, /name="intent" value="notification-acknowledge"/);
assert.match(view, /فقط خوانده‌نشده/);
assert.match(view, /فعلاً فعال نیست/);
assert.doesNotMatch(view, /item\.payload|notification\.payload/);
assert.match(view, /<bdi dir="ltr">/);

assert.match(css, /account-tools__nav/);
assert.match(css, /min-height:\s*44px/);
assert.match(css, /:focus-visible/);
assert.match(css, /@media \(max-width: 37\.5rem\)/);
assert.doesNotMatch(css.toLowerCase(), /brown|#(?:6f4e37|795548|8b4513)/);

assert.match(pkg, /wishlist-notifications-tools:verify/);

console.log(JSON.stringify({
  status: "PASS",
  stage: "64-F",
  route: "/account/tools",
  authority: {
    wishlist: true,
    notifications: true,
    productAlerts: "NO_ACTION",
    loyalty: "NO_ACTION",
    reviews: "NO_ACTION",
    rawNotificationPayloadRendered: false,
    browserCredentialStorage: false,
  },
}));
