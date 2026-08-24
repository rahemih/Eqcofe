import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CustomerManagementService } from '../src/modules/analytics/application/customer-management.service';

function serviceWith(rows: any[]) {
  return new CustomerManagementService({ customerMetrics: async () => rows } as any);
}

test('Step 51 A7 aggregates bounded customer lifetime metrics in integer Toman', async () => {
  const out = await serviceWith([
    { customer_id:'c1', order_count:'2', lifetime_value_toman:'300000', last_order_at:'2026-08-20T10:00:00.000Z', source_watermark:'2026-08-20T11:00:00.000Z' },
    { customer_id:'c2', order_count:'1', lifetime_value_toman:'100000', last_order_at:'2026-08-21T10:00:00.000Z', source_watermark:'2026-08-21T11:00:00.000Z' },
  ]).read(100);
  assert.equal(out.customerCount,2);
  assert.equal(out.activeCustomerCount,2);
  assert.equal(out.totalOrderCount,3);
  assert.equal(out.lifetimeValueToman,400000);
  assert.equal(out.averageLifetimeValueToman,200000);
  assert.equal(out.sourceWatermark?.toISOString(),'2026-08-21T11:00:00.000Z');
});

test('Step 51 A7 accepts empty projection sets without fabricating customers', async () => {
  const out = await serviceWith([]).read();
  assert.equal(out.customerCount,0);
  assert.equal(out.activeCustomerCount,0);
  assert.equal(out.totalOrderCount,0);
  assert.equal(out.lifetimeValueToman,0);
  assert.equal(out.averageLifetimeValueToman,0);
  assert.equal(out.sourceWatermark,null);
});

test('Step 51 A7 validates bounded limits', async () => {
  const svc = serviceWith([]);
  await assert.rejects(()=>svc.read(0),/ANALYTICS_LIMIT_INVALID/);
  await assert.rejects(()=>svc.read(501),/ANALYTICS_LIMIT_INVALID/);
  await assert.rejects(()=>svc.read('x'),/ANALYTICS_LIMIT_INVALID/);
});

test('Step 51 A7 fails closed for unsafe customer metrics', async () => {
  await assert.rejects(()=>serviceWith([{customer_id:'c1',order_count:'-1',lifetime_value_toman:'1',last_order_at:null,source_watermark:'2026-08-20T00:00:00Z'}]).read(),/ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE/);
  await assert.rejects(()=>serviceWith([{customer_id:'c1',order_count:'1',lifetime_value_toman:'9007199254740992',last_order_at:null,source_watermark:'2026-08-20T00:00:00Z'}]).read(),/ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE/);
});

test('Step 51 A7 validates temporal projection metadata', async () => {
  await assert.rejects(()=>serviceWith([{customer_id:'c1',order_count:'1',lifetime_value_toman:'1',last_order_at:'bad',source_watermark:'2026-08-20T00:00:00Z'}]).read(),/ANALYTICS_LAST_ORDER_AT_INVALID/);
  await assert.rejects(()=>serviceWith([{customer_id:'c1',order_count:'1',lifetime_value_toman:'1',last_order_at:null,source_watermark:'bad'}]).read(),/ANALYTICS_SOURCE_WATERMARK_INVALID/);
});

test('Step 51 A7 remains Analytics-owned read-side only', () => {
  const source=readFileSync('src/modules/analytics/application/customer-management.service.ts','utf8');
  const moduleSource=readFileSync('src/modules/analytics/analytics.module.ts','utf8');
  assert.ok(source.includes('repository.customerMetrics(limit)'));
  assert.ok(!source.match(/\b(INSERT|UPDATE|DELETE)\b/i));
  assert.ok(!source.includes('orders.'));
  assert.ok(!source.includes('customers.'));
  assert.ok(!source.includes('@Controller'));
  assert.ok(moduleSource.includes('CustomerManagementService'));
});
