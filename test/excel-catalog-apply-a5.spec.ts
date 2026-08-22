import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CatalogApplyService } from '../src/modules/excel/application/catalog-apply.service';

const workbook: any = {
  contractVersion: 'eqcofe-step50-v1',
  sheets: [
    { name: 'products', rows: [['product_slug', 'name_fa', 'status'], ['p-1', 'نام جدید', 'draft']] },
    { name: 'variants', rows: [['sku', 'product_slug', 'barcode'], ['SKU-1', 'p-1', '123456']] },
    { name: 'prices', rows: [['sku', 'price_toman'], ['SKU-1', 1000]] },
  ],
};

function service(state = { version: 3, variantVersion: 4 }) {
  const dryRun = { validate: async () => ({ valid: true }) } as any;
  const catalog = {
    product: async () => ({ id: 'product-1' }),
    adminProduct: async () => ({ id: 'product-1', version: state.version, status: 'draft', name_fa: 'قدیم' }),
    variants: async () => [{ id: 'variant-1', version: state.variantVersion, barcode: 'OLD' }],
  } as any;
  const lookup = { resolve: async () => ({ variantId: 'variant-1', productId: 'product-1', sku: 'SKU-1', barcode: 'OLD' }) } as any;
  const applied: any[] = [];
  const apply = { apply: async (command: any) => { applied.push(command); return { products: command.products.length, variants: command.variants.length }; } } as any;
  return { value: new CatalogApplyService(dryRun, catalog, lookup, apply), applied };
}

test('Step 50 A5 preview binds workbook to canonical product and variant versions', async () => {
  const { value } = service();
  const preview = await value.preview(workbook);
  assert.equal(preview.products[0]?.expectedVersion, 3);
  assert.equal(preview.variants[0]?.expectedVersion, 4);
  assert.equal(preview.products[0]?.nameFa, 'نام جدید');
  assert.equal(preview.variants[0]?.barcode, '123456');
  assert.match(preview.previewHash, /^[a-f0-9]{64}$/);
});

test('Step 50 A5 apply requires the exact server-derived preview hash', async () => {
  const { value, applied } = service();
  const preview = await value.preview(workbook);
  await value.apply(workbook, preview.previewHash);
  assert.equal(applied.length, 1);
  await assert.rejects(() => value.apply(workbook, '0'.repeat(64)), (error: any) => error?.code === 'EXCEL_PREVIEW_STALE');
});

test('Step 50 A5 changed canonical versions make prior preview stale', async () => {
  const state = { version: 3, variantVersion: 4 };
  const { value } = service(state);
  const preview = await value.preview(workbook);
  state.version = 5;
  await assert.rejects(() => value.apply(workbook, preview.previewHash), (error: any) => error?.code === 'EXCEL_PREVIEW_STALE');
});

test('Step 50 A5 rejects invalid product status before mutation', async () => {
  const { value, applied } = service();
  const bad = structuredClone(workbook);
  bad.sheets[0].rows[1][2] = 'deleted';
  await assert.rejects(() => value.preview(bad), (error: any) => error?.code === 'EXCEL_PRODUCT_STATUS_INVALID');
  assert.equal(applied.length, 0);
});

test('Step 50 A5 Catalog owns atomic mutation audit and optimistic locking', () => {
  const source = readFileSync('src/modules/catalog/application/catalog-import-apply.service.ts', 'utf8');
  assert.match(source, /tx\.run/);
  assert.match(source, /VERSION_CONFLICT/);
  assert.match(source, /catalog\.product\.excel_apply/);
  assert.match(source, /catalog\.variant\.excel_apply/);
  assert.match(source, /saveProduct/);
  assert.match(source, /saveVariant/);
});

test('Step 50 A5 introduces no direct Catalog SQL or Pricing mutation in Excel', () => {
  const source = readFileSync('src/modules/excel/application/catalog-apply.service.ts', 'utf8');
  assert.doesNotMatch(source, /INSERT INTO|UPDATE catalog\.|DELETE FROM|PricingModule|price_toman|InventoryModule|PaymentsModule|FinanceModule/);
  assert.match(source, /CatalogImportApplyService/);
  assert.match(source, /EXCEL_PREVIEW_STALE/);
});
