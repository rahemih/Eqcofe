import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import YAML from 'yaml';

const api:any=YAML.parse(readFileSync('contracts/http/openapi.yaml','utf8'));
const pricingController=readFileSync('src/modules/pricing/presentation/pricing.controller.ts','utf8');
const excelController=readFileSync('src/modules/excel/presentation/excel-admin.controller.ts','utf8');
const pricingImportApply=readFileSync('src/modules/pricing/application/pricing-import-apply.service.ts','utf8');
const generated=readFileSync('src/generated/openapi.ts','utf8');

const pricingFxOps:[string,string,string,string][]=[
  ['get','/admin/pricing/base-prices','200','pricing.view'],
  ['post','/admin/pricing/base-prices','201','pricing.manage'],
  ['post','/admin/pricing/base-prices/preview','201','pricing.manage'],
  ['post','/admin/variants/{variant_id}/prices','201','pricing.manage'],
  ['get','/admin/pricing/rules','200','pricing.view'],
  ['post','/admin/pricing/rules','201','pricing.manage'],
  ['get','/admin/pricing/rules/{id}','200','pricing.view'],
  ['patch','/admin/pricing/rules/{id}','200','pricing.manage'],
  ['post','/admin/pricing/rules/{id}/activate','201','pricing.manage'],
  ['post','/admin/pricing/rules/{id}/deactivate','201','pricing.manage'],
  ['post','/admin/pricing/bulk/preview','201','pricing.bulk.manage'],
  ['post','/admin/pricing/bulk/apply','201','pricing.bulk.manage'],
  ['get','/admin/pricing/bulk/{operation_id}','200','pricing.view'],
  ['get','/admin/pricing/currency-rates','200','pricing.view'],
  ['get','/admin/pricing/currency-rates/current','200','pricing.view'],
  ['post','/admin/pricing/currency-rates/refresh','201','pricing.currency.manage'],
  ['post','/admin/pricing/currency-rates/{id}/select','201','pricing.currency.manage'],
  ['post','/admin/pricing/currency-rates/{id}/reject','201','pricing.currency.manage'],
  ['post','/admin/pricing/currency-rates/register','201','pricing.currency.manage'],
  ['get','/admin/pricing/currency-rules','200','pricing.view'],
  ['post','/admin/pricing/currency-rules','201','pricing.currency.manage'],
  ['get','/admin/pricing/currency-rules/{id}','200','pricing.view'],
  ['patch','/admin/pricing/currency-rules/{id}','200','pricing.currency.manage'],
  ['post','/admin/pricing/currency-rules/{id}/activate','201','pricing.currency.manage'],
  ['post','/admin/pricing/currency-rules/{id}/deactivate','201','pricing.currency.manage'],
  ['post','/admin/pricing/currency/impact-preview','201','pricing.currency.manage'],
  ['post','/admin/pricing/currency/apply','201','pricing.currency.manage'],
];

const excelOps:[string,string,string,string][]=[
  ['get','/admin/excel/exports/template','200','excel.view'],
  ['post','/admin/excel/dry-run','201','excel.view'],
  ['post','/admin/excel/catalog/preview','201','excel.view'],
  ['post','/admin/excel/pricing/preview','201','excel.view'],
  ['post','/admin/excel/imports','201','excel.import'],
  ['post','/admin/excel/catalog/apply','201','excel.apply'],
  ['post','/admin/excel/pricing/apply','201','excel.apply'],
  ['post','/admin/excel/imports/{id}/recover','201','excel.recover'],
];

function operation(method:string,path:string):any{
  const op=api.paths?.[path]?.[method];
  assert.ok(op,`STEP69_OPERATION_MISSING:${method.toUpperCase()} ${path}`);
  return op;
}
function successSchema(op:any,status:string):string{
  const ref=op.responses?.[status]?.content?.['application/json']?.schema?.$ref;
  assert.equal(typeof ref,'string',`STEP69_TYPED_SUCCESS_MISSING:${op.operationId}`);
  return ref;
}
function hasSecurity(op:any,key:string){
  return Array.isArray(op.security)&&op.security.some((entry:any)=>Object.prototype.hasOwnProperty.call(entry,key));
}
function hasParameter(op:any,refSuffix:string){
  return (op.parameters??[]).some((p:any)=>String(p?.$ref??'').endsWith(refSuffix));
}

