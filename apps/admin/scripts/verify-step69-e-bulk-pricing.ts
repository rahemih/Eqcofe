import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateBulkApplyInput,
  validateBulkPreviewInput,
} from "../app/pricing/pricing-bulk.server.js";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const read=(path:string)=>readFileSync(resolve(repoRoot,path),"utf8");

const task=JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP69-E-BULK-PRICING-001.json")) as {
  risk:string;
  risk_floor:string;
  human_gate_required:boolean;
  canonical:{base_sha:string};
  scope:{write:string[];forbidden:string[]};
  requested_lock_ids:string[];
  authorized_human_approver:{role:string;github_login:string};
  evidence:{
    surface:string;
    source_proven_operations:string[];
    runtime_permissions:{status_read:string;preview_apply:string};
    preview:{max_affected_variants:number;visible_items_max:number;ttl_seconds:number};
    apply:{step_up_required:boolean;idempotency_scope:string;expected_affected_count_required:boolean;fresh_profit_guard_recheck_proven:boolean;requester_binding_proven:boolean};
  };
};

assert.equal(task.risk,"HIGH","STEP69_E_RISK");
assert.equal(task.risk_floor,"HIGH","STEP69_E_RISK_FLOOR");
assert.equal(task.human_gate_required,true,"STEP69_E_HUMAN_GATE");
assert.equal(task.canonical.base_sha,"8621831d688e55e0150c6928944d3dff2b385e11","STEP69_E_BASE");
assert.deepEqual(task.requested_lock_ids,["LOCK-EQCOFE-STEP69-E-BULK-PRICING-001-01"],"STEP69_E_LOCK");
assert.deepEqual(task.authorized_human_approver,{role:"PROJECT_OWNER",github_login:"rahemih"},"STEP69_E_APPROVER");
assert.equal(task.evidence.surface,"AD-D-03","STEP69_E_SURFACE");
assert.deepEqual(task.evidence.source_proven_operations,[
  "GET /admin/pricing/bulk/{operation_id}",
  "POST /admin/pricing/bulk/preview",
  "POST /admin/pricing/bulk/apply",
],"STEP69_E_OPERATIONS");
assert.equal(task.evidence.runtime_permissions.status_read,"pricing.view","STEP69_E_READ_PERMISSION");
assert.equal(task.evidence.runtime_permissions.preview_apply,"pricing.bulk.manage","STEP69_E_MUTATION_PERMISSION");
assert.equal(task.evidence.preview.max_affected_variants,5000,"STEP69_E_MAX_AFFECTED");
assert.equal(task.evidence.preview.visible_items_max,200,"STEP69_E_VISIBLE_MAX");
assert.equal(task.evidence.preview.ttl_seconds,600,"STEP69_E_TTL");
assert.equal(task.evidence.apply.step_up_required,true,"STEP69_E_STEP_UP");
assert.equal(task.evidence.apply.idempotency_scope,"pricing.bulk.apply","STEP69_E_IDEMPOTENCY_SCOPE");
assert.equal(task.evidence.apply.expected_affected_count_required,true,"STEP69_E_EXPECTED_COUNT");
assert.equal(task.evidence.apply.fresh_profit_guard_recheck_proven,false,"STEP69_E_NO_FRESH_GUARD_CLAIM");
assert.equal(task.evidence.apply.requester_binding_proven,false,"STEP69_E_NO_REQUESTER_BINDING");

assert.deepEqual(task.scope.write,[
  "apps/admin/**",
  "docs/11-step-history/STEP-69-E-BULK-PRICING.md",
  "docs/14-multi-agent/tasks/EQCOFE-STEP69-E-BULK-PRICING-001.json",
  "docs/14-multi-agent/generated/TASK-CATALOG.md",
],"STEP69_E_WRITE_SCOPE");
for(const forbidden of [
  ".github/**","package.json","pnpm-lock.yaml","pnpm-workspace.yaml","contracts/**","database/**","src/**",
  "apps/storefront/**","docs/12-current-state/**","docs/13-product-design/**","src/modules/inventory/**",
  "src/modules/procurement/**","scripts/graphify/**","graphify-out/**",
])assert.ok(task.scope.forbidden.includes(forbidden),"STEP69_E_FORBIDDEN:"+forbidden);

