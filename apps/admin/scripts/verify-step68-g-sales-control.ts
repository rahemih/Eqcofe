import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const read=(path:string)=>readFileSync(resolve(repoRoot,path),"utf8");

const task=JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP68-G-SALES-CONTROL-001.json")) as {
  risk:string;
  human_gate_required:boolean;
  canonical:{base_sha:string};
  scope:{write:string[];forbidden:string[]};
  evidence:{
    design_surfaces:string[];
    operations:string[];
    permission:string;
    preview_lifetime_seconds:number;
    scopes:string[];
    source_invariants:Record<string,boolean>;
  };
};

assert.equal(task.risk,"HIGH","STEP68_G_RISK");
assert.equal(task.human_gate_required,true,"STEP68_G_HUMAN_GATE");
assert.equal(task.canonical.base_sha,"9230e88178f5ffa5d2352126ee4edac57f021fec","STEP68_G_BASE");
assert.deepEqual(task.evidence.design_surfaces,["AD-C-08"],"STEP68_G_SURFACE");
assert.deepEqual(task.evidence.operations,["POST /admin/sales-control/preview","POST /admin/sales-control/apply"],"STEP68_G_OPERATIONS");
assert.equal(task.evidence.permission,"sales_control.manage","STEP68_G_PERMISSION");
assert.equal(task.evidence.preview_lifetime_seconds,600,"STEP68_G_PREVIEW_TTL");
assert.deepEqual(task.evidence.scopes,["global","brand","category","product","variant"],"STEP68_G_SCOPES");
assert.equal(task.evidence.source_invariants.fresh_recount_before_apply,false,"STEP68_G_NO_FRESH_RECOUNT_CLAIM");
assert.equal(task.evidence.source_invariants.requester_binding_proven,false,"STEP68_G_NO_REQUESTER_BINDING_CLAIM");
assert.equal(task.evidence.source_invariants.generic_catalog_bulk_runtime,false,"STEP68_G_NO_GENERIC_BULK");
assert.equal(task.evidence.source_invariants.unsafe_mutation_auto_retry,false,"STEP68_G_NO_AUTO_RETRY");
assert.ok(task.scope.write.includes("apps/admin/**"),"STEP68_G_ADMIN_WRITE");
for(const forbidden of ["apps/storefront/**","contracts/**","src/**","database/**","docs/12-current-state/**","docs/13-product-design/**"]){
  assert.ok(task.scope.forbidden.includes(forbidden),"STEP68_G_FORBIDDEN:"+forbidden);
}

const server=read("apps/admin/app/catalog/sales-control.server.ts");
const route=read("apps/admin/app/routes/catalog-sales-control.tsx");
const routes=read("apps/admin/app/routes.ts");
const shell=read("apps/admin/app/shell/AdminShell.tsx");
const css=read("apps/admin/app/styles/shell.css");
const packageJson=JSON.parse(read("apps/admin/package.json")) as {scripts:Record<string,string>};
const generated=read("src/generated/openapi.ts");
const controller=read("src/modules/catalog/presentation/catalog.controller.ts");
const service=read("src/modules/catalog/application/sales-control.service.ts");
const stepup=read("apps/admin/app/platform/auth/step-up-credentials.server.ts");
const review=read("apps/admin/app/security/ActionReviewDialog.tsx");

for(const endpoint of ['"/admin/sales-control/preview"','"/admin/sales-control/apply"']){
  assert.ok(server.includes(endpoint),"STEP68_G_ENDPOINT:"+endpoint);
}
assert.ok(server.includes("createAdminAuthBridge(request)"),"STEP68_G_PREVIEW_AUTH_BRIDGE");
assert.ok(server.includes("createAdminAuthBridge(request,{stepUpToken})"),"STEP68_G_APPLY_STEPUP_BRIDGE");
assert.ok(server.includes('"network"||error.kind==="timeout"||error.kind==="aborted"'),"STEP68_G_NETWORK_UNKNOWN");
assert.ok(server.includes('"SALES_PREVIEW_EXPIRED"'),"STEP68_G_EXPIRED_MAPPING");
assert.ok(server.includes('"AFFECTED_COUNT_CHANGED"'),"STEP68_G_COUNT_CONFLICT_MAPPING");
assert.ok(server.includes('"STEP_UP_REQUIRED"'),"STEP68_G_STEPUP_MAPPING");
assert.ok(server.includes('kind:"unknown_outcome"'),"STEP68_G_UNKNOWN_OUTCOME");
assert.ok(!server.includes("localStorage"),"STEP68_G_NO_LOCAL_STORAGE");
assert.ok(!server.includes("sessionStorage"),"STEP68_G_NO_SESSION_STORAGE");
assert.ok(!server.includes('"/admin/pricing/'),"STEP68_G_NO_PRICING");
assert.ok(!server.includes('"/admin/media/'),"STEP68_G_NO_MEDIA");
assert.ok(!server.includes('"/admin/inventory/'),"STEP68_G_NO_INVENTORY");

