import test from 'node:test';
import assert from 'node:assert/strict';
import { CustomerWholesaleService } from '../src/modules/customer/application/customer-wholesale.service';
const CUSTOMER='11111111-1111-4111-8111-111111111111';
const APP='22222222-2222-4222-8222-222222222222';
const STAFF='33333333-3333-4333-8333-333333333333';
const PROVINCE='44444444-4444-4444-8444-444444444444';
const CITY='55555555-5555-4555-8555-555555555555';
function app(status:any='submitted',version=1){return{id:APP,customer_id:CUSTOMER,business_name:'Cafe EQ',manager_name:'Manager',business_type:'cafe',province_id:PROVINCE,city_id:CITY,business_identifier:null,note:null,status,submitted_at:new Date(),review_started_at:status==='submitted'?null:new Date(),reviewed_at:['approved','rejected'].includes(status)?new Date():null,reviewer_staff_id:status==='submitted'?null:STAFF,decision_note:null,rejection_reason:status==='rejected'?'reason':null,created_at:new Date(),updated_at:new Date(),version};}
function harness(opts:{actor?:any;customerType?:string;customerStatus?:string;application?:any;active?:any;promote?:any}={}){
 const calls:any={events:[],audits:[],created:0,started:0,approved:0,rejected:0,promoted:0,tx:0};
 const current=opts.application===undefined?app():opts.application;
 const repo:any={
  customer:async()=>({id:CUSTOMER,status:opts.customerStatus??'active',customer_type:opts.customerType??'retail',version:7}),
  active:async()=>opts.active??null,
  latest:async()=>current,
  create:async()=>{calls.created++;return app('submitted',1);},
  byId:async()=>current,
  list:async()=>[current].filter(Boolean),
  startReview:async()=>{calls.started++;return app('under_review',2);},
  approve:async()=>{calls.approved++;return app('approved',3);},
  reject:async()=>{calls.rejected++;return app('rejected',3);},
  promote:async()=>{calls.promoted++;return opts.promote===null?null:{id:CUSTOMER,status:'active',customer_type:'wholesale',version:8};},
 };
 const ctxValue:any={requestId:'req',correlationId:'corr',traceId:'trace',actor:opts.actor??{type:'customer',id:CUSTOMER}};
 const tx:any={run:async(fn:any)=>{calls.tx++;return fn({});}};
 const ctx:any={get:()=>ctxValue,require:()=>ctxValue};
 const outbox:any={append:async(_ex:any,events:any[])=>calls.events.push(...events)};
 const audit:any={writeWith:async(_ex:any,e:any)=>calls.audits.push(e)};
 return{service:new CustomerWholesaleService(tx,repo,ctx,outbox,audit),calls};
}
const input={business_name:' Cafe EQ ',manager_name:' Manager ',business_type:' cafe ',province_id:PROVINCE,city_id:CITY};
test('customer submit creates submitted application with audit/outbox',async()=>{const h=harness({application:null});const r:any=await h.service.submit(input);assert.equal(r.status,'submitted');assert.equal(h.calls.created,1);assert.equal(h.calls.events[0].eventType,'customer.wholesale_application.submitted.v1');assert.equal(h.calls.audits[0].action,'customer.wholesale_application.submit');});
test('active application and existing wholesale customer fail closed',async()=>{const a=harness({active:app()});await assert.rejects(()=>a.service.submit(input),/WHOLESALE_APPLICATION_ACTIVE|فعال/);const b=harness({customerType:'wholesale'});await assert.rejects(()=>b.service.submit(input),/CUSTOMER_ALREADY_WHOLESALE|قبلاً/);});
test('start review requires staff and submitted state',async()=>{const no=harness();await assert.rejects(()=>no.service.startReview(APP),/STAFF_REQUIRED|مدیر/);const ok=harness({actor:{type:'staff',id:STAFF}});const r:any=await ok.service.startReview(APP);assert.equal(r.status,'under_review');assert.equal(ok.calls.started,1);assert.equal(ok.calls.events[0].eventType,'customer.wholesale_application.review_started.v1');});
test('approve promotes customer and emits approval plus type-changed in same transaction',async()=>{const h=harness({actor:{type:'staff',id:STAFF},application:app('under_review',2)});const r:any=await h.service.approve(APP,'ok');assert.equal(r.status,'approved');assert.equal(h.calls.tx,1);assert.equal(h.calls.approved,1);assert.equal(h.calls.promoted,1);assert.deepEqual(h.calls.events.map((x:any)=>x.eventType),['customer.wholesale_application.approved.v1','customer.type_changed.v1']);assert.equal(h.calls.audits[0].action,'customer.wholesale_application.approve');});
test('reject is terminal decision without customer promotion',async()=>{const h=harness({actor:{type:'staff',id:STAFF},application:app('under_review',2)});const r:any=await h.service.reject(APP,'مدارک ناقص است');assert.equal(r.status,'rejected');assert.equal(h.calls.rejected,1);assert.equal(h.calls.promoted,0);assert.equal(h.calls.events[0].eventType,'customer.wholesale_application.rejected.v1');});
test('approve/reject outside under_review fail closed before mutation',async()=>{const a=harness({actor:{type:'staff',id:STAFF},application:app('approved',3)});await assert.rejects(()=>a.service.approve(APP),/WHOLESALE_INVALID_STATE|درحال بررسی/);assert.equal(a.calls.promoted,0);const b=harness({actor:{type:'staff',id:STAFF},application:app('submitted',1)});await assert.rejects(()=>b.service.reject(APP,'reason'),/WHOLESALE_INVALID_STATE|درحال بررسی/);assert.equal(b.calls.rejected,0);});
test('customer view is self scoped and admin list requires staff',async()=>{const c=harness();const mine:any=await c.service.myApplication();assert.equal(mine.customer_id,CUSTOMER);await assert.rejects(()=>c.service.listAdmin(),/STAFF_REQUIRED|مدیر/);const a=harness({actor:{type:'staff',id:STAFF}});const list:any=await a.service.listAdmin('submitted');assert.equal(list.items.length,1);});
