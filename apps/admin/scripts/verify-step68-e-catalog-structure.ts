import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isTrustedCatalogFormOrigin } from "../app/catalog/catalog-form.server.js";

const adminRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(adminRoot, "../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

const task = JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP68-E-CATALOG-STRUCTURE-001.json")) as {
  risk: string; human_gate_required: boolean; canonical: { base_sha: string };
  scope: { write: string[]; forbidden: string[] };
};
assert.equal(task.risk, "HIGH", "STEP68_E_RISK");
assert.equal(task.human_gate_required, true, "STEP68_E_HUMAN_GATE");
assert.equal(task.canonical.base_sha, "de4f72a4c2e9c4d3d48762e778f45d3644d9c727", "STEP68_E_BASE");
for (const path of ["contracts/http/openapi.yaml", "src/generated/openapi.ts", "apps/admin/**"]) {
  assert.ok(task.scope.write.includes(path), "STEP68_E_WRITE:" + path);
}
for (const path of ["database/**", "apps/storefront/**", "docs/12-current-state/**"]) {
  assert.ok(task.scope.forbidden.includes(path), "STEP68_E_FORBIDDEN:" + path);
}

const openapi = read("contracts/http/openapi.yaml");
const generated = read("src/generated/openapi.ts");
for (const [yamlStart, yamlEnd, genStart, genEnd] of [
  ["/admin/brands/{id}:", "/admin/brands/{id}/stop-sales:", "patchAdminBrandsId: {", "postAdminBrandsIdStopSales: {"],
  ["/admin/categories/{id}:", "/admin/categories/{id}/stop-sales:", "patchAdminCategoriesId: {", "postAdminCategoriesIdStopSales: {"],
] as const) {
  assert.ok(section(openapi, yamlStart, yamlEnd).includes("$ref: '#/components/parameters/IfMatch'"), "STEP68_E_TAXONOMY_IF_MATCH_OPENAPI:" + yamlStart);
  assert.ok(section(generated, genStart, genEnd).includes('"If-Match": components["parameters"]["IfMatch"]'), "STEP68_E_TAXONOMY_IF_MATCH_GENERATED:" + genStart);
}

const server = read("apps/admin/app/catalog/catalog-structure.server.ts");
const structureRoute = read("apps/admin/app/routes/catalog-structure.tsx");
const assignmentRoute = read("apps/admin/app/routes/catalog-product-attributes.tsx");
const productRoute = read("apps/admin/app/routes/catalog-product.tsx");
const routes = read("apps/admin/app/routes.ts");
const shell = read("apps/admin/app/shell/AdminShell.tsx");
const packageJson = JSON.parse(read("apps/admin/package.json")) as { scripts: Record<string,string> };

assert.ok(server.includes("createAdminAuthBridge(request)"), "STEP68_E_AUTH_BRIDGE");
assert.ok(!server.includes("fetch("), "STEP68_E_NO_ADHOC_FETCH");
for (const endpoint of [
  '"/admin/brands"', '"/admin/brands/{id}"', '"/admin/brands/{id}/stop-sales"', '"/admin/brands/{id}/resume-sales"',
  '"/admin/categories"', '"/admin/categories/{id}"', '"/admin/categories/{id}/stop-sales"', '"/admin/categories/{id}/resume-sales"',
  '"/admin/attributes"', '"/admin/attributes/{id}"', '"/admin/attributes/{id}/values"', '"/admin/attribute-values/{id}"',
  '"/admin/products/{product_id}/attributes"', '"/admin/variants/{id}/attributes"',
]) assert.ok(server.includes(endpoint), "STEP68_E_ENDPOINT:" + endpoint);

