import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXCEL_MAX_UPLOAD_BYTES,
  EXCEL_MIME,
  excelCatalogApplyIdempotencyKey,
  excelImportIdempotencyKey,
  excelPricingApplyIdempotencyKey,
  excelRecoveryIdempotencyKey,
} from "../app/excel/excel-admin.server.js";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const read=(path:string)=>readFileSync(resolve(repoRoot,path),"utf8");

const task=JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP69-G-EXCEL-ADMINISTRATION-001.json")) as {
  risk:string;
  risk_floor:string;
  human_gate_required:boolean;
  canonical:{base_sha:string};
  requested_lock_ids:string[];
  authorized_human_approver:{role:string;github_login:string};
  scope:{write:string[];forbidden:string[]};
  evidence:{
    surfaces:string[];
    source_proven_operations:string[];
    runtime_permissions:Record<string,string>;
    workbook_limits:{max_upload_bytes:number;max_rows_per_sheet:number;max_columns_per_sheet:number;max_zip_entries:number;max_expanded_bytes:number};
    import_boundary:{idempotency_scope:string;step_up:boolean;list_or_status_get_proven:boolean};
    recovery_boundary:{step_up:boolean;idempotency_scope:string;failed_only:boolean;max_attempts:number;note_min:number;note_max:number;status_read_proven:boolean};
    catalog_boundary:{apply_step_up:boolean;idempotency_scope:string;new_product_creation:boolean};
    pricing_boundary:{apply_step_up:boolean;idempotency_scope:string;money:string;current_price_recheck:boolean};
    transaction_boundary:string;
  };
};

assert.equal(task.risk,"HIGH","STEP69_G_RISK");
assert.equal(task.risk_floor,"HIGH","STEP69_G_RISK_FLOOR");
assert.equal(task.human_gate_required,true,"STEP69_G_HUMAN_GATE");
assert.equal(task.canonical.base_sha,"a2cfcb5a306110e84aa17fcbc17c7114da9ddf88","STEP69_G_BASE");
assert.deepEqual(task.requested_lock_ids,["LOCK-EQCOFE-STEP69-G-EXCEL-ADMINISTRATION-001-01"],"STEP69_G_LOCK");
assert.deepEqual(task.authorized_human_approver,{role:"PROJECT_OWNER",github_login:"rahemih"},"STEP69_G_APPROVER");
assert.deepEqual(task.evidence.surfaces,["AD-D-19","AD-D-20","AD-D-21"],"STEP69_G_SURFACES");
assert.deepEqual(task.evidence.source_proven_operations,[
  "GET /admin/excel/exports/template",
  "POST /admin/excel/dry-run",
  "POST /admin/excel/imports",
  "POST /admin/excel/imports/{id}/recover",
  "POST /admin/excel/catalog/preview",
  "POST /admin/excel/catalog/apply",
  "POST /admin/excel/pricing/preview",
  "POST /admin/excel/pricing/apply",
],"STEP69_G_OPERATIONS");
assert.equal(task.evidence.runtime_permissions.template_dryrun_preview,"excel.view");
assert.equal(task.evidence.runtime_permissions.import_create,"excel.import");
assert.equal(task.evidence.runtime_permissions.apply,"excel.apply");
assert.equal(task.evidence.runtime_permissions.recover,"excel.recover");
assert.deepEqual(task.evidence.workbook_limits,{
  max_upload_bytes:10_485_760,
  max_rows_per_sheet:5000,
  max_columns_per_sheet:64,
  max_zip_entries:256,
  max_expanded_bytes:52_428_800,
},"STEP69_G_LIMITS");
assert.equal(task.evidence.import_boundary.idempotency_scope,"excel.import.create");
assert.equal(task.evidence.import_boundary.step_up,false);
assert.equal(task.evidence.import_boundary.list_or_status_get_proven,false);
assert.deepEqual(task.evidence.recovery_boundary,{
  step_up:true,idempotency_scope:"excel.import.recover",failed_only:true,max_attempts:3,note_min:3,note_max:500,status_read_proven:false,
});
assert.equal(task.evidence.catalog_boundary.apply_step_up,true);
assert.equal(task.evidence.catalog_boundary.idempotency_scope,"excel.catalog.apply");
assert.equal(task.evidence.catalog_boundary.new_product_creation,false);
assert.equal(task.evidence.pricing_boundary.apply_step_up,true);
assert.equal(task.evidence.pricing_boundary.idempotency_scope,"excel.pricing.apply");
assert.equal(task.evidence.pricing_boundary.money,"nonnegative integer Toman");
assert.equal(task.evidence.pricing_boundary.current_price_recheck,true);
assert.match(task.evidence.transaction_boundary,/separate transactions/);

