import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import YAML from 'yaml';

const controller=fs.readFileSync('src/modules/pos/presentation/pos-admin.controller.ts','utf8');
const commit=fs.readFileSync('src/modules/pos/application/physical-sale-commit.service.ts','utf8');
const saleRepo=fs.readFileSync('src/modules/pos/infrastructure/physical-sale.repository.ts','utf8');
const offline=fs.readFileSync('src/modules/pos/application/offline-command-sync.service.ts','utf8');
const adminRecon=fs.readFileSync('src/modules/pos/application/pos-admin-reconciliation.service.ts','utf8');
const offlineRepo=fs.readFileSync('src/modules/pos/infrastructure/offline-command.repository.ts','utf8');
const inventoryPos=fs.readFileSync('src/modules/inventory/application/inventory-pos.service.ts','utf8');
const a52=fs.readFileSync('database/migrations/0052_pos_offline_command_sync.sql','utf8');
const a53=fs.readFileSync('database/migrations/0053_pos_offline_reconciliation.sql','utf8');
const a54=fs.readFileSync('database/migrations/0054_pos_rbac_audit_api.sql','utf8');
const contract:any=YAML.parse(fs.readFileSync('contracts/http/step49-pos-a9.yaml','utf8'));

test('Step 49 A10 enforces staff RBAC separation for sell view and reconciliation surfaces',()=>{
  assert.match(controller,/@Controller\('admin\/pos'\)[\s\S]*@StaffOnly\(\)/);
  assert.match(controller,/@Permissions\('pos\.view'\)[\s\S]*@Get\('scan'\)/);
  assert.match(controller,/@Permissions\('pos\.sell'\)[\s\S]*@Post\('sales'\)/);
  assert.match(controller,/@Permissions\('pos\.reconcile'\)[\s\S]*@Get\('reconciliation\/failed'\)/);
  assert.match(controller,/@Permissions\('pos\.reconcile'\)[\s\S]*@Get\('reconciliation\/:clientCommandId'\)/);
  assert.doesNotMatch(controller,/@Permissions\('pos\.view'\)[\s\S]{0,120}@Get\('reconciliation/);
});

test('Step 49 A10 requires idempotency on every POS HTTP mutation and step-up on destructive reconciliation decisions',()=>{
  for(const scope of ['pos.sale.create','pos.sale.line.add','pos.sale.price','pos.sale.commit','pos.offline.capture','pos.offline.sync','pos.reconciliation.admin.retry','pos.reconciliation.admin.abandon']){
    assert.match(controller,new RegExp(`@RequireIdempotency\\('${scope.replaceAll('.','\\.')}'\\)`),scope);
  }
  for(const action of ['retry','abandon']){
    assert.match(controller,new RegExp(`@RequireStepUp\\(\\)[\\s\\S]{0,180}@RequireIdempotency\\('pos\\.reconciliation\\.admin\\.${action}'\\)`));
  }
});

test('Step 49 A10 serializes physical sale commit and rejects stale optimistic versions before authoritative mutations',()=>{
  assert.match(commit,/repo\.byId\(saleId,ex,true\)/);
  assert.match(commit,/Number\(sale\.version\)!==expectedVersion/);
  assert.match(commit,/POS_SALE_VERSION_CONFLICT/);
  assert.match(saleRepo,/SELECT \* FROM pos\.physical_sales WHERE id=.*FOR UPDATE/s);
  assert.match(saleRepo,/WHERE id=.*status='draft'.*version=/s);
});

test('Step 49 A10 keeps payment inventory and finance authority outside POS persistence',()=>{
  assert.match(commit,/payments\.confirmInTransaction/);
  assert.match(commit,/inventory\.consumePhysicalSaleInTransaction/);
  assert.doesNotMatch(saleRepo,/UPDATE\s+(payments|inventory|finance|pricing|catalog)\./i);
  assert.doesNotMatch(commit,/UPDATE\s+(payments|inventory|finance|pricing|catalog)\./i);
});

test('Step 49 A10 physical inventory consumption locks balance and excludes encumbered or non-sellable stock',()=>{
  assert.match(inventoryPos,/repo\.lockBalance\(ex, warehouseId, variantId\)/);
  for(const bucket of ['reserved','allocated','damaged','quarantine'])assert.match(inventoryPos,new RegExp(`${bucket}: Number\\(balance\\.${bucket}\\)`));
  assert.match(inventoryPos,/repo\.fifoLayers\(ex, warehouseId, variantId, 'sellable'\)/);
  assert.match(inventoryPos,/POS_INSUFFICIENT_PHYSICAL_STOCK/);
  assert.match(inventoryPos,/POS_INVENTORY_COST_LINEAGE_INSUFFICIENT/);
});

test('Step 49 A10 offline command identity is payload-bound and replay-safe under concurrency',()=>{
  assert.match(offline,/createHash\('sha256'\).*JSON\.stringify\(payload\)/s);
  assert.match(a52,/client_command_id uuid NOT NULL UNIQUE/);
  assert.match(offlineRepo,/ON CONFLICT \(client_command_id\) DO NOTHING/);
  assert.match(offlineRepo,/FOR UPDATE/);
  assert.match(offlineRepo,/pg_advisory_xact_lock\(hashtextextended/);
  assert.match(a52,/PRIMARY KEY \(command_id,line_index\)/);
  assert.match(a52,/UNIQUE \(command_id,variant_id\)/);
});

test('Step 49 A10 rejects client authority for price stock COGS paid state and totals during offline sync',()=>{
  assert.match(offline,/allowed=new Set\(\['warehouse_id','customer_type','payment_method','external_reference','lines'\]\)/);
  assert.match(offline,/Object\.keys\(x\)\.some\(k=>!allowed\.has\(k\)\)/);
  const payload=contract.components.schemas.OfflineSaleSyncPayload;
  assert.equal(payload.additionalProperties,false);
  for(const forbidden of ['price','unit_price_toman','stock','cogs','paid','payment_status','total_toman'])assert.equal(payload.properties[forbidden],undefined,forbidden);
});

test('Step 49 A10 reconciliation is explicit bounded terminal and append-only',()=>{
  assert.match(adminRecon,/recovery_count\?\?0\)>=5/);
  assert.match(adminRecon,/POS_RECONCILIATION_RETRY_LIMIT/);
  assert.match(adminRecon,/String\(current\.status\)==='abandoned'/);
  assert.match(a53,/recovery_count BETWEEN 0 AND 5/);
  assert.match(a53,/status IN \('queued','applied','failed','abandoned'\)/);
  assert.match(a53,/BEFORE UPDATE OR DELETE ON pos\.offline_command_reconciliation_history/);
  assert.match(a53,/offline command reconciliation history is immutable/);
});

test('Step 49 A10 cross-staff admin recovery never rewrites original owner payload or historical line effects',()=>{
  assert.match(adminRecon,/requires_owner_sync:true/);
  assert.match(adminRecon,/owner_staff_actor_id:saved\.staff_actor_id/);
  assert.doesNotMatch(offlineRepo,/SET\s+staff_actor_id=/i);
  assert.doesNotMatch(offlineRepo,/SET[\s\S]{0,100}payload=/i);
  assert.doesNotMatch(offlineRepo,/UPDATE\s+pos\.offline_command_line_effects/i);
});

test('Step 49 A10 security-sensitive POS permissions remain additive and risk classified',()=>{
  for(const key of ['pos.view','pos.sell','pos.reconcile'])assert.match(a54,new RegExp(`'${key.replaceAll('.','\\.')}'`));
  assert.match(a54,/ON CONFLICT \(key\) DO NOTHING/);
  assert.doesNotMatch(a54,/DELETE FROM admin\.permissions|UPDATE admin\.permissions/i);
});

test('Step 49 A10 HTTP contract agrees with runtime permission and step-up boundaries',()=>{
  assert.equal(contract.paths['/admin/pos/scan'].get['x-permission'],'pos.view');
  assert.equal(contract.paths['/admin/pos/sales'].post['x-permission'],'pos.sell');
  assert.equal(contract.paths['/admin/pos/reconciliation/failed'].get['x-permission'],'pos.reconcile');
  assert.equal(contract.paths['/admin/pos/reconciliation/{clientCommandId}'].get['x-permission'],'pos.reconcile');
  for(const action of ['retry','abandon']){
    const op=contract.paths[`/admin/pos/reconciliation/{clientCommandId}/${action}`].post;
    assert.equal(op['x-permission'],'pos.reconcile');
    assert.equal(op['x-step-up-required'],true);
  }
});

test('Step 49 A10 retains every Step 49 regression suite A2 through A9',()=>{
  for(const path of [
    'test/pos-physical-sale-a2.spec.ts',
    'test/pos-barcode-sku-resolution-a3.spec.ts',
    'test/pos-inventory-a4.spec.ts',
    'test/pos-pricing-snapshot-a5.spec.ts',
    'test/pos-physical-sale-commit-a6.spec.ts',
    'test/pos-offline-command-sync-a7.spec.ts',
    'test/pos-offline-reconciliation-a8.spec.ts',
    'test/pos-rbac-admin-api-a9.spec.ts',
  ]) assert.equal(fs.existsSync(path),true,path);
});

test('Step 49 A10 is a gate-only substep and adds no new persistence authority',()=>{
  const migrations=fs.readdirSync('database/migrations');
  assert.equal(migrations.some(name=>name.startsWith('0055_')),false);
  assert.match(commit,/pos\.sale\.committed\.v1/);
  assert.doesNotMatch(offline,/setInterval|setTimeout|@Cron|@Interval/);
});
