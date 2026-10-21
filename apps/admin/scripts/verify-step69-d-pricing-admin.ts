import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatPricingIfMatch } from "../app/pricing/pricing-admin.server.js";
import {
  pricingRuleScopes,
  pricingTimestamp,
  type PricingFormIssue,
} from "../app/pricing/pricing-form.server.js";

const adminRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(adminRoot, "../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

const task = JSON.parse(
  read("docs/14-multi-agent/tasks/EQCOFE-STEP69-D-BASE-PRICE-PRICING-RULES-001.json"),
) as {
  risk: string;
  human_gate_required: boolean;
  canonical: { base_sha: string };
  scope: { write: string[]; forbidden: string[] };
  evidence: { source_proven_operations: string[]; step_up: string; retry: string };
};

assert.equal(task.risk, "HIGH", "STEP69_D_RISK");
assert.equal(task.human_gate_required, true, "STEP69_D_HUMAN_GATE");
assert.equal(
  task.canonical.base_sha,
  "15f695a850c1bee124223c4c1dd4e1747cc856de",
  "STEP69_D_BASE_SHA",
);
assert.deepEqual(
  task.scope.write,
  [
    "apps/admin/**",
    "docs/11-step-history/STEP-69-D-BASE-PRICE-PRICING-RULES.md",
    "docs/14-multi-agent/tasks/EQCOFE-STEP69-D-BASE-PRICE-PRICING-RULES-001.json",
    "docs/14-multi-agent/generated/TASK-CATALOG.md",
  ],
  "STEP69_D_WRITE_SCOPE",
);
for (const forbidden of [
  "contracts/**",
  "database/**",
  "src/**",
  "apps/storefront/**",
  "docs/12-current-state/**",
  "docs/13-product-design/**",
]) {
  assert.ok(task.scope.forbidden.includes(forbidden), "STEP69_D_FORBIDDEN:" + forbidden);
}

assert.equal(formatPricingIfMatch(7), '"7"', "STEP69_D_IF_MATCH");
assert.throws(() => formatPricingIfMatch(0), /PRICING_VERSION_INVALID/, "STEP69_D_BAD_VERSION");

{
  const issues: PricingFormIssue[] = [];
  const form = new FormData();
  form.set("scopes", "global");
  assert.deepEqual(pricingRuleScopes(form, "scopes", issues), [{ scope_type: "global" }]);
  assert.equal(issues.length, 0);
}
{
  const issues: PricingFormIssue[] = [];
  const form = new FormData();
  form.set(
    "scopes",
    "category:11111111-1111-4111-8111-111111111111\nproduct:22222222-2222-4222-8222-222222222222",
  );
  assert.equal(pricingRuleScopes(form, "scopes", issues).length, 2, "STEP69_D_MULTI_SCOPE");
  assert.equal(issues.length, 0);
}
{
  const issues: PricingFormIssue[] = [];
  const form = new FormData();
  form.set("scopes", "global\nbrand:33333333-3333-4333-8333-333333333333");
  pricingRuleScopes(form, "scopes", issues);
  assert.ok(issues.some((issue) => issue.field === "scopes"), "STEP69_D_GLOBAL_EXCLUSIVE");
}
{
  const issues: PricingFormIssue[] = [];
  const form = new FormData();
  form.set("when", "2026-10-21T08:30:00");
  assert.equal(pricingTimestamp(form, "when", { required: true }, issues), null);
  assert.ok(issues.length > 0, "STEP69_D_TIMESTAMP_OFFSET_REQUIRED");
}

const service = read("apps/admin/app/pricing/pricing-admin.server.ts");
const formService = read("apps/admin/app/pricing/pricing-form.server.ts");
const baseRoute = read("apps/admin/app/routes/pricing-base-prices.tsx");
const rulesRoute = read("apps/admin/app/routes/pricing-rules.tsx");
const routes = read("apps/admin/app/routes.ts");
const shell = read("apps/admin/app/shell/AdminShell.tsx");
const root = read("apps/admin/app/root.tsx");
const packageJson = JSON.parse(read("apps/admin/package.json")) as { scripts: Record<string, string> };

for (const endpoint of [
  '"/admin/pricing/base-prices"',
  '"/admin/pricing/base-prices/preview"',
  '"/admin/variants/{variant_id}/prices"',
  '"/admin/pricing/rules"',
  '"/admin/pricing/rules/{id}"',
  '"/admin/pricing/rules/{id}/activate"',
  '"/admin/pricing/rules/{id}/deactivate"',
]) {
  assert.ok(service.includes(endpoint), "STEP69_D_ENDPOINT:" + endpoint);
}
assert.ok(service.includes('headers: { "If-Match": formatPricingIfMatch(version) }'), "STEP69_D_IF_MATCH_WIRED");
assert.ok(!service.includes('client.request("post", "/admin/pricing/base-prices",'), "STEP69_D_NO_UNTYPED_ROOT_CREATE");
for (const forbiddenSignal of [
  "Idempotency-Key",
  "X-Step-Up-Token",
  '"/admin/pricing/bulk/',
  '"/admin/pricing/currency',
  '"/admin/excel/',
]) {
  assert.ok(!service.includes(forbiddenSignal), "STEP69_D_FORBIDDEN_SERVICE_SIGNAL:" + forbiddenSignal);
}
assert.ok(service.includes('"unknown_outcome"'), "STEP69_D_UNKNOWN_OUTCOME");
assert.ok(formService.includes('origin === new URL(request.url).origin'), "STEP69_D_ORIGIN_GATE");
assert.ok(formService.includes("global") && formService.includes("scope_type"), "STEP69_D_SCOPE_PARSER");
assert.ok(baseRoute.includes("فیلتر فقط روی پاسخ فعلی اعمال شده است"), "STEP69_D_LOCAL_FILTER_DISCLOSURE");
assert.ok(baseRoute.includes('value="preview-base-price"'), "STEP69_D_BASE_PREVIEW_UI");
assert.ok(baseRoute.includes('value="create-base-price"'), "STEP69_D_BASE_CREATE_UI");
assert.ok(rulesRoute.includes('value="create-rule"'), "STEP69_D_RULE_CREATE_UI");
assert.ok(rulesRoute.includes('value="update-rule"'), "STEP69_D_RULE_UPDATE_UI");
assert.ok(rulesRoute.includes('value="activate-rule"'), "STEP69_D_RULE_ACTIVATE_UI");
assert.ok(rulesRoute.includes('value="deactivate-rule"'), "STEP69_D_RULE_DEACTIVATE_UI");
assert.ok(!rulesRoute.includes('value="delete-rule"'), "STEP69_D_NO_RULE_DELETE");
assert.ok(rulesRoute.includes("خودکار دوباره ارسال نمی‌شود"), "STEP69_D_NO_AUTO_REPLAY_DISCLOSURE");
assert.ok(routes.includes('route("pricing/base-prices"'), "STEP69_D_BASE_ROUTE");
assert.ok(routes.includes('route("pricing/rules"'), "STEP69_D_RULES_ROUTE");
assert.ok(shell.includes('if(surface==="AD-D-01")return "/pricing/base-prices";'), "STEP69_D_BASE_NAV");
assert.ok(shell.includes('if(surface==="AD-D-02")return "/pricing/rules";'), "STEP69_D_RULE_NAV");
assert.ok(root.includes('import "./styles/pricing.css";'), "STEP69_D_PRICING_STYLES");

assert.equal(
  packageJson.scripts["step69-pricing-admin:verify"],
  "pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step69-d-pricing-admin.ts",
  "STEP69_D_VERIFY_SCRIPT",
);
assert.ok(
  (packageJson.scripts.verify ?? "").includes("step69-pricing-admin:verify"),
  "STEP69_D_VERIFY_CHAIN",
);

console.log("Step 69-D Base Price / Pricing Rules administration verification: PASS");
