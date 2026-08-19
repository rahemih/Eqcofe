import test from 'node:test';
import assert from 'node:assert/strict';
import { CustomerWishlistService } from '../src/modules/customer/application/customer-wishlist.service';

const CUSTOMER='11111111-1111-4111-8111-111111111111';
const PRODUCT='22222222-2222-4222-8222-222222222222';
function harness(opts:{actor?:any;active?:boolean;exists?:boolean;addResult?:any;removeResult?:boolean}={}){
  const calls:any={add:[],remove:[],events:[],audits:[],exists:[]};
  const repo:any={
    profileById:async()=>({id:CUSTOMER,status:opts.active===false?'disabled':'active'}),
    listWishlist:async()=>[{customer_id:CUSTOMER,product_id:PRODUCT,created_at:new Date('2026-08-18T00:00:00Z')}],
    addWishlistItem:async(_ex:any,c:string,p:string)=>{calls.add.push([c,p]);return opts.addResult===undefined?{customer_id:c,product_id:p,created_at:new Date()}:opts.addResult;},
    removeWishlistItem:async(_ex:any,c:string,p:string)=>{calls.remove.push([c,p]);return opts.removeResult??true;},
  };
  const ctxValue:any={requestId:'req',correlationId:'corr',traceId:'trace',actor:opts.actor??{type:'customer',id:CUSTOMER}};
  const ctx:any={get:()=>ctxValue,require:()=>ctxValue};
  const tx:any={run:async(fn:any)=>fn({})};
  const outbox:any={append:async(_ex:any,events:any[])=>calls.events.push(...events)};
  const audit:any={writeWith:async(_ex:any,e:any)=>calls.audits.push(e)};
  const catalog:any={productExists:async(id:string)=>{calls.exists.push(id);return opts.exists!==false;}};
  return {service:new CustomerWishlistService(tx,repo,ctx,outbox,audit,catalog),calls};
}

test('wishlist list exposes relationship only, not product facts',async()=>{const {service}=harness();const r:any=await service.list();assert.equal(r.items[0].product_id,PRODUCT);assert.equal((r.items[0] as any).price,undefined);assert.equal((r.items[0] as any).stock,undefined);assert.equal((r.items[0] as any).title,undefined);});
test('add validates product through Catalog port and emits event/audit on first insert',async()=>{const {service,calls}=harness();const r:any=await service.add(PRODUCT);assert.deepEqual(calls.exists,[PRODUCT]);assert.equal(r.already_present,false);assert.equal(calls.events[0].eventType,'customer.wishlist.item_added.v1');assert.equal(calls.audits[0].action,'customer.wishlist.add');});
test('duplicate add is idempotent with no duplicate side effects',async()=>{const {service,calls}=harness({addResult:null});const r:any=await service.add(PRODUCT);assert.equal(r.already_present,true);assert.equal(calls.events.length,0);assert.equal(calls.audits.length,0);});
test('remove is idempotent and only emits when relation existed',async()=>{const h1=harness();const r1:any=await h1.service.remove(PRODUCT);assert.equal(r1.already_absent,false);assert.equal(h1.calls.events[0].eventType,'customer.wishlist.item_removed.v1');const h2=harness({removeResult:false});const r2:any=await h2.service.remove(PRODUCT);assert.equal(r2.already_absent,true);assert.equal(h2.calls.events.length,0);assert.equal(h2.calls.audits.length,0);});
test('missing product fails closed before insert',async()=>{const {service,calls}=harness({exists:false});await assert.rejects(()=>service.add(PRODUCT),/PRODUCT_NOT_FOUND|محصول/);assert.equal(calls.add.length,0);});
test('non-customer and inactive customer fail closed',async()=>{const a=harness({actor:{type:'staff',id:CUSTOMER}});await assert.rejects(()=>a.service.list(),/CUSTOMER_REQUIRED|ورود مشتری/);const b=harness({active:false});await assert.rejects(()=>b.service.add(PRODUCT),/CUSTOMER_INACTIVE|فعال نیست/);});
