import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OperationalManagementService } from '../src/modules/analytics/application/operational-management.service';

const base={order_id:'o1',started_at:'2026-08-20T10:00:00.000Z',completed_at:null,source_version:2,source_watermark:'2026-08-21T10:00:00.000Z'};
function service(rows:Record<string,any[]>){return new OperationalManagementService({operationalMetrics:async(kind:string)=>rows[kind]??[]} as any);}
const input={from:'2026-08-01T00:00:00.000Z',to:'2026-08-23T00:00:00.000Z',asOf:'2026-08-24T10:00:00.000Z',limit:100};

test('Step 51 A10 composes four bounded operational domains with explicit as-of age',async()=>{
  const out=await service({fulfillment:[{...base,id:'o1',status:'preparing'}],shipment:[{...base,id:'s1',status:'delivered',completed_at:'2026-08-20T12:00:00.000Z'}],return:[],warranty:[]}).read(input);
  assert.equal(out.fulfillment.totalCount,1);assert.equal(out.fulfillment.rows[0].ageSeconds,345600);
  assert.equal(out.shipment.completedCount,1);assert.equal(out.shipment.averageCompletedCycleSeconds,7200);
  assert.deepEqual(out.shipment.countsByStatus,{delivered:1});assert.equal(out.returns.totalCount,0);
});

test('Step 51 A10 rejects unbounded windows limits and future window edges',async()=>{
  const s=service({});
  await assert.rejects(()=>s.read({...input,limit:501}),/ANALYTICS_LIMIT_INVALID/);
  await assert.rejects(()=>s.read({...input,from:'bad'}),/ANALYTICS_FROM_INVALID/);
  await assert.rejects(()=>s.read({...input,to:'2026-08-25T00:00:00.000Z'}),/ANALYTICS_OPERATIONAL_WINDOW_INVALID/);
});

test('Step 51 A10 fails closed on unknown status unsafe version and invalid chronology',async()=>{
  await assert.rejects(()=>service({fulfillment:[{...base,id:'o1',status:'unknown'}]}).read(input),/ANALYTICS_OPERATIONAL_STATUS_INVALID/);
  await assert.rejects(()=>service({fulfillment:[{...base,id:'o1',status:'preparing',source_version:0}]}).read(input),/ANALYTICS_SOURCE_VERSION_INVALID/);
  await assert.rejects(()=>service({shipment:[{...base,id:'s1',status:'delivered',completed_at:'2026-08-19T00:00:00.000Z'}]}).read(input),/ANALYTICS_OPERATIONAL_TIMELINE_INVALID/);
});

test('Step 51 A10 re-reads four authoritative owners and stale-guards projections',()=>{
  const source=readFileSync('src/modules/analytics/infrastructure/analytics-authoritative-source.reader.ts','utf8');
  const repo=readFileSync('src/modules/analytics/infrastructure/analytics-projection.repository.ts','utf8');
  for(const table of ['fulfillment.fulfillments','fulfillment.shipments','returns.returns','warranty.claims'])assert.ok(source.includes(table));
  for(const table of ['fulfillment_operational_metrics','shipment_operational_metrics','return_operational_metrics','warranty_operational_metrics'])assert.ok(repo.includes(`${table}.source_watermark<=EXCLUDED.source_watermark`));
  assert.doesNotMatch(source,/\b(INSERT|UPDATE|DELETE)\b/i);
});

test('Step 51 A10 closes shipment tracking trigger gap atomically through Outbox',()=>{
  const shipment=readFileSync('src/modules/fulfillment/application/shipment.service.ts','utf8');
  const consumer=readFileSync('src/modules/analytics/application/analytics-cross-domain.consumer.ts','utf8');
  const contract=JSON.parse(readFileSync('contracts/events/shipment.tracking_status_changed.v1.schema.json','utf8'));
  assert.match(shipment,/setShipmentState[\s\S]*outbox\.append/);
  assert.ok(shipment.includes("'shipment.tracking_status_changed.v1'"));
  assert.ok(consumer.includes("'shipment.tracking_status_changed.v1'"));
  assert.deepEqual(contract.required,['shipment_id','order_id','status','occurred_at']);
});

test('Step 51 A10 stays additive and introduces no HTTP RBAC export SLA or monetary rule',()=>{
  const migration=readFileSync('database/migrations/0060_analytics_operational_metrics.sql','utf8');
  const serviceSource=readFileSync('src/modules/analytics/application/operational-management.service.ts','utf8');
  assert.equal((migration.match(/CREATE TABLE analytics\./g)??[]).length,4);
  assert.doesNotMatch(migration,/ALTER TABLE (fulfillment|returns|warranty)\./i);
  assert.doesNotMatch(serviceSource,/@Controller|@Permissions|@StaffOnly|\bSLA\b|\bstuck\b|\btoman\b/i);
});
