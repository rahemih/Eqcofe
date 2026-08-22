import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PricingApplyService } from '../src/modules/excel/application/pricing-apply.service';

const workbook: any = {
  contractVersion: 'eqcofe-step50-v1',
  sheets: [
    { name: 'products', rows: [['product_slug'], ['p-1']] },
    { name: 'variants', rows: [['sku', 'product_slug'], ['SKU-1', 'p-1']] },
    { name: 'prices', rows: [['sku', 'price_toman'], ['SKU-1', 125000]] },
  ],
};

function service(state = { currentPriceToman: 100000 }) {
  const lookup = { resolve: async ({ value }: any) => ({ variantId: 'variant-1', productId: 'product-1', sku: String(value), barcode: null }) } as any;
  const previews: any[] = [];
  const applies: any[] = [];
  const pricing = {
    preview: async (fingerprint: string, input: any[]) => {
      const items = input.map((x) => ({ ...x, currentBasePriceId: 'price-1', currentPriceToman: state.currentPriceToman, guardStatus: 'not_required', guardReason: null }));
      const result = { sourceFingerprint: fingerprint, previewHash: `${state.currentPriceToman}`.padStart(64, '0'), items };
      previews.push(result);
      return result;
    },
    apply: async (preview: any, hash: string) => { applies.push({ preview, hash }); return { affectedCount: preview.items.length }; },
  } as any;
  return { value: new PricingApplyService(lookup, pricing), previews, applies };
}

test('Step 50 A6 preview resolves SKU and preserves integer Toman intent', async () => {
  const { value, previews } = service();
  const preview = await value.preview(workbook);
  assert.equal(previews.length, 1);
  assert.equal(preview.items[0]?.variantId, 'variant-1');
  assert.equal(preview.items[0]?.proposedPriceToman, 125000);
  assert.match(preview.sourceFingerprint, /^[a-f0-9]{64}$/);
});

test('Step 50 A6 rejects non-integer negative and malformed Toman before Pricing mutation', async () => {
  const { value, previews } = service();
  for (const bad of [12.5, -1, 'not-money']) {
    const copy = structuredClone(workbook);
    copy.sheets[2].rows[1][1] = bad;
    await assert.rejects(() => value.preview(copy), (error: any) => error?.code === 'INVALID_MONEY');
  }
  assert.equal(previews.length, 0);
});

test('Step 50 A6 rejects duplicate SKU rows fail closed', async () => {
  const { value } = service();
  const copy = structuredClone(workbook);
  copy.sheets[2].rows.push(['SKU-1', 130000]);
  await assert.rejects(() => value.preview(copy), (error: any) => error?.code === 'EXCEL_PRICE_SKU_DUPLICATE');
});

test('Step 50 A6 apply requires exact server-derived pricing preview hash', async () => {
  const { value, applies } = service();
  const preview = await value.preview(workbook);
  await value.apply(workbook, preview.previewHash);
  assert.equal(applies.length, 1);
  await assert.rejects(() => value.apply(workbook, 'f'.repeat(64)), (error: any) => error?.code === 'EXCEL_PRICING_PREVIEW_STALE');
});

test('Step 50 A6 Pricing owns transaction stale-price guard profit guard audit and history append', () => {
  const source = readFileSync('src/modules/pricing/application/pricing-import-apply.service.ts', 'utf8');
  assert.match(source, /tx\.run/);
  assert.match(source, /PRICE_CHANGED_SINCE_PREVIEW/);
  assert.match(source, /PROFIT_GUARD_FAILED/);
  assert.match(source, /closeBasePriceAt/);
  assert.match(source, /insertBasePrice/);
  assert.match(source, /pricing\.base-price\.excel_apply/);
  assert.match(source, /source_fingerprint/);
});

test('Step 50 A6 Excel owns orchestration only and cannot write Pricing SQL directly', () => {
  const source = readFileSync('src/modules/excel/application/pricing-apply.service.ts', 'utf8');
  assert.doesNotMatch(source, /INSERT INTO|UPDATE pricing\.|DELETE FROM|PricingRepository|InventoryModule|PaymentsModule|FinanceModule/);
  assert.match(source, /PricingImportApplyService/);
  assert.match(source, /EXCEL_PRICING_PREVIEW_STALE/);
  const pricingSource = readFileSync('src/modules/pricing/application/pricing-import-apply.service.ts', 'utf8');
  assert.match(pricingSource, /sourceType: 'excel_import'/);
  assert.doesNotMatch(pricingSource, /inventory\.|payments\.|finance\./i);
});
