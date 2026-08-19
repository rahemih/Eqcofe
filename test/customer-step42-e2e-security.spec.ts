import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { of, firstValueFrom } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { CustomerWholesaleService } from '../src/modules/customer/application/customer-wholesale.service';
import { CustomerCommerceAdapter } from '../src/modules/customer/infrastructure/customer-commerce.adapter';
import { CustomerWholesaleAdminController } from '../src/modules/customer/presentation/customer.controller';
import { REQUIRED_PERMISSIONS, STEP_UP_REQUIRED, IDEMPOTENCY_SCOPE } from '../src/platform/auth/auth.decorators';
import { StepUpGuard } from '../src/platform/auth/step-up.guard';
import { IdempotencyInterceptor } from '../src/platform/idempotency/idempotency.interceptor';

const CUSTOMER='11111111-1111-4111-8111-111111111111';
const APP='22222222-2222-4222-8222-222222222222';
const STAFF='33333333-3333-4333-8333-333333333333';
const PROVINCE='44444444-4444-4444-8444-444444444444';
const CITY='55555555-5555-4555-8555-555555555555';

function wholesaleApp(status:any='under_review',version=2){return{id:APP,customer_id:CUSTOMER,business_name:'Cafe EQ',manager_name:'Manager',business_type:'cafe',province_id:PROVINCE,city_id:CITY,business_identifier:null,note:null,status,submitted_at:new Date(),review_started_at:new Date(),reviewed_at:null,reviewer_staff_id:STAFF,decision_note:null,rejection_reason:null,created_at:new Date(),updated_at:new Date(),version};}

test('A7 approval changes the same authoritative state A8 commerce port reads',async()=>{
  const state:any={customer:{id:CUSTOMER,status:'active',customer_type:'retail',version:7},application:wholesaleApp()};
  const repo:any={
    customer:async()=>({...state.customer}), byId:async()=>({...state.application}),
    approve:async()=>{state.application={...state.application,status:'approved',version:3,reviewed_at:new Date()};return {...state.application};},
    promote:async()=>{state.customer={...state.customer,customer_type:'wholesale',version:8};return {...state.customer};},
  };
  const tx:any={run:async(fn:any)=>fn({})};
  const context:any={requestId:'r',traceId:'t',actor:{type:'staff',id:STAFF}};
  const ctx:any={get:()=>context,require:()=>context};
  const outbox:any={append:async()=>{}};const audit:any={writeWith:async()=>{}};
  const service=new CustomerWholesaleService(tx,repo,ctx,outbox,audit);
  await service.approve(APP,'ok');
  const commerce=new CustomerCommerceAdapter({profileById:async()=>({...state.customer})} as any);
  assert.equal(await commerce.getCustomerType(CUSTOMER),'wholesale');
});

test('admin decision methods carry decide RBAC + step-up + idempotency metadata',()=>{
  for(const name of ['approve','reject'] as const){
    const fn=CustomerWholesaleAdminController.prototype[name];
    assert.deepEqual(Reflect.getMetadata(REQUIRED_PERMISSIONS,fn),['customer.wholesale.decide']);
    assert.equal(Reflect.getMetadata(STEP_UP_REQUIRED,fn),true);
    assert.equal(Reflect.getMetadata(IDEMPOTENCY_SCOPE,fn),`customer.wholesale.${name}`);
  }
});

test('step-up guard fails closed when token is absent',()=>{
  const reflector:any={getAllAndOverride:()=>true};
  const tokens:any={verify:()=>null};
  const guard=new StepUpGuard(reflector,tokens);
  const ctx:any={getHandler:()=>()=>{},getClass:()=>class{},switchToHttp:()=>({getRequest:()=>({headers:{},actor:{accountId:'a',sessionId:'s'}})})};
  assert.throws(()=>guard.canActivate(ctx),/STEP_UP_REQUIRED/);
});

test('step-up guard accepts only token bound to current account and session',()=>{
  const reflector:any={getAllAndOverride:()=>true};
  const ctx:any={getHandler:()=>()=>{},getClass:()=>class{},switchToHttp:()=>({getRequest:()=>({headers:{'x-step-up-token':'ok'},actor:{accountId:'a',sessionId:'s'}})})};
  assert.equal(new StepUpGuard(reflector,{verify:()=>({sub:'a',sid:'s'})} as any).canActivate(ctx),true);
  assert.throws(()=>new StepUpGuard(reflector,{verify:()=>({sub:'other',sid:'s'})} as any).canActivate(ctx),/STEP_UP_REQUIRED/);
});