assert.deepEqual(task.scope.write,[
  "apps/admin/**",
  "docs/11-step-history/STEP-69-G-EXCEL-ADMINISTRATION.md",
  "docs/14-multi-agent/tasks/EQCOFE-STEP69-G-EXCEL-ADMINISTRATION-001.json",
  "docs/14-multi-agent/generated/TASK-CATALOG.md",
],"STEP69_G_WRITE_SCOPE");
for(const forbidden of [
  ".github/**","package.json","pnpm-lock.yaml","pnpm-workspace.yaml","contracts/**","database/**","src/**","test/**","scripts/**",
  "apps/storefront/**","docs/12-current-state/**","docs/13-product-design/**","src/modules/inventory/**","src/modules/procurement/**",
  "scripts/graphify/**","graphify-out/**",
])assert.ok(task.scope.forbidden.includes(forbidden),"STEP69_G_FORBIDDEN:"+forbidden);

assert.equal(EXCEL_MIME,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
assert.equal(EXCEL_MAX_UPLOAD_BYTES,10*1024*1024);
const digest="a".repeat(64);
assert.equal(excelImportIdempotencyKey(digest),"excel-import:"+digest);
assert.equal(excelCatalogApplyIdempotencyKey(digest),"excel-catalog:"+digest);
assert.equal(excelPricingApplyIdempotencyKey(digest),"excel-pricing:"+digest);
assert.match(excelRecoveryIdempotencyKey("11111111-1111-4111-8111-111111111111","retry after review"),/^excel-recover:11111111-1111-4111-8111-111111111111:[0-9a-f]{32}$/);

const server=read("apps/admin/app/excel/excel-admin.server.ts");
const route=read("apps/admin/app/routes/excel.tsx");
const routes=read("apps/admin/app/routes.ts");
const shell=read("apps/admin/app/shell/AdminShell.tsx");
const css=read("apps/admin/app/styles/pricing.css");
const packageJson=JSON.parse(read("apps/admin/package.json")) as {scripts:Record<string,string>};
const controller=read("src/modules/excel/presentation/excel-admin.controller.ts");
const workbookContract=read("src/modules/excel/domain/workbook-contract.ts");
const generated=read("src/generated/openapi.ts");
const history=read("docs/11-step-history/STEP-69-G-EXCEL-ADMINISTRATION.md");

for(const endpoint of [
  '"/admin/excel/exports/template"',
  '"/admin/excel/dry-run"',
  '"/admin/excel/imports"',
  '"/admin/excel/imports/{id}/recover"',
  '"/admin/excel/catalog/preview"',
  '"/admin/excel/catalog/apply"',
  '"/admin/excel/pricing/preview"',
  '"/admin/excel/pricing/apply"',
])assert.ok(server.includes(endpoint),"STEP69_G_ENDPOINT:"+endpoint);

assert.ok(server.includes('createHash("sha256").update(bytes).digest("hex")'),"STEP69_G_UPLOAD_DIGEST");
assert.ok(server.includes('contentBase64:Buffer.from(bytes).toString("base64")'),"STEP69_G_BINARY_TRANSPORT");
assert.ok(server.includes("EXCEL_MAX_UPLOAD_BYTES=10*1024*1024"),"STEP69_G_UPLOAD_LIMIT");
assert.ok(server.includes('headers:{"Idempotency-Key":idempotencyKey}'),"STEP69_G_IDEMPOTENCY_HEADER");
assert.ok(server.includes("createAdminAuthBridge(request,{stepUpToken})"),"STEP69_G_SERVER_STEPUP");
assert.ok(server.includes('kind:mutation?"unknown_outcome":"unavailable"'),"STEP69_G_UNKNOWN_OUTCOME");
assert.ok(!server.includes("localStorage")&&!server.includes("sessionStorage"),"STEP69_G_NO_STORAGE_SERVER");

assert.ok(route.includes("isTrustedPricingFormOrigin(request)"),"STEP69_G_SAME_ORIGIN");
assert.ok(route.includes('intent==="dry-run"'),"STEP69_G_DRYRUN_INTENT");
assert.ok(route.includes('intent==="import-create"'),"STEP69_G_IMPORT_INTENT");
assert.ok(route.includes('intent==="begin-recover"'),"STEP69_G_RECOVERY_INTENT");
assert.ok(route.includes('intent==="preview"'),"STEP69_G_PREVIEW_INTENT");
assert.ok(route.includes('intent==="begin-apply"'),"STEP69_G_APPLY_INTENT");
assert.ok(route.includes('intent==="verify-step-up"'),"STEP69_G_VERIFY_STEPUP");
assert.ok(route.includes('runAdminWebAuthn("authentication"'),"STEP69_G_WEBAUTHN");
assert.ok(route.includes("verifyAdminStepUp(request,credential)"),"STEP69_G_VERIFY_SERVER");
assert.ok(route.includes("هیچ Import status/list منبع‌اثبات‌شده‌ای وجود ندارد"),"STEP69_G_NO_STATUS_COPY");
assert.ok(route.includes("Catalog Apply و Pricing Apply اتمیک/ترکیبی نیستند"),"STEP69_G_NON_ATOMIC_COPY");
assert.ok(route.includes("ایجاد Product جدید در این authority وجود ندارد"),"STEP69_G_NO_PRODUCT_CREATE_COPY");
assert.ok(route.includes('accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"'),"STEP69_G_XLSX_ACCEPT");
assert.ok(route.includes("ActionReviewDialog"),"STEP69_G_ACTION_REVIEW");
assert.ok(route.includes("setSelectedFile"),"STEP69_G_REVIEWED_FILE_CONTEXT");
assert.ok(!route.includes('name="idempotency_key"')&&!route.includes('form.set("idempotency_key"'),"STEP69_G_NO_BROWSER_KEY");
assert.ok(!route.includes('name="step_up_token"')&&!route.includes('form.set("step_up_token"'),"STEP69_G_NO_BROWSER_STEPUP");
assert.ok(!route.includes("localStorage")&&!route.includes("sessionStorage"),"STEP69_G_NO_BROWSER_STORAGE");
assert.ok(!route.includes("dangerouslySetInnerHTML"),"STEP69_G_NO_DANGEROUS_HTML");
assert.ok(!route.includes("/admin/excel/imports/status")&&!route.includes("/admin/excel/imports?"),"STEP69_G_NO_FAKE_STATUS_ENDPOINT");

assert.match(controller,/@Permissions\('excel\.view'\)[\s\S]*@Get\('exports\/template'\)/);
assert.match(controller,/@Permissions\('excel\.import'\)[\s\S]*@RequireIdempotency\('excel\.import\.create'\)[\s\S]*@Post\('imports'\)/);
assert.match(controller,/@Permissions\('excel\.apply'\)[\s\S]*@RequireStepUp\(\)[\s\S]*@RequireIdempotency\('excel\.catalog\.apply'\)[\s\S]*@Post\('catalog\/apply'\)/);
assert.match(controller,/@Permissions\('excel\.apply'\)[\s\S]*@RequireStepUp\(\)[\s\S]*@RequireIdempotency\('excel\.pricing\.apply'\)[\s\S]*@Post\('pricing\/apply'\)/);
assert.match(controller,/@Permissions\('excel\.recover'\)[\s\S]*@RequireStepUp\(\)[\s\S]*@RequireIdempotency\('excel\.import\.recover'\)[\s\S]*@Post\('imports\/:id\/recover'\)/);

for(const proof of [
  "EXCEL_MAX_UPLOAD_BYTES = 10 * 1024 * 1024",
  "EXCEL_MAX_ROWS_PER_SHEET = 5_000",
  "EXCEL_MAX_COLUMNS_PER_SHEET = 64",
  "EXCEL_MAX_ZIP_ENTRIES = 256",
  "EXCEL_MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024",
])assert.ok(workbookContract.includes(proof),"STEP69_G_RUNTIME_LIMIT:"+proof);

for(const schema of [
  "ExcelBinaryWorkbook:","ExcelWorkbookRequest:","ExcelApplyRequest:","ExcelRecoverRequest:",
  "ExcelDryRunData:","ExcelCatalogPreviewData:","ExcelPricingPreviewData:","ExcelImportData:",
  "ExcelCatalogApplyData:","ExcelPricingApplyData:","ExcelRecoveryData:",
])assert.ok(generated.includes(schema),"STEP69_G_GENERATED_SCHEMA:"+schema);
assert.ok(generated.includes('"Idempotency-Key": components["parameters"]["IdempotencyKey"]'),"STEP69_G_GENERATED_IDEMPOTENCY");

assert.ok(routes.includes('route("excel/:kind", "./routes/excel.tsx")'),"STEP69_G_ROUTE");
for(const mapping of [
  'if(surface==="AD-D-19")return "/excel/core";',
  'if(surface==="AD-D-20")return "/excel/catalog";',
  'if(surface==="AD-D-21")return "/excel/pricing";',
  'if(pathname==="/excel/core")return "AD-D-19";',
  'if(pathname==="/excel/catalog")return "AD-D-20";',
  'if(pathname==="/excel/pricing")return "AD-D-21";',
])assert.ok(shell.includes(mapping),"STEP69_G_NAV:"+mapping);

assert.ok(css.includes("Step 69-G — Excel administration"),"STEP69_G_CSS");
assert.ok(css.includes(".excel-tabs"),"STEP69_G_TABS_CSS");
assert.ok(css.includes(".excel-template-grid"),"STEP69_G_TEMPLATE_GRID");
assert.ok(css.includes("min-block-size: var(--eq-size-touch-min)"),"STEP69_G_TOUCH");
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css),"STEP69_G_NO_RAW_HEX");
assert.ok(!/brown|قهوه‌ای/i.test(css),"STEP69_G_NO_BROWN");

assert.equal(packageJson.scripts["step69-excel-admin:verify"],"pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step69-g-excel-admin.ts");
assert.ok((packageJson.scripts.verify??"").includes("step69-excel-admin:verify"),"STEP69_G_VERIFY_CHAIN");

assert.ok(history.includes("No import-list or import-status GET route exists"),"STEP69_G_HISTORY_NO_STATUS");
assert.ok(history.includes("Catalog Apply and Pricing Apply are separate transactions"),"STEP69_G_HISTORY_NON_ATOMIC");
assert.ok(history.includes("STEP_69_H = BLOCKED_FROM_MUTATION"),"STEP69_G_HISTORY_BLOCKS_H");

console.log("Step 69-G Excel administration verification: PASS");
