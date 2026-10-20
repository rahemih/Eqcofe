import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STEP69_FOUNDATION_SURFACES,
  isStep69FoundationSurface,
  readStep69Foundation,
} from "../app/pricing/pricing-foundation.server.js";

const adminRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(adminRoot, "../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

const task = JSON.parse(
  read("docs/14-multi-agent/tasks/EQCOFE-STEP69-C-ADMIN-PRICING-FX-EXCEL-FOUNDATION-001.json"),
) as {
  risk: string;
  human_gate_required: boolean;
  canonical: { base_sha: string };
  scope: { write: string[]; forbidden: string[] };
  evidence: { frozen_surfaces: string[]; source_proven_foundation_reads: string[] };
};

assert.equal(task.risk, "MEDIUM", "STEP69_C_RISK");
assert.equal(task.human_gate_required, false, "STEP69_C_HUMAN_GATE");
assert.equal(
  task.canonical.base_sha,
  "3f0cca89f309931ba4ea3877468c6290c8b2a97e",
  "STEP69_C_BASE_SHA",
);
assert.deepEqual(
  task.scope.write,
  [
    "apps/admin/**",
    "docs/11-step-history/STEP-69-C-ADMIN-PRICING-FX-EXCEL-FOUNDATION.md",
    "docs/14-multi-agent/tasks/EQCOFE-STEP69-C-ADMIN-PRICING-FX-EXCEL-FOUNDATION-001.json",
    "docs/14-multi-agent/generated/TASK-CATALOG.md",
  ],
  "STEP69_C_WRITE_SCOPE",
);
for (const forbidden of [
  "contracts/**",
  "database/**",
  "src/**",
  "apps/storefront/**",
  "docs/12-current-state/**",
  "docs/13-product-design/**",
]) {
  assert.ok(task.scope.forbidden.includes(forbidden), "STEP69_C_FORBIDDEN:" + forbidden);
}

const expectedSurfaces = [
  "AD-D-01",
  "AD-D-02",
  "AD-D-03",
  "AD-D-04",
  "AD-D-05",
  "AD-D-19",
  "AD-D-20",
  "AD-D-21",
];
assert.deepEqual([...STEP69_FOUNDATION_SURFACES], expectedSurfaces, "STEP69_C_SURFACES");
assert.deepEqual(task.evidence.frozen_surfaces, expectedSurfaces, "STEP69_C_TASK_SURFACES");
for (const surface of expectedSurfaces) {
  assert.equal(isStep69FoundationSurface(surface), true, "STEP69_C_SURFACE_ALLOWED:" + surface);
}
assert.equal(isStep69FoundationSurface("AD-D-06"), false, "STEP69_C_STEP70_EXCLUDED");

const noReadRequest = { headers: new Headers() };
for (const surface of ["AD-D-03", "AD-D-20", "AD-D-21"] as const) {
  const result = await readStep69Foundation(noReadRequest, surface);
  assert.equal(result.kind, "action_only", "STEP69_C_ACTION_ONLY:" + surface);
  assert.deepEqual(result.setCookies, [], "STEP69_C_ACTION_ONLY_COOKIES:" + surface);
}

const service = read("apps/admin/app/pricing/pricing-foundation.server.ts");
const route = read("apps/admin/app/routes/destination.tsx");
const packageJson = JSON.parse(read("apps/admin/package.json")) as { scripts: Record<string, string> };

assert.ok(service.includes("createAdminAuthBridge(request)"), "STEP69_C_AUTH_BRIDGE_REQUIRED");
for (const endpoint of [
  '"/admin/pricing/base-prices"',
  '"/admin/pricing/rules"',
  '"/admin/pricing/currency-rates"',
  '"/admin/pricing/currency-rates/current"',
  '"/admin/pricing/currency-rules"',
  '"/admin/excel/exports/template"',
]) {
  assert.ok(service.includes(endpoint), "STEP69_C_REQUIRED_READ:" + endpoint);
}
assert.equal(
  (service.match(/\.request\("get"/g) ?? []).length,
  6,
  "STEP69_C_EXACT_GET_COUNT",
);
for (const method of ["post", "put", "patch", "delete"]) {
  assert.ok(!service.includes(`.request("${method}"`), "STEP69_C_READ_ONLY_METHOD:" + method);
}
for (const forbiddenWriteSignal of ["Idempotency-Key", "If-Match", "X-Step-Up-Token"]) {
  assert.ok(!service.includes(forbiddenWriteSignal), "STEP69_C_NO_WRITE_SIGNAL:" + forbiddenWriteSignal);
}

assert.ok(route.includes("isStep69FoundationSurface"), "STEP69_C_DESTINATION_GUARD");
assert.ok(route.includes("readStep69Foundation"), "STEP69_C_DESTINATION_READ");
assert.ok(route.includes("هیچ اختیار تغییردهنده‌ای ایجاد نمی‌کند"), "STEP69_C_READ_ONLY_DISCLOSURE");
assert.ok(route.includes("دادهٔ قدیمی یا حدسی جایگزین"), "STEP69_C_NO_STALE_FALLBACK");
assert.ok(
  route.includes("این عدد به‌عنوان شمارش کل کاتالوگ تفسیر نمی‌شود"),
  "STEP69_C_COUNT_DISCLOSURE",
);
assert.equal(
  packageJson.scripts["step69-foundation:verify"],
  "pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step69-c-pricing-foundation.ts",
  "STEP69_C_VERIFY_SCRIPT",
);
assert.ok(
  (packageJson.scripts.verify ?? "").includes("step69-foundation:verify"),
  "STEP69_C_VERIFY_CHAIN",
);

console.log("Step 69-C Admin Pricing/FX/Excel foundation verification: PASS");
