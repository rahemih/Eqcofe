import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CheckoutPromotionService } from '../src/modules/marketing/application/checkout-promotion.service';

const cartSource=fs.readFileSync('src/modules/cart/application/cart.service.ts','utf8');
const purchaseSource=fs.readFileSync('src/modules/orders/application/ports/order-purchase-history.service.ts','utf8');
const migration=fs.readFileSync('database/migrations/0038_marketing_checkout_snapshot.sql','utf8');
const cartModule=fs.readFileSync('src/modules/cart/cart.module.ts','utf8');
const ordersModule=fs.readFileSync('src/modules/orders/orders.module.ts','utf8');

function service(auto:any,coupon:any){return new CheckoutPromotionService({resolve:async()=>auto} as any,{evaluate:async()=>coupon} as any);}

test('exclusive coupon deterministically replaces smaller automatic discount',async()=>{
 const s=service({items:[{promotionId:'b',campaignId:'c',name:'auto',discountToman:10000,stacking:'stackable',firstPurchaseOnly:false}],totalDiscountToman:10000},{promotionId:'a',campaignId:'c2',couponId:'cp',code:'SAVE',discountToman:20000,stacking:'exclusive'});
 const r=await s.evaluate({couponCode:'SAVE',customerId:'u',subtotalToman:100000,isWholesale:false,hasCompletedPurchase:false});
 assert.equal(r.totalDiscountToman,20000);assert.equal(r.applications.length,1);assert.equal(r.applications[0].source,'coupon');
});

test('exclusive automatic promotion blocks stackable coupon',async()=>{
 const s=service({items:[{promotionId:'a',campaignId:'c',name:'auto',discountToman:30000,stacking:'exclusive',firstPurchaseOnly:false}],totalDiscountToman:30000},{promotionId:'b',campaignId:'c2',couponId:'cp',code:'SAVE',discountToman:20000,stacking:'stackable'});
 const r=await s.evaluate({couponCode:'SAVE',customerId:'u',subtotalToman:100000,isWholesale:false,hasCompletedPurchase:false});
 assert.equal(r.totalDiscountToman,30000);assert.equal(r.applications.length,1);assert.equal(r.applications[0].source,'automatic');
});

test('stackable coupon is capped at pricing net subtotal',async()=>{
 const s=service({items:[{promotionId:'a',campaignId:'c',name:'auto',discountToman:80000,stacking:'stackable',firstPurchaseOnly:false}],totalDiscountToman:80000},{promotionId:'b',campaignId:'c2',couponId:'cp',code:'SAVE',discountToman:50000,stacking:'stackable'});
 const r=await s.evaluate({couponCode:'SAVE',customerId:'u',subtotalToman:100000,isWholesale:false,hasCompletedPurchase:false});
 assert.equal(r.totalDiscountToman,100000);assert.equal(r.applications[1].discountToman,20000);
});

test('checkout derives wholesale and purchase-history facts server-side',()=>{
 assert.match(cartSource,/customerCommerce\.getCustomerType\(customerId\)/);
 assert.match(cartSource,/purchaseHistory\.hasCompletedPurchase\(customerId\)/);
 assert.doesNotMatch(cartSource,/input\.hasCompletedPurchase/);
 assert.doesNotMatch(cartSource,/input\.isWholesale/);
});

test('marketing applies after authoritative pricing discount',()=>{
 assert.match(cartSource,/const pricingNet=subtotal\.subtract\(pricingDiscount\)/);
 assert.match(cartSource,/subtotalToman:pricingNet\.toJSON\(\)/);
 assert.match(cartSource,/totalDiscount=pricingDiscount\.add\(marketingDiscount\)/);
});

test('paid order history is authoritative for first-purchase fact',()=>{
 assert.match(purchaseSource,/FROM orders\.orders/);
 assert.match(purchaseSource,/payment_status IN \('paid','partially_refunded','refund_required','refunded'\)/);
});

test('A7 persistence separates pricing and marketing discounts without breaking totals',()=>{
 assert.match(migration,/marketing_discount_toman bigint NOT NULL DEFAULT 0/);
 assert.match(migration,/marketing_snapshot jsonb NOT NULL/);
 assert.match(migration,/h\.discount_toman<>s\.pricing_discount\+h\.marketing_discount_toman/);
 assert.match(migration,/trg_order_copy_marketing_snapshot/);
});

test('checkout persists and returns immutable commercial marketing snapshot',()=>{
 assert.match(cartSource,/marketingSnapshot\.apply/);
 assert.match(cartSource,/pricing_discount_toman:pricingDiscount\.toJSON\(\)/);
 assert.match(cartSource,/marketing_discount_toman:marketingDiscount\.toJSON\(\)/);
 assert.match(cartSource,/marketing_snapshot:\{applications:marketing\.applications,pricing_net_toman:pricingNet\.toJSON\(\)\}/);
});

test('module wiring keeps marketing and order facts behind exported services',()=>{
 assert.match(cartModule,/MarketingModule/);assert.match(cartModule,/forwardRef\(\(\)=>OrdersModule\)/);
 assert.match(ordersModule,/ORDER_PURCHASE_HISTORY_PORT/);assert.match(ordersModule,/forwardRef\(\(\)=>CartModule\)/);
});
