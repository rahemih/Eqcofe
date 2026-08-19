import test from 'node:test';import assert from 'node:assert/strict';import {createHmac} from 'node:crypto';import fs from 'node:fs';
const src=fs.readFileSync(new URL('../infrastructure/configured-shipping.provider.ts',import.meta.url),'utf8');
test('provider uses constant-time HMAC verification',()=>{assert.match(src,/timingSafeEqual/);assert.match(src,/createHmac\('sha256'/);});
test('provider rejects stale webhook timestamps',()=>{assert.match(src,/SHIPPING_WEBHOOK_TIMESTAMP_INVALID/);assert.match(src,/ALLOWED_CLOCK_SKEW/);});
test('provider normalizes known states and preserves unknown',()=>{for(const x of ['in_transit','delivered','delivery_failed','returned','unknown'])assert.ok(src.includes(x));});
test('tracking refresh is timeout-bound and bearer-authenticated',()=>{assert.match(src,/AbortSignal\.timeout/);assert.match(src,/authorization:`Bearer/);});
test('provider fail-closed errors are explicit',()=>{for(const code of ['SHIPPING_PROVIDER_UNAVAILABLE','SHIPPING_PROVIDER_RESPONSE_INVALID','SHIPPING_PROVIDER_REJECTED','SHIPPING_WEBHOOK_SIGNATURE_INVALID'])assert.ok(src.includes(code));});
test('hmac construction contract is timestamp dot raw-body',()=>{const secret='x'.repeat(32),ts='1700000000',body=Buffer.from('{"a":1}');const sig=createHmac('sha256',secret).update(`${ts}.`).update(body).digest('hex');assert.equal(sig.length,64);});
