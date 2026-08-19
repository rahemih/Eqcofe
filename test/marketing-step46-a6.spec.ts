import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AutomaticPromotionService } from '../src/modules/marketing/application/automatic-promotion.service';
import { evaluatePromotion } from '../src/modules/marketing/domain/promotion-policy';

const repoSource=fs.readFileSync('src/modules/marketing/infrastructure/automatic-promotion.repository.ts','utf8');
const moduleSource=fs.readFileSync('src/modules/marketing/marketing.module.ts','utf8');

const base={
  promotion_id:'00000000-0000-0000-0000-000000000001',campaign_id:'00000000-0000-0000-0000-000000000010',name:'جشنواره',
  kind:'percentage' as const,value:20,max_discount_toman:15000,min_subtotal_toman:10000,
  first_purchase_only:false,wholesale_allowed:false,total_usage_limit:null,per_customer_usage_limit:null,
  stacking:'exclusive' as const,starts_at:new Date('2026-08-01T00:00:00Z'),ends_at:new Date('2026-09-01T00:00:00Z'),
};

function service(rows:any[],usage={total:0,customer:0}){
  return new AutomaticPromotionService({activeAutomatic:async()=>rows,usage:async()=>usage} as any);
}

test('first purchase promotion requires stable customer identity',()=>{
  const result=evaluatePromotion({id:'p',campaignId:'c',name:'اولین خرید',kind:'percentage',value:10,eligibility:{startsAt:new Date('2026-08-01'),endsAt:new Date('2026-09-01'),firstPurchaseOnly:true}}, {customerId:null,subtotalToman:100000,isWholesale:false,hasCompletedPurchase:false,totalRedemptions:0,customerRedemptions:0,now:new Date('2026-08-20')});
  assert.equal(result.eligible,false); assert.equal(result.reason,'CUSTOMER_REQUIRED');
});

test('eligible first purchase customer receives automatic discount',async()=>{
  const s=service([{...base,first_purchase_only:true}]);
  const r=await s.resolve({customerId:'00000000-0000-0000-0000-000000000020',subtotalToman:100000,isWholesale:false,hasCompletedPurchase:false,now:new Date('2026-08-20')});
  assert.equal(r.totalDiscountToman,15000); assert.equal(r.items.length,1); assert.equal(r.items[0].firstPurchaseOnly,true);
});

test('returning customer does not receive first purchase promotion',async()=>{
  const s=service([{...base,first_purchase_only:true}]);
  const r=await s.resolve({customerId:'00000000-0000-0000-0000-000000000020',subtotalToman:100000,isWholesale:false,hasCompletedPurchase:true,now:new Date('2026-08-20')});
  assert.equal(r.totalDiscountToman,0); assert.equal(r.items.length,0);
});

test('exclusive festival promotion deterministically wins over stackable items',async()=>{
  const s=service([
    {...base,promotion_id:'00000000-0000-0000-0000-000000000003',stacking:'stackable',value:5,max_discount_toman:null},
    {...base,promotion_id:'00000000-0000-0000-0000-000000000002',stacking:'exclusive',value:10,max_discount_toman:null},
    {...base,promotion_id:'00000000-0000-0000-0000-000000000001',stacking:'exclusive',value:10,max_discount_toman:null},
  ]);
  const r=await s.resolve({customerId:'00000000-0000-0000-0000-000000000020',subtotalToman:100000,isWholesale:false,hasCompletedPurchase:false,now:new Date('2026-08-20')});
  assert.equal(r.items.length,1); assert.equal(r.items[0].promotionId,'00000000-0000-0000-0000-000000000001'); assert.equal(r.totalDiscountToman,10000);
});

test('stackable festival promotions never discount below zero',async()=>{
  const s=service([
    {...base,promotion_id:'00000000-0000-0000-0000-000000000001',stacking:'stackable',kind:'fixed_toman',value:80000,max_discount_toman:null},
    {...base,promotion_id:'00000000-0000-0000-0000-000000000002',stacking:'stackable',kind:'fixed_toman',value:80000,max_discount_toman:null},
  ]);
  const r=await s.resolve({customerId:'00000000-0000-0000-0000-000000000020',subtotalToman:100000,isWholesale:false,hasCompletedPurchase:false,now:new Date('2026-08-20')});
  assert.equal(r.totalDiscountToman,100000);
});

test('wholesale festival promotion is denied unless explicitly allowed',async()=>{
  const s=service([base]);
  const r=await s.resolve({customerId:'00000000-0000-0000-0000-000000000020',subtotalToman:100000,isWholesale:true,hasCompletedPurchase:false,now:new Date('2026-08-20')});
  assert.equal(r.totalDiscountToman,0);
});

test('automatic repository selects only active coupon-free promotions',()=>{
  assert.match(repoSource,/c\.status='active'/);
  assert.match(repoSource,/p\.enabled=true/);
  assert.match(repoSource,/NOT EXISTS \(SELECT 1 FROM marketing\.coupons cp WHERE cp\.promotion_id=p\.id\)/);
  assert.match(repoSource,/status IN \('reserved','consumed'\)/);
});

test('marketing module exports automatic promotion service',()=>{
  assert.match(moduleSource,/AutomaticPromotionService/);
  assert.match(moduleSource,/AutomaticPromotionRepository/);
  assert.match(moduleSource,/exports: \[[^\]]*AutomaticPromotionService[^\]]*\]/);
});
