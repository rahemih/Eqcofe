import assert from 'node:assert/strict';
import test from 'node:test';
import { CatalogDryRunService } from '../src/modules/excel/application/catalog-dry-run.service';
import { CatalogDryRunError } from '../src/modules/excel/domain/catalog-dry-run';
import { ParsedWorkbook } from '../src/modules/excel/domain/workbook-contract';
import { DomainError } from '../src/shared/errors/domain-error';

function workbook(productSlug = 'tamper-58', sku = 'SKU-58', variantProductSlug = 'tamper-58'): ParsedWorkbook {
  return {
    contractVersion: 'eqcofe-step50-v1',
    fileName: 'import.xlsx',
    sheets: [
      { name: 'products', rows: [['product_slug', 'name_fa'], [productSlug, 'تمپر ۵۸']] },
      { name: 'variants', rows: [['sku', 'product_slug', 'barcode'], [sku, variantProductSlug, '12345678']] },
      { name: 'prices', rows: [['sku', 'price_toman'], [sku, 1_250_000]] },
    ],
  };
}

function make(options: { missingProduct?: boolean; missingVariant?: boolean; mismatch?: boolean } = {}) {
  const catalog: any = {
    product: async (slug: string) => {
      if (options.missingProduct || slug === 'missing') throw new DomainError('PRODUCT_NOT_FOUND', 'محصول پیدا نشد.');
      return { id: slug === 'other' ? 'product-2' : 'product-1', slug };
    },
  };
  const variants: any = {
    resolve: async ({ value }: any) => {
      if (options.missingVariant || value === 'MISSING') throw new DomainError('POS_SCAN_NOT_FOUND', 'کالا پیدا نشد.');
      return { variantId: 'variant-1', productId: options.mismatch ? 'product-2' : 'product-1', sku: value, barcode: null };
    },
  };
  return new CatalogDryRunService(catalog, variants);
}

test('Step 50 A4 valid catalog workbook returns zero row errors without mutation', async () => {
  const result = await make().validate(workbook());
  assert.equal(result.valid, true);
  assert.equal(result.checkedRows, 2);
  assert.equal(result.validRows, 2);
  assert.equal(result.invalidRows, 0);
  assert.deepEqual(result.rows.flatMap((row) => row.errors), []);
});

test('Step 50 A4 missing product is reported on the exact products row', async () => {
  const result = await make({ missingProduct: true }).validate(workbook());
  const product = result.rows.find((row) => row.sheet === 'products');
  assert.equal(result.valid, false);
  assert.equal(product?.row, 2);
  assert.equal(product?.errors[0]?.field, 'product_slug');
  assert.equal(product?.errors[0]?.code, 'PRODUCT_NOT_FOUND');
});

test('Step 50 A4 missing SKU is reported on the exact variants row', async () => {
  const result = await make({ missingVariant: true }).validate(workbook());
  const variant = result.rows.find((row) => row.sheet === 'variants');
  assert.equal(variant?.valid, false);
  assert.equal(variant?.errors.some((error) => error.field === 'sku' && error.code === 'POS_SCAN_NOT_FOUND'), true);
});

test('Step 50 A4 SKU belonging to another product fails closed at row level', async () => {
  const result = await make({ mismatch: true }).validate(workbook());
  const variant = result.rows.find((row) => row.sheet === 'variants');
  assert.equal(variant?.errors.some((error) => error.code === 'EXCEL_VARIANT_PRODUCT_MISMATCH'), true);
});

test('Step 50 A4 malformed headers fail the workbook before catalog lookups', async () => {
  const bad = workbook();
  bad.sheets[0] = { name: 'products', rows: [['name_fa'], ['تمپر ۵۸']] };
  await assert.rejects(
    () => make().validate(bad),
    (error: unknown) => error instanceof CatalogDryRunError && error.code === 'EXCEL_DRY_RUN_COLUMN_MISSING',
  );
});

test('Step 50 A4 requires products and variants sheets and never consumes prices as catalog authority', async () => {
  const bad = workbook();
  bad.sheets = bad.sheets.filter((sheet) => sheet.name !== 'variants');
  await assert.rejects(
    () => make().validate(bad),
    (error: unknown) => error instanceof CatalogDryRunError && error.code === 'EXCEL_DRY_RUN_SHEET_MISSING',
  );
});