assert.ok(route.includes("isTrustedCatalogFormOrigin(request)"),"STEP68_G_SAME_ORIGIN");
assert.ok(route.includes('intent==="preview"'),"STEP68_G_PREVIEW_INTENT");
assert.ok(route.includes('intent==="begin-apply"'),"STEP68_G_REVIEW_INTENT");
assert.ok(route.includes('intent==="verify-step-up"'),"STEP68_G_VERIFY_INTENT");
assert.ok(route.includes('runAdminWebAuthn("authentication"'),"STEP68_G_WEBAUTHN_CLIENT");
assert.ok(route.includes("verifyAdminStepUp(request,credential)"),"STEP68_G_WEBAUTHN_SERVER_VERIFY");
assert.ok(route.includes("applyAdminSalesControl(request,stepped.token"),"STEP68_G_SERVER_ONLY_STEPUP_APPLY");
assert.ok(!route.includes('form.set("step_up_token"'),"STEP68_G_NO_STEPUP_TOKEN_BROWSER_FORM");
assert.ok(!route.includes('name="step_up_token"'),"STEP68_G_NO_STEPUP_TOKEN_RENDER");
assert.ok(route.includes("Date.parse(preview.expires_at)<=Date.now()"),"STEP68_G_EXPIRY_GUARD");
assert.ok(route.includes("expectedAffectedCount:preview.affected_count"),"STEP68_G_EXACT_REVIEWED_COUNT");
assert.ok(route.includes("درخواست Apply دوباره ارسال نمی‌شود"),"STEP68_G_NO_APPLY_RETRY_COPY");
assert.ok(route.includes("پیش‌نمایش تازه بگیرید"),"STEP68_G_FRESH_PREVIEW_RECOVERY");
assert.ok(route.includes("ActionReviewDialog"),"STEP68_G_REVIEW_DIALOG");
assert.ok(route.includes("setReviewOpen(false)"),"STEP68_G_REVIEW_CLOSE");
assert.ok(route.includes("launcherRef.current?.focus()"),"STEP68_G_FOCUS_RESTORE");
assert.ok(route.includes("fetcher.state!==\"idle\""),"STEP68_G_SINGLE_INFLIGHT");
assert.ok(route.includes("requestId"),"STEP68_G_REQUEST_ID");

assert.ok(review.includes("cancelRef.current?.focus()"),"STEP68_G_SAFE_CANCEL_INITIAL_FOCUS");
assert.ok(review.includes("onCancel"),"STEP68_G_ESCAPE_CANCEL");
assert.ok(stepup.includes("step_up_token"),"STEP68_G_CANONICAL_STEPUP_VERIFY");
assert.ok(stepup.includes('headers.set("X-Step-Up-Token"')||read("apps/admin/app/platform/auth/admin-cookie.server.ts").includes('headers.set("X-Step-Up-Token"'),"STEP68_G_STEPUP_HEADER_BRIDGE");

assert.ok(controller.includes("@Permissions('sales_control.manage')"),"STEP68_G_RUNTIME_PERMISSION");
assert.ok(controller.includes("@RequireStepUp() @Post('admin/sales-control/apply')"),"STEP68_G_RUNTIME_STEPUP");
assert.ok(service.includes("Date.now()+10*60*1000"),"STEP68_G_RUNTIME_TTL");
assert.ok(service.includes("consumeSalesPreview"),"STEP68_G_SINGLE_USE_RUNTIME");
assert.ok(service.includes("expected_affected_count"),"STEP68_G_STORED_COUNT_COMPARE");
assert.ok(!service.includes("requested_by===c.actor.id"),"STEP68_G_NO_REQUESTER_BINDING_RUNTIME");

for(const name of ["PostAdminSalesControlPreviewRequest","AdminSalesControlPreviewResponse","PostAdminSalesControlApplyRequest","AdminSalesControlApplyResponse"]){
  assert.ok(generated.includes(name),"STEP68_G_GENERATED_CONTRACT:"+name);
}
assert.ok(generated.includes('scope_type: "global" | "brand" | "category" | "product" | "variant"'),"STEP68_G_GENERATED_SCOPES");
assert.ok(generated.includes("expected_affected_count?: number"),"STEP68_G_GENERATED_EXPECTED_COUNT");

assert.ok(routes.includes('route("catalog/sales-control", "./routes/catalog-sales-control.tsx")'),"STEP68_G_ROUTE");
assert.ok(shell.includes('if(surface==="AD-C-08")return "/catalog/sales-control"'),"STEP68_G_SHELL_LINK");
assert.ok(shell.includes('if(pathname==="/catalog/sales-control")return "AD-C-08"'),"STEP68_G_SHELL_ACTIVE");

assert.ok(css.includes("Step 68-G — Sales Control"),"STEP68_G_CSS");
assert.ok(css.includes(".catalog-sales-control-page"),"STEP68_G_LAYOUT");
assert.ok(css.includes("min-block-size: var(--eq-size-touch-min)"),"STEP68_G_TOUCH_TARGET");
assert.ok(css.includes("@media (max-width: 599px)"),"STEP68_G_RESPONSIVE");

assert.equal(packageJson.scripts["catalog-sales-control:verify"],"pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step68-g-sales-control.ts","STEP68_G_VERIFY_SCRIPT");
assert.ok((packageJson.scripts.verify??"").includes("catalog-sales-control:verify"),"STEP68_G_VERIFY_CHAIN");

console.log("Step 68-G Sales-Control verification: PASS");
