import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(path, "utf8");
const [view, route, css, pkg] = await Promise.all([
  read("apps/storefront/app/features/content/SupportContactView.tsx"),
  read("apps/storefront/app/routes/contact.tsx"),
  read("apps/storefront/app/styles/content.css"),
  read("apps/storefront/package.json"),
]);

assert.equal(route.includes("RoutePlaceholder"), false);
assert.ok(route.includes("SupportContactView"));
assert.ok(route.includes('name: "robots"'));

assert.ok(view.includes("<h1"));
assert.ok(view.includes("ارسال مستقیم پیام عمومی هنوز فعال نیست"));
assert.ok(view.includes("API عمومی مصوبی برای ارسال پیام پشتیبانی وجود ندارد"));
for (const path of ["/account/orders", "/account/returns", "/account/warranty", "/account/wholesale", "/faq"]) {
  assert.ok(view.includes(path), "STEP66_F_SUPPORT_PATH_MISSING:" + path);
}
for (const sensitive of ["رمز یک‌بارمصرف", "token", "secret", "اطلاعات کامل کارت"]) {
  assert.ok(view.includes(sensitive), "STEP66_F_PRIVACY_WARNING_MISSING:" + sensitive);
}
for (const forbidden of ["<form", "<input", "<textarea", 'type="submit"', "mailto:", "tel:", "24 ساعت", "۲۴ ساعت", "SLA"]) {
  assert.equal(view.includes(forbidden), false, "STEP66_F_UNAPPROVED_SUPPORT_BEHAVIOR:" + forbidden);
}
assert.ok(css.includes("support-page"));
assert.ok(css.includes("min-block-size: var(--eq-size-touch-min)"));
assert.equal(/\bbrown\b/i.test(css), false);
assert.equal(/(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css), false);

const packageJson = JSON.parse(pkg) as { scripts: Record<string, string> };
assert.equal(packageJson.scripts["contact-support:verify"], "pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step66-contact-support.ts");
const verifyScript = packageJson.scripts.verify;
if (typeof verifyScript !== "string") throw new Error("STEP66_F_VERIFY_CHAIN_MISSING");
for (const inherited of ["content-foundation:verify","article-seo:verify","policy-pages:verify","contact-support:verify"]) {
  assert.ok(verifyScript.includes(inherited), "STEP66_F_INHERITED_GATE_MISSING:" + inherited);
}

console.log("STEP66_CONTACT_SUPPORT_VERIFY_PASS");
