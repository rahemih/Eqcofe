import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(path, "utf8");
const [content, page, about, faq, terms, returns, css, pkg, contact] = await Promise.all([
  read("apps/storefront/app/features/content/static-content.ts"),
  read("apps/storefront/app/features/content/StaticContentPage.tsx"),
  read("apps/storefront/app/routes/about.tsx"),
  read("apps/storefront/app/routes/faq.tsx"),
  read("apps/storefront/app/routes/terms.tsx"),
  read("apps/storefront/app/routes/returns-warranty.tsx"),
  read("apps/storefront/app/styles/content.css"),
  read("apps/storefront/package.json"),
  read("apps/storefront/app/routes/contact.tsx"),
]);

for (const expected of [
  'POLICY_CONTENT_VERSION = "1.0"',
  'POLICY_EFFECTIVE_DATE = "2026-10-11"',
  "واحد پایه قیمت در EQCOFE تومان است",
  "کیف پول در محدوده محصول EQCOFE قرار ندارد",
  "بازگشت مرورگر به‌تنهایی موفقیت پرداخت را ثابت نمی‌کند",
  "درخواست در حال بررسی به‌تنهایی چنین اختیاری ایجاد نمی‌کند",
  "ثبت درخواست به معنی پذیرش قطعی نیست",
  "این صفحه مدت گارانتی یا پذیرش قطعی برای همه کالاها تعریف نمی‌کند",
]) assert.ok(content.includes(expected), "STEP66_E_CONTENT_FACT_MISSING:" + expected);

for (const forbidden of [
  "تضمین ارسال", "ارسال در 24", "ارسال ۲۴", "پاسخ در 24", "پاسخ در ۲۴",
  "گارانتی یک سال", "گارانتی ۱۲", "مرجوعی 7", "مرجوعی ۷", "دارای مجوز", "شریک رسمی",
]) assert.equal(content.includes(forbidden), false, "STEP66_E_UNAPPROVED_CLAIM:" + forbidden);

assert.ok(page.includes("<main"));
assert.ok(page.includes("<h1"));
assert.ok(page.includes('aria-label="فهرست مطالب"'));
assert.ok(page.includes("<details"));
assert.ok(page.includes("<summary"));
assert.equal(page.includes("dangerouslySetInnerHTML"), false);

for (const route of [about, faq, terms, returns]) {
  assert.equal(route.includes("RoutePlaceholder"), false, "STEP66_E_ROUTE_NOT_PRODUCTIONIZED");
  assert.ok(route.includes("../styles/content.css"));
}
assert.ok(contact.includes("RoutePlaceholder"), "STEP66_E_CONTACT_BOUNDARY_BROKEN");

assert.ok(css.includes("focus-visible"));
assert.equal(/\bbrown\b/i.test(css), false);
assert.equal(/(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css), false);

const packageJson = JSON.parse(pkg) as { scripts: Record<string, string> };
assert.equal(packageJson.scripts["policy-content:verify"], "pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step66-policy-content.ts");
const verifyScript = packageJson.scripts.verify;
if (typeof verifyScript !== "string") throw new Error("STEP66_E_VERIFY_CHAIN_MISSING");
assert.ok(verifyScript.includes("policy-content:verify"));
assert.ok(verifyScript.includes("article-seo:verify"));
assert.ok(verifyScript.includes("content-foundation:verify"));

console.log("STEP66_POLICY_CONTENT_VERIFY_PASS");
