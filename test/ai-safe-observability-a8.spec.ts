import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AiObservabilityService } from '../src/modules/ai/application/ai-observability.service';

const migration=readFileSync('database/migrations/0048_ai_safe_observability.sql','utf8');
const repository=readFileSync('src/modules/ai/infrastructure/ai-observability.repository.ts','utf8');
const productQa=readFileSync('src/modules/ai/application/product-qa.service.ts','utf8');
const draft=readFileSync('src/modules/ai/application/draft-content-generation.service.ts','utf8');

function service(){
  let captured:any=null;
  const repo={append:async(input:any)=>{captured=input;},summary:async(operation:string,hours:number)=>({operation,hours,total:1})};
  return {svc:new AiObservabilityService(repo as any),captured:()=>captured};
}

test('A8 records only bounded safe invocation metadata',async()=>{
  const x=service();
  await x.svc.record({requestId:'123e4567-e89b-42d3-a456-426614174000',operation:'product_qa',promptKey:'product-qa',promptVersion:3,outcome:'succeeded',model:'model-x',inputTokens:10,outputTokens:20,latencyMs:25});
  assert.equal(x.captured().operation,'product_qa');
  assert.equal(x.captured().promptKey,'product-qa');
  assert.equal(x.captured().inputTokens,10);
  assert.equal(x.captured().outputTokens,20);
  assert.equal('prompt' in x.captured(),false);
  assert.equal('response' in x.captured(),false);
  assert.equal('secret' in x.captured(),false);
});

test('A8 rejects secret-like observability metadata',async()=>{
  const x=service();
  await assert.rejects(()=>x.svc.record({requestId:'123e4567-e89b-42d3-a456-426614174000',operation:'product_qa',promptKey:'product-qa',promptVersion:1,outcome:'provider_failed',providerFailureKind:'Bearer SECRET_TOKEN',latencyMs:1}));
});

test('A8 migration is append-only and stores no raw prompt response or secret fields',()=>{
  assert.match(migration,/CREATE TABLE ai\.invocation_observations/);
  assert.match(migration,/BEFORE UPDATE OR DELETE/);
  assert.match(migration,/append-only/);
  assert.doesNotMatch(migration,/prompt_text|prompt_body|request_body|response_body|raw_response|secret_value|api_key/i);
});

test('A8 repository exposes bounded operational summary without raw payload reads',()=>{
  assert.match(repository,/hours >= 1 && hours <= 168/);
  assert.match(repository,/avg\(latency_ms\)/);
  assert.match(repository,/sum\(input_tokens\)/);
  assert.doesNotMatch(repository,/SELECT \*/);
});

test('A8 observes both Product Q&A and Draft Content outcomes',()=>{
  for(const source of [productQa,draft]){
    assert.match(source,/AiObservabilityService/);
    assert.match(source,/provider_failed/);
    assert.match(source,/application_failed/);
    assert.match(source,/succeeded/);
  }
});

test('A8 observability cannot expose public HTTP or commerce mutation authority',()=>{
  const source=[repository,readFileSync('src/modules/ai/application/ai-observability.service.ts','utf8')].join('\n');
  assert.doesNotMatch(source,/Controller\(|@Post\(|@Patch\(|@Delete\(/);
  assert.doesNotMatch(source,/pricing\.|inventory\.|orders\.|payments\.|finance\.|refund/i);
});