test('Step 69-B exposes exactly the frozen 27 Pricing/FX and 8 Excel operations with typed success contracts',()=>{
  assert.equal(pricingFxOps.length,27);
  assert.equal(excelOps.length,8);
  for(const [method,path,status,permission] of [...pricingFxOps,...excelOps]){
    const op=operation(method,path);
    assert.equal(op['x-eqcofe']?.permission,permission,`STEP69_PERMISSION:${method} ${path}`);
    const successStatuses=Object.keys(op.responses??{}).filter((x)=>/^2\d\d$/.test(x));
    assert.deepEqual(successStatuses,[status],`STEP69_SUCCESS_STATUS:${method} ${path}`);
    assert.match(successSchema(op,status),/^#\/components\/schemas\/(AdminPricing|AdminExcel)/);
  }
});

test('Step 69-B keeps concurrency Step-Up and idempotency authority source-accurate',()=>{
  assert.equal(hasParameter(operation('patch','/admin/pricing/rules/{id}'),'IfMatch'),true);
  assert.equal(hasParameter(operation('patch','/admin/pricing/currency-rules/{id}'),'IfMatch'),true);

  for(const p of ['/admin/pricing/bulk/apply','/admin/pricing/currency/apply']){
    const op=operation('post',p);
    assert.equal(hasSecurity(op,'stepUpToken'),true,p);
    assert.equal(hasParameter(op,'IdempotencyKey'),true,p);
  }
  const select=operation('post','/admin/pricing/currency-rates/{id}/select');
  assert.equal(hasSecurity(select,'stepUpToken'),true);
  assert.equal(hasParameter(select,'IdempotencyKey'),false);

  assert.equal(hasSecurity(operation('post','/admin/pricing/bulk/preview'),'stepUpToken'),false);
  assert.equal(hasSecurity(operation('post','/admin/pricing/currency/impact-preview'),'stepUpToken'),false);

  assert.equal(hasParameter(operation('post','/admin/excel/imports'),'IdempotencyKey'),true);
  for(const p of ['/admin/excel/catalog/apply','/admin/excel/pricing/apply','/admin/excel/imports/{id}/recover']){
    const op=operation('post',p);
    assert.equal(hasSecurity(op,'stepUpToken'),true,p);
    assert.equal(hasParameter(op,'IdempotencyKey'),true,p);
  }
});

test('Step 69-B aligns FX refresh request authority with FxCurrencyPreviewService instead of the stale Step 56 inventory shape',()=>{
  const schema=api.components.schemas.PostAdminPricingCurrencyRatesRefreshRequest;
  assert.deepEqual(schema.required,['provider_key']);
  for(const key of ['provider_key','source_currency_code','timeout_ms','max_age_ms','scope_type','scope_ids','include_inactive']){
    assert.ok(schema.properties[key],key);
  }
  for(const stale of ['provider_ids','force_refresh']) assert.equal(schema.properties[stale],undefined,stale);
  assert.equal(schema.properties.timeout_ms.minimum,100);
  assert.equal(schema.properties.timeout_ms.maximum,30000);
  assert.equal(schema.properties.max_age_ms.minimum,60000);
  assert.equal(schema.properties.max_age_ms.maximum,86400000);
});

test('Step 69-B promotes Excel into the base generated-contract authority and retires the additive overlay',()=>{
  assert.equal(existsSync('contracts/http/openapi-step50-a8.yaml'),false);
  for(const [,path] of excelOps){
    assert.match(generated,new RegExp(`"${path.replace(/[.*+?^$()|[\]\\]/g,'\\$&')}"`),path);
  }
  for(const schema of ['ExcelBinaryWorkbook','AdminExcelTemplateResponse','AdminExcelPricingPreviewResponse','AdminExcelRecoveryResponse']){
    assert.match(generated,new RegExp(`\\b${schema}:\\s*`),schema);
  }
});

test('Step 69-B keeps runtime authority unchanged while fixing only contract truth',()=>{
  assert.match(pricingController,/@Permissions\('pricing\.bulk\.manage'\)[\s\S]*@RequireStepUp\(\)[\s\S]*@RequireIdempotency\('pricing\.bulk\.apply'\)/);
  assert.match(pricingController,/@Permissions\('pricing\.currency\.manage'\)[\s\S]*@RequireStepUp\(\)[\s\S]*@RequireIdempotency\('pricing\.currency\.apply'\)/);
  assert.match(pricingController,/@Permissions\('pricing\.currency\.manage'\)[\s\S]*@RequireStepUp\(\)[\s\S]*@Post\('admin\/pricing\/currency-rates\/:id\/select'\)/);
  assert.match(excelController,/@Controller\('admin\/excel'\)[\s\S]*@StaffOnly\(\)/);
  assert.doesNotMatch(pricingController,/@Delete\(/);
});

test('Step 69-B generated OpenAPI is byte-for-byte reproducible from canonical base contract',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eqcofe-step69-openapi-'));
  const output=join(dir,'openapi.ts');
  const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
  try{
    execFileSync(pnpm,['exec','openapi-typescript','contracts/http/openapi.yaml','-o',output],{stdio:'pipe'});
    const expected=readFileSync(output,'utf8');
    if(generated!==expected){
      const diff=spawnSync('git',['diff','--no-index','--unified=1','src/generated/openapi.ts',output],{encoding:'utf8'});
      assert.fail('STEP69_GENERATED_OPENAPI_DRIFT\n'+String(diff.stdout||diff.stderr||'').slice(0,24000));
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});
