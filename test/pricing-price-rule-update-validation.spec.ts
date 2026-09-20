import test from 'node:test';
import assert from 'node:assert/strict';
import { PriceRuleService } from '../src/modules/pricing/application/price-rule.service';

const RULE_ID='11111111-1111-4111-8111-111111111111';
const ACTOR_ID='22222222-2222-4222-8222-222222222222';

function harness(ruleOverrides:any={}){
  const calls={updates:[] as any[],audits:0};
  const rule={
    id:RULE_ID,
    name_fa:'تخفیف عمده',
    rule_type:'quantity_discount',
    priority:100,
    value_type:'percentage',
    value_numeric:10,
    min_quantity:11,
    max_quantity:null,
    customer_type:null,
    stacking_policy:'best_only',
    is_global:true,
    version:7,
    ...ruleOverrides,
  };
  const tx:any={run:async(fn:any)=>fn({kind:'trx'})};
  const repo:any={
    ruleById:async()=>rule,
    updateRule:async(...args:any[])=>{calls.updates.push(args);},
  };
  const audit:any={writeWith:async()=>{calls.audits+=1;}};
  const ctx:any={require:()=>({actor:{type:'admin',id:ACTOR_ID},requestId:'req-high-pilot'})};
  const service=new PriceRuleService(tx,repo,{} as any,audit,ctx,{} as any);
  return {service,calls};
}

test('update rejects percentage above 100 before persistence and audit',async()=>{
  const h=harness();
  await assert.rejects(()=>h.service.update(RULE_ID,{value_numeric:101},7),/درصد تخفیف بیش از ۱۰۰ مجاز نیست/);
  assert.equal(h.calls.updates.length,0);
  assert.equal(h.calls.audits,0);
});

test('update rejects negative rule value before persistence and audit',async()=>{
  const h=harness();
  await assert.rejects(()=>h.service.update(RULE_ID,{value_numeric:-1},7),/مقدار قانون قیمت معتبر نیست/);
  assert.equal(h.calls.updates.length,0);
  assert.equal(h.calls.audits,0);
});

test('update rejects malformed non-numeric rule value before persistence and audit',async()=>{
  const h=harness();
  await assert.rejects(()=>h.service.update(RULE_ID,{value_numeric:'not-a-number'},7),/مقدار قانون قیمت معتبر نیست/);
  assert.equal(h.calls.updates.length,0);
  assert.equal(h.calls.audits,0);
});

test('update rejects non-finite rule value before persistence and audit',async()=>{
  const h=harness();
  await assert.rejects(()=>h.service.update(RULE_ID,{value_numeric:Number.POSITIVE_INFINITY},7),/مقدار قانون قیمت معتبر نیست/);
  assert.equal(h.calls.updates.length,0);
  assert.equal(h.calls.audits,0);
});

test('update cannot clear minimum quantity from quantity discount',async()=>{
  const h=harness();
  await assert.rejects(()=>h.service.update(RULE_ID,{min_quantity:null},7),/قانون تخفیف تعدادی باید حداقل تعداد داشته باشد/);
  assert.equal(h.calls.updates.length,0);
  assert.equal(h.calls.audits,0);
});

test('update rejects max quantity below effective minimum quantity',async()=>{
  const h=harness();
  await assert.rejects(()=>h.service.update(RULE_ID,{max_quantity:10},7),/حداکثر تعداد کمتر از حداقل است/);
  assert.equal(h.calls.updates.length,0);
  assert.equal(h.calls.audits,0);
});

test('valid partial update reaches repository and audit exactly once',async()=>{
  const h=harness();
  await h.service.update(RULE_ID,{value_numeric:15,min_quantity:12,max_quantity:50},7);
  assert.equal(h.calls.updates.length,1);
  assert.equal(h.calls.audits,1);
  const [,id,input,expected]=h.calls.updates[0];
  assert.equal(id,RULE_ID);
  assert.equal(input.valueNumeric,15);
  assert.equal(input.minQuantity,12);
  assert.equal(input.maxQuantity,50);
  assert.equal(expected,7);
});
