import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CheckoutPromotionService } from '../src/modules/marketing/application/checkout-promotion.service';

const cart=fs.readFileSync('src/modules/cart/application/cart.service.ts','utf8');
const a7=fs.readFileSync('database/migrations/0038_marketing_checkout_snapshot.sql','utf8');
const a8=fs.readFileSync('database/migrations/0039_marketing_redemption_integrity.sql','utf8')+'\n'+fs.readFileSync('database/migrations/0040_marketing_redemption_runtime_hardening.sql','utf8');
const a9=fs.readFileSync('database/migrations/0041_loyalty_points_mvp_foundation.sql','utf8');
const marketingAdmin=fs.readFileSync('src/modules/marketing/presentation/marketing-admin.controller.ts','utf8');
const loyaltyAdmin=fs.readFileSync('src/modules/loyalty/presentation/loyalty-admin.controller.ts','utf8');
const rbac=fs.readFileSync('database/migrations/0035_marketing_loyalty_rbac.sql','utf8');
const policy=fs.readFileSync('scripts/check-project-policies.mjs','utf8');

function promotionService(auto:any,coupon:any){return new CheckoutPromotionService({resolve:async()=>auto} as any,{evaluate:async()=>coupon} as any);}

test('A11 E2E promotion resolution is deterministic before persistence',async()=>{
  const s=promotionService(
    {items:[{promotionId:'00000000-0000-4000-8000-000000000001',campaignId:'00000000-0000-4000-8000-000000000002',name:'festival',discountToman:15000,stacking:'stackable',firstPurchaseOnly:false}],totalDiscountToman:15000},
    {promotionId:'00000000-0000-4000-8000-000000000003',campaignId:'00000000-0000-4000-8000-000000000004',couponId:'00000000-0000-4000-8000-000000000005',code:'SAVE',discountToman:30000,stacking:'exclusive'}
  );
  const result=await s.evaluate({couponCode:'SAVE',customerId:'00000000-0000-4000-8000-000000000006',subtotalToman:100000,isWholesale:false,hasCompletedPurchase:false});
  assert.equal(result.totalDiscountToman,30000);
  assert.equal(result.applications.length,1);
  assert.equal(result.applications[0].source,'coupon');
});

test('A11 checkout derives trust-sensitive facts server-side',()=>{
  assert.match(cart,/customerCommerce\.getCustomerType\(customerId\)/);
  assert.match(cart,/purchaseHistory\.hasCompletedPurchase\(customerId\)/);
  assert.doesNotMatch(cart,/input\.isWholesale/);
  assert.doesNotMatch(cart,/input\.hasCompletedPurchase/);
});

test('A11 financial snapshot keeps pricing and marketing discounts separated and additive',()=>{
  assert.match(a7,/marketing_discount_toman bigint NOT NULL DEFAULT 0/);
  assert.match(a7,/marketing_snapshot jsonb NOT NULL/);
  assert.match(a7,/discount_toman<>s\.pricing_discount\+h\.marketing_discount_toman/);
});

test('A11 checkout reserve to order consume to cancellation reverse is database-owned',()=>{
  assert.match(a8,/trg_marketing_reserve_on_checkout/);
  assert.match(a8,/SET status='consumed',order_id=NEW\.id,consumed_at=now\(\)/);
  assert.match(a8,/SET status='reversed',reversed_at=now\(\)/);
  assert.match(a8,/NEW\.status IN \('cancelled','expired'\)/);
});

