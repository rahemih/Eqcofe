import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';

test('Step 49 A9 adds only valid additive POS RBAC permissions',()=>{
  const sql=readFileSync('database/migrations/0054_pos_rbac_audit_api.sql','utf8');
  assert.match(sql,/\('pos\.view','pos'.*'normal'\)/s);
  assert.match(sql,/\('pos\.sell','pos'.*'sensitive'\)/s);
  assert.match(sql,/\('pos\.reconcile','pos'.*'sensitive'\)/s);
  assert.doesNotMatch(sql,/'high'/);
  assert.match(sql,/ON CONFLICT \(key\) DO NOTHING/);
});

test('Step 49 A9 controller is staff-only and all POS routes are permission guarded',()=>{
  const src=readFileSync('src/modules/pos/presentation/pos-admin.controller.ts','utf8');
  assert.match(src,/@Controller\('admin\/pos'\)/);
  assert.match(src,/@StaffOnly\(\)/);
  assert.match(src,/@Permissions\('pos\.view'\)[\s\S]*@Get\('scan'\)/);
  assert.match(src,/@Permissions\('pos\.sell'\)[\s\S]*@Post\('sales'\)/);
  assert.match(src,/@Permissions\('pos\.reconcile'\)[\s\S]*@Get\('reconciliation\/failed'\)/);
  assert.match(src,/@Permissions\('pos\.reconcile'\)[\s\S]*@Post\('reconciliation\/:clientCommandId\/retry'\)/);
});

test('Step 49 A9 sensitive reconciliation requires step-up plus idempotency',()=>{
  const src=readFileSync('src/modules/pos/presentation/pos-admin.controller.ts','utf8');
  for(const scope of ['pos.reconciliation.admin.retry','pos.reconciliation.admin.abandon']){
    const escaped=scope.replaceAll('.','\\.');
    assert.match(src,new RegExp(`@RequireStepUp\\(\\)[\\s\\S]*@RequireIdempotency\\('${escaped}'\\)`));
  }
  assert.match(src,/@RequireIdempotency\('pos\.sale\.commit'\)/);
  assert.match(src,/@RequireIdempotency\('pos\.offline\.sync'\)/);
});

test('Step 49 A9 cross-staff admin recovery preserves original command owner and central audit',()=>{
  const svc=readFileSync('src/modules/pos/application/pos-admin-reconciliation.service.ts','utf8');
  const repo=readFileSync('src/modules/pos/infrastructure/offline-command.repository.ts','utf8');
  assert.match(svc,/adminReopenFailedForRetry/);
  assert.match(svc,/requires_owner_sync:true/);
  assert.match(svc,/pos\.reconciliation\.admin_retry/);
  assert.match(svc,/pos\.reconciliation\.admin_abandon/);
  assert.match(svc,/audit\.writeWith\(ex/);
  assert.doesNotMatch(repo,/SET staff_actor_id=/);
  assert.doesNotMatch(repo,/UPDATE pos\.offline_command_line_effects/);
  assert.doesNotMatch(repo,/UPDATE[\s\S]*payload=/);
});

test('Step 49 A9 operational mutations write only safe central audit metadata',()=>{
  const src=readFileSync('src/modules/pos/application/pos-operations.service.ts','utf8');
  assert.match(src,/audit\.write\(/);
  assert.match(src,/pos\.sale\.create/);
  assert.match(src,/pos\.sale\.commit/);
  assert.match(src,/pos\.offline\.capture/);
  assert.match(src,/pos\.offline\.sync/);
  assert.doesNotMatch(src,/afterData:body|afterData:input\.payload/);
});

test('Step 49 A9 HTTP contract is strict and refuses client price stock and paid-state authority',()=>{
  const doc:any=YAML.parse(readFileSync('contracts/http/step49-pos-a9.yaml','utf8'));
  assert.equal(doc.openapi,'3.1.0');
  assert.equal(doc.paths['/admin/pos/sales/{id}/commit'].post['x-permission'],'pos.sell');
  assert.equal(doc.paths['/admin/pos/reconciliation/{clientCommandId}/retry'].post['x-step-up-required'],true);
  assert.equal(doc.paths['/admin/pos/reconciliation/{clientCommandId}/retry'].post['x-permission'],'pos.reconcile');
  const payload=doc.components.schemas.OfflineSaleSyncPayload;
  assert.equal(payload.additionalProperties,false);
  for(const forbidden of ['price','unit_price_toman','stock','cogs','paid','payment_status','total_toman'])assert.equal(payload.properties[forbidden],undefined);
});

test('Step 49 A9 module exposes API without creating parallel commerce authority',()=>{
  const mod=readFileSync('src/modules/pos/pos.module.ts','utf8');
  const controller=readFileSync('src/modules/pos/presentation/pos-admin.controller.ts','utf8');
  assert.match(mod,/controllers: \[PosAdminController\]/);
  assert.doesNotMatch(controller,/payments\.payments|inventory\.inventory_balances|pricing\.base_prices|finance\./);
});