{
  const valid=validateBulkPreviewInput({
    scopeType:"brand",
    scopeIds:["11111111-1111-4111-8111-111111111111","11111111-1111-4111-8111-111111111111"],
    changeType:"decrease_percent",
    value:5,
    roundingRule:"nearest_1000",
    reason:"اصلاح قیمت",
  });
  assert.equal(valid.ok,true,"STEP69_E_VALID_PREVIEW");
  if(valid.ok)assert.equal(valid.body.scope_ids?.length,1,"STEP69_E_SCOPE_DEDUP");
}
{
  const invalid=validateBulkPreviewInput({
    scopeType:"all",
    scopeIds:["11111111-1111-4111-8111-111111111111"],
    changeType:"set_price",
    value:120000,
    roundingRule:"none",
    reason:"اعمال",
  });
  assert.equal(invalid.ok,false,"STEP69_E_ALL_SCOPE_IDS_FORBIDDEN");
}
{
  const invalid=validateBulkApplyInput({
    previewId:"11111111-1111-4111-8111-111111111111",
    reason:"اعمال",
    expectedAffectedCount:-1,
  });
  assert.equal(invalid.ok,false,"STEP69_E_NEGATIVE_COUNT");
}

const server=read("apps/admin/app/pricing/pricing-bulk.server.ts");
const route=read("apps/admin/app/routes/pricing-bulk.tsx");
const routes=read("apps/admin/app/routes.ts");
const shell=read("apps/admin/app/shell/AdminShell.tsx");
const css=read("apps/admin/app/styles/pricing.css");
const packageJson=JSON.parse(read("apps/admin/package.json")) as {scripts:Record<string,string>};
const controller=read("src/modules/pricing/presentation/pricing.controller.ts");
const service=read("src/modules/pricing/application/bulk-pricing.service.ts");
const generated=read("src/generated/openapi.ts");
const bridge=read("apps/admin/app/platform/auth/admin-cookie.server.ts");

for(const endpoint of [
  '"/admin/pricing/bulk/preview"',
  '"/admin/pricing/bulk/apply"',
  '"/admin/pricing/bulk/{operation_id}"',
])assert.ok(server.includes(endpoint),"STEP69_E_ENDPOINT:"+endpoint);

assert.ok(server.includes("createAdminAuthBridge(request,{stepUpToken})"),"STEP69_E_SERVER_STEPUP");
assert.ok(server.includes('headers:{"Idempotency-Key":idempotencyKey}'),"STEP69_E_IDEMPOTENCY_HEADER");\nassert.ok(server.includes('return "pricing-bulk:"+previewId.toLowerCase()'),"STEP69_E_SERVER_DERIVED_IDEMPOTENCY");
assert.ok(server.includes('"PRICING_PREVIEW_EXPIRED"'),"STEP69_E_EXPIRED_MAPPING");
assert.ok(server.includes('"AFFECTED_COUNT_CHANGED"'),"STEP69_E_COUNT_CONFLICT");
assert.ok(server.includes('"PRICE_CHANGED_SINCE_PREVIEW"'),"STEP69_E_PRICE_CONFLICT");
assert.ok(server.includes('"PROFIT_GUARD_FAILED"'),"STEP69_E_GUARD_BLOCK");
assert.ok(server.includes('kind:"unknown_outcome"'),"STEP69_E_UNKNOWN_OUTCOME");
assert.ok(!server.includes('"/admin/pricing/currency'),"STEP69_E_NO_FX");
assert.ok(!server.includes('"/admin/excel/'),"STEP69_E_NO_EXCEL");
assert.ok(!server.includes("localStorage")&&!server.includes("sessionStorage"),"STEP69_E_NO_BROWSER_STORAGE");

assert.ok(route.includes("isTrustedPricingFormOrigin(request)"),"STEP69_E_SAME_ORIGIN");
assert.ok(route.includes('intent==="preview"'),"STEP69_E_PREVIEW_INTENT");
assert.ok(route.includes('intent==="begin-apply"'),"STEP69_E_BEGIN_APPLY");
assert.ok(route.includes('intent==="verify-step-up"'),"STEP69_E_VERIFY_STEPUP");
assert.ok(route.includes('intent==="status-check"'),"STEP69_E_STATUS_CHECK");
assert.ok(route.includes('intent==="begin-retry"'),"STEP69_E_EXPLICIT_RETRY");
assert.ok(route.includes('readBulkPricingStatus(request,context.preview_id)'),"STEP69_E_STATUS_BEFORE_RETRY");
assert.ok(route.includes('runAdminWebAuthn("authentication"'),"STEP69_E_WEBAUTHN");
assert.ok(route.includes("verifyAdminStepUp(request,credential)"),"STEP69_E_VERIFY_SERVER");
assert.ok(route.includes("applyBulkPricing(request,stepped.token,bulkPricingIdempotencyKey(context.preview_id)"),"STEP69_E_APPLY_SERVER_DERIVED_KEY");
assert.ok(!route.includes('name="step_up_token"')&&!route.includes('form.set("step_up_token"'),"STEP69_E_NO_STEPUP_RENDER");
assert.ok(route.includes("مرورگر authority ساخت یا تغییر key را ندارد"),"STEP69_E_IDEMPOTENCY_AUTHORITY_COPY");
assert.ok(route.includes("replay خودکار"),"STEP69_E_NO_AUTO_REPLAY_COPY");
assert.ok(route.includes("requester-binding"),"STEP69_E_NO_REQUESTER_BINDING_DISCLOSURE");
assert.ok(route.includes("Profit Guard تازه"),"STEP69_E_NO_FRESH_GUARD_DISCLOSURE");
assert.ok(route.includes("ActionReviewDialog"),"STEP69_E_ACTION_REVIEW");
assert.ok(route.includes("affected_count>preview.data.items.length"),"STEP69_E_TRUNCATION_DISCLOSURE");
assert.ok(!route.includes('name="idempotency_key"')&&!route.includes('form.set("idempotency_key"'),"STEP69_E_NO_BROWSER_KEY_AUTHORITY");\nassert.ok(!route.includes("localStorage")&&!route.includes("sessionStorage"),"STEP69_E_NO_CLIENT_PERSISTENCE");
assert.ok(!route.includes("dangerouslySetInnerHTML"),"STEP69_E_NO_DANGEROUS_HTML");