assert.ok(server.includes('headers: { "If-Match": formatIfMatch(version) }'), "STEP68_E_TYPED_IF_MATCH");
const assignmentSection = section(server, "export async function setAdminAssignments(", "\nasync function readList");
assert.ok(!assignmentSection.includes('"If-Match"'), "STEP68_E_ASSIGNMENT_NO_IF_MATCH");
assert.ok(assignmentSection.includes('"/admin/products/{product_id}/variants"'), "STEP68_E_VARIANT_PARENT_PREFLIGHT");
assert.ok(assignmentSection.includes("variants.data.some((variant) => variant.id === target.id)"), "STEP68_E_VARIANT_PARENT_BINDING");
assert.ok(server.includes('kind: "unknown_outcome"'), "STEP68_E_UNKNOWN_OUTCOME");
assert.ok(server.includes("await reread(bridge)"), "STEP68_E_CANONICAL_REREAD");
assert.ok(!server.includes('request("delete"'), "STEP68_E_NO_DELETE");
assert.ok(!server.includes('"/admin/media/'), "STEP68_E_NO_MEDIA");
assert.ok(!server.includes('"/admin/sales-control/'), "STEP68_E_NO_BULK");
assert.ok(!server.includes('"/admin/pricing/'), "STEP68_E_NO_PRICING");

assert.ok(structureRoute.includes("isTrustedCatalogFormOrigin(request)"), "STEP68_E_STRUCTURE_ORIGIN");
assert.ok(assignmentRoute.includes("isTrustedCatalogFormOrigin(request)"), "STEP68_E_ASSIGNMENT_ORIGIN");
assert.equal(isTrustedCatalogFormOrigin(new Request("https://admin.eqcofe.test/catalog/structure/brands", {headers:{origin:"https://admin.eqcofe.test"}})), true, "STEP68_E_SAME_ORIGIN");
assert.equal(isTrustedCatalogFormOrigin(new Request("https://admin.eqcofe.test/catalog/structure/brands", {headers:{origin:"https://evil.example"}})), false, "STEP68_E_CROSS_ORIGIN");

for (const intent of [
  "create-brand","update-brand","stop-brand-sales","resume-brand-sales",
  "create-category","update-category","stop-category-sales","resume-category-sales",
  "create-attribute","update-attribute","create-attribute-value","update-attribute-value",
]) assert.ok(structureRoute.includes(intent), "STEP68_E_INTENT:" + intent);
assert.ok(structureRoute.includes('name="version"'), "STEP68_E_VERSION_FORMS");
assert.ok(structureRoute.includes("چرخه و والد نامعتبر توسط Backend رد می‌شود"), "STEP68_E_CATEGORY_AUTHORITY");
assert.ok(structureRoute.includes("هیچ حذف یا آرشیو ساختگی ایجاد نمی‌کند"), "STEP68_E_NO_FAKE_DELETE_UI");

assert.ok(assignmentRoute.includes('name="intent" value="replace-assignments"'), "STEP68_E_FULL_SET_FORM");
assert.ok(assignmentRoute.includes('name={"attribute:" + attribute.id}'), "STEP68_E_ASSIGNMENT_FIELDS");
assert.ok(assignmentRoute.includes("جایگزینی مجموعه مشخصات"), "STEP68_E_FULL_SET_DISCLOSURE");
assert.ok(assignmentRoute.includes("If-Match ساختگی"), "STEP68_E_NO_FAKE_CONCURRENCY_DISCLOSURE");

assert.ok(routes.includes('route("catalog/structure/:kind"'), "STEP68_E_STRUCTURE_ROUTE");
assert.ok(routes.includes('route("catalog/products/:productId/attributes"'), "STEP68_E_ASSIGNMENT_ROUTE");
for (const [surface, href] of [
  ["AD-C-03", "/catalog/structure/attributes"],
  ["AD-C-05", "/catalog/structure/brands"],
  ["AD-C-06", "/catalog/structure/categories"],
] as const) {
  assert.ok(shell.includes(`surface==="${surface}"`), "STEP68_E_SHELL_SURFACE:" + surface);
  assert.ok(shell.includes(`return "${href}"`), "STEP68_E_SHELL_HREF:" + href);
}
assert.ok(productRoute.includes('"/attributes"'), "STEP68_E_PRODUCT_ATTRIBUTE_LINK");

assert.equal(packageJson.scripts["catalog-structure:verify"], "pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step68-e-catalog-structure.ts", "STEP68_E_VERIFY_SCRIPT");
assert.ok((packageJson.scripts.verify ?? "").includes("catalog-structure:verify"), "STEP68_E_VERIFY_CHAIN");

console.log("Step 68-E Catalog structure verification: PASS");

function section(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, "STEP68_E_SECTION_MISSING:" + startMarker);
  return source.slice(start, end);
}
