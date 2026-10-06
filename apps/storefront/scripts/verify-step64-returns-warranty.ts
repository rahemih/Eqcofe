import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const contract = read("apps/storefront/app/features/account/account-contract.ts");
const server = read("apps/storefront/app/features/account/account-after-sales.server.ts");
const returnsView = read("apps/storefront/app/features/account/AccountReturnsView.tsx");
const warrantyView = read("apps/storefront/app/features/account/AccountWarrantyView.tsx");
const returnsRoute = read("apps/storefront/app/routes/account-return.tsx");
const warrantyRoute = read("apps/storefront/app/routes/account-warranty.tsx");
const css = read("apps/storefront/app/styles/account.css");
const stageB = read("docs/11-step-history/STEP-64-B-CONTRACT-READINESS.md");
const pkg = read("apps/storefront/package.json");

for (const expected of [
  'ApiRequestInput<"post", "/customer/orders/{order_number}/returns">',
  'ApiRequestInput<"get", "/customer/returns">',
  'ApiRequestInput<"get", "/customer/returns/{return_number}">',
  'ApiRequestInput<"get", "/customer/returns/{return_number}/timeline">',
  'ApiRequestInput<"post", "/customer/returns/{return_number}/cancel">',
  'ApiRequestInput<"post", "/customer/warranty/claims">',
  'ApiRequestInput<"get", "/customer/warranty/claims">',
  'ApiRequestInput<"get", "/customer/warranty/claims/{claim_number}">',
  'ApiRequestInput<"get", "/customer/warranty/claims/{claim_number}/timeline">',
]) assert.ok(contract.includes(expected), expected);

assert.match(stageB, /Customer Returns create\/list\/detail\/timeline\/cancel contracts are aligned|Returns create\/list\/detail\/timeline\/cancel contracts are aligned/);
assert.match(stageB, /Customer Warranty create\/list\/detail\/timeline contracts are aligned|Warranty create\/list\/detail\/timeline contracts are aligned/);

assert.match(server, /createCustomerSessionBridge/);
assert.match(server, /"post", "\/customer\/orders\/\{order_number\}\/returns"/);
assert.match(server, /"get", "\/customer\/returns"/);
assert.match(server, /"get", "\/customer\/returns\/\{return_number\}"/);
assert.match(server, /"get", "\/customer\/returns\/\{return_number\}\/timeline"/);
assert.match(server, /"post", "\/customer\/returns\/\{return_number\}\/cancel"/);
assert.match(server, /item\.status !== "requested"/);
assert.match(server, /"post", "\/customer\/warranty\/claims"/);
assert.match(server, /"get", "\/customer\/warranty\/claims"/);
assert.match(server, /"get", "\/customer\/warranty\/claims\/\{claim_number\}"/);
assert.match(server, /"get", "\/customer\/warranty\/claims\/\{claim_number\}\/timeline"/);
assert.match(server, /"Idempotency-Key"/);
assert.match(server, /stableAfterSalesKey/);
assert.match(server, /error\.status === 403 \|\| error\.status === 404/);
assert.match(server, /موفقیت را فرض نکنید/);
assert.doesNotMatch(server, /localStorage|sessionStorage/);
assert.doesNotMatch(server, /"\/admin\//);
assert.doesNotMatch(server, /refund_amount_toman|replacement_request|warehouse_id|start-review|start-repair|resolve|close/);

assert.doesNotMatch(returnsRoute, /RoutePlaceholder/);
assert.doesNotMatch(warrantyRoute, /RoutePlaceholder/);
assert.match(returnsRoute, /loadAccountReturns/);
assert.match(returnsRoute, /mutateAccountReturn/);
assert.match(warrantyRoute, /loadAccountWarranty/);
assert.match(warrantyRoute, /mutateAccountWarranty/);

assert.match(returnsView, /name="intent" value="create-return"/);
assert.match(returnsView, /name="intent" value="cancel-return"/);
assert.match(returnsView, /<bdi dir="ltr">/);
assert.match(returnsView, /timeline\.timeline/);
assert.doesNotMatch(returnsView, /item\.items|refund_amount|replacement_request|warehouse_id/);

assert.match(warrantyView, /name="intent" value="create-warranty"/);
assert.match(warrantyView, /preferred_resolution/);
assert.match(warrantyView, /<bdi dir="ltr">/);
assert.match(warrantyView, /timeline\.timeline/);
assert.doesNotMatch(warrantyView, /refund_amount|replacement_request|warehouse_id|start-review|start-repair/);

assert.match(css, /account-after-sales__form/);
assert.match(css, /min-height:\s*44px/);
assert.match(css, /:focus-visible/);
assert.match(css, /@media \(max-width: 37\.5rem\)/);
assert.doesNotMatch(css.toLowerCase(), /brown|#(?:6f4e37|795548|8b4513)/);
assert.match(pkg, /returns-warranty:verify/);

console.log(JSON.stringify({
  status: "PASS",
  stage: "64-G",
  routes: [
    "/account/returns/:returnNumber?",
    "/account/warranty/:claimNumber?",
  ],
  authority: {
    returns: "customer-owned-list-detail-timeline-create-cancel-requested-only",
    warranty: "customer-owned-list-detail-timeline-create",
    idempotency: true,
    unknownMutationSuccess: false,
    adminAuthorityExposed: false,
    browserCredentialStorage: false,
  },
}));
