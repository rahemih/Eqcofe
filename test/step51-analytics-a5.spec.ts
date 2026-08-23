import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ProfitManagementService } from '../src/modules/analytics/application/profit-management.service';

function serviceWith(rows: any[]) {
  return new ProfitManagementService({ profitDaily: async () => rows } as any);
}

test('Step 51 A5 aggregates COGS, operating cost and profit in integer Toman', async () => {
  const svc = serviceWith([
    { business_date: '2026-08-20', revenue_toman: '1000000', cogs_toman: '600000', operating_cost_toman: '100000', profit_toman: '300000', source_watermark: '2026-08-20T20:00:00.000Z' },
    { business_date: '2026-08-21', revenue_toman: '2000000', cogs_toman: '1100000', operating_cost_toman: '200000', profit_toman: '700000', source_watermark: '2026-08-21T20:00:00.000Z' },
  ]);
  const out = await svc.read('2026-08-20', '2026-08-21');
  assert.equal(out.dayCount, 2);
  assert.equal(out.revenueToman, 3000000);
  assert.equal(out.cogsToman, 1700000);
  assert.equal(out.operatingCostToman, 300000);
  assert.equal(out.grossProfitToman, 1300000);
  assert.equal(out.profitToman, 1000000);
  assert.equal(out.grossMarginBps, 4333);
  assert.equal(out.netMarginBps, 3333);
  assert.equal(out.sourceWatermark?.toISOString(), '2026-08-21T20:00:00.000Z');
  assert.equal(out.daily[0].grossProfitToman, 400000);
  assert.equal(out.daily[0].grossMarginBps, 4000);
  assert.equal(out.daily[0].netMarginBps, 3000);
});

test('Step 51 A5 preserves losses and does not fabricate margin when revenue is zero', async () => {
  const out = await serviceWith([
    { business_date: '2026-08-20', revenue_toman: '0', cogs_toman: '10000', operating_cost_toman: '5000', profit_toman: '-15000', source_watermark: '2026-08-20T20:00:00.000Z' },
  ]).read('2026-08-20', '2026-08-20');
  assert.equal(out.grossProfitToman, -10000);
  assert.equal(out.profitToman, -15000);
  assert.equal(out.grossMarginBps, 0);
  assert.equal(out.netMarginBps, 0);
});

test('Step 51 A5 accepts empty projection windows', async () => {
  const out = await serviceWith([]).read('2026-08-20', '2026-08-20');
  assert.equal(out.revenueToman, 0);
  assert.equal(out.cogsToman, 0);
  assert.equal(out.operatingCostToman, 0);
  assert.equal(out.grossProfitToman, 0);
  assert.equal(out.profitToman, 0);
  assert.equal(out.sourceWatermark, null);
});

test('Step 51 A5 validates calendar dates, ordering and bounded range', async () => {
  const svc = serviceWith([]);
  await assert.rejects(() => svc.read('2026-02-30', '2026-03-01'), /ANALYTICS_FROM_DATE_INVALID/);
  await assert.rejects(() => svc.read('2026-08-22', '2026-08-21'), /ANALYTICS_DATE_RANGE_INVALID/);
  await assert.rejects(() => svc.read('2025-01-01', '2026-01-02'), /ANALYTICS_DATE_RANGE_TOO_LARGE/);
});

test('Step 51 A5 fails closed for invalid watermarks and unsafe integer aggregates', async () => {
  await assert.rejects(() => serviceWith([
    { business_date: '2026-08-20', revenue_toman: '1', cogs_toman: '0', operating_cost_toman: '0', profit_toman: '1', source_watermark: 'invalid' },
  ]).read('2026-08-20', '2026-08-20'), /ANALYTICS_SOURCE_WATERMARK_INVALID/);
  await assert.rejects(() => serviceWith([
    { business_date: '2026-08-20', revenue_toman: '9007199254740990', cogs_toman: '0', operating_cost_toman: '0', profit_toman: '0', source_watermark: '2026-08-20T00:00:00.000Z' },
    { business_date: '2026-08-21', revenue_toman: '2', cogs_toman: '0', operating_cost_toman: '0', profit_toman: '0', source_watermark: '2026-08-21T00:00:00.000Z' },
  ]).read('2026-08-20', '2026-08-21'), /ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE/);
});

test('Step 51 A5 remains Analytics-owned read-side only', () => {
  const source = readFileSync('src/modules/analytics/application/profit-management.service.ts', 'utf8');
  const moduleSource = readFileSync('src/modules/analytics/analytics.module.ts', 'utf8');
  assert.ok(source.includes('repository.profitDaily(from, to)'));
  assert.ok(!source.match(/\b(INSERT|UPDATE|DELETE)\b/i));
  assert.ok(!source.includes('finance.'));
  assert.ok(!source.includes('orders.'));
  assert.ok(!source.includes('@Controller'));
  assert.ok(moduleSource.includes('ProfitManagementService'));
});
