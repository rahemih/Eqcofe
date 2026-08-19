import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateProviderConfiguration,assertNonSecretConfig } from '../src/modules/integrations/domain/provider-configuration';
import { EnvironmentSecretResolver } from '../src/modules/integrations/infrastructure/environment-secret.resolver';

test('A3 provider configuration rejects secret-like keys',()=>{
  assert.throws(()=>assertNonSecretConfig({nested:{apiKey:'x'}}),/محرمانه/);
});

test('A3 provider configuration accepts only bounded timeout retry and HTTPS',()=>{
  const v=validateProviderConfiguration({key:'fx-main',kind:'fx',enabled:true,baseUrl:'https://example.com/',timeoutMs:5000,retryMaxAttempts:2,secretRef:'EQCOFE_FX_MAIN_SECRET',config:{region:'ir'}});
  assert.equal(v.baseUrl,'https://example.com');
  assert.throws(()=>validateProviderConfiguration({...v,timeoutMs:0}),/Timeout/);
  assert.throws(()=>validateProviderConfiguration({...v,retryMaxAttempts:9}),/Retry/);
  assert.throws(()=>validateProviderConfiguration({...v,baseUrl:'http://example.com'}),/HTTPS/);
});

test('A3 secret resolver fails closed and uses platform config boundary',()=>{
  const missing=new EnvironmentSecretResolver({get:()=>undefined} as any);
  assert.throws(()=>missing.resolve('EQCOFE_TEST_MISSING_SECRET'),/در دسترس نیست/);
  const available=new EnvironmentSecretResolver({get:(key:string)=>key==='EQCOFE_TEST_SECRET'?'runtime-secret':undefined} as any);
  assert.equal(available.resolve('EQCOFE_TEST_SECRET'),'runtime-secret');
  const src=fs.readFileSync('src/modules/integrations/infrastructure/environment-secret.resolver.ts','utf8');
  assert.doesNotMatch(src,/process\.env/);
  assert.match(src,/ConfigService/);
});

test('A3 migration stores only secret references and rejects sensitive config',()=>{
  const sql=fs.readFileSync('database/migrations/0042_integration_configuration_rbac.sql','utf8');
  assert.match(sql,/secret_ref varchar\(128\)/);
  assert.match(sql,/reject_sensitive_provider_config/);
  assert.doesNotMatch(sql,/secret_value|credential_value|access_token\s+text/i);
});

test('A3 RBAC is additive and risk-classified',()=>{
  const sql=fs.readFileSync('database/migrations/0042_integration_configuration_rbac.sql','utf8');
  assert.match(sql,/integrations\.view/);
  assert.match(sql,/integrations\.manage/);
  assert.match(sql,/integrations\.secret_ref\.manage/);
  assert.match(sql,/critical/);
  assert.match(sql,/ON CONFLICT \(key\) DO NOTHING/);
});

test('A3 integration module exports only configuration service surface',()=>{
  const src=fs.readFileSync('src/modules/integrations/integrations.module.ts','utf8');
  assert.match(src,/ProviderConfigurationService/);
  assert.match(src,/EnvironmentSecretResolver/);
});
