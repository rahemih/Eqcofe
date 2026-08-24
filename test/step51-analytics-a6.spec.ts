import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { InventoryManagementService } from '../src/modules/analytics/application/inventory-management.service';

function serviceWith(rows: any[]) {
  return new InventoryManagementService({ inventorySnapshot: async () => rows } as any);
}

test('Step 51 A6 aggregates inventory snapshot counts and quantities', async () => {
  const out = await serviceWith([
    { variant_id: 'v1', available_quantity: '12', reserved_quantity: '2', stock_state: 'in_stock', captured_at: '2026-08-24T01:00:00.000Z', source_watermark: '2026-08-24T01:00:00.000Z' },
    { variant_id: 'v2', available_quantity: '4', reserved_quantity: '1', stock_state: 'low_stock', captured_at: '2026-08-24T02:00:00.000Z', source_watermark: '2026-08-24T02:00:00.000Z' },
    { variant_id: 'v3', available_quantity: '0', reserved_quantity: '0', stock_state: 'out_of_stock', captured_at: '2026-08-24T03:00:00.000Z', source_watermark: '2026-08-24T03:00:00.000Z' },
  ]).read();
  assert.equal(out.variantCount, 3);
  assert.equal(out.totalAvailableQuantity, 16);
  assert.equal(out.totalReservedQuantity, 3);
  assert.equal(out.inStockCount, 1);
  assert.equal(out.lowStockCount, 1);
  assert.equal(out.outOfStockCount, 1);
  assert.equal(out.sourceWatermark?.toISOString(), '2026-08-24T03:00:00.000Z');
});

test('Step 51 A6 accepts empty snapshots without fabricating stock', async () => {
  const out = await serviceWith([]).read();
  assert.equal(out.variantCount, 0);
  assert.equal(out.totalAvailableQuantity, 0);
  assert.equal(out.totalReservedQuantity, 0);
  assert.equal(out.sourceWatermark, null);
});

test('Step 51 A6 validates bounded result limits', async () => {
  const svc = serviceWith([]);
  await assert.rejects(() => svc.read(0), /ANALYTICS_LIMIT_INVALID/);
  await assert.rejects(() => svc.read(501), /ANALYTICS_LIMIT_INVALID/);
  await assert.rejects(() => svc.read(1.5), /ANALYTICS_LIMIT_INVALID/);
});

test('Step 51 A6 fails closed on invalid states timestamps and unsafe quantities', async () => {
  await assert.rejects(() => serviceWith([{ variant_id: 'v1', available_quantity: '1', reserved_quantity: '0', stock_state: 'bad', captured_at: '2026-08-24T00:00:00.000Z', source_watermark: '2026-08-24T00:00:00.000Z' }]).read(), /ANALYTICS_STOCK_STATE_INVALID/);
  await assert.rejects(() => serviceWith([{ variant_id: 'v1', available_quantity: '-1', reserved_quantity: '0', stock_state: 'in_stock', captured_at: '2026-08-24T00:00:00.000Z', source_watermark: '2026-08-24T00:00:00.000Z' }]).read(), /ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE/);
  await assert.rejects(() => serviceWith([{ variant_id: 'v1', available_quantity: '1', reserved_quantity: '0', stock_state: 'in_stock', captured_at: 'invalid', source_watermark: '2026-08-24T00:00:00.000Z' }]).read(), /ANALYTICS_CAPTURED_AT_INVALID/);
});

test('Step 51 A6 fails closed when aggregate quantities exceed safe integer range', async () => {
  await assert.rejects(() => serviceWith([
    { variant_id: 'v1', available_quantity: '9007199254740990', reserved_quantity: '0', stock_state: 'in_stock', captured_at: '2026-08-24T00:00:00.000Z', source_watermark: '2026-08-24T00:00:00.000Z' },
    { variant_id: 'v2', available_quantity: '2', reserved_quantity: '0', stock_state: 'in_stock', captured_at: '2026-08-24T00:00:00.000Z', source_watermark: '2026-08-24T00:00:00.000Z' },
  ]).read(), /ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE/);
});

test('Step 51 A6 remains Analytics-owned read-side only', () => {
  const source = readFileSync('src/modules/analytics/application/inventory-management.service.ts', 'utf8');
  const moduleSource = readFileSync('src/modules/analytics/analytics.module.ts', 'utf8');
  assert.ok(source.includes('repository.inventorySnapshot(limit)'));
  assert.ok(!source.match(/\b(INSERT|UPDATE|DELETE)\b/i));
  assert.ok(!source.includes('inventory.stock_balances'));
  assert.ok(!source.includes('@Controller'));
  assert.ok(moduleSource.includes('InventoryManagementService'));
});
