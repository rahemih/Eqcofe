import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(path, "utf8");
const [content, page, about, faq, terms, returns, contact, css, pkg] = await Promise.all([
  read("apps/storefront/app/features/content/static-content.ts"),
  read("apps/storefront/app/features/content/StaticInfoPage.tsx"),
  read("apps/storefront/app/routes/about.tsx"),
  read("apps/storefront/app/routes/faq.tsx"),
  read("apps/storefront/app/routes/terms.tsx"),
  read("apps/storefront/app/routes/returns-warranty.tsx"),
  read("apps/storefront/app/routes/contact.tsx"),
  read("apps/storefront/app/styles/content.css"),
  read("apps/storefront/package.json"),
]);

for (const source of [about, faq, terms, returns]) {
  assert.equal(source.includes("RoutePlaceholder"), false, "STEP66_E_ROUTE_STILL_PLACEHOLDER");
  assert.ok(source.includes('name: "robots"'));
}
assert.ok(page.includes('aria-labelledby="static-page-title"'));
assert.ok(page.includes("<h1"));
assert.ok(page.includes("<h2"));

for (const required of [
  "دانه یا پودر قهوه",
  "دستگاه اسپرسوساز صنعتی",
  "واحد پایه قیمت تومان",
  "ارسال درخواست به معنی تأیید نیست",
  "ثبت درخواست به معنی پذیرش مرجوعی",
  "eligibility",
  "SLA",
]) {
  assert.ok(content.includes(required), "STEP66_E_APPROVED_BOUNDARY_MISSING:" + required);
}

for (const forbidden of [
  "٪ تخفیف تضمینی",
  "تضمین بازپرداخت",
  "تا ۷ روز",
  "تا ۳۰ روز",
  "پاسخ در ۲۴ ساعت",
  "نمایندگی رسمی",
  "گواهینامه",
]) {
  assert.equal(content.includes(forbidden), false, "STEP66_E_UNAPPROVED_CLAIM:" + forbidden);
}

assert.ok(faq.includes("<details"));
assert.ok(faq.includes("<summary"));
assert.ok(terms.includes("TERMS_CONTENT"));
assert.ok(returns.includes("RETURNS_CONTENT"));
const contactProductionized =
  contact.includes("SupportContactView")
  && !contact.includes("RoutePlaceholder");
assert.ok(
  contact.includes("RoutePlaceholder") || contactProductionized,
  "STEP66_CONTACT_HANDOFF_INVALID",
);

assert.equal(/\bbrown\b/i.test(css), false);
assert.equal(/(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css), false);

const packageJson = JSON.parse(pkg) as { scripts: Record<string, string> };
assert.equal(packageJson.scripts["policy-pages:verify"], "pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step66-policy-pages.ts");
const verifyScript = packageJson.scripts.verify;
if (typeof verifyScript !== "string") throw new Error("STEP66_E_VERIFY_CHAIN_MISSING");
assert.ok(verifyScript.includes("policy-pages:verify"));

console.log("STEP66_POLICY_PAGES_VERIFY_PASS");
