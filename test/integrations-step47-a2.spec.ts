import test from 'node:test';
import assert from 'node:assert/strict';
import { createProviderFailure, mayRetryProviderFailure, providerFailureFromHttpStatus } from '../src/modules/integrations/domain/provider-failure';
import { createProviderRequestContext } from '../src/modules/integrations/domain/provider-request';

test('A2 request context requires finite positive timeout',()=>{
  assert.throws(()=>createProviderRequestContext({requestId:'r1',operation:'read',timeoutMs:0}),/PROVIDER_TIMEOUT_INVALID/);
  assert.throws(()=>createProviderRequestContext({requestId:'r1',operation:'read',timeoutMs:120001}),/PROVIDER_TIMEOUT_INVALID/);
  assert.equal(createProviderRequestContext({requestId:'r1',operation:'read',timeoutMs:5000}).timeoutMs,5000);
});

test('A2 write retry is denied without idempotency key',()=>{
  const failure=createProviderFailure({kind:'network',code:'NET',message:'network'});
  assert.equal(mayRetryProviderFailure(failure,{operation:'write',hasIdempotencyKey:false}),false);
  assert.equal(mayRetryProviderFailure(failure,{operation:'write',hasIdempotencyKey:true}),true);
});

test('A2 authentication and authorization failures never retry',()=>{
  for(const kind of ['authentication','authorization'] as const){
    const failure=createProviderFailure({kind,code:'AUTH',message:'auth'});
    assert.equal(failure.retry,'never');
    assert.equal(mayRetryProviderFailure(failure,{operation:'read'}),false);
  }
});

test('A2 rate limiting is retryable and can carry retry-after',()=>{
  const failure=providerFailureFromHttpStatus(429,{retryAfterMs:1500});
  assert.equal(failure.kind,'rate_limited');
  assert.equal(failure.retry,'safe');
  assert.equal(failure.retryAfterMs,1500);
});

test('A2 server errors are conditional rather than fabricated success',()=>{
  const failure=providerFailureFromHttpStatus(503);
  assert.equal(failure.kind,'upstream_error');
  assert.equal(failure.retry,'conditional');
  assert.equal(failure.providerStatus,503);
});

test('A2 4xx invalid request failures do not retry',()=>{
  const failure=providerFailureFromHttpStatus(422);
  assert.equal(failure.kind,'invalid_request');
  assert.equal(failure.retry,'never');
});

test('A2 malformed failure metadata is rejected',()=>{
  assert.throws(()=>createProviderFailure({kind:'network',code:'',message:'x'}),/PROVIDER_FAILURE_CODE_REQUIRED/);
  assert.throws(()=>createProviderFailure({kind:'network',code:'X',message:'',retryAfterMs:-1}),/PROVIDER_FAILURE_MESSAGE_REQUIRED|PROVIDER_RETRY_AFTER_INVALID/);
  assert.throws(()=>createProviderFailure({kind:'network',code:'X',message:'x',providerStatus:99}),/PROVIDER_STATUS_INVALID/);
});

test('A2 unknown failures are fail-closed and non-retryable by default',()=>{
  const failure=createProviderFailure({kind:'unknown',code:'UNKNOWN',message:'unknown'});
  assert.equal(failure.retry,'never');
  assert.equal(mayRetryProviderFailure(failure,{operation:'read'}),false);
});
