import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const contract = read("apps/storefront/app/features/account/account-contract.ts");
const server = read("apps/storefront/app/features/account/account-settings.server.ts");
const profile = read("apps/storefront/app/features/account/AccountProfileView.tsx");
const addresses = read("apps/storefront/app/features/account/AccountAddressesView.tsx");
const profileRoute = read("apps/storefront/app/routes/account-profile.tsx");
const addressRoute = read("apps/storefront/app/routes/account-addresses.tsx");
const css = read("apps/storefront/app/styles/account.css");
const pkg = read("apps/storefront/package.json");

for (const expected of [
  'ApiRequestInput<"get", "/customer/profile">',
  'ApiRequestInput<"patch", "/customer/profile">',
  'ApiRequestInput<"get", "/customer/addresses">',
  'ApiRequestInput<"post", "/customer/addresses">',
  'ApiRequestInput<"patch", "/customer/addresses/{id}">',
  'ApiRequestInput<"post", "/customer/addresses/{id}/set-default">',
  'ApiRequestInput<"delete", "/customer/addresses/{id}">',
  'ApiRequestInput<"post", "/auth/logout">',
  'ApiRequestInput<"post", "/auth/logout-all">',
]) assert.ok(contract.includes(expected), expected);

assert.match(server, /createCustomerSessionBridge/);
assert.match(server, /stableAccountIdempotencyKey/);
assert.match(server, /isIranProvinceCityPair1404/);
assert.match(server, /IRAN_PROVINCES_1404/);
assert.match(server, /IRAN_CITIES_1404/);
assert.match(server, /"Idempotency-Key"/);
assert.match(server, /listed\.data as AccountAddressesResponse/);
assert.match(server, /find\(\(item\) => item\.id === addressId\)/);
assert.match(server, /statusCode === 401/);
assert.match(server, /statusCode === 403 \|\| statusCode === 404/);
assert.match(server, /statusCode === 409/);
assert.match(server, /موفقیت را فرض نکنید/);
assert.doesNotMatch(server, /localStorage|sessionStorage/);

assert.match(profile, /name="first_name"/);
assert.match(profile, /name="last_name"/);
assert.match(profile, /name="email"/);
assert.doesNotMatch(profile, /name="mobile"/);
assert.match(profile, /تغییر شماره موبایل در قرارداد فعلی پروفایل پشتیبانی نمی‌شود/);
assert.match(profile, /name="intent" value="logout"/);
assert.match(profile, /name="intent" value="logout-all"/);
assert.match(profileRoute, /loadAccountProfile/);
assert.match(profileRoute, /mutateAccountProfile/);
assert.doesNotMatch(profileRoute, /RoutePlaceholder/);

assert.match(addresses, /name="intent" value="create-address"/);
assert.match(addresses, /name="intent" value="update-address"/);
assert.match(addresses, /name="intent" value="set-default-address"/);
assert.match(addresses, /name="intent" value="delete-address"/);
assert.match(addresses, /provinceCities/);
assert.match(addresses, /maskMobile/);
assert.match(addresses, /maskPostal/);
assert.match(addressRoute, /loadAccountAddresses/);
assert.match(addressRoute, /mutateAccountAddress/);
assert.doesNotMatch(addressRoute, /RoutePlaceholder/);

assert.match(css, /min-height:\s*44px/);
assert.match(css, /:focus-visible/);
assert.match(css, /@media \(max-width: 37\.5rem\)/);
assert.doesNotMatch(css.toLowerCase(), /brown|#(?:6f4e37|795548|8b4513)/);
assert.match(pkg, /profile-security-addresses:verify/);

console.log(JSON.stringify({
  status: "PASS",
  stage: "64-D",
  routes: ["/account/profile", "/account/addresses"],
  security: {
    sessionBridge: true,
    idempotency: true,
    ownershipRecheck: true,
    geographyValidation: true,
    browserCredentialStorage: false,
  },
}));
