import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeFifo, onlineSellable, physicalAvailable, protectedPhysicalQuantity, weightedCost } from '../src/modules/inventory/domain/inventory.math';

test('inventory availability separates physical, reserved, allocated and non-sellable buckets', () => {
  const balance = { onHand: 20, reserved: 3, allocated: 2, damaged: 1, quarantine: 2, protectionPercent: 20 };
  assert.equal(physicalAvailable(balance), 12);
  assert.equal(protectedPhysicalQuantity(balance), 3);
  assert.equal(onlineSellable(balance), 9);
});

test('physical protection is fail-safe and never makes online stock negative', () => {
  assert.equal(onlineSellable({ onHand: 1, reserved: 0, allocated: 0, damaged: 0, quarantine: 0, protectionPercent: 20 }), 0);
  assert.equal(onlineSellable({ onHand: 2, reserved: 1, allocated: 1, damaged: 0, quarantine: 0, protectionPercent: 100 }), 0);
});

test('FIFO consumes oldest layers first and preserves exact cost lineage', () => {
  const parts = consumeFifo([
    { id: 'new', remainingQuantity: 5, effectiveUnitCostToman: 120, receivedAt: '2026-02-01T00:00:00Z' },
    { id: 'old', remainingQuantity: 2, effectiveUnitCostToman: 100, receivedAt: '2026-01-01T00:00:00Z' },
  ], 4);
  assert.deepEqual(parts, [
    { layerId: 'old', quantity: 2, unitCostToman: 100 },
    { layerId: 'new', quantity: 2, unitCostToman: 120 },
  ]);
  assert.equal(weightedCost(parts), 110);
});

test('FIFO fails closed when cost layers are insufficient', () => {
  assert.throws(() => consumeFifo([
    { id: 'only', remainingQuantity: 1, effectiveUnitCostToman: 100, receivedAt: '2026-01-01T00:00:00Z' },
  ], 2), /INSUFFICIENT_COST_LAYERS/);
});

test('weighted cost returns null for an empty consumption', () => {
  assert.equal(weightedCost([]), null);
});