const retryIndex=route.indexOf('if(intent==="begin-retry")');
const retryStatusIndex=route.indexOf("readBulkPricingStatus(request,context.preview_id)",retryIndex);
const retryChallengeIndex=route.indexOf("createAdminStepUpChallenge(request)",retryIndex);
assert.ok(retryIndex>=0&&retryStatusIndex>retryIndex&&retryChallengeIndex>retryStatusIndex,"STEP69_E_RETRY_STATUS_THEN_STEPUP");

assert.ok(controller.includes("@Permissions('pricing.bulk.manage') @RequireStepUp() @RequireIdempotency('pricing.bulk.apply')"),"STEP69_E_RUNTIME_GATES");
assert.ok(controller.includes("@Permissions('pricing.view') @Get('admin/pricing/bulk/:operation_id')"),"STEP69_E_RUNTIME_STATUS_READ");
assert.ok(service.includes("MAX_BULK_VARIANTS=5_000"),"STEP69_E_RUNTIME_MAX");
assert.ok(service.includes("items:items.slice(0,200)"),"STEP69_E_RUNTIME_VISIBLE_LIMIT");
assert.ok(service.includes("Date.now()+10*60*1000"),"STEP69_E_RUNTIME_TTL");
assert.ok(service.includes("expected_affected_count"),"STEP69_E_RUNTIME_EXPECTED_COUNT");
assert.ok(service.includes("PRICE_CHANGED_SINCE_PREVIEW"),"STEP69_E_RUNTIME_PRICE_RECHECK");
assert.ok(!service.includes("requested_by===c.actor.id"),"STEP69_E_NO_REQUESTER_BINDING_RUNTIME");

for(const contractName of [
  "PostAdminPricingBulkPreviewRequest",
  "PostAdminPricingBulkApplyRequest",
  "AdminPricingBulkPreviewData",
  "AdminPricingBulkOperationData",
  "AdminPricingBulkApplyData",
])assert.ok(generated.includes(contractName),"STEP69_E_GENERATED_CONTRACT:"+contractName);
assert.ok(generated.includes('"Idempotency-Key": components["parameters"]["IdempotencyKey"]'),"STEP69_E_GENERATED_IDEMPOTENCY");
assert.ok(bridge.includes('headers.set("X-Step-Up-Token",stepUpToken)'),"STEP69_E_BRIDGE_STEPUP");

assert.ok(routes.includes('route("pricing/bulk", "./routes/pricing-bulk.tsx")'),"STEP69_E_ROUTE");
assert.ok(shell.includes('if(surface==="AD-D-03")return "/pricing/bulk";'),"STEP69_E_NAV");
assert.ok(shell.includes('if(pathname==="/pricing/bulk")return "AD-D-03";'),"STEP69_E_ACTIVE_SURFACE");
assert.ok(css.includes("Step 69-E — Bulk Pricing"),"STEP69_E_CSS");
assert.ok(css.includes(".pricing-bulk-table-wrap"),"STEP69_E_RESPONSIVE_TABLE");
assert.ok(css.includes("min-block-size: var(--eq-size-touch-min)"),"STEP69_E_TOUCH_TARGET");
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css),"STEP69_E_NO_RAW_HEX");

assert.equal(
  packageJson.scripts["step69-bulk-pricing:verify"],
  "pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step69-e-bulk-pricing.ts",
  "STEP69_E_VERIFY_SCRIPT",
);
assert.ok((packageJson.scripts.verify??"").includes("step69-bulk-pricing:verify"),"STEP69_E_VERIFY_CHAIN");

console.log("Step 69-E Bulk Pricing administration verification: PASS");
