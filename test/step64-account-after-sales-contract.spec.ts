import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const openapi=readFileSync('contracts/http/openapi.yaml','utf8');
const generated=readFileSync('src/generated/openapi.ts','utf8');
const auth=readFileSync('src/modules/identity/presentation/auth.controller.ts','utf8');
const notifications=readFileSync('src/modules/notifications/presentation/notifications.controller.ts','utf8');
const inApp=readFileSync('src/modules/notifications/application/notification-in-app.service.ts','utf8');
const returnsController=readFileSync('src/modules/returns/presentation/returns.controller.ts','utf8');
const warrantyController=readFileSync('src/modules/warranty/presentation/warranty.controller.ts','utf8');

test('customer session response is sanitized and logout status is explicit',()=>{
  assert.match(auth,/@CustomerOnly\(\) @HttpCode\(HttpStatus\.OK\) @Post\('auth\/logout'\)/);
  assert.match(auth,/@CustomerOnly\(\) @HttpCode\(HttpStatus\.OK\) @Post\('auth\/logout-all'\)/);
  const session=auth.slice(auth.indexOf("@CustomerOnly() @Get('auth/session')"),auth.indexOf("@Public() @Post('admin/auth/login')"));
  assert.match(session,/actor:\{type:'customer',id:req\.actor\.id,accountId:req\.actor\.accountId\?\?req\.actor\.id\}/);
  assert.doesNotMatch(session,/sessionId/);
  assert.doesNotMatch(session,/permissions/);
  assert.doesNotMatch(session,/scopes/);
});

test('customer notification inbox is a customer-only wrapper over owner-scoped service',()=>{
  assert.match(notifications,/@CustomerOnly\(\) @Get\('customer\/notifications'\)/);
  assert.match(notifications,/@RequireIdempotency\('notifications\.customer\.mark_read'\)/);
  assert.match(notifications,/@Patch\('customer\/notifications\/:id\/read'\)/);
  assert.match(notifications,/@RequireIdempotency\('notifications\.customer\.acknowledge'\)/);
  assert.match(notifications,/@Post\('customer\/notifications\/:id\/acknowledge'\)/);
  assert.match(inApp,/recipient_subject_type=o\.type/);
  assert.match(inApp,/recipient_subject_id=o\.id/);
  assert.match(inApp,/NOTIFICATION_IN_APP_NOT_FOUND/);
});

test('returns and warranty runtime require customer ownership and idempotency on mutations',()=>{
  assert.match(returnsController,/@CustomerOnly\(\)[\s\S]*@RequireIdempotency\('return\.customer\.create'\)[\s\S]*@Post\('customer\/orders\/:order_number\/returns'\)/);
  assert.match(returnsController,/@RequireIdempotency\('return\.customer\.cancel'\)[\s\S]*@HttpCode\(HttpStatus\.OK\)[\s\S]*@Post\('customer\/returns\/:return_number\/cancel'\)/);
  assert.match(warrantyController,/@CustomerOnly\(\)[\s\S]*@RequireIdempotency\('warranty\.customer\.create'\)[\s\S]*@Post\('customer\/warranty\/claims'\)/);
});

test('Step 64-B OpenAPI exposes safe typed account and after-sales contract',()=>{
  const authPaths=openapi.slice(openapi.indexOf('  /auth/logout:'),openapi.indexOf('  /customer/cart:'));
  assert.doesNotMatch(authPaths,/'202':/);
  for(const name of ['AuthLogoutResponse','AuthSessionResponse']) assert.match(authPaths,new RegExp(name));
  for(const path of ['  /customer/notifications:','  /customer/notifications/{id}/read:','  /customer/notifications/{id}/acknowledge:']) assert.ok(openapi.includes(path),path);
  const afterSales=openapi.slice(openapi.indexOf('  /customer/orders/{order_number}/returns:'),openapi.indexOf('  /customer/wholesale/applications:'));
  assert.match(afterSales,/IdempotencyKey/);
  assert.match(afterSales,/CustomerReturnResponse/);
  assert.match(afterSales,/CustomerWarrantyResponse/);
  assert.match(afterSales,/AfterSalesTimelineEnvelope/);
  assert.doesNotMatch(afterSales,/'202':/);
});

test('generated Step 64-B contract contains safe account, notifications and after-sales operations',()=>{
  for(const name of ['AuthLogoutResponse','AuthSessionResponse','CustomerNotificationResponse','CustomerReturnResponse','CustomerWarrantyResponse','AfterSalesTimelineEnvelope']) assert.match(generated,new RegExp(name));
  for(const op of ['getCustomerNotifications','patchCustomerNotificationsIdRead','postCustomerNotificationsIdAcknowledge']) assert.match(generated,new RegExp(op));
  const logout=generated.slice(generated.indexOf('postAuthLogout: {'),generated.indexOf('postAuthLogoutAll: {'));
  assert.doesNotMatch(logout,/\n\s*202:/);
});

test('generated contract is byte-for-byte reproducible from canonical OpenAPI',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eqcofe-step64-openapi-'));
  const output=join(dir,'openapi.ts');
  const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
  try{
    execFileSync(pnpm,['exec','openapi-typescript','contracts/http/openapi.yaml','-o',output],{stdio:'pipe'});
    assert.equal(readFileSync('src/generated/openapi.ts','utf8'),readFileSync(output,'utf8'));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
