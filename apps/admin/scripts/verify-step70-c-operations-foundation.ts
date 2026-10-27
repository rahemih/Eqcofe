import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STEP70_FOUNDATION_SURFACES,
  isStep70FoundationSurface,
  readStep70Foundation,
} from "../app/operations/step70-foundation.server.js";

const adminRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(adminRoot, "../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

const task = JSON.parse(
  read(
    "docs/14-multi-agent/tasks/EQCOFE-STEP70-C-ADMIN-INVENTORY-PROCUREMENT-POS-FOUNDATION-001.json",
  ),
) as {
  risk: string;
  human_gate_required: boolean;
  canonical: { base_sha: string };
  scope: { write: string[]; forbidden: string[] };
  evidence: {
    frozen_surfaces: string[];
    source_proven_foundation_reads: string[];
    explicit_boundaries: Record<string, string>;
  };
};

assert.equal(task.risk, "MEDIUM", "STEP70_C_RISK");
assert.equal(task.human_gate_required, false, "STEP70_C_HUMAN_GATE");
assert.equal(
  task.canonical.base_sha,
  "4a98b9b856233ec01fff4472163b37644d911ce6",
  "STEP70_C_BASE_SHA",
);
assert.deepEqual(
  task.scope.write,
  [
    "apps/admin/**",
    "docs/11-step-history/STEP-70-C-ADMIN-INVENTORY-PROCUREMENT-POS-FOUNDATION.md",
    "docs/14-multi-agent/tasks/EQCOFE-STEP70-C-ADMIN-INVENTORY-PROCUREMENT-POS-FOUNDATION-001.json",
    "docs/14-multi-agent/generated/TASK-CATALOG.md",
  ],
  "STEP70_C_WRITE_SCOPE",
);

for (const forbidden of [
  "contracts/**",
  "database/**",
  "src/**",
  "test/**",
  "scripts/**",
  "apps/storefront/**",
  "docs/12-current-state/**",
  "docs/13-product-design/**",
]) {
  assert.ok(task.scope.forbidden.includes(forbidden), "STEP70_C_FORBIDDEN:" + forbidden);
}

const expectedSurfaces = [
  "AD-D-06",
  "AD-D-07",
  "AD-D-08",
  "AD-D-09",
  "AD-D-10",
  "AD-D-11",
  "AD-D-12",
  "AD-D-13",
  "AD-D-14",
  "AD-D-15",
  "AD-D-16",
  "AD-D-17",
  "AD-D-18",
  "AD-E-09",
  "AD-E-10",
  "AD-E-11",
];
assert.deepEqual([...STEP70_FOUNDATION_SURFACES], expectedSurfaces, "STEP70_C_SURFACES");
assert.deepEqual(task.evidence.frozen_surfaces, expectedSurfaces, "STEP70_C_TASK_SURFACES");
for (const surface of expectedSurfaces) {
  assert.equal(isStep70FoundationSurface(surface), true, "STEP70_C_SURFACE_ALLOWED:" + surface);
}
assert.equal(isStep70FoundationSurface("AD-E-12"), false, "STEP70_C_STEP71_EXCLUDED");

const noReadRequest = { headers: new Headers() };
for (const surface of ["AD-D-07", "AD-E-09", "AD-E-10"] as const) {
  const result = await readStep70Foundation(noReadRequest, surface);
  assert.equal(result.kind, "boundary", "STEP70_C_BOUNDARY:" + surface);
  assert.deepEqual(result.setCookies, [], "STEP70_C_BOUNDARY_COOKIES:" + surface);
}

const expectedReads = [
  "GET /admin/inventory",
  "GET /admin/inventory/transfers",
  "GET /admin/inventory/reservations",
  "GET /admin/inventory/allocations",
  "GET /admin/inventory/warehouses",
  "GET /admin/procurement/suppliers",
  "GET /admin/procurement/purchase-requests",
  "GET /admin/procurement/purchase-orders",
  "GET /admin/procurement/goods-receipts",
  "GET /admin/procurement/landed-costs",
  "GET /admin/procurement/supplier-invoices",
  "GET /admin/procurement/purchase-returns",
  "GET /admin/pos/reconciliation/failed",
];
assert.deepEqual(
  task.evidence.source_proven_foundation_reads,
  expectedReads,
  "STEP70_C_READ_ALLOWLIST",
);
assert.deepEqual(Object.keys(task.evidence.explicit_boundaries).sort(), [
  "AD-D-07",
  "AD-E-09",
  "AD-E-10",
]);

const service = read("apps/admin/app/operations/step70-foundation.server.ts");
const route = read("apps/admin/app/routes/destination.tsx");
const packageJson = JSON.parse(read("apps/admin/package.json")) as {
  scripts: Record<string, string>;
};

assert.ok(service.includes("createAdminAuthBridge(request)"), "STEP70_C_AUTH_BRIDGE_REQUIRED");
for (const operation of expectedReads) {
  const endpoint = operation.slice(4);
  assert.ok(service.includes(`"${endpoint}"`), "STEP70_C_REQUIRED_READ:" + endpoint);
}
assert.equal(
  (service.match(/\.request\("get"/g) ?? []).length,
  expectedReads.length,
  "STEP70_C_EXACT_GET_COUNT",
);
for (const method of ["post", "put", "patch", "delete"]) {
  assert.ok(!service.includes(`.request("${method}"`), "STEP70_C_READ_ONLY_METHOD:" + method);
}
for (const forbiddenWriteSignal of ["Idempotency-Key", "If-Match", "X-Step-Up-Token"]) {
  assert.ok(!service.includes(forbiddenWriteSignal), "STEP70_C_NO_WRITE_SIGNAL:" + forbiddenWriteSignal);
}

assert.ok(
  service.includes("مرحلهٔ 70-C endpoint خواندن ساختگی ایجاد نمی‌کند"),
  "STEP70_C_ADJUSTMENT_BOUNDARY",
);
assert.ok(
  service.includes("هیچ endpoint منبع‌اثبات‌شده‌ای برای فروشگاه، صندوق، شیفت"),
  "STEP70_C_POS_NO_AUTHORITY",
);
assert.ok(
  service.includes("مرحلهٔ 70-C اسکن مصنوعی یا مقدار پیش‌فرض تولید نمی‌کند"),
  "STEP70_C_SCAN_BOUNDARY",
);

assert.ok(route.includes("isStep70FoundationSurface"), "STEP70_C_DESTINATION_GUARD");
assert.ok(route.includes("readStep70Foundation"), "STEP70_C_DESTINATION_READ");
assert.ok(
  route.includes("دادهٔ قدیمی یا حدسی جایگزین پاسخ معتبر سرور نمی‌شود"),
  "STEP70_C_NO_STALE_FALLBACK",
);
assert.ok(
  route.includes("هیچ کنترل تغییردهنده‌ای در 70-C فعال نیست"),
  "STEP70_C_NO_MUTATION_DISCLOSURE",
);

assert.equal(
  packageJson.scripts["step70-foundation:verify"],
  "pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step70-c-operations-foundation.ts",
  "STEP70_C_VERIFY_SCRIPT",
);
assert.ok(
  (packageJson.scripts.verify ?? "").includes("step70-foundation:verify"),
  "STEP70_C_VERIFY_CHAIN",
);

console.log("Step 70-C Admin Inventory/Procurement/POS foundation verification: PASS");
