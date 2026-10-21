import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { currencyApplyIdempotencyKey, formatCurrencyIfMatch } from "../app/pricing/pricing-fx.server.js";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const read=(path:string)=>readFileSync(resolve(repoRoot,path),"utf8");

const task=JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP69-F-FX-ADMINISTRATION-001.json")) as {
  risk:string;
  risk_floor:string;
  human_gate_required:boolean;
  canonical:{base_sha:string};
  scope:{write:string[];forbidden:string[]};
  requested_lock_ids:string[];
  authorized_human_approver:{role:string;github_login:string};
  evidence:{
    surfaces:string[];
    source_proven_operations:string[];
    step_up:{rate_select:boolean;currency_apply:boolean;other_stage_f_mutations:boolean};
    idempotency:{currency_apply:string;rate_select:null;other_stage_f_mutations:null};
    preview:{ttl_seconds:number;visible_items_max:number;scope_query_complete_population_proven:boolean};
    apply:{current_price_recheck_proven:boolean;fresh_profit_guard_recheck_proven:boolean;requester_binding_proven:boolean;generic_status_read_proven:boolean};
    provider_boundary:string;
  };
};

assert.equal(task.risk,"HIGH","STEP69_F_RISK");
assert.equal(task.risk_floor,"HIGH","STEP69_F_RISK_FLOOR");
assert.equal(task.human_gate_required,true,"STEP69_F_HUMAN_GATE");
assert.equal(task.canonical.base_sha,"3f9e1157d28aa6d515e1591a5899fe5bc59a8274","STEP69_F_BASE");
assert.deepEqual(task.requested_lock_ids,["LOCK-EQCOFE-STEP69-F-FX-ADMINISTRATION-001-01"],"STEP69_F_LOCK");
assert.deepEqual(task.authorized_human_approver,{role:"PROJECT_OWNER",github_login:"rahemih"},"STEP69_F_APPROVER");
assert.deepEqual(task.evidence.surfaces,["AD-D-04","AD-D-05"],"STEP69_F_SURFACES");
assert.equal(task.evidence.source_proven_operations.length,14,"STEP69_F_OPERATION_COUNT");
assert.equal(task.evidence.step_up.rate_select,true,"STEP69_F_SELECT_STEPUP");
assert.equal(task.evidence.step_up.currency_apply,true,"STEP69_F_APPLY_STEPUP");
assert.equal(task.evidence.step_up.other_stage_f_mutations,false,"STEP69_F_NO_INVENTED_STEPUP");
assert.equal(task.evidence.idempotency.currency_apply,"pricing.currency.apply","STEP69_F_APPLY_IDEMPOTENCY");
assert.equal(task.evidence.idempotency.rate_select,null,"STEP69_F_SELECT_NO_IDEMPOTENCY");
assert.equal(task.evidence.preview.ttl_seconds,600,"STEP69_F_TTL");
assert.equal(task.evidence.preview.visible_items_max,200,"STEP69_F_VISIBLE_ITEMS");
assert.equal(task.evidence.preview.scope_query_complete_population_proven,false,"STEP69_F_SCOPE_COMPLETENESS");
assert.equal(task.evidence.apply.current_price_recheck_proven,false,"STEP69_F_NO_PRICE_RECHECK_CLAIM");
assert.equal(task.evidence.apply.fresh_profit_guard_recheck_proven,false,"STEP69_F_NO_FRESH_GUARD_CLAIM");
assert.equal(task.evidence.apply.requester_binding_proven,false,"STEP69_F_NO_REQUESTER_BINDING");
assert.equal(task.evidence.apply.generic_status_read_proven,false,"STEP69_F_NO_STATUS_ENDPOINT");
assert.match(task.evidence.provider_boundary,/Step 77/,"STEP69_F_PROVIDER_BOUNDARY");

assert.deepEqual(task.scope.write,[
  "apps/admin/**",
  "docs/11-step-history/STEP-69-F-FX-ADMINISTRATION.md",
  "docs/14-multi-agent/tasks/EQCOFE-STEP69-F-FX-ADMINISTRATION-001.json",
  "docs/14-multi-agent/generated/TASK-CATALOG.md",
],"STEP69_F_WRITE_SCOPE");
for(const forbidden of [
  ".github/**","package.json","pnpm-lock.yaml","pnpm-workspace.yaml","contracts/**","database/**","src/**",
  "apps/storefront/**","docs/12-current-state/**","docs/13-product-design/**","src/modules/inventory/**",
  "src/modules/procurement/**","scripts/graphify/**","graphify-out/**",
])assert.ok(task.scope.forbidden.includes(forbidden),"STEP69_F_FORBIDDEN:"+forbidden);

