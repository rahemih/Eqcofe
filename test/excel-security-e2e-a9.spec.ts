import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import YAML from 'yaml';

const controller = fs.readFileSync('src/modules/excel/presentation/excel-admin.controller.ts','utf8');
const admin = fs.readFileSync('src/modules/excel/application/excel-admin.service.ts','utf8');
const parser = fs.readFileSync('src/modules/excel/application/safe-workbook-parser.service.ts','utf8');
const catalogApply = fs.readFileSync('src/modules/excel/application/catalog-apply.service.ts','utf8');
const pricingApply = fs.readFileSync('src/modules/excel/application/pricing-apply.service.ts','utf8');
const recovery = fs.readFileSync('src/modules/excel/application/import-recovery.service.ts','utf8');
const moduleSource = fs.readFileSync('src/modules/excel/excel.module.ts','utf8');
const a55 = fs.readFileSync('database/migrations/0055_excel_import_jobs.sql','utf8');
const a56 = fs.readFileSync('database/migrations/0056_excel_import_recovery.sql','utf8');
const a57 = fs.readFileSync('database/migrations/0057_excel_rbac_audit_api.sql','utf8');
const contract:any = YAML.parse(fs.readFileSync('contracts/http/openapi-step50-a8.yaml','utf8'));

test('Step 50 A9 keeps every Excel HTTP route staff-only and permission separated',()=>{
  assert.match(controller,/@Controller\('admin\/excel'\)[\s\S]*@StaffOnly\(\)/);
  for (const permission of ['excel.view','excel.import','excel.apply','excel.recover']) {
    assert.match(controller,new RegExp(`@Permissions\\('${permission.replaceAll('.','\\.')}'\\)`),permission);
  }
  assert.doesNotMatch(controller,/CustomerOnly|@Public\(/);
});

test('Step 50 A9 requires Step-Up and idempotency for all apply and recovery mutations',()=>{
  for (const scope of ['excel.catalog.apply','excel.pricing.apply','excel.import.recover']) {
    assert.match(controller,new RegExp(`@RequireStepUp\\(\\)[\\s\\S]{0,180}@RequireIdempotency\\('${scope.replaceAll('.','\\.')}'\\)`),scope);
  }
  assert.match(controller,/@RequireIdempotency\('excel\.import\.create'\)/);
});

test('Step 50 A9 treats every workbook as untrusted and fails closed before orchestration',()=>{
  assert.match(admin,/this\.parser\.parse\(envelope\)/);
  assert.match(parser,/EXCEL_MACRO_FORBIDDEN/);
  assert.match(parser,/EXCEL_EXTERNAL_LINK_FORBIDDEN/);
  assert.match(parser,/EXCEL_FORMULA_FORBIDDEN/);
  assert.match(parser,/EXCEL_FILE_SIZE_INVALID/);
  assert.match(parser,/EXCEL_CELL_TYPE_INVALID/);
});

test('Step 50 A9 apply stays preview-bound and owner-service controlled',()=>{
  assert.match(admin,/this\.catalog\.apply\(workbook, previewHash\)/);
  assert.match(admin,/this\.pricing\.apply\(workbook, previewHash\)/);
  assert.match(catalogApply,/expectedPreviewHash/);
  assert.match(pricingApply,/expectedPreviewHash/);
  assert.doesNotMatch(admin,/UPDATE\s+(catalog|pricing)\./i);
});

test('Step 50 A9 recovery remains explicit bounded and concurrency guarded',()=>{
  assert.match(recovery,/recover\(/);
  assert.match(a56,/import_job_attempts/);
  assert.match(a56,/worker_token/);
  assert.match(a56,/attempt_no/);
  assert.match(a56,/UNIQUE/);
  assert.match(a56,/CHECK/);
});

test('Step 50 A9 audit never stores raw workbook sheets cells or secrets',()=>{
  assert.match(admin,/writeAudit/);
  assert.match(admin,/fingerprint/);
  assert.doesNotMatch(admin,/afterData:\s*envelope|afterData:\s*workbook|beforeData:\s*envelope|beforeData:\s*workbook/);
  assert.doesNotMatch(a55,/bytea|workbook_payload|raw_workbook/i);
  assert.doesNotMatch(a56,/bytea|workbook_payload|raw_workbook/i);
});

test('Step 50 A9 HTTP contract agrees with runtime RBAC Step-Up and idempotency',()=>{
  const viewPaths=['/admin/excel/exports/template','/admin/excel/dry-run','/admin/excel/catalog/preview','/admin/excel/pricing/preview'];
  for(const p of viewPaths){ const op=contract.paths[p][p.endsWith('template')?'get':'post']; assert.equal(op['x-eqcofe'].permission,'excel.view'); }
  for(const p of ['/admin/excel/catalog/apply','/admin/excel/pricing/apply','/admin/excel/imports/{id}/recover']){
    const op=contract.paths[p].post;
    assert.equal(op['x-eqcofe'].stepUp,true,p);
    assert.equal(op['x-eqcofe'].idempotency,'required',p);
  }
});

test('Step 50 A9 RBAC and migration lineage are additive and forward-only',()=>{
  for(const key of ['excel.view','excel.import','excel.apply','excel.recover']) assert.match(a57,new RegExp(`'${key.replaceAll('.','\\.')}'`));
  assert.match(a57,/ON CONFLICT \(key\) DO NOTHING/);
  assert.doesNotMatch(a57,/DELETE FROM admin\.permissions|UPDATE admin\.permissions/i);
  const migrations=fs.readdirSync('database/migrations').filter(x=>/^005[5-7]_excel_/.test(x)).sort();
  assert.deepEqual(migrations,['0055_excel_import_jobs.sql','0056_excel_import_recovery.sql','0057_excel_rbac_audit_api.sql']);
});

test('Step 50 A9 retains all Step 50 regression suites A2 through A8',()=>{
  for(const path of [
    'test/excel-workbook-foundation-a2.spec.ts',
    'test/excel-import-job-a3.spec.ts',
    'test/excel-catalog-dry-run-a4.spec.ts',
    'test/excel-catalog-apply-a5.spec.ts',
    'test/excel-pricing-apply-a6.spec.ts',
    'test/excel-recovery-concurrency-a7.spec.ts',
    'test/excel-admin-api-a8.spec.ts',
  ]) assert.equal(fs.existsSync(path),true,path);
});

test('Step 50 A9 is gate-only and introduces no unrelated commerce authority',()=>{
  assert.doesNotMatch(moduleSource,/InventoryModule|OrdersModule|PaymentsModule|FinanceModule/);
  assert.doesNotMatch(admin,/inventory|orders|payments|finance/i);
  const migrations=fs.readdirSync('database/migrations');
  assert.deepEqual(migrations.filter(x=>/step[-_]?50.*a9|excel.*security.*e2e/i.test(x)),[]);
});
