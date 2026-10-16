import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatIfMatch } from "../app/catalog/catalog-mutation.server.js";
import { isTrustedCatalogFormOrigin } from "../app/catalog/catalog-form.server.js";

const adminRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(adminRoot, "../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

const task = JSON.parse(
  read("docs/14-multi-agent/tasks/EQCOFE-STEP68-D-PRODUCT-VARIANT-LIFECYCLE-001.json"),
) as {
  risk: string;
  human_gate_required: boolean;
  canonical: { base_sha: string };
  scope: { write: string[]; forbidden: string[] };
};

assert.equal(task.risk, "HIGH", "STEP68_D_RISK");
assert.equal(task.human_gate_required, true, "STEP68_D_HUMAN_GATE");
assert.equal(
  task.canonical.base_sha,
  "e90a454f001d4e831f6d300927c8fa93325fe1d0",
  "STEP68_D_BASE_SHA",
);
for (const requiredWrite of [
  "apps/admin/**",
  "contracts/http/openapi.yaml",
  "src/generated/openapi.ts",
  "docs/11-step-history/STEP-68-D-PRODUCT-VARIANT-LIFECYCLE.md",
]) {
  assert.ok(task.scope.write.includes(requiredWrite), "STEP68_D_WRITE_SCOPE:" + requiredWrite);
}
for (const forbidden of [
  "database/**",
  "apps/storefront/**",
  "docs/12-current-state/**",
  "docs/13-product-design/**",
]) {
  assert.ok(task.scope.forbidden.includes(forbidden), "STEP68_D_FORBIDDEN:" + forbidden);
}

const openapi = read("contracts/http/openapi.yaml");
const generated = read("src/generated/openapi.ts");
const variantPatchYaml = section(
  openapi,
  "/admin/variants/{id}:",
  "/admin/variants/{id}/stop-sales:",
);
const variantPatchGenerated = section(
  generated,
  "patchAdminVariantsId: {",
  "postAdminVariantsIdStopSales: {",
);

assert.ok(
  variantPatchYaml.includes("$ref: '#/components/parameters/IfMatch'"),
  "STEP68_D_VARIANT_IF_MATCH_OPENAPI",
);
assert.ok(
  variantPatchGenerated.includes('"If-Match": components["parameters"]["IfMatch"]'),
  "STEP68_D_VARIANT_IF_MATCH_GENERATED",
);
assert.equal(formatIfMatch(7), '"7"', "STEP68_D_IF_MATCH_FORMAT");

const mutation = read("apps/admin/app/catalog/catalog-mutation.server.ts");
const form = read("apps/admin/app/catalog/catalog-form.server.ts");
const createRoute = read("apps/admin/app/routes/catalog-product-new.tsx");
const detailRoute = read("apps/admin/app/routes/catalog-product.tsx");
const productEditor = read("apps/admin/app/catalog/CatalogProductEditor.tsx");
const productLifecycle = read("apps/admin/app/catalog/CatalogProductLifecycle.tsx");
const variantAdmin = read("apps/admin/app/catalog/CatalogVariantAdministration.tsx");
const routes = read("apps/admin/app/routes.ts");
const packageJson = JSON.parse(read("apps/admin/package.json")) as { scripts: Record<string, string> };

assert.ok(mutation.includes("createAdminAuthBridge(request)"), "STEP68_D_AUTH_BRIDGE");
assert.ok(!mutation.includes("fetch("), "STEP68_D_NO_ADHOC_FETCH");
assert.ok(mutation.includes('headers: { "If-Match": formatIfMatch(version) }'), "STEP68_D_PRODUCT_AND_VARIANT_IF_MATCH");
assert.ok(mutation.includes('kind: "unknown_outcome"'), "STEP68_D_UNKNOWN_OUTCOME");
assert.ok(mutation.includes('if (outcome.status === 202)'), "STEP68_D_202_NONFINAL");
assert.ok(mutation.includes('error.status === 408 || error.status >= 500'), "STEP68_D_AMBIGUOUS_HTTP_UNKNOWN");
assert.ok(mutation.includes('body: { ...body, status: "active" }'), "STEP68_D_VARIANT_CREATE_ACTIVE");
assert.ok(!mutation.includes('"/admin/sales-control/'), "STEP68_D_NO_BULK_SALES_CONTROL");
assert.ok(!mutation.includes('"/admin/media/'), "STEP68_D_NO_MEDIA_MUTATION");
assert.ok(!mutation.includes('"/admin/pricing/'), "STEP68_D_NO_PRICING_MUTATION");
assert.ok(!mutation.includes('"/admin/brands'), "STEP68_D_NO_BRAND_MUTATION");
assert.ok(!mutation.includes('"/admin/categories'), "STEP68_D_NO_CATEGORY_MUTATION");
assert.ok(!mutation.includes('"/admin/attributes'), "STEP68_D_NO_ATTRIBUTE_MUTATION");

for (const endpoint of [
  '"/admin/products"',
  '"/admin/products/{id}"',
  '"/admin/products/{id}/publish"',
  '"/admin/products/{id}/archive"',
  '"/admin/products/{id}/unarchive"',
  '"/admin/products/{id}/stop-sales"',
  '"/admin/products/{id}/resume-sales"',
  '"/admin/products/{product_id}/variants"',
  '"/admin/variants/{id}"',
  '"/admin/variants/{id}/stop-sales"',
  '"/admin/variants/{id}/resume-sales"',
]) {
  assert.ok(mutation.includes(endpoint), "STEP68_D_ENDPOINT:" + endpoint);
}

assert.ok(form.includes("sec-fetch-site"), "STEP68_D_FORM_ORIGIN_FALLBACK");
assert.equal(
  isTrustedCatalogFormOrigin(
    new Request("https://admin.eqcofe.test/catalog/products/x", {
      headers: { origin: "https://admin.eqcofe.test" },
    }),
  ),
  true,
  "STEP68_D_SAME_ORIGIN_ALLOWED",
);
assert.equal(
  isTrustedCatalogFormOrigin(
    new Request("https://admin.eqcofe.test/catalog/products/x", {
      headers: { origin: "https://evil.example" },
    }),
  ),
  false,
  "STEP68_D_CROSS_ORIGIN_DENIED",
);

assert.ok(routes.includes('route("catalog/products/new"'), "STEP68_D_CREATE_ROUTE");
assert.ok(createRoute.includes('name="primary_category_id"'), "STEP68_D_CREATE_PRIMARY_CATEGORY");
assert.ok(createRoute.includes('name="sales_enabled"'), "STEP68_D_CREATE_SALES_FLAG");
assert.ok(detailRoute.includes('intent === "update-product"'), "STEP68_D_UPDATE_PRODUCT");
assert.ok(detailRoute.includes('intent === "publish-product"'), "STEP68_D_PUBLISH_PRODUCT");
assert.ok(detailRoute.includes('intent === "archive-product"'), "STEP68_D_ARCHIVE_PRODUCT");
assert.ok(detailRoute.includes('intent === "unarchive-product"'), "STEP68_D_UNARCHIVE_PRODUCT");
assert.ok(detailRoute.includes('intent === "create-variant"'), "STEP68_D_CREATE_VARIANT");
assert.ok(detailRoute.includes('intent === "update-variant"'), "STEP68_D_UPDATE_VARIANT");
assert.ok(detailRoute.includes("noticeRef.current?.focus()"), "STEP68_D_OUTCOME_FOCUS_RESTORE");
assert.ok(detailRoute.includes("tabIndex={-1}"), "STEP68_D_OUTCOME_FOCUS_TARGET");
assert.ok(detailRoute.includes("useRevalidator"), "STEP68_D_FAILED_ACTION_REVALIDATOR");
assert.ok(detailRoute.includes("needsRevalidation"), "STEP68_D_FAILED_ACTION_REVALIDATION_FLAG");
assert.ok(detailRoute.includes("بازخوانی وضعیت canonical"), "STEP68_D_CONFLICT_REREAD_PATH");

assert.ok(productEditor.includes('product.status === "archived"'), "STEP68_D_ARCHIVED_EDIT_GUARD");
assert.ok(productEditor.includes('name="version" value={String(product.version)}'), "STEP68_D_PRODUCT_VERSION_FORM");
assert.ok(productLifecycle.includes('intent="archive-product"'), "STEP68_D_ARCHIVE_REVIEW");
assert.ok(productLifecycle.includes("فروش به‌صورت خودکار فعال نمی‌شود"), "STEP68_D_UNARCHIVE_SALES_DISCLOSURE");
assert.ok(variantAdmin.includes("وضعیت اولیه active"), "STEP68_D_VARIANT_ACTIVE_DISCLOSURE");
assert.ok(variantAdmin.includes('name="version" value={String(variant.version)}'), "STEP68_D_VARIANT_VERSION_FORM");
assert.ok(!variantAdmin.includes('name="price'), "STEP68_D_NO_VARIANT_PRICE_EDIT");
assert.ok(!variantAdmin.includes('name="inventory'), "STEP68_D_NO_VARIANT_INVENTORY_EDIT");
assert.ok(!variantAdmin.includes('name="attribute'), "STEP68_D_NO_VARIANT_ATTRIBUTE_EDIT");

assert.equal(
  packageJson.scripts["catalog-lifecycle:verify"],
  "pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step68-d-product-variant-lifecycle.ts",
  "STEP68_D_VERIFY_SCRIPT",
);
assert.ok(
  (packageJson.scripts.verify ?? "").includes("catalog-lifecycle:verify"),
  "STEP68_D_VERIFY_CHAIN",
);

console.log("Step 68-D Product/Variant lifecycle verification: PASS");

function section(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, "STEP68_D_SECTION_MISSING:" + startMarker);
  return source.slice(start, end);
}