assert.equal(formatCurrencyIfMatch(5),'"5"',"STEP69_F_IF_MATCH");
assert.throws(()=>formatCurrencyIfMatch(0),/FX_RULE_VERSION_INVALID/,"STEP69_F_BAD_VERSION");
assert.equal(currencyApplyIdempotencyKey("11111111-1111-4111-8111-111111111111"),"pricing-currency:11111111-1111-4111-8111-111111111111","STEP69_F_IDEMPOTENCY_KEY");
assert.throws(()=>currencyApplyIdempotencyKey("bad"),/FX_PREVIEW_ID_INVALID/,"STEP69_F_BAD_PREVIEW_ID");

const server=read("apps/admin/app/pricing/pricing-fx.server.ts");
const fxRoute=read("apps/admin/app/routes/pricing-fx.tsx");
const ruleRoute=read("apps/admin/app/routes/pricing-currency-rules.tsx");
const routes=read("apps/admin/app/routes.ts");
const shell=read("apps/admin/app/shell/AdminShell.tsx");
const css=read("apps/admin/app/styles/pricing.css");
const packageJson=JSON.parse(read("apps/admin/package.json")) as {scripts:Record<string,string>};
const controller=read("src/modules/pricing/presentation/pricing.controller.ts");
const impact=read("src/modules/pricing/application/currency-impact.service.ts");
const refresh=read("src/modules/pricing/application/fx-currency-preview.service.ts");
const rules=read("src/modules/pricing/application/currency-rule.service.ts");

for(const endpoint of [
  '"/admin/pricing/currency-rates"',
  '"/admin/pricing/currency-rates/current"',
  '"/admin/pricing/currency-rates/refresh"',
  '"/admin/pricing/currency-rates/{id}/select"',
  '"/admin/pricing/currency-rates/{id}/reject"',
  '"/admin/pricing/currency-rates/register"',
  '"/admin/pricing/currency/impact-preview"',
  '"/admin/pricing/currency/apply"',
  '"/admin/pricing/currency-rules"',
  '"/admin/pricing/currency-rules/{id}"',
  '"/admin/pricing/currency-rules/{id}/activate"',
  '"/admin/pricing/currency-rules/{id}/deactivate"',
])assert.ok(server.includes(endpoint),"STEP69_F_ENDPOINT:"+endpoint);

assert.ok(server.includes('createAdminAuthBridge(request,{stepUpToken})'),"STEP69_F_SERVER_STEPUP");
assert.ok(server.includes('client.request("get","/admin/pricing/currency-rates",{})'),"STEP69_F_TYPED_RATE_READ");
assert.ok(server.includes('client.request("get","/admin/pricing/currency-rates/current",{})'),"STEP69_F_TYPED_CURRENT_READ");
assert.ok(!server.includes('/admin/pricing/currency-rates",{query:'),"STEP69_F_NO_UNTYPED_RATE_QUERY");
assert.ok(fxRoute.includes("فیلتر ارز فقط روی پاسخ canonical بارگذاری‌شده اعمال می‌شود"),"STEP69_F_LOCAL_FILTER_DISCLOSURE");
assert.ok(server.includes('headers:{"Idempotency-Key":idempotencyKey}'),"STEP69_F_APPLY_IDEMPOTENCY_HEADER");
assert.ok(server.includes('return "pricing-currency:"+previewId.toLowerCase()'),"STEP69_F_SERVER_DERIVED_KEY");
assert.ok(server.includes('headers:{"If-Match":formatCurrencyIfMatch(version)}'),"STEP69_F_IF_MATCH_WIRED");
assert.ok(!server.includes('Idempotency-Key":idempotencyKey')||server.indexOf('Idempotency-Key":idempotencyKey')===server.lastIndexOf('Idempotency-Key":idempotencyKey'),"STEP69_F_ONLY_APPLY_IDEMPOTENCY");
assert.ok(!server.includes('"/admin/excel/'),"STEP69_F_NO_EXCEL");
assert.ok(!server.includes("localStorage")&&!server.includes("sessionStorage"),"STEP69_F_NO_BROWSER_STORAGE_SERVER");

