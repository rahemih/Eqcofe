import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PosVariantLookupService } from '../src/modules/catalog/application/pos-variant-lookup.service';

const active = { id:'11111111-1111-4111-8111-111111111111', product_id:'22222222-2222-4222-8222-222222222222', sku:'EQ-001', barcode:'626000000001', status:'active', sales_enabled:true };

test('Step 49 A3 resolves normalized SKU through Catalog-owned lookup', async () => {
  const repo:any = { bySku: async (sku:string) => { assert.equal(sku,'EQ-001'); return [active]; }, byBarcode: async () => [] };
  const service = new PosVariantLookupService(repo);
  const result = await service.resolve({ kind:'sku', value:' eq-001 ' });
  assert.equal(result.variantId, active.id);
  assert.equal(result.sku, 'EQ-001');
});

test('Step 49 A3 resolves barcode exactly and rejects malformed scanner input', async () => {
  const repo:any = { bySku: async () => [], byBarcode: async (barcode:string) => { assert.equal(barcode,'626000000001'); return [active]; } };
  const service = new PosVariantLookupService(repo);
  assert.equal((await service.resolve({kind:'barcode',value:' 626000000001 '})).barcode,'626000000001');
  await assert.rejects(() => service.resolve({kind:'barcode',value:'12'}));
  await assert.rejects(() => service.resolve({kind:'sku',value:'bad sku'}));
  await assert.rejects(() => service.resolve({kind:'sku',value:'EQ\u0001-1'}));
});

test('Step 49 A3 fails closed on missing ambiguous or inactive variants', async () => {
  const missing = new PosVariantLookupService({bySku:async()=>[],byBarcode:async()=>[]} as any);
  await assert.rejects(() => missing.resolve({kind:'sku',value:'EQ-001'}));
  const ambiguous = new PosVariantLookupService({bySku:async()=>[active,active],byBarcode:async()=>[]} as any);
  await assert.rejects(() => ambiguous.resolve({kind:'sku',value:'EQ-001'}));
  const inactive = new PosVariantLookupService({bySku:async()=>[{...active,status:'inactive'}],byBarcode:async()=>[]} as any);
  await assert.rejects(() => inactive.resolve({kind:'sku',value:'EQ-001'}));
});

test('Step 49 A3 keeps barcode and SKU authority in Catalog, not POS persistence', () => {
  const catalogRepo = readFileSync('src/modules/catalog/infrastructure/pos-variant-lookup.repository.ts','utf8');
  const posService = readFileSync('src/modules/pos/application/pos-scan-resolution.service.ts','utf8');
  const migration = readFileSync('database/migrations/0005_catalog_core.sql','utf8');
  assert.match(catalogRepo,/catalog\.product_variants/);
  assert.match(migration,/uq_catalog_variants_sku_ci/);
  assert.match(migration,/uq_catalog_variants_barcode/);
  assert.doesNotMatch(posService,/sql`|KYSELY_DB|product_variants/);
});

test('Step 49 A3 adds no new migration or price stock payment authority', () => {
  const posModule = readFileSync('src/modules/pos/pos.module.ts','utf8');
  const lookup = readFileSync('src/modules/catalog/application/pos-variant-lookup.service.ts','utf8');
  assert.match(posModule,/CatalogModule/);
  assert.doesNotMatch(lookup,/price|inventory|payment|finance/i);
});