test('A11 promotion and coupon limits are serialized under concurrency',()=>{
  assert.match(a8,/pg_advisory_xact_lock\(hashtextextended\('marketing-promotion:'/);
  assert.match(a8,/pg_advisory_xact_lock\(hashtextextended\('marketing-coupon:'/);
  assert.match(a8,/MARKETING_PROMOTION_TOTAL_LIMIT_REACHED/);
  assert.match(a8,/MARKETING_COUPON_TOTAL_LIMIT_REACHED/);
});

test('A11 first-purchase race is customer serialized and revalidated from paid orders',()=>{
  assert.match(a8,/marketing-first-purchase:/);
  assert.match(a8,/FROM orders\.orders WHERE customer_id=NEW\.customer_id AND payment_status='paid'/);
  assert.match(a8,/MARKETING_FIRST_PURCHASE_ALREADY_RESERVED/);
});

test('A11 redemption financial integrity is deferred to transaction boundary',()=>{
  assert.match(a8,/CREATE CONSTRAINT TRIGGER trg_marketing_redemption_financial_integrity/);
  assert.match(a8,/DEFERRABLE INITIALLY DEFERRED/);
  assert.match(a8,/MARKETING_ORDER_FINANCIAL_MISMATCH/);
  assert.match(a8,/MARKETING_CHECKOUT_REDEMPTION_MISMATCH/);
});

test('A11 loyalty mutation is serialized, append-only and non-negative',()=>{
  assert.match(a9,/pg_advisory_xact_lock\(hashtextextended\(NEW\.customer_id::text, 46\)\)/);
  assert.match(a9,/LOYALTY_NEGATIVE_BALANCE/);
  assert.match(a9,/BEFORE UPDATE OR DELETE ON loyalty\.points_entries/);
  assert.match(a9,/LOYALTY_LEDGER_IMMUTABLE/);
});

test('A11 critical admin mutations require staff RBAC step-up and idempotency',()=>{
  assert.match(marketingAdmin,/@StaffOnly\(\)/);
  assert.match(loyaltyAdmin,/@StaffOnly\(\)/);
  assert.match(marketingAdmin,/@Permissions\('marketing\.activate'\)[\s\S]{0,180}@RequireStepUp\(\)[\s\S]{0,180}@RequireIdempotency/);
  assert.match(loyaltyAdmin,/@Permissions\('loyalty\.adjust'\) @RequireStepUp\(\) @RequireIdempotency/);
});

test('A11 redemption admin remains read-only and cannot bypass commerce lifecycle',()=>{
  assert.match(marketingAdmin,/@Permissions\('marketing\.redemption\.view'\) @Get\('redemptions'\)/);
  assert.doesNotMatch(marketingAdmin,/redemptions\/:id\/(consume|release|reverse|status)/i);
  assert.doesNotMatch(marketingAdmin,/@Permissions\('marketing\.redemption\.manage'\)/);
});

test('A11 frozen RBAC keys exist for all Step-46 admin surfaces',()=>{
  for(const key of ['marketing.view','marketing.manage','marketing.activate','marketing.redemption.view','loyalty.view','loyalty.adjust']){
    assert.match(rbac,new RegExp(`'${key.replaceAll('.','\\.')}'`));
  }
});

test('A11 no-cash-account project policy remains active for Step 46',()=>{
  assert.match(policy,/toman-no-wallet-config-boundary/);
  assert.match(a9,/Points are non-cash, non-transferable units/);
  assert.doesNotMatch(a9,/toman_per_point|withdrawal_amount|transfer_points/i);
});

test('A11 all Step-46 regression suites A2 through A10 remain present',()=>{
  const expected=[
    'test/marketing-loyalty-step46-a2.spec.ts',
    'test/marketing-loyalty-step46-a3.spec.ts',
    'test/marketing-step46-a4.spec.ts',
    'test/marketing-step46-a5.spec.ts',
    'test/marketing-step46-a6.spec.ts',
    'test/marketing-step46-a7.spec.ts',
    'test/marketing-step46-a8.spec.ts',
    'test/loyalty-step46-a9.spec.ts',
    'test/marketing-loyalty-step46-a10.spec.ts',
  ];
  for(const path of expected) assert.equal(fs.existsSync(path),true,path);
});

test('A11 Step-46 migration lineage is additive and ordered',()=>{
  for(let n=34;n<=41;n++){
    const prefix=String(n).padStart(4,'0')+'_';
    const found=fs.readdirSync('database/migrations').some(name=>name.startsWith(prefix));
    assert.equal(found,true,`missing ${prefix}`);
  }
});

test('A11 marketing financial fields remain integer Toman contracts',()=>{
  for(const source of [a7,a8]){
    assert.match(source,/discount_toman/);
    assert.doesNotMatch(source,/discount_rial|subtotal_rial|total_rial/i);
  }
});
