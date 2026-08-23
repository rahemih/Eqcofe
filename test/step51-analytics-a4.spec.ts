import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SalesRevenueManagementService } from '../src/modules/analytics/application/sales-revenue-management.service';

function serviceWith(rows:any[]){
  return new SalesRevenueManagementService({ salesDaily: async()=>rows } as any);
}

test('Step 51 A4 aggregates bounded integer Toman sales and revenue metrics', async()=>{
  const svc=serviceWith([
    {business_date:'2026-08-20',order_count:'4',cancelled_count:'1',gross_sales_toman:'1000000',paid_sales_toman:'800000',source_watermark:'2026-08-20T20:00:00.000Z'},
    {business_date:'2026-08-21',order_count:'6',cancelled_count:'0',gross_sales_toman:'2000000',paid_sales_toman:'1800000',source_watermark:'2026-08-21T20:00:00.000Z'},
  ]);
  const out=await svc.read('2026-08-20','2026-08-21');
  assert.equal(out.dayCount,2);
  assert.equal(out.orderCount,10);
  assert.equal(out.cancelledCount,1);
  assert.equal(out.grossSalesToman,3000000);
  assert.equal(out.paidSalesToman,2600000);
  assert.equal(out.collectionRateBps,8667);
  assert.equal(out.cancellationRateBps,1000);
  assert.equal(out.averageGrossOrderToman,300000);
  assert.equal(out.sourceWatermark?.toISOString(),'2026-08-21T20:00:00.000Z');
});

test('Step 51 A4 accepts empty projection windows without fabricating activity',async()=>{
  const out=await serviceWith([]).read('2026-08-20','2026-08-20');
  assert.equal(out.orderCount,0);
  assert.equal(out.grossSalesToman,0);
  assert.equal(out.paidSalesToman,0);
  assert.equal(out.collectionRateBps,0);
  assert.equal(out.cancellationRateBps,0);
  assert.equal(out.sourceWatermark,null);
});

test('Step 51 A4 validates real calendar dates and ordered range',async()=>{
  const svc=serviceWith([]);
  await assert.rejects(()=>svc.read('2026-02-30','2026-03-01'),/ANALYTICS_FROM_DATE_INVALID/);
  await assert.rejects(()=>svc.read('2026-08-22','2026-08-21'),/ANALYTICS_DATE_RANGE_INVALID/);
});

test('Step 51 A4 caps management query window to one leap-year span',async()=>{
  await assert.rejects(()=>serviceWith([]).read('2025-01-01','2026-01-02'),/ANALYTICS_DATE_RANGE_TOO_LARGE/);
});

test('Step 51 A4 fails closed when projection integers or aggregate totals exceed JS safe range',async()=>{
  await assert.rejects(()=>serviceWith([{business_date:'2026-08-20',order_count:'9007199254740992',cancelled_count:'0',gross_sales_toman:'0',paid_sales_toman:'0',source_watermark:'2026-08-20T00:00:00.000Z'}]).read('2026-08-20','2026-08-20'),/ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE/);
  await assert.rejects(()=>serviceWith([
    {business_date:'2026-08-20',order_count:'1',cancelled_count:'0',gross_sales_toman:'9007199254740990',paid_sales_toman:'0',source_watermark:'2026-08-20T00:00:00.000Z'},
    {business_date:'2026-08-21',order_count:'1',cancelled_count:'0',gross_sales_toman:'2',paid_sales_toman:'0',source_watermark:'2026-08-21T00:00:00.000Z'},
  ]).read('2026-08-20','2026-08-21'),/ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE/);
});

test('Step 51 A4 remains analytics-owned read-side only with no HTTP RBAC migration or cross-domain SQL',()=>{
  const source=readFileSync('src/modules/analytics/application/sales-revenue-management.service.ts','utf8');
  const moduleSource=readFileSync('src/modules/analytics/analytics.module.ts','utf8');
  assert.ok(source.includes('repository.salesDaily(from, to)'));
  assert.ok(!source.match(/\b(INSERT|UPDATE|DELETE)\b/i));
  assert.ok(!source.includes('orders.orders'));
  assert.ok(!source.includes('payments.payments'));
  assert.ok(!source.includes('@Controller'));
  assert.ok(moduleSource.includes('SalesRevenueManagementService'));
});
