import test from 'node:test';
import assert from 'node:assert/strict';
import { CustomerProfileService } from '../src/modules/customer/application/customer-profile.service';

function row(overrides:any={}){return{id:'11111111-1111-4111-8111-111111111111',account_id:'22222222-2222-4222-8222-222222222222',customer_type:'retail',first_name:'Ali',last_name:'Ahmadi',mobile_normalized:'09121234567',email_normalized:'old@example.com',status:'active',registered_at:new Date(),created_at:new Date(),updated_at:new Date(),version:3,...overrides};}
function harness(opts:{actor?:any;before?:any;updateResult?:any}={}){
  const calls:any={update:[],events:[],audits:[]};
  const before=opts.before??row();
  const repo:any={profileById:async()=>before,updateProfile:async(_ex:any,input:any)=>{calls.update.push(input);return opts.updateResult===undefined?row({...input,first_name:input.firstName,last_name:input.lastName,email_normalized:input.emailNormalized,version:4}):opts.updateResult;}};
  const ctxValue:any={requestId:'req',correlationId:'corr',traceId:'trace',actor:opts.actor??{type:'customer',id:before.id}};
  const ctx:any={get:()=>ctxValue,require:()=>ctxValue};
  const tx:any={run:async(fn:any)=>fn({})};
  const outbox:any={append:async(_ex:any,events:any[])=>calls.events.push(...events)};
  const audit:any={writeWith:async(_ex:any,e:any)=>calls.audits.push(e)};
  return{service:new CustomerProfileService(tx,repo,ctx,outbox,audit),calls};
}

test('profile read exposes only customer-safe allowlisted fields',async()=>{const {service}=harness();const p:any=await service.getProfile();assert.deepEqual(Object.keys(p).sort(),['created_at','customer_type','email','first_name','id','last_name','mobile','status'].sort());assert.equal((p as any).account_id,undefined);assert.equal((p as any).version,undefined);});

test('profile update normalizes fields, uses optimistic version, audit and outbox',async()=>{const {service,calls}=harness();const p:any=await service.updateProfile({first_name:'  Ali   Reza  ',email:' NEW@Example.COM '});assert.equal(calls.update.length,1);assert.equal(calls.update[0].expectedVersion,3);assert.equal(calls.update[0].firstName,'Ali Reza');assert.equal(calls.update[0].emailNormalized,'new@example.com');assert.equal(calls.events[0].eventType,'customer.profile.updated.v1');assert.deepEqual(calls.events[0].payload.changed_fields,['first_name','email']);assert.equal(calls.audits[0].action,'customer.profile.update');assert.equal(p.email,'new@example.com');});

test('profile no-op is idempotent and emits no audit/event',async()=>{const {service,calls}=harness();const p:any=await service.updateProfile({first_name:' Ali '});assert.equal(p.first_name,'Ali');assert.equal(calls.update.length,0);assert.equal(calls.events.length,0);assert.equal(calls.audits.length,0);});

test('profile rejects non-customer actor and forbidden system fields',async()=>{const h1=harness({actor:{type:'staff',id:'33333333-3333-4333-8333-333333333333'}});await assert.rejects(()=>h1.service.getProfile(),/CUSTOMER_REQUIRED|ورود مشتری/);const h2=harness();await assert.rejects(()=>h2.service.updateProfile({customer_type:'wholesale'} as any),/PROFILE_FIELD_FORBIDDEN|مجاز نیست/);});

test('profile update fails closed on optimistic concurrency conflict',async()=>{const {service,calls}=harness({updateResult:null});await assert.rejects(()=>service.updateProfile({last_name:'New'}),/VERSION_CONFLICT|همزمان/);assert.equal(calls.events.length,0);assert.equal(calls.audits.length,0);});

test('anonymized profile is not readable or mutable',async()=>{const {service}=harness({before:row({status:'anonymized'})});await assert.rejects(()=>service.getProfile(),/CUSTOMER_INACTIVE|فعال نیست/);await assert.rejects(()=>service.updateProfile({first_name:'X'}),/CUSTOMER_INACTIVE|فعال نیست/);});
