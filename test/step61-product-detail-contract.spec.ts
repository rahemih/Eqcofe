import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service';

function service() {
  const repo:any = {
    publicProductBySlug: async (slug:string) => slug === 'espresso-maker' ? {
      id:'p1', name_fa:'اسپرسوساز', name_en:'Espresso Maker', slug,
      short_description:'خلاصه', description:'توضیحات',
      brand_id:'b1', brand_name:'برند', brand_slug:'brand',
      primary_category_id:'c1', category_name:'تجهیزات', category_slug:'equipment',
      effective_sales_enabled:true, sales_enabled:true, version:3,
      published_at:new Date('2026-09-01T00:00:00Z'), updated_at:new Date('2026-09-02T00:00:00Z'),
    } : null,
    additionalCategories: async () => [],
    publicProductMedia: async () => [
      { id:'m1', variant_id:null, media_type:'image', sort_order:0, is_primary:true, alt_text_fa:'نمای اصلی', storage_key:'/media/a.webp', mime_type:'image/webp', width:1200, height:1200 },
      { id:'m2', variant_id:'v1', media_type:'video', sort_order:1, is_primary:false, alt_text_fa:null, storage_key:'/media/a.mp4', mime_type:'video/mp4', width:1920, height:1080 },
    ],
    productAttributes: async () => [
      { attribute_id:'a1', key:'power', name_fa:'توان', unit:'W', data_type:'number', is_filterable:true, is_comparable:true, attribute_value_id:'av1', value_text:null, value_numeric:1350, value_boolean:null, normalized_value:'1350' },
    ],
    listVariants: async () => [
      { id:'v1', productId:'p1', sku:'SKU-1', barcode:null, nameSuffix:'مشکی', status:'active', salesEnabled:true, effectiveSalesEnabled:true, weightGrams:4200, version:2 },
      { id:'v2', productId:'p1', sku:'SKU-2', barcode:null, nameSuffix:'پیش‌نویس', status:'draft', salesEnabled:true, effectiveSalesEnabled:false, weightGrams:4100, version:1 },
    ],
    variantAttributes: async (id:string) => id === 'v1'
      ? [{ attribute_id:'va1', key:'color', name_fa:'رنگ', unit:null, data_type:'text', attribute_value_id:'vav1', value_text:'مشکی', value_numeric:null, value_boolean:null, normalized_value:'black' }]
      : [],
  };
  const pricing:any = {
    getProductPrice: async () => ({ current_toman:12500000, old_toman:null, discount_percent:null }),
    getVariantPrice: async (id:string) => id === 'v1' ? ({ current_toman:12500000, old_toman:null, discount_percent:null }) : null,
  };
  const inventory:any = {
    getOnlineSellableQuantities: async (ids:string[]) => Object.fromEntries(ids.map(id => [id, id === 'v1' ? 7 : 0])),
  };
  return new CatalogQueryService(repo, pricing, inventory);
}

test('Step 61-B public Product Detail exposes authoritative typed detail and active variants only', async () => {
  const query:any = service();
  const product = await query.product('espresso-maker');
  assert.equal(product.short_description, 'خلاصه');
  assert.equal(product.description, 'توضیحات');
  assert.equal(product.price.current_toman, 12500000);
  assert.equal(product.media.length, 2);
  assert.deepEqual(product.media.map((m:any) => m.media_type), ['image','video']);
  assert.equal(product.primary_image.id, 'm1');
  assert.equal(product.specifications[0].key, 'power');
  assert.equal(product.variants.length, 1);
  assert.equal(product.variants[0].id, 'v1');
  assert.deepEqual(product.variants[0].availability, { sales_enabled:true, in_stock:true, available_quantity:7 });
  assert.equal(product.variants[0].attributes[0].key, 'color');

  const adminVariants = await query.variants('p1');
  assert.equal(adminVariants.length, 2, 'admin variant projection must retain non-active records');
});

test('Step 61-B public media repository fails closed to active image/video media', () => {
  const source = readFileSync('src/modules/catalog/infrastructure/catalog.repository.ts','utf8');
  assert.match(source, /publicProductMedia\(productId:string\)/);
  assert.match(source, /m\.status='active'/);
  assert.match(source, /pm\.media_type IN \('image','video'\)/);
  assert.match(source, /pm\.variant_id IS NULL OR v\.status='active'/);
});

test('Step 61-B OpenAPI and generated types own Product Detail and public variants', () => {
  const openapi = readFileSync('contracts/http/openapi.yaml','utf8');
  const generated = readFileSync('src/generated/openapi.ts','utf8');
  assert.match(openapi, /PublicProductResponse:/);
  assert.match(openapi, /PublicProductMediaView:/);
  assert.match(openapi, /PublicVariantResponse:/);
  assert.match(openapi, /ProductSpecificationView:/);
  assert.match(openapi, /operationId: getProduct[\s\S]*PublicProductResponse/);
  assert.match(openapi, /operationId: getProductsSlugVariants[\s\S]*PublicVariantResponse/);
  assert.doesNotMatch(openapi.match(/PublicProductMediaView:[\s\S]*?PublicVariantResponse:/)?.[0] ?? '', /3d|360/i);
  assert.match(generated, /PublicProductResponse: \{/);
  assert.match(generated, /PublicProductMediaView: \{/);
  assert.match(generated, /PublicVariantResponse: \{/);
  assert.match(generated, /"application\/json": components\["schemas"\]\["PublicProductResponse"\]/);
});

test('Step 61-B preserves authoritative add-to-cart boundary without Cart mutation', () => {
  const openapi = readFileSync('contracts/http/openapi.yaml','utf8');
  const cart = readFileSync('src/modules/cart/application/cart.service.ts','utf8');
  assert.match(openapi, /operationId: addCartItem/);
  assert.match(openapi, /variant_id:[\s\S]*quantity:/);
  assert.match(cart, /getOnlineSellableQuantity\(variantId\)/);
  assert.match(cart, /INSUFFICIENT_STOCK/);
});
