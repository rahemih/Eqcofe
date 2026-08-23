import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('database/migrations/0058_analytics_projection_foundation.sql', 'utf8');
const repository = readFileSync('src/modules/analytics/infrastructure/analytics-projection.repository.ts', 'utf8');
const service = readFileSync('src/modules/analytics/application/analytics-projection.service.ts', 'utf8');
const moduleSource = readFileSync('src/modules/analytics/analytics.module.ts', 'utf8');

test('Step 51 A2 creates additive analytics-owned projection tables only', () => {
  assert.match(migration, /CREATE SCHEMA IF NOT EXISTS analytics/);
  for (const table of ['projection_checkpoints','sales_daily','inventory_snapshot','customer_metrics','profit_daily']) {
    assert.match(migration, new RegExp(`CREATE TABLE analytics\\.${table}`));
  }
  assert.doesNotMatch(migration, /ALTER TABLE (orders|finance|inventory|catalog|pricing|customer)\./i);
});

test('Step 51 A2 keeps Toman projection values integer and bounded by database checks', () => {
  assert.match(migration, /gross_sales_toman bigint/);
  assert.match(migration, /lifetime_value_toman bigint/);
  assert.match(migration, /revenue_toman bigint/);
  assert.match(migration, /cogs_toman bigint/);
  assert.doesNotMatch(migration, /numeric\s*\(|decimal\s*\(|double precision|real\b/i);
});

test('Step 51 A2 projection writes are watermark guarded against stale overwrite', () => {
  assert.match(repository, /source_watermark <= EXCLUDED\.source_watermark/g);
  assert.match(repository, /ON CONFLICT \(business_date\) DO UPDATE/);
  assert.match(repository, /ON CONFLICT \(variant_id\) DO UPDATE/);
  assert.match(repository, /ON CONFLICT \(customer_id\) DO UPDATE/);
});

test('Step 51 A2 advances projection checkpoints in the same transaction as projection writes', () => {
  assert.match(service, /this\.tx\.run\(async \(trx\)/);
  assert.match(service, /upsertSalesDaily\(trx, metric\)[\s\S]*advanceCheckpoint\(trx, 'sales_daily'/);
  assert.match(service, /upsertProfitDaily\(trx, metric\)[\s\S]*advanceCheckpoint\(trx, 'profit_daily'/);
});

test('Step 51 A2 remains a read-model boundary without commerce mutation authority', () => {
  assert.doesNotMatch(repository, /INSERT INTO (orders|finance|inventory|catalog|pricing|customer)\./i);
  assert.doesNotMatch(repository, /UPDATE (orders|finance|inventory|catalog|pricing|customer)\./i);
  assert.doesNotMatch(repository, /DELETE FROM (orders|finance|inventory|catalog|pricing|customer)\./i);
});

test('Step 51 A2 module exports projection and query surfaces but exposes no HTTP controller', () => {
  assert.match(moduleSource, /AnalyticsProjectionService/);
  assert.match(moduleSource, /AnalyticsQueryService/);
  assert.doesNotMatch(moduleSource, /controllers\s*:/);
});
