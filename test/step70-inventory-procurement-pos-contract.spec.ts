import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read=(p:string)=>fs.readFileSync(p,'utf8');
const openapi=read('contracts/http/openapi.yaml');
const generated=read('src/generated/openapi.ts');
const controller=read('src/modules/pos/presentation/pos-admin.controller.ts');
const ops=read('src/modules/pos/application/pos-operations.service.ts');
const offline=read('src/modules/pos/application/offline-command-sync.service.ts');
const reconciliation=read('src/modules/pos/application/pos-admin-reconciliation.service.ts');
const task=JSON.parse(read('docs/14-multi-agent/tasks/EQCOFE-STEP70-B-INVENTORY-PROCUREMENT-POS-CONTRACT-001.json'));

const live=[
  'GET /admin/pos/scan',
  'POST /admin/pos/sales',
  'POST /admin/pos/sales/{id}/lines',
  'POST /admin/pos/sales/{id}/price',
  'POST /admin/pos/sales/{id}/commit',
  'POST /admin/pos/offline/commands',
  'POST /admin/pos/offline/commands/{clientCommandId}/sync',
  'GET /admin/pos/reconciliation/failed',
  'GET /admin/pos/reconciliation/{clientCommandId}',
  'POST /admin/pos/reconciliation/{clientCommandId}/retry',
  'POST /admin/pos/reconciliation/{clientCommandId}/abandon',
];
const removed=[
  'GET /admin/pos/stores','GET /admin/pos/registers','GET /admin/pos/shifts/current','POST /admin/pos/shifts/open',
  'POST /admin/pos/shifts/{id}/begin-closing','POST /admin/pos/shifts/{id}/close','POST /admin/pos/shifts/{id}/reconcile','POST /admin/pos/orders',
];

function escapeRegExp(value:string){return value.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');}
function hasPath(spec:string,operation:string){
  const [method,...rest]=operation.split(' ');
  const path=rest.join(' ');
  const re=new RegExp('\\n  '+escapeRegExp(path)+':([\\s\\S]*?)(?=\\n  /|\\ncomponents:)');
  const block=spec.match(re)?.[1]??'';
  return new RegExp('\\n    '+method.toLowerCase()+':').test(block);
}

test('Step70-B governance remains HIGH and exact 70-A based',()=>{
  assert.equal(task.risk,'HIGH');
  assert.equal(task.risk_floor,'HIGH');
  assert.equal(task.human_gate_required,true);
  assert.equal(task.canonical.base_sha,'017475977c0377d42a668c84647eff1b3c9097b9');
  assert.deepEqual(task.evidence.pos_canonical_target_operations,live);
  assert.deepEqual(task.evidence.pos_remove_from_canonical_openapi,removed);
});

test('canonical OpenAPI POS authority is exactly the live controller set',()=>{
  for(const operation of live)assert.equal(hasPath(openapi,operation),true,'missing canonical '+operation);
  for(const operation of removed)assert.equal(hasPath(openapi,operation),false,'source-unproven route remains '+operation);
  for(const path of ['/admin/pos/scan','/admin/pos/sales','/admin/pos/offline/commands','/admin/pos/reconciliation/failed'])assert.ok(generated.includes('"'+path+'"'),'generated path missing '+path);
  for(const path of ['/admin/pos/stores','/admin/pos/registers','/admin/pos/shifts/current','/admin/pos/orders'])assert.ok(!generated.includes('"'+path+'"'),'generated stale path '+path);
});

test('controller security metadata is preserved in canonical contract',()=>{
  for(const permission of ["@Permissions('pos.view')","@Permissions('pos.sell')","@Permissions('pos.reconcile')"])assert.ok(controller.includes(permission));
  for(const scope of ['pos.sale.create','pos.sale.line.add','pos.sale.price','pos.sale.commit','pos.offline.capture','pos.offline.sync','pos.reconciliation.admin.retry','pos.reconciliation.admin.abandon']){
    assert.ok(controller.includes("@RequireIdempotency('"+scope+"')"));
    assert.ok(openapi.includes('idempotencyScope: '+scope));
  }
  assert.equal((controller.match(/@RequireStepUp\(\)/g)??[]).length,2);
  assert.ok((openapi.match(/stepUpToken: \[\]/g)??[]).length>=2);
  assert.ok(openapi.includes('permission: pos.view'));
  assert.ok(openapi.includes('permission: pos.sell'));
  assert.ok(openapi.includes('permission: pos.reconcile'));
});

test('runtime-accurate POS status and validation bounds are frozen',()=>{
  assert.match(openapi,/\/admin\/pos\/sales:[\s\S]*?responses:[\s\S]*?'201':/);
  assert.match(openapi,/\/admin\/pos\/sales\/\{id\}\/lines:[\s\S]*?responses:[\s\S]*?'201':/);
  assert.match(openapi,/\/admin\/pos\/sales\/\{id\}\/price:[\s\S]*?responses:[\s\S]*?'200':/);
  assert.match(openapi,/\/admin\/pos\/sales\/\{id\}\/commit:[\s\S]*?responses:[\s\S]*?'200':/);
  assert.match(openapi,/\/admin\/pos\/offline\/commands:[\s\S]*?responses:[\s\S]*?'201':/);
  assert.match(openapi,/\/admin\/pos\/offline\/commands\/\{clientCommandId\}\/sync:[\s\S]*?responses:[\s\S]*?'200':/);
  assert.ok(openapi.includes('maxLength: 120'));
  assert.ok(openapi.includes('maxItems: 100'));
  assert.ok(openapi.includes('maximum: 999'));
  assert.ok(offline.includes('external_reference.length>120'));
  assert.ok(offline.includes('x.lines.length>100'));
  assert.ok(reconciliation.includes('limit>100'));
  assert.ok(reconciliation.includes("recovery_count??0)>=5"));
  assert.ok(reconciliation.includes('v.length<1||v.length>500'));
});

test('generated POS contract has typed requests and success envelopes',()=>{
  for(const schema of ['AdminPosScanData: {','AdminPosAddLineRequest: {','AdminPosCommitRequest: {','AdminPosOfflineSaleSyncRequest: {','AdminPosSaleData: {','AdminPosPricingData: {','AdminPosOfflineCommandData: {','AdminPosReconciliationDetailData: {','AdminPosRecoveryData: {','AdminPosScanResponse: {','AdminPosSaleResponse: {','AdminPosPricingResponse: {'])assert.ok(generated.includes(schema),'generated schema missing '+schema);
  for(const operation of ['getAdminPosScan: {','postAdminPosSales: {','postAdminPosSalesIdLines: {','postAdminPosSalesIdPrice: {','postAdminPosSalesIdCommit: {','postAdminPosOfflineCommands: {','postAdminPosOfflineCommandsClientCommandIdSync: {','getAdminPosReconciliationFailed: {','getAdminPosReconciliationClientCommandId: {','postAdminPosReconciliationClientCommandIdRetry: {','postAdminPosReconciliationClientCommandIdAbandon: {'])assert.ok(generated.includes(operation),'generated operation missing '+operation);
});

test('negative authority remains explicit',()=>{
  assert.ok(!controller.includes("@Get('stores')"));
  assert.ok(!controller.includes("@Get('registers')"));
  assert.ok(!controller.includes("@Get('shifts/current')"));
  assert.ok(!controller.includes("@Post('orders')"));
  assert.ok(ops.includes('resolveScan'));
  assert.ok(ops.includes('createSale'));
  assert.ok(ops.includes('captureOffline'));
  assert.ok(reconciliation.includes('listFailed'));
  assert.ok(reconciliation.includes('requires_owner_sync:true'));
});
