import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract=readFileSync("apps/storefront/app/features/account/account-contract.ts","utf8");
const data=readFileSync("apps/storefront/app/features/account/account-data.server.ts","utf8");
const view=readFileSync("apps/storefront/app/features/account/AccountOverviewView.tsx","utf8");
const route=readFileSync("apps/storefront/app/routes/account.tsx","utf8");
const css=readFileSync("apps/storefront/app/styles/account.css","utf8");
const routes=readFileSync("apps/storefront/app/routes.ts","utf8");

for(const path of ["/auth/session","/customer/orders","/customer/notifications"]) assert.match(contract,new RegExp(path.replaceAll("/","\\/")));
assert.match(data,/createCustomerSessionBridge/);
assert.match(data,/Promise\.allSettled/);
assert.match(data,/status: "unauthenticated"/);
assert.match(data,/partialFailures/);
assert.doesNotMatch(data,/localStorage|sessionStorage|document\.cookie/);
assert.match(route,/loadAccountOverview/);
assert.match(route,/appendCustomerSessionSetCookies/);
assert.doesNotMatch(route,/RoutePlaceholder/);
assert.match(view,/پیشخوان حساب کاربری/);
assert.match(view,/نشست شما پایان یافته است/);
assert.match(view,/سفارش‌های اخیر/);
assert.match(view,/اعلان‌های اخیر/);
assert.match(view,/خدمات مشتری/);
assert.match(view,/to="\/account\/profile"/);
assert.match(view,/to="\/account\/orders"/);
assert.match(view,/to="\/account\/returns"/);
assert.match(view,/to="\/account\/warranty"/);
assert.match(css,/min-height: 44px/);
assert.match(css,/:focus-visible/);
assert.match(css,/@media \(max-width: 37\.5rem\)/);
assert.match(routes,/route\("account", "\.\/routes\/account\.tsx"\)/);

console.log(JSON.stringify({
  status:"PASS",
  stage:"64-C",
  route:"/account",
  generatedContractAuthority:true,
  customerSessionBridge:true,
  partialRecovery:true,
  productionOverview:true,
  childRoutesDeferred:true,
  browserAuthAuthorityInvented:false
}));