function idemContext(headers:any,response:any={statusCode:200}){return{getHandler:()=>()=>{},getClass:()=>class{},switchToHttp:()=>({getRequest:()=>({method:'POST',url:'/x',body:{a:1},actor:{accountId:'acct'},headers}),getResponse:()=>response})} as any;}

test('idempotency interceptor rejects missing key before business handler',()=>{
  const interceptor=new IdempotencyInterceptor({getAllAndOverride:()=> 'scope'} as any,{} as any);
  let ran=false;
  assert.throws(()=>interceptor.intercept(idemContext({}),{handle:()=>{ran=true;return of('x');}} as any),(e:any)=>e?.code==='IDEMPOTENCY_KEY_REQUIRED');
  assert.equal(ran,false);
});

test('idempotency replay returns stored response and does not rerun business handler',async()=>{
  const service:any={hashRequest:()=> 'hash',claim:async()=>({replay:true,responseCode:201,responseBody:{ok:true}})};
  const response:any={statusCode:200};let ran=false;
  const interceptor=new IdempotencyInterceptor({getAllAndOverride:()=> 'scope'} as any,service);
  const value=await firstValueFrom(interceptor.intercept(idemContext({'idempotency-key':'abcdefgh'},response),{handle:()=>{ran=true;return of({bad:true});}} as any));
  assert.deepEqual(value,{ok:true});assert.equal(response.statusCode,201);assert.equal(ran,false);
});

test('idempotency first execution completes exactly once',async()=>{
  let claims=0,completes=0,runs=0;
  const service:any={hashRequest:()=> 'hash',claim:async()=>{claims++;return{replay:false};},complete:async()=>{completes++;}};
  const interceptor=new IdempotencyInterceptor({getAllAndOverride:()=> 'scope'} as any,service);
  const value=await firstValueFrom(interceptor.intercept(idemContext({'idempotency-key':'abcdefgh'}),{handle:()=>{runs++;return of({ok:true});}} as any));
  assert.deepEqual(value,{ok:true});assert.equal(claims,1);assert.equal(runs,1);assert.equal(completes,1);
});

test('concurrent approve vs reject produces one winner through state/version CAS semantics',async()=>{
  const shared:any={status:'under_review',version:2,customer:{id:CUSTOMER,status:'active',customer_type:'retail',version:7}};
  const mk=(decision:'approve'|'reject')=>{
    const repo:any={
      byId:async()=>({...wholesaleApp(shared.status,shared.version)}),
      customer:async()=>({...shared.customer}),
      approve:async(_ex:any,_id:string,v:number)=>{await new Promise(r=>setTimeout(r,1));if(shared.status!=='under_review'||shared.version!==v)return null;shared.status='approved';shared.version++;return wholesaleApp('approved',shared.version);},
      reject:async(_ex:any,_id:string,v:number)=>{await new Promise(r=>setTimeout(r,1));if(shared.status!=='under_review'||shared.version!==v)return null;shared.status='rejected';shared.version++;return {...wholesaleApp('rejected',shared.version),rejection_reason:'reason'};},
      promote:async()=>{if(shared.customer.customer_type!=='retail')return null;shared.customer={...shared.customer,customer_type:'wholesale',version:8};return {...shared.customer};},
    };
    const tx:any={run:async(fn:any)=>fn({})};const context:any={requestId:'r',traceId:'t',actor:{type:'staff',id:STAFF}};
    const s=new CustomerWholesaleService(tx,repo,{get:()=>context,require:()=>context} as any,{append:async()=>{}} as any,{writeWith:async()=>{}} as any);
    return decision==='approve'?()=>s.approve(APP,'ok'):()=>s.reject(APP,'reason');
  };
  const results=await Promise.allSettled([mk('approve')(),mk('reject')()]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.filter(x=>x.status==='rejected').length,1);
  assert.ok(['approved','rejected'].includes(shared.status));
});
