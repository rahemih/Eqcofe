import test from "node:test";
import assert from "node:assert/strict";
import { CartService } from "../src/modules/cart/application/cart.service";

const CUSTOMER="11111111-1111-4111-8111-111111111111";
const CART="22222222-2222-4222-8222-222222222222";
const VARIANT="33333333-3333-4333-8333-333333333333";
const PRODUCT="44444444-4444-4444-8444-444444444444";
const ITEM="55555555-5555-4555-8555-555555555555";

function cartViewHarness({
  customerId=CUSTOMER,
  customerType="wholesale" as "retail"|"wholesale",
  quoted=true,
  sellable=true,
  available=7,
}={}){
  const calls:any={customerIds:[],quotes:[]};
  const cart={id:CART,customer_id:customerId,status:"active",expires_at:new Date(Date.now()+60000),version:3};
  const item={
    id:ITEM,product_id:PRODUCT,variant_id:VARIANT,sku:"SKU-65-E",product_name:"محصول آزمون",quantity:2,
    global_sales_enabled:sellable,brand_sales_enabled:true,category_sales_enabled:true,
    product_sales_enabled:true,variant_sales_enabled:true,product_status:"published",variant_status:"active",
  };
  const repo:any={
    cart:async()=>cart,
    tokenValid:async()=>true,
    items:async()=>[item],
  };
  const marketingSnapshot:any={};
  const tx:any={run:async(fn:any)=>fn({})};
  const pricing:any={
    quoteVariant:async(input:any)=>{
      calls.quotes.push(input);
      if(!quoted)return null;
      return{
        variant_id:VARIANT,
        base_price_toman:100000,
        current_toman:customerType==="wholesale"?80000:100000,
        customer_type:input.customerType,
        quantity:input.quantity,
      };
    },
  };
  const availability:any={getOnlineSellableQuantity:async()=>available};
  const reservation:any={};
  const customerCommerce:any={
    getCustomerType:async(id:string|null)=>{
      calls.customerIds.push(id);
      return customerType;
    },
  };
  const purchaseHistory:any={};
  const checkoutPromotions:any={};
  const tax:any={};
  const ctx:any={get:()=>null};
  const config:any={get:(_k:string,d:string)=>d};
  const service=new CartService(
    repo,marketingSnapshot,tx,pricing,availability,reservation,customerCommerce,
    purchaseHistory,checkoutPromotions,tax,ctx,config,
  );
  return{service,calls};
}

test("CartView projects authoritative wholesale customer type and quantity price",async()=>{
  const h=cartViewHarness();
  const view:any=await h.service.view(CART,"token");
  assert.deepEqual(h.calls.customerIds,[CUSTOMER]);
  assert.deepEqual(h.calls.quotes,[{variantId:VARIANT,quantity:2,customerType:"wholesale"}]);
  assert.equal(view.customer_type,"wholesale");
  assert.equal(view.items[0].quantity,2);
  assert.deepEqual(view.items[0].price,{
    unit_base_toman:100000,
    unit_final_toman:80000,
    discount_toman:40000,
    line_total_toman:160000,
  });
  assert.deepEqual(view.items[0].availability,{
    sales_enabled:true,
    in_stock:true,
    available_quantity:7,
  });
  assert.deepEqual(view.pricing,{
    subtotal_toman:200000,
    discount_toman:40000,
    total_toman:160000,
  });
  assert.equal(view.requires_revalidation,false);
});

test("guest CartView remains retail and does not invent wholesale pricing",async()=>{
  const h=cartViewHarness({customerId:null,customerType:"retail",available:20});
  const view:any=await h.service.view(CART,"token");
  assert.deepEqual(h.calls.customerIds,[null]);
  assert.equal(view.customer_type,"retail");
  assert.equal(view.items[0].price.unit_final_toman,100000);
  assert.equal(view.pricing.discount_toman,0);
  assert.equal(view.pricing.total_toman,200000);
});

test("CartView stays readable and fails pricing closed when current price is unavailable",async()=>{
  const h=cartViewHarness({quoted:false});
  const view:any=await h.service.view(CART,"token");
  assert.equal(view.customer_type,"wholesale");
  assert.equal(view.items[0].price,null);
  assert.equal(view.pricing,null);
  assert.equal(view.requires_revalidation,true);
});

test("CartView marks unsellable or insufficient-stock lines for revalidation",async()=>{
  const unsellable=cartViewHarness({sellable:false});
  const a:any=await unsellable.service.view(CART,"token");
  assert.equal(a.items[0].availability.sales_enabled,false);
  assert.equal(a.items[0].price,null);
  assert.equal(a.requires_revalidation,true);
  assert.deepEqual(unsellable.calls.quotes,[]);

  const stock=cartViewHarness({available:1});
  const b:any=await stock.service.view(CART,"token");
  assert.equal(b.items[0].availability.in_stock,true);
  assert.equal(b.items[0].availability.available_quantity,1);
  assert.equal(b.requires_revalidation,true);
});
