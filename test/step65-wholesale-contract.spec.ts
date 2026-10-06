import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const read=(p:string)=>readFileSync(p,'utf8');
const controller=read('src/modules/customer/presentation/customer.controller.ts');
const service=read('src/modules/customer/application/customer-wholesale.service.ts');
const pricing=read('src/modules/pricing/application/pricing-query.service.ts');
const cart=read('src/modules/cart/application/cart.service.ts');
const config=read('src/modules/configuration/domain/configuration.registry.ts');
const openapi=read('contracts/http/openapi.yaml');
const generated=read('src/generated/openapi.ts');

test('customer wholesale submit is explicit 201, customer-only and idempotent',()=>{
  assert.match(controller,/@CustomerOnly\(\) @RequireIdempotency\('customer\.wholesale\.submit'\) @HttpCode\(HttpStatus\.CREATED\) @Post\('customer\/wholesale\/applications'\)/);
  const block=openapi.slice(
    openapi.indexOf('  /customer/wholesale/applications:'),
    openapi.indexOf('  /customer/loyalty:'),
  );
  assert.match(block,/'201':[\s\S]*CustomerWholesaleApplicationView/);
  assert.doesNotMatch(block,/'200':\s*\n\s*description: عملیات موفق/);
  assert.doesNotMatch(block,/'202':/);
  assert.match(block,/'401':[\s\S]*Unauthorized/);
  assert.match(block,/'409':[\s\S]*Conflict/);
  assert.match(block,/'422':[\s\S]*Unprocessable/);
  assert.match(block,/IdempotencyKey/);
  assert.match(block,/customerSession/);
});

test('latest wholesale application contract preserves the runtime null state',()=>{
  assert.match(service,/async myApplication\(\)[\s\S]*return row\?this\.present\(row\):null;/);
  const block=openapi.slice(
    openapi.indexOf('  /customer/wholesale/application:'),
    openapi.indexOf('  /customer/loyalty:'),
  );
  assert.match(block,/CustomerWholesaleApplicationMaybe/);
  assert.match(block,/'401':[\s\S]*Unauthorized/);
  assert.match(block,/'422':[\s\S]*Unprocessable/);
  const schema=openapi.slice(
    openapi.indexOf('    CustomerWholesaleApplicationView:'),
    openapi.indexOf('    PostCustomerWholesaleApplicationsRequest:'),
  );
  assert.match(schema,/CustomerWholesaleApplicationMaybe:[\s\S]*CustomerWholesaleApplicationView[\s\S]*type: 'null'/);
});

test('wholesale application view matches current runtime-present fields and bounded states',()=>{
  const schema=openapi.slice(
    openapi.indexOf('    CustomerWholesaleApplicationView:'),
    openapi.indexOf('    CustomerWholesaleApplicationMaybe:'),
  );
  for(const key of [
    'id','customer_id','business_name','manager_name','business_type','province_id','city_id',
    'business_identifier','note','status','submitted_at','review_started_at','reviewed_at',
    'decision_note','rejection_reason',
  ]) assert.match(schema,new RegExp('\\n\\s+'+key+':'));
  for(const status of ['submitted','under_review','approved','rejected']) assert.match(schema,new RegExp('- '+status));
  assert.doesNotMatch(schema,/version|reviewer_staff_id|created_by|updated_by/);

  const present=service.slice(service.indexOf('private present('),service.indexOf('async myApplication'));
  for(const key of [
    'id','customer_id','business_name','manager_name','business_type','province_id','city_id',
    'business_identifier','note','status','submitted_at','review_started_at','reviewed_at',
    'decision_note','rejection_reason',
  ]) assert.match(present,new RegExp(key));
});

