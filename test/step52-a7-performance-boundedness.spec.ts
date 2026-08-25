import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateEnvironment } from '../src/platform/config/env.validation';
import { BulkPricingService } from '../src/modules/pricing/application/bulk-pricing.service';

const baseEnv={DATABASE_URL:'postgres://example.invalid/eqcofe'};

test('Step 52 A7 rejects operational batch retry and timeout values outside hard bounds',()=>{
  assert.throws(()=>validateEnvironment({...baseEnv,OUTBOX_BATCH_SIZE:'501'}),/OUTBOX_BATCH_SIZE must be between 1 and 500/);
  assert.throws(()=>validateEnvironment({...baseEnv,OUTBOX_MAX_ATTEMPTS:'101'}),/OUTBOX_MAX_ATTEMPTS must be between 1 and 100/);
  assert.throws(()=>validateEnvironment({...baseEnv,OUTBOX_PROCESSING_TIMEOUT_MS:'3600001'}),/OUTBOX_PROCESSING_TIMEOUT_MS must be between 1000 and 3600000/);
  assert.throws(()=>validateEnvironment({...baseEnv,ZARINPAL_TIMEOUT_MS:'120001'}),/ZARINPAL_TIMEOUT_MS must be between 100 and 120000/);
  assert.equal(validateEnvironment({...baseEnv,OUTBOX_BATCH_SIZE:'500'}).OUTBOX_BATCH_SIZE,500);
});

test('Step 52 A7 fails closed before processing an oversized bulk-pricing scope',async()=>{
  let currentPriceReads=0;
  const variants=Array.from({length:5_001},(_,i)=>({variant_id:`variant-${i}`}));
  const repo={variantsForScope:async(_scope:string,_ids:string[],_inactive:boolean,limit:number)=>{assert.equal(limit,5_001);return variants;},currentBasePrice:async()=>{currentPriceReads+=1;return null;}};
  const service=new BulkPricingService({} as any,repo as any,{} as any,{} as any,{} as any,{} as any);
  await assert.rejects(()=>service.preview({scope_type:'all',change_type:'percentage',value:1}), (error:any)=>error?.code==='PRICING_BULK_SCOPE_TOO_LARGE');
  assert.equal(currentPriceReads,0);
});

test('Step 52 A7 keeps database-side ceilings on bulk pricing inventory and outbox claims',()=>{
  const pricing=readFileSync('src/modules/pricing/infrastructure/pricing.repository.ts','utf8');
  const inventory=readFileSync('src/modules/inventory/infrastructure/inventory.repository.ts','utf8');
  const outbox=readFileSync('src/platform/outbox/outbox-repository.ts','utf8');
  assert.match(pricing,/ORDER BY v\.id LIMIT \$\{limit\}/);
  assert.match(inventory,/ORDER BY w\.code,sb\.variant_id LIMIT \$\{limit\}/);
  assert.match(outbox,/limit > 500/);
});
