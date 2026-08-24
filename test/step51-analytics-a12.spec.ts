import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { serializeManagementExport } from '../src/modules/analytics/application/management-export.serializer';

const now=new Date('2026-08-24T12:00:00.000Z');
const input={dataset:'customer_lifetime' as const,generatedAt:now,sourceWatermark:now,exportId:'11111111-1111-4111-8111-111111111111'};

test('Step 51 A12 serializes deterministic BOM CSV with allow-listed columns',()=>{
  const out=serializeManagementExport({...input,format:'csv',rows:[{customerId:'c1',orderCount:2,lifetimeValueToman:100,lastOrderAt:now,sourceWatermark:now,secret:'never'}]});
  assert.ok(out.content.startsWith('\uFEFFcustomerId,orderCount,lifetimeValueToman,lastOrderAt,sourceWatermark\r\n'));
  assert.doesNotMatch(out.content,/secret|never/);assert.equal(out.mimeType,'text/csv; charset=utf-8');assert.equal(out.rowCount,1);assert.match(out.contentHash,/^[0-9a-f]{64}$/);
});

test('Step 51 A12 neutralizes spreadsheet formula injection before CSV quoting',()=>{
  for(const value of ['=cmd()',' +SUM(1,1)','-2+3','@IMPORT']){const out=serializeManagementExport({...input,format:'csv',rows:[{customerId:value,orderCount:0,lifetimeValueToman:0,lastOrderAt:null,sourceWatermark:now}]});assert.ok(out.content.includes(`'${value}`));}
});

test('Step 51 A12 emits versioned allow-listed JSON without arbitrary objects',()=>{
  const out=serializeManagementExport({...input,format:'json',rows:[{customerId:'c1',orderCount:1,lifetimeValueToman:10,lastOrderAt:null,sourceWatermark:now,raw:{secret:true}}]});
  const parsed=JSON.parse(out.content);assert.equal(parsed.contractVersion,'eqcofe-analytics-export-v1');assert.equal(parsed.rowCount,1);assert.equal(parsed.rows[0].raw,undefined);assert.equal(parsed.rows[0].sourceWatermark,now.toISOString());
});

test('Step 51 A12 fails closed on unsafe values and encoded content above 5 MiB',()=>{
  assert.throws(()=>serializeManagementExport({...input,format:'json',rows:[{customerId:'c',orderCount:Number.MAX_SAFE_INTEGER+1,lifetimeValueToman:0,lastOrderAt:null,sourceWatermark:now}]}),/ANALYTICS_EXPORT_INTEGER_INVALID/);
  assert.throws(()=>serializeManagementExport({...input,format:'csv',rows:[{customerId:'x'.repeat(5*1024*1024),orderCount:0,lifetimeValueToman:0,lastOrderAt:null,sourceWatermark:now}]}),/ANALYTICS_EXPORT_CONTENT_TOO_LARGE/);
});

test('Step 51 A12 persistence is bounded idempotent and terminal immutable',()=>{
  const migration=readFileSync('database/migrations/0061_analytics_management_exports.sql','utf8');
  for(const key of ['analytics.export.create','analytics.export.view','analytics.export.download'])assert.ok(migration.includes(key));
  assert.match(migration,/UNIQUE\(requested_by,idempotency_hash\)/);assert.match(migration,/octet_length\(content_text\)<=5242880/);assert.match(migration,/ANALYTICS_TERMINAL_EXPORT_IMMUTABLE/);assert.match(migration,/row_count BETWEEN 0 AND 500/);
});

test('Step 51 A12 composes existing A4-A10 services and never queries owner domains',()=>{
  const service=readFileSync('src/modules/analytics/application/management-export.service.ts','utf8');
  for(const call of ['sales.read','profit.read','inventory.read','customers.read','wholesale.read','operations.readOne'])assert.ok(service.includes(call));
  assert.doesNotMatch(service,/\bFROM\s+(orders|payments|finance|inventory|customer|fulfillment|returns|warranty)\./i);
  assert.doesNotMatch(service,/@Controller|@Permissions|@StaffOnly/);
});

test('Step 51 A12 freezes one dataset per artifact and excludes XLSX or external delivery',()=>{
  const service=readFileSync('src/modules/analytics/application/management-export.service.ts','utf8');
  const serializer=readFileSync('src/modules/analytics/application/management-export.serializer.ts','utf8');
  const moduleSource=readFileSync('src/modules/analytics/analytics.module.ts','utf8');
  assert.match(service,/\['csv','json'\]/);assert.doesNotMatch(service+serializer,/xlsx|email|signed.?url|cloud|upload/i);assert.match(moduleSource,/ManagementExportService/);
});
