import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(path, "utf8");

const [
  contract,
  server,
  applicationView,
  statusView,
  applyRoute,
  statusRoute,
  css,
  pkg,
  publicRoute,
] = await Promise.all([
  read("apps/storefront/app/features/wholesale/wholesale-contract.ts"),
  read("apps/storefront/app/features/wholesale/wholesale-application.server.ts"),
  read("apps/storefront/app/features/wholesale/WholesaleApplicationView.tsx"),
  read("apps/storefront/app/features/wholesale/WholesaleStatusView.tsx"),
  read("apps/storefront/app/routes/wholesale-apply.tsx"),
  read("apps/storefront/app/routes/account-wholesale.tsx"),
  read("apps/storefront/app/styles/wholesale.css"),
  read("apps/storefront/package.json"),
  read("apps/storefront/app/routes/wholesale.tsx"),
]);

for (const capability of [
  'ApiRequestInput<"post", "/customer/wholesale/applications">',
  'ApiSuccessData<"post", "/customer/wholesale/applications">',
  'ApiSuccessData<"get", "/customer/wholesale/application">',
  'WholesaleProfile["customer_type"]',
]) {
  assert.ok(contract.includes(capability), capability);
}

for (const capability of [
  "createCustomerSessionBridge",
  "IRAN_PROVINCES_1404",
  "IRAN_CITIES_1404",
  "isIranProvinceCityPair1404",
  '"get", "/customer/profile"',
  '"get", "/customer/wholesale/application"',
  '"post", "/customer/wholesale/applications"',
  '"Idempotency-Key"',
  'createHash("sha256")',
  "extractCustomerSessionCookieHeader",
  "response.status !== 201",
  "error.status === 401",
  "error.status === 409",
  "error.status === 422",
]) {
  assert.ok(server.includes(capability), capability);
}

assert.ok(server.includes('snapshot.application.status === "rejected"'));
assert.ok(server.includes('preflight.customerType === "wholesale"'));
assert.ok(server.includes('preflight.application.status !== "rejected"'));
assert.ok(server.includes('redirectTo: "/account/wholesale"'));
assert.ok(server.includes("business_name"));
assert.ok(server.includes("250"));
assert.ok(server.includes("manager_name"));
assert.ok(server.includes("200"));
assert.ok(server.includes("business_type"));
assert.ok(server.includes("100"));
assert.ok(server.includes("business_identifier"));
assert.ok(server.includes("note"));
assert.ok(server.includes("4000"));
assert.ok(!server.includes("localStorage"));
assert.ok(!server.includes("sessionStorage"));
assert.ok(!server.includes("start-review"));
assert.ok(!server.includes("/approve"));
assert.ok(!server.includes("/reject"));

assert.ok(applicationView.includes("SF-E-08"));
assert.ok(applicationView.includes('name="business_name"'));
assert.ok(applicationView.includes('maxLength={250}'));
assert.ok(applicationView.includes('name="manager_name"'));
assert.ok(applicationView.includes('maxLength={200}'));
assert.ok(applicationView.includes('name="business_type"'));
assert.ok(applicationView.includes('maxLength={100}'));
assert.ok(applicationView.includes('name="province_id"'));
assert.ok(applicationView.includes('name="city_id"'));
assert.ok(applicationView.includes("ثبت درخواست به معنی تأیید حساب یا تضمین تخفیف نیست"));
assert.ok(!applicationView.includes("درصد تخفیف"));
assert.ok(!applicationView.includes("11 عدد"));

assert.ok(statusView.includes("SF-E-09"));
for (const status of ["submitted", "under_review", "approved", "rejected"]) {
  assert.ok(statusView.includes(`case "${status}"`), status);
}
assert.ok(statusView.includes('customerType === "wholesale"'));
assert.ok(statusView.includes("نوع مشتری پروفایل"));
assert.ok(statusView.includes("application.rejection_reason"));
assert.ok(statusView.includes("application.decision_note"));
assert.ok(!statusView.includes("start-review"));
assert.ok(!statusView.includes("/approve"));
assert.ok(!statusView.includes("/reject"));

for (const route of [applyRoute, statusRoute]) {
  assert.ok(!route.includes("RoutePlaceholder"));
  assert.ok(route.includes("appendCustomerSessionSetCookies"));
  assert.ok(route.includes('name: "robots", content: "noindex,nofollow"'));
}
assert.ok(applyRoute.includes("submitWholesaleApplication"));
assert.ok(applyRoute.includes("loadWholesaleApplicationPage"));
assert.ok(applyRoute.includes("redirect(result.redirectTo"));
assert.ok(statusRoute.includes("loadWholesaleAccountSnapshot"));

assert.ok(publicRoute.includes("WholesaleIntroductionView"));
assert.ok(publicRoute.includes("loadWholesaleIntroduction"));

assert.ok(css.includes("min-height: 44px"));
assert.ok(css.includes("focus-visible"));
assert.ok(css.includes("max-width: 37.5rem"));
assert.ok(css.includes(".wholesale-account__form"));
assert.ok(css.includes(".wholesale-status__facts"));

const packageJson = JSON.parse(pkg) as { scripts: Record<string, string | undefined> };
assert.equal(
  packageJson.scripts["wholesale-application:verify"],
  "pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step65-wholesale-application.ts",
);
const verifyScript = packageJson.scripts.verify;
if (typeof verifyScript !== "string") {
  throw new Error("STOREFRONT_VERIFY_CHAIN_MISSING");
}
assert.ok(verifyScript.includes("wholesale-foundation:verify"));
assert.ok(verifyScript.includes("wholesale-application:verify"));

console.log("STEP65_WHOLESALE_APPLICATION_VERIFY_PASS");