for(const intent of ["refresh","register","reject","begin-select","impact-preview","begin-apply","verify-step-up"]){
  assert.ok(fxRoute.includes(`intent==="${intent}"`)||fxRoute.includes(`value="${intent}"`),"STEP69_F_FX_INTENT:"+intent);
}
assert.ok(fxRoute.includes("isTrustedPricingFormOrigin(request)"),"STEP69_F_SAME_ORIGIN");
assert.ok(fxRoute.includes('runAdminWebAuthn("authentication"'),"STEP69_F_WEBAUTHN");
assert.ok(fxRoute.includes("verifyAdminStepUp(request,credential)"),"STEP69_F_VERIFY_STEPUP");
assert.ok(fxRoute.includes("currencyApplyIdempotencyKey(context.preview_id)"),"STEP69_F_APPLY_KEY_DERIVED");
assert.ok(!fxRoute.includes('name="idempotency_key"')&&!fxRoute.includes('form.set("idempotency_key"'),"STEP69_F_NO_BROWSER_IDEMPOTENCY");
assert.ok(!fxRoute.includes('name="step_up_token"')&&!fxRoute.includes('form.set("step_up_token"'),"STEP69_F_NO_BROWSER_STEPUP_TOKEN");
assert.ok(fxRoute.includes("Production provider integration")||fxRoute.includes("Production provider"),"STEP69_F_PROVIDER_DISCLOSURE");
assert.ok(fxRoute.includes("requester-binding"),"STEP69_F_REQUESTER_DISCLOSURE");
assert.ok(fxRoute.includes("بازبینی مجدد قیمت فعلی"),"STEP69_F_PRICE_RECHECK_DISCLOSURE");
assert.ok(fxRoute.includes("Profit Guard تازه"),"STEP69_F_GUARD_DISCLOSURE");
assert.ok(fxRoute.includes("replay خودکار انجام نمی‌شود"),"STEP69_F_NO_BLIND_REPLAY");
assert.ok(fxRoute.includes("affected_count>preview.data.items.length"),"STEP69_F_TRUNCATION");
assert.ok(!fxRoute.includes("dangerouslySetInnerHTML"),"STEP69_F_NO_DANGEROUS_HTML");

for(const intent of ["create-rule","update-rule","activate-rule","deactivate-rule"]){
  assert.ok(ruleRoute.includes(`value="${intent}"`)||ruleRoute.includes(`intent==="${intent}"`),"STEP69_F_RULE_INTENT:"+intent);
}
assert.ok(ruleRoute.includes("pricingRuleScopes"),"STEP69_F_RULE_SCOPES");
assert.ok(ruleRoute.includes("If-Match"),"STEP69_F_RULE_IF_MATCH_COPY");
assert.ok(!ruleRoute.includes('value="delete-rule"'),"STEP69_F_NO_RULE_DELETE");

assert.match(controller,/@Permissions\('pricing\.currency\.manage'\) @RequireStepUp\(\) @Post\('admin\/pricing\/currency-rates\/:id\/select'\)/,"STEP69_F_RUNTIME_SELECT_STEPUP");
assert.match(controller,/@RequireStepUp\(\) @RequireIdempotency\('pricing\.currency\.apply'\)/,"STEP69_F_RUNTIME_APPLY_GATES");
assert.match(controller,/@Patch\('admin\/pricing\/currency-rules\/:id'\)/,"STEP69_F_RUNTIME_RULE_PATCH");
assert.ok(impact.includes("Date.now()+10*60*1000"),"STEP69_F_RUNTIME_TTL");
assert.ok(impact.includes("items:items.slice(0,200)"),"STEP69_F_RUNTIME_VISIBLE_LIMIT");
assert.ok(impact.includes("PROFIT_GUARD_FAILED"),"STEP69_F_RUNTIME_STORED_GUARD");
assert.ok(!impact.includes("PRICE_CHANGED_SINCE_PREVIEW"),"STEP69_F_NO_RUNTIME_PRICE_RECHECK");
assert.ok(refresh.includes("FX_RATE_REQUIRES_REVIEW"),"STEP69_F_REFRESH_REVIEW");
assert.ok(rules.includes("VERSION_CONFLICT"),"STEP69_F_RULE_CONFLICT");

assert.ok(routes.includes('route("pricing/fx", "./routes/pricing-fx.tsx")'),"STEP69_F_FX_ROUTE");
assert.ok(routes.includes('route("pricing/currency-rules", "./routes/pricing-currency-rules.tsx")'),"STEP69_F_RULE_ROUTE");
assert.ok(shell.includes('if(surface==="AD-D-04")return "/pricing/fx";'),"STEP69_F_FX_NAV");
assert.ok(shell.includes('if(surface==="AD-D-05")return "/pricing/currency-rules";'),"STEP69_F_RULE_NAV");
assert.ok(shell.includes('if(pathname==="/pricing/fx")return "AD-D-04";'),"STEP69_F_FX_ACTIVE");
assert.ok(shell.includes('if(pathname==="/pricing/currency-rules")return "AD-D-05";'),"STEP69_F_RULE_ACTIVE");
assert.ok(css.includes("Step 69-F — FX administration"),"STEP69_F_CSS");
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css),"STEP69_F_NO_RAW_HEX");

assert.equal(packageJson.scripts["step69-fx-admin:verify"],"pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step69-f-fx-admin.ts","STEP69_F_VERIFY_SCRIPT");
assert.ok((packageJson.scripts.verify??"").includes("step69-fx-admin:verify"),"STEP69_F_VERIFY_CHAIN");

console.log("Step 69-F FX administration verification: PASS");
