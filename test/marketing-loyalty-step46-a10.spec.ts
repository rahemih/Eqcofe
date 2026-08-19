import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const marketingController=fs.readFileSync('src/modules/marketing/presentation/marketing-admin.controller.ts','utf8');
const loyaltyController=fs.readFileSync('src/modules/loyalty/presentation/loyalty-admin.controller.ts','utf8');
const marketingService=fs.readFileSync('src/modules/marketing/application/marketing-admin.service.ts','utf8');
const loyaltyService=fs.readFileSync('src/modules/loyalty/application/loyalty-admin.service.ts','utf8');
const marketingModule=fs.readFileSync('src/modules/marketing/marketing.module.ts','utf8');
const loyaltyModule=fs.readFileSync('src/modules/loyalty/loyalty.module.ts','utf8');
const rbac=fs.readFileSync('database/migrations/0035_marketing_loyalty_rbac.sql','utf8');

test('A10 marketing admin controller is staff-only and permission guarded',()=>{
  assert.match(marketingController,/@Controller\('admin\/marketing'\)[\s\S]*@StaffOnly\(\)/);
  assert.match(marketingController,/@Permissions\('marketing\.view'\)/);
  assert.match(marketingController,/@Permissions\('marketing\.manage'\)/);
  assert.match(marketingController,/@Permissions\('marketing\.activate'\)/);
  assert.match(marketingController,/@Permissions\('marketing\.redemption\.view'\)/);
});

test('A10 critical marketing state changes require step-up and idempotency',()=>{
  for(const scope of ['marketing.campaign.activate','marketing.campaign.pause','marketing.campaign.end','marketing.campaign.archive','marketing.promotion.enable','marketing.promotion.disable','marketing.coupon.enable','marketing.coupon.disable']){
    assert.match(marketingController,new RegExp(`@RequireStepUp\\(\\)[\\s\\S]{0,120}@RequireIdempotency\\('${scope.replaceAll('.','\\.')}'\\)`));
  }
});

test('A10 marketing create mutations are idempotent and audited',()=>{
  assert.match(marketingController,/@RequireIdempotency\('marketing\.promotion\.create'\)/);
  assert.match(marketingController,/@RequireIdempotency\('marketing\.coupon\.create'\)/);
  assert.match(marketingService,/action:'marketing\.promotion\.create'/);
  assert.match(marketingService,/action:'marketing\.coupon\.create'/);
  assert.match(marketingService,/audit\.writeWith\(ex/);
});

test('A10 promotion and coupon writes enforce optimistic version checks',()=>{
  assert.match(marketingService,/PROMOTION_VERSION_CONFLICT/);
  assert.match(marketingService,/COUPON_VERSION_CONFLICT/);
  assert.match(marketingService,/Number\(before\.version\)!==expectedVersion/);
});

test('A10 loyalty admin reads and mutations use frozen RBAC permissions',()=>{
  assert.match(loyaltyController,/@Controller\('admin\/loyalty'\)[\s\S]*@StaffOnly\(\)/);
  assert.match(loyaltyController,/@Permissions\('loyalty\.view'\)/);
  assert.match(loyaltyController,/@Permissions\('loyalty\.adjust'\)/);
  assert.match(rbac,/'loyalty\.view'/);
  assert.match(rbac,/'loyalty\.adjust'/);
});

test('A10 loyalty mutations require both step-up and idempotency',()=>{
  assert.match(loyaltyController,/@Permissions\('loyalty\.adjust'\) @RequireStepUp\(\) @RequireIdempotency\('loyalty\.points\.adjust'\)/);
  assert.match(loyaltyController,/@Permissions\('loyalty\.adjust'\) @RequireStepUp\(\) @RequireIdempotency\('loyalty\.points\.reverse'\)/);
});

test('A10 loyalty adjustment and reversal are audit-recorded in the same transaction executor',()=>{
  assert.match(loyaltyService,/action:'loyalty\.points\.adjust'/);
  assert.match(loyaltyService,/action:'loyalty\.points\.reverse'/);
  const writes=loyaltyService.match(/audit\.writeWith\(ex/g)??[];
  assert.equal(writes.length,2);
});

test('A10 admin loyalty remains points-only with no cash value',()=>{
  assert.match(loyaltyService,/unit:'points' as const,cash_value:null/);
  assert.doesNotMatch(loyaltyService,/toman_per_point|cash_value\s*:\s*[1-9]/i);
});

test('A10 modules register controllers and admin services',()=>{
  assert.match(marketingModule,/controllers:\[MarketingAdminController\]/);
  assert.match(marketingModule,/MarketingAdminService/);
  assert.match(loyaltyModule,/controllers:\[LoyaltyAdminController\]/);
  assert.match(loyaltyModule,/LoyaltyAdminService/);
});

test('A10 reuses existing additive RBAC instead of inventing parallel permissions',()=>{
  for(const key of ['marketing.view','marketing.manage','marketing.activate','marketing.redemption.view','loyalty.view','loyalty.adjust']) assert.match(rbac,new RegExp(`'${key.replaceAll('.','\\.')}'`));
});
