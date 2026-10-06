import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const contract = read("apps/storefront/app/features/account/account-contract.ts");
const server = read("apps/storefront/app/features/account/account-orders.server.ts");
const listView = read("apps/storefront/app/features/account/AccountOrdersView.tsx");
const detailView = read("apps/storefront/app/features/account/AccountOrderDetailView.tsx");
const listRoute = read("apps/storefront/app/routes/account-orders.tsx");
const detailRoute = read("apps/storefront/app/routes/account-order-detail.tsx");
const css = read("apps/storefront/app/styles/account.css");
const pkg = read("apps/storefront/package.json");

for (const expected of [
  'ApiRequestInput<"get", "/customer/orders">',
  'ApiRequestInput<"get", "/customer/orders/{order_number}">',
  'ApiRequestInput<"get", "/customer/orders/{order_number}/timeline">',
  'ApiRequestInput<"get", "/customer/orders/{order_number}/invoice">',
  'ApiRequestInput<"post", "/customer/orders/{order_number}/cancel">',
]) assert.ok(contract.includes(expected), expected);

assert.match(server, /createCustomerSessionBridge/);
assert.match(server, /const PAGE_SIZE = 12/);
assert.match(server, /meta\.pagination/);
assert.match(server, /allowed_actions\.includes\("cancel_order"\)/);
assert.match(server, /"Idempotency-Key"/);
assert.match(server, /stableOrderIdempotencyKey/);
assert.match(server, /status === 403 \|\| error\.status === 404/);
assert.match(server, /status === 409/);
assert.match(server, /status === 422/);
assert.match(server, /موفقیت را فرض نکنید/);
assert.doesNotMatch(server, /localStorage|sessionStorage/);

assert.match(server, /function normalizeOrderTimeline/);
assert.match(server, /cleanTimelineString\(row\.to_status\) \?\? cleanTimelineString\(row\.status\)/);
assert.match(server, /from_status: fromStatus/);
assert.match(server, /to_status: toStatus/);

assert.doesNotMatch(listRoute, /RoutePlaceholder/);
assert.doesNotMatch(detailRoute, /RoutePlaceholder/);
assert.match(listRoute, /loadAccountOrders/);
assert.match(detailRoute, /loadAccountOrderDetail/);
assert.match(detailRoute, /mutateAccountOrder/);

assert.match(listView, /toLocaleString\("fa-IR"\)/);
assert.match(listView, /bdi/);
assert.match(listView, /سفارش‌های قدیمی‌تر/);
assert.doesNotMatch(listView, /name="status"|status-filter|filter-status/);
assert.match(detailView, /name="intent" value="cancel-order"/);
assert.match(detailView, /فاکتور authoritative/);
assert.match(detailView, /bdi/);

assert.match(css, /account-orders__list/);
assert.match(css, /account-order-detail__timeline/);
assert.match(css, /min-height:\s*44px/);
assert.match(css, /:focus-visible/);
assert.match(css, /@media \(max-width: 37\.5rem\)/);
assert.doesNotMatch(css.toLowerCase(), /brown|#(?:6f4e37|795548|8b4513)/);

assert.match(pkg, /orders-invoice-actions:verify/);

console.log(JSON.stringify({
  status: "PASS",
  stage: "64-E",
  routes: ["/account/orders", "/account/orders/:order-number"],
  authority: {
    listPagination: "cursor-only",
    detail: true,
    timelineContractAligned: true,
    invoice: true,
    cancellationFromAllowedActions: true,
    cancellationIdempotent: true,
    browserCredentialStorage: false,
  },
}));
