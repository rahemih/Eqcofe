import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADMIN_CATALOG_CURSOR_MAX_LENGTH,
  ADMIN_CATALOG_PAGE_LIMIT,
  normalizeCatalogCursor,
} from "../app/catalog/catalog-read.server.js";
import { filterLoadedCatalogProducts } from "../app/catalog/catalog-filter.js";

const adminRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(adminRoot, "../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

const task = JSON.parse(
  read("docs/14-multi-agent/tasks/EQCOFE-STEP68-C-ADMIN-CATALOG-READ-001.json"),
) as {
  risk: string;
  human_gate_required: boolean;
  canonical: { base_sha: string };
  scope: { write: string[]; forbidden: string[] };
};

assert.equal(task.risk, "MEDIUM", "STEP68_C_RISK");
assert.equal(task.human_gate_required, false, "STEP68_C_HUMAN_GATE");
assert.equal(
  task.canonical.base_sha,
  "bc5bb287a14d3200a8c234ed5ec0c30e0ee50c11",
  "STEP68_C_BASE_SHA",
);
assert.deepEqual(
  task.scope.write,
  [
    "apps/admin/**",
    "docs/11-step-history/STEP-68-C-ADMIN-CATALOG-READ.md",
    "docs/14-multi-agent/tasks/EQCOFE-STEP68-C-ADMIN-CATALOG-READ-001.json",
    "docs/14-multi-agent/generated/TASK-CATALOG.md",
  ],
  "STEP68_C_WRITE_SCOPE",
);
for (const forbidden of [
  "contracts/**",
  "database/**",
  "src/**",
  "apps/storefront/**",
  "docs/12-current-state/**",
  "docs/13-product-design/**",
]) {
  assert.ok(task.scope.forbidden.includes(forbidden), "STEP68_C_FORBIDDEN:" + forbidden);
}

assert.equal(ADMIN_CATALOG_PAGE_LIMIT, 25, "STEP68_C_PAGE_LIMIT");
assert.equal(normalizeCatalogCursor(null).ok, true, "STEP68_C_CURSOR_ABSENT");
assert.equal(normalizeCatalogCursor("opaque-value").ok, true, "STEP68_C_CURSOR_OPAQUE");
assert.equal(
  normalizeCatalogCursor("x".repeat(ADMIN_CATALOG_CURSOR_MAX_LENGTH + 1)).ok,
  false,
  "STEP68_C_CURSOR_BOUND",
);
assert.equal(normalizeCatalogCursor("bad\nvalue").ok, false, "STEP68_C_CURSOR_CONTROL_CHAR");

const products = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name_fa: "تمپر استیل",
    name_en: "Steel Tamper",
    slug: "steel-tamper",
    brand: { id: "b", name_fa: "برند نمونه", slug: "sample-brand" },
    primary_category: { id: "c", name_fa: "ابزار باریستا", slug: "barista-tools" },
    additional_categories: [],
    status: "draft",
    sales_enabled: false,
    price: null,
    specifications: [],
    variants: [
      {
        id: "v",
        product_id: "11111111-1111-4111-8111-111111111111",
        sku: "TMP-01",
        status: "active",
        sales_enabled: false,
        version: 1,
      },
    ],
    version: 1,
    created_at: "2026-10-16T00:00:00Z",
    updated_at: "2026-10-16T00:00:00Z",
  },
] as Parameters<typeof filterLoadedCatalogProducts>[0];

assert.equal(filterLoadedCatalogProducts(products, "تمپر").length, 1, "STEP68_C_LOCAL_FILTER_FA");
assert.equal(filterLoadedCatalogProducts(products, "TMP-01").length, 1, "STEP68_C_LOCAL_FILTER_SKU");
assert.equal(filterLoadedCatalogProducts(products, "ناموجود").length, 0, "STEP68_C_LOCAL_FILTER_EMPTY");

const readService = read("apps/admin/app/catalog/catalog-read.server.ts");
const listRoute = read("apps/admin/app/routes/catalog-products.tsx");
const detailRoute = read("apps/admin/app/routes/catalog-product.tsx");
const routes = read("apps/admin/app/routes.ts");
const shell = read("apps/admin/app/shell/AdminShell.tsx");
const packageJson = JSON.parse(read("apps/admin/package.json")) as { scripts: Record<string, string> };

assert.ok(readService.includes('createAdminAuthBridge(request)'), "STEP68_C_AUTH_BRIDGE_REQUIRED");
assert.ok(readService.includes('"/admin/products"'), "STEP68_C_PRODUCT_LIST_ENDPOINT");
assert.ok(readService.includes('"/admin/products/{id}"'), "STEP68_C_PRODUCT_DETAIL_ENDPOINT");
assert.ok(
  readService.includes('"/admin/products/{product_id}/variants"'),
  "STEP68_C_VARIANT_READ_ENDPOINT",
);
assert.ok(readService.includes("limit: ADMIN_CATALOG_PAGE_LIMIT"), "STEP68_C_LIMIT_BOUND");
assert.ok(readService.includes("...(cursor ? { cursor } : {})"), "STEP68_C_CURSOR_ONLY");
assert.ok(!/\bq\s*:/.test(readService), "STEP68_C_NO_SERVER_Q");
assert.ok(!/\bstatus\s*:/.test(readService), "STEP68_C_NO_SERVER_STATUS_FILTER");

for (const method of ["post", "put", "patch", "delete"]) {
  assert.ok(
    !readService.includes(`.request("${method}"`),
    "STEP68_C_READ_ONLY_METHOD:" + method,
  );
}

assert.ok(
  listRoute.includes("فقط روی") && listRoute.includes("جستجوی سراسری کاتالوگ نیست"),
  "STEP68_C_LOCAL_FILTER_DISCLOSURE",
);
assert.ok(
  !listRoute.includes('searchParams.get("q")') && !listRoute.includes('searchParams.get("status")'),
  "STEP68_C_NO_SERVER_FILTER_INPUT",
);
assert.ok(
  detailRoute.includes("endpoint canonical ندارد"),
  "STEP68_C_NO_AUDIT_HISTORY_INVENTION",
);
assert.ok(routes.includes('route("catalog/products"'), "STEP68_C_LIST_ROUTE");
assert.ok(routes.includes('route("catalog/products/:productId"'), "STEP68_C_DETAIL_ROUTE");
assert.ok(
  shell.includes('if(surface==="AD-C-01")return "/catalog/products";'),
  "STEP68_C_DESTINATION_ROUTING",
);
assert.equal(
  packageJson.scripts["catalog-read:verify"],
  "pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step68-c-catalog-read.ts",
  "STEP68_C_VERIFY_SCRIPT",
);
assert.ok(
  (packageJson.scripts.verify ?? "").includes("catalog-read:verify"),
  "STEP68_C_VERIFY_CHAIN",
);

console.log("Step 68-C Admin Catalog read verification: PASS");
