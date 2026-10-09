import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(path, "utf8");

const [contract, data, view, route, css, pkg, applyRoute, statusRoute] = await Promise.all([
  read("apps/storefront/app/features/wholesale/wholesale-contract.ts"),
  read("apps/storefront/app/features/wholesale/wholesale-data.server.ts"),
  read("apps/storefront/app/features/wholesale/WholesaleIntroductionView.tsx"),
  read("apps/storefront/app/routes/wholesale.tsx"),
  read("apps/storefront/app/styles/wholesale.css"),
  read("apps/storefront/package.json"),
  read("apps/storefront/app/routes/wholesale-apply.tsx"),
  read("apps/storefront/app/routes/account-wholesale.tsx"),
]);

for (const capability of [
  'ApiSuccessData<"get", "/auth/session">',
  'ApiSuccessData<"get", "/customer/profile">',
  'ApiSuccessData<"get", "/customer/wholesale/application">',
]) {
  assert.ok(contract.includes(capability), capability);
}

assert.ok(data.includes("createCustomerSessionBridge"));
assert.ok(data.includes('client.request("get", "/auth/session"'));
assert.ok(data.includes('client.request("get", "/customer/profile"'));
assert.ok(data.includes('client.request("get", "/customer/wholesale/application"'));
assert.ok(data.includes("error.status === 401"));
assert.ok(!data.includes("localStorage"));
assert.ok(!data.includes("sessionStorage"));
assert.ok(!data.includes("document.cookie"));

assert.ok(view.includes("خرید عمده تجهیزات قهوه از ایکوفی"));
assert.ok(view.includes("تأیید درخواست یا میزان تخفیف از پیش تضمین نمی‌شود"));
assert.ok(view.includes('state.customerType === "wholesale"'));
assert.ok(view.includes('state.application.status === "rejected"'));
assert.ok(view.includes("فرم دوم ساخته نمی‌شود"));
assert.ok(!view.includes("localStorage"));
assert.ok(!view.includes("sessionStorage"));
assert.ok(!view.includes("11 عدد"));
assert.ok(!view.includes("درصد تخفیف"));

assert.ok(route.includes("loadWholesaleIntroduction"));
assert.ok(route.includes("appendCustomerSessionSetCookies"));
assert.ok(route.includes("WholesaleIntroductionView"));
assert.ok(!route.includes("RoutePlaceholder"));

assert.ok(css.includes("min-height: 44px"));
assert.ok(css.includes("focus-visible"));
assert.ok(css.includes("max-width: 37.5rem"));

assert.ok(applyRoute.includes("RoutePlaceholder"));
assert.ok(statusRoute.includes("RoutePlaceholder"));

const packageJson = JSON.parse(pkg) as { scripts: Record<string, string> };
assert.equal(
  packageJson.scripts["wholesale-foundation:verify"],
  "pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step65-wholesale-foundation.ts",
);
const verifyScript = packageJson.scripts.verify;
if (typeof verifyScript !== "string") {
  throw new Error("STOREFRONT_VERIFY_CHAIN_MISSING");
}
assert.ok(verifyScript.includes("wholesale-foundation:verify"));

console.log("STEP65_WHOLESALE_FOUNDATION_VERIFY_PASS");
