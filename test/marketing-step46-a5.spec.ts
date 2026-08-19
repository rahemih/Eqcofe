import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CouponEligibilityService } from '../src/modules/marketing/application/coupon-eligibility.service';

const now=new Date('2026-08-19T10:00:00Z');
const base={
  coupon_id:'11111111-1111-4111-8111-111111111111',coupon_code:'WELCOME10',coupon_enabled:true,
  coupon_starts_at:new Date('2026-08-01T00:00:00Z'),coupon_ends_at:new Date('2026-09-01T00:00:00Z'),coupon_total_usage_limit:100,coupon_per_customer_usage_limit:1,
  promotion_id:'22222222-2222-4222-8222-222222222222',promotion_name:'Welcome',promotion_kind:'percentage' as const,promotion_value:10,promotion_max_discount_toman:50000,promotion_min_subtotal_toman:100000,
  promotion_first_purchase_only:true,promotion_wholesale_allowed:false,promotion_total_usage_limit:100,promotion_per_customer_usage_limit:1,promotion_stacking:'exclusive' as const,
  promotion_starts_at:new Date('2026-08-01T00:00:00Z'),promotion_ends_at:new Date('2026-09-01T00:00:00Z'),promotion_enabled:true,
  campaign_id:'33333333-3333-4333-8333-333333333333',campaign_status:'active' as const,campaign_starts_at:new Date('2026-08-01T00:00:00Z'),campaign_ends_at:new Date('2026-09-01T00:00:00Z'),
};
function svc(row:any=base,usage:any={couponTotal:0,couponCustomer:0,promotionTotal:0,promotionCustomer:0}){return new CouponEligibilityService({byCode:async()=>row,usage:async()=>usage} as any);}

test('coupon is normalized and eligible first retail purchase returns capped integer Toman discount',async()=>{const r=await svc().evaluate({code:' welcome10 ',customerId:'44444444-4444-4444-8444-444444444444',subtotalToman:800000,isWholesale:false,hasCompletedPurchase:false,now});assert.equal(r.code,'WELCOME10');assert.equal(r.discountToman,50000);assert.equal(r.stacking,'exclusive');});
test('returning customer is rejected by first purchase eligibility',async()=>{await assert.rejects(()=>svc().evaluate({code:'WELCOME10',customerId:'44444444-4444-4444-8444-444444444444',subtotalToman:200000,isWholesale:false,hasCompletedPurchase:true,now}),/این کد تخفیف/);});
test('wholesale is rejected unless promotion explicitly allows it',async()=>{await assert.rejects(()=>svc().evaluate({code:'WELCOME10',customerId:'44444444-4444-4444-8444-444444444444',subtotalToman:200000,isWholesale:true,hasCompletedPurchase:false,now}),/این کد تخفیف/);const row={...base,promotion_wholesale_allowed:true,promotion_first_purchase_only:false};const r=await svc(row).evaluate({code:'WELCOME10',customerId:'44444444-4444-4444-8444-444444444444',subtotalToman:200000,isWholesale:true,hasCompletedPurchase:true,now});assert.equal(r.discountToman,20000);});
test('coupon per customer usage limit fails closed',async()=>{await assert.rejects(()=>svc(base,{couponTotal:1,couponCustomer:1,promotionTotal:1,promotionCustomer:0}).evaluate({code:'WELCOME10',customerId:'44444444-4444-4444-8444-444444444444',subtotalToman:200000,isWholesale:false,hasCompletedPurchase:false,now}),/سقف استفاده مشتری/);});
test('inactive campaign and disabled promotion fail closed before discount',async()=>{await assert.rejects(()=>svc({...base,campaign_status:'paused'}).evaluate({code:'WELCOME10',customerId:null,subtotalToman:200000,isWholesale:false,hasCompletedPurchase:false,now}),/کمپین این کد فعال نیست/);await assert.rejects(()=>svc({...base,promotion_enabled:false}).evaluate({code:'WELCOME10',customerId:null,subtotalToman:200000,isWholesale:false,hasCompletedPurchase:false,now}),/تخفیف غیرفعال/);});
test('repository counts only reserved and consumed usage',()=>{const r=fs.readFileSync('src/modules/marketing/infrastructure/coupon-eligibility.repository.ts','utf8');assert.match(r,/status IN \('reserved','consumed'\)/);assert.match(r,/customer_id IS NOT DISTINCT FROM/);});
test('A5 migration aligns coupon format and window with domain',()=>{const m=fs.readFileSync('database/migrations/0037_marketing_coupon_eligibility_hardening.sql','utf8');assert.match(m,/\^\[A-Z0-9\]\[A-Z0-9_-\]\{2,31\}\$/);assert.match(m,/COUPON_OUTSIDE_PROMOTION_WINDOW/);assert.match(m,/ix_marketing_redemptions_coupon_active_usage/);});
test('marketing module exports coupon eligibility engine',()=>{const m=fs.readFileSync('src/modules/marketing/marketing.module.ts','utf8');assert.match(m,/CouponEligibilityService/);assert.match(m,/CouponEligibilityRepository/);});
