import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addPhysicalSaleLine, createPhysicalSale, voidPhysicalSale } from '../src/modules/pos/domain/physical-sale';

const saleId = '11111111-1111-4111-8111-111111111111';
const commandId = '22222222-2222-4222-8222-222222222222';
const actorId = '33333333-3333-4333-8333-333333333333';
const variantId = '44444444-4444-4444-8444-444444444444';

test('Step 49 A2 creates draft physical sale with stable command identity', () => {
  const sale = createPhysicalSale({ id: saleId, clientCommandId: commandId, staffActorId: actorId });
  assert.equal(sale.status, 'draft');
  assert.equal(sale.version, 1);
  assert.equal(sale.clientCommandId, commandId);
  assert.deepEqual(sale.lines, []);
});

test('Step 49 A2 line quantities are positive bounded integers and converge by variant', () => {
  const sale = createPhysicalSale({ id: saleId, clientCommandId: commandId, staffActorId: actorId });
  const once = addPhysicalSaleLine(sale, { variantId, quantity: 2 });
  const twice = addPhysicalSaleLine(once, { variantId, quantity: 3 });
  assert.deepEqual(twice.lines, [{ variantId, quantity: 5 }]);
  assert.throws(() => addPhysicalSaleLine(sale, { variantId, quantity: 0 }));
  assert.throws(() => addPhysicalSaleLine(sale, { variantId, quantity: 1000 }));
});

test('Step 49 A2 void is terminal for editing and idempotent for repeated void', () => {
  const sale = createPhysicalSale({ id: saleId, clientCommandId: commandId, staffActorId: actorId });
  const voided = voidPhysicalSale(sale);
  assert.equal(voided.status, 'voided');
  assert.equal(voidPhysicalSale(voided), voided);
  assert.throws(() => addPhysicalSaleLine(voided, { variantId, quantity: 1 }));
});

test('Step 49 A2 persistence is forward-only, idempotent by client command and contains no price or stock authority', () => {
  const migration = readFileSync('database/migrations/0049_pos_physical_sales.sql', 'utf8');
  assert.match(migration, /CREATE TABLE pos\.physical_sales/);
  assert.match(migration, /client_command_id uuid NOT NULL UNIQUE/);
  assert.match(migration, /CREATE TABLE pos\.physical_sale_lines/);
  assert.doesNotMatch(migration, /unit_price|total_price|stock_quantity|available_quantity|inventory_balance/i);
});

test('Step 49 A2 repository serializes sale mutation and does not mutate Catalog Pricing Inventory Payments or Finance', () => {
  const source = readFileSync('src/modules/pos/infrastructure/physical-sale.repository.ts', 'utf8');
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /ON CONFLICT \(client_command_id\) DO NOTHING/);
  assert.doesNotMatch(source, /UPDATE\s+(catalog|pricing|inventory|payments|finance)\./i);
});

test('Step 49 A2 exposes no POS HTTP controller and leaves barcode pricing inventory payment work for later substeps', () => {
  const moduleSource = readFileSync('src/modules/pos/pos.module.ts', 'utf8');
  assert.match(moduleSource, /PhysicalSaleService/);
  assert.doesNotMatch(moduleSource, /controllers\s*:/);
  const migration = readFileSync('database/migrations/0049_pos_physical_sales.sql', 'utf8');
  assert.doesNotMatch(migration, /barcode|payment|price_snapshot|inventory_reservation/i);
});