test('request limits remain aligned and no wholesale eligibility rule is invented in OpenAPI',()=>{
  const req=openapi.slice(
    openapi.indexOf('    PostCustomerWholesaleApplicationsRequest:'),
    openapi.indexOf('    PostCustomerProductsProductIdReviewsRequest:'),
  );
  assert.match(req,/business_name:[\s\S]*maxLength: 250/);
  assert.match(req,/manager_name:[\s\S]*maxLength: 200/);
  assert.match(req,/business_type:[\s\S]*maxLength: 100/);
  assert.match(req,/business_identifier:[\s\S]*maxLength: 100/);
  assert.match(req,/note:[\s\S]*maxLength: 4000/);
  assert.doesNotMatch(req,/business_type:[\s\S]{0,160}enum:/);

  assert.match(service,/c\.customer_type!=='retail'/);
  assert.match(service,/WHOLESALE_APPLICATION_ACTIVE/);
  assert.match(service,/status!=='under_review'/);
  assert.match(service,/customer_type:'wholesale'/);
});

test('admin decision authority remains staff-only and outside customer operations',()=>{
  const admin=controller.slice(controller.indexOf("@Controller('admin/wholesale/applications')"));
  assert.match(admin,/@StaffOnly\(\)/);
  assert.match(admin,/Permissions\('customer\.wholesale\.review'\)/);
  assert.match(admin,/Permissions\('customer\.wholesale\.decide'\)/);
  assert.match(admin,/@RequireStepUp\(\)/);
  const customer=controller.slice(0,controller.indexOf("@Controller('admin/wholesale/applications')"));
  assert.doesNotMatch(customer,/start-review|\/approve|\/reject|customer\.wholesale\.decide/);
});

test('generated contract exposes typed wholesale submit/status and no stale success shapes',()=>{
  const post=generated.slice(
    generated.indexOf('postCustomerWholesaleApplications:'),
    generated.indexOf('getCustomerWholesaleApplication:'),
  );
  assert.match(post,/201:[\s\S]*CustomerWholesaleApplicationView/);
  assert.match(post,/401: components\["responses"\]\["Unauthorized"\]/);
  assert.match(post,/409: components\["responses"\]\["Conflict"\]/);
  assert.match(post,/422: components\["responses"\]\["Unprocessable"\]/);
  assert.doesNotMatch(post,/\n\s+200:/);
  assert.doesNotMatch(post,/\n\s+202:/);

  const get=generated.slice(
    generated.indexOf('getCustomerWholesaleApplication:'),
    generated.indexOf('getCustomerLoyalty:'),
  );
  assert.match(get,/CustomerWholesaleApplicationMaybe/);
  assert.match(generated,/CustomerWholesaleApplicationMaybe: components\["schemas"\]\["CustomerWholesaleApplicationView"\] \| null;/);
});

test('existing profile and Cart Quote remain wholesale identity/pricing authority',()=>{
  const profile=generated.slice(
    generated.indexOf('CustomerProfileResponse:'),
    generated.indexOf('AuthLogoutData:'),
  );
  assert.match(profile,/customer_type: "retail" \| "wholesale"/);

  const auth=generated.slice(
    generated.indexOf('AuthSessionActor:'),
    generated.indexOf('AuthSessionData:'),
  );
  assert.doesNotMatch(auth,/customer_type/);

  const quote=generated.slice(
    generated.indexOf('CheckoutQuoteResponse:'),
    generated.indexOf('CreateReservationRequest:'),
  );
  assert.match(quote,/customer_type: "retail" \| "wholesale"/);
  assert.match(pricing,/getVariantPrice\(variantId:string,quantity=1,customerType:'retail'\|'wholesale'='retail'\)/);
  assert.match(cart,/customerCommerce\.getCustomerType\(customerId\)/);
  assert.match(cart,/pricing\.quoteVariant\(\{variantId:String\(i\.variant_id\),quantity,customerType\}\)/);
  assert.match(config,/'pricing\.wholesale_quantity_discount_min_qty'/);
});

test('generated OpenAPI TypeScript is byte-for-byte reproducible',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eqcofe-step65-b-'));
  const output=join(dir,'openapi.ts');
  const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
  try{
    execFileSync(pnpm,['exec','openapi-typescript','contracts/http/openapi.yaml','-o',output],{stdio:'pipe'});
    assert.equal(generated,readFileSync(output,'utf8'));
  }finally{
    rmSync(dir,{recursive:true,force:true});
  }
});
