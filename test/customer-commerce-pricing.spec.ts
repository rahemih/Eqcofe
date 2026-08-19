import test from 'node:test';
import assert from 'node:assert/strict';
import { CustomerCommerceAdapter } from '../src/modules/customer/infrastructure/customer-commerce.adapter';
import { CartService } from '../src/modules/cart/application/cart.service';

const CUSTOMER='11111111-1111-4111-8111-111111111111';
const CART='22222222-2222-4222-8222-222222222222';
const VARIANT='33333333-3333-4333-8333-333333333333';
const PRODUCT='44444444-4444-4444-8444-444444444444';
const SHIPPING='55555555-5555-4555-8555-555555555555';
const TAX='66666666-6666-4666-8666-666666666666';

function commerce(status='active',type:'retail'|'wholesale'='retail'){
  const repo:any={profileById:async()=>({id:CUSTOMER,status,customer_type:type})};
  return new CustomerCommerceAdapter(repo);
}

test('customer commerce port treats guest as retail without repository lookup',async()=>{
  let reads=0;const adapter=new CustomerCommerceAdapter({profileById:async()=>{reads++;return null;}} as any);
  assert.equal(await adapter.getCustomerType(null),'retail');assert.equal(reads,0);
});

test('customer commerce port exposes only authoritative active customer type',async()=>{
  assert.equal(await commerce('active','retail').getCustomerType(CUSTOMER),'retail');
  assert.equal(await commerce('active','wholesale').getCustomerType(CUSTOMER),'wholesale');
  await assert.rejects(()=>commerce('disabled','wholesale').getCustomerType(CUSTOMER),/CUSTOMER_COMMERCE_UNAVAILABLE|فعال نیست/);
});

function cartHarness(customerId:string|null,customerType:'retail'|'wholesale'){
  const calls:any={customerIds:[],priceTypes:[],checkout:null};
  const cart={id:CART,customer_id:customerId,status:'active',expires_at:new Date(Date.now()+60000),version:3};
  const item={id:'77777777-7777-4777-8777-777777777777',product_id:PRODUCT,variant_id:VARIANT,sku:'SKU',product_name:'Product',quantity:2,global_sales_enabled:true,brand_sales_enabled:true,category_sales_enabled:true,product_sales_enabled:true,variant_sales_enabled:true,product_status:'published',variant_status:'active',brand_id:null,primary_category_id:null};
  const repo:any={
    cart:async()=>cart,tokenValid:async()=>true,items:async()=>[item],shipping:async()=>({id:SHIPPING,fee_toman:0}),
    insertCheckout:async(_ex:any,c:any,items:any[])=>{calls.checkout={c,items};},extendCartExpiry:async()=>{},
  };
  const marketingSnapshot:any={apply:async(_ex:any,input:any)=>{calls.marketing=input;}};
  const tx:any={run:async(fn:any)=>fn({})};
  const pricing:any={quoteVariant:async(i:any)=>{calls.priceTypes.push(i.customerType);return{variant_id:VARIANT,base_price_toman:100000,current_toman:customerType==='wholesale'?80000:100000,customer_type:i.customerType,applied_rule_ids:[]};}};
  const availability:any={getOnlineSellableQuantity:async()=>100};
  const reservation:any={};
  const customerCommerce:any={getCustomerType:async(id:string|null)=>{calls.customerIds.push(id);return customerType;}};
  const purchaseHistory:any={hasCompletedPurchase:async()=>false};
  const checkoutPromotions:any={evaluate:async()=>({applications:[],totalDiscountToman:0})};
  const tax:any={resolve:async()=>({tax_toman:0,rule_id:TAX,rate_basis_points:0})};
  const ctx:any={get:()=>null};
  const config:any={get:(_k:string,d:string)=>d};
  const service=new CartService(repo,marketingSnapshot,tx,pricing,availability,reservation,customerCommerce,purchaseHistory,checkoutPromotions,tax,ctx,config);(service as any).assertNotAdvanced=async()=>{};return{service,calls};
}

test('guest checkout resolves retail through Customer port and quotes retail',async()=>{
  const h=cartHarness(null,'retail');const q:any=await h.service.quote(CART,'token',{shipping_method_id:SHIPPING});
  assert.deepEqual(h.calls.customerIds,[null]);assert.deepEqual(h.calls.priceTypes,['retail']);assert.equal(q.customer_type,'retail');assert.equal(q.total_toman,200000);
});

test('approved wholesale customer checkout quotes using authoritative wholesale type',async()=>{
  const h=cartHarness(CUSTOMER,'wholesale');const q:any=await h.service.quote(CART,'token',{shipping_method_id:SHIPPING});
  assert.deepEqual(h.calls.customerIds,[CUSTOMER]);assert.deepEqual(h.calls.priceTypes,['wholesale']);assert.equal(q.customer_type,'wholesale');assert.equal(q.discount_toman,40000);assert.equal(q.total_toman,160000);assert.equal(h.calls.checkout.items[0].pricing_snapshot.customer_type,'wholesale');
});

import { PricingEngine } from '../src/modules/pricing/domain/pricing-engine';
test('pricing engine applies wholesale-targeted rule only to wholesale customer type',()=>{
  const engine=new PricingEngine();
  const rules:any[]=[{id:'wholesale-20',nameFa:'عمده',priority:100,valueType:'percentage',valueNumeric:20,minQuantity:null,maxQuantity:null,customerType:'wholesale',stackingPolicy:'exclusive'}];
  assert.equal(engine.calculate(100000,rules,1,'retail').finalPriceToman,100000);
  assert.equal(engine.calculate(100000,rules,1,'wholesale').finalPriceToman,80000);
});
