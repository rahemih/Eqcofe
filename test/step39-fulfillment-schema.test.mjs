import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const m = readFileSync(new URL('../database/migrations/0014_fulfillment_core.sql', import.meta.url),'utf8');

test('Step39 fulfillment migration owns workflow, not inventory allocation quantity',()=>{
  assert.match(m,/CREATE TABLE IF NOT EXISTS fulfillment\.fulfillments/);
  assert.match(m,/CREATE TABLE IF NOT EXISTS fulfillment\.allocation_progress/);
  assert.match(m,/allocation_id uuid PRIMARY KEY REFERENCES inventory\.allocations/);
  assert.doesNotMatch(m,/CREATE TABLE IF NOT EXISTS fulfillment\.allocations\s*\(/);
});

test('fulfillment starts only after confirmed settled order',()=>{
  assert.match(m,/FULFILLMENT_ORDER_NOT_CONFIRMED/);
  assert.match(m,/payment_status,settlement_payment_id/);
  assert.match(m,/ps NOT IN \('paid','partially_refunded'\) OR settlement IS NULL/);
});

test('allocation lineage and order-item cap are database protected',()=>{
  assert.match(m,/FULFILLMENT_ALLOCATION_VARIANT_MISMATCH/);
  assert.match(m,/FULFILLMENT_ALLOCATION_EXCEEDS_ORDER_ITEM/);
  assert.match(m,/CREATE CONSTRAINT TRIGGER trg_fulfillment_inventory_allocation/);
});

test('shipment cannot exceed picked stock or cross order\/warehouse lineage',()=>{
  assert.match(m,/FULFILLMENT_SHIPMENT_LINEAGE_MISMATCH/);
  assert.match(m,/FULFILLMENT_SHIPMENT_EXCEEDS_PICKED/);
  assert.match(m,/FULFILLMENT_SHIPMENT_ITEMS_REQUIRED/);
  assert.match(m,/FULFILLMENT_HANDOVER_REQUIRES_SHIPPED_INVENTORY/);
});

test('carrier identity is snapshotted and shipment cancellation is pre-handover only',()=>{
  assert.match(m,/cp\.provider_key=sh\.provider_key/);
  assert.match(m,/FULFILLMENT_PROVIDER_SNAPSHOT_WITHOUT_CARRIER/);
  assert.match(m,/OLD\.status='ready' AND NEW\.status IN \('handed_over','cancelled'\)/);
  assert.doesNotMatch(m,/OLD\.status='handed_over' AND NEW\.status IN \([^\n]*'cancelled'/);
});

test('shipping webhook is replay-safe and tracking history is append-only',()=>{
  assert.match(m,/UNIQUE\(provider_key,external_event_id\)/);
  assert.match(m,/ux_tracking_event_fingerprint/);
  assert.match(m,/fulfillment\.tracking_events is append-only/);
});
