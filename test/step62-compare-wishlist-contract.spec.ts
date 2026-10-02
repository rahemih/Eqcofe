import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const openapi = readFileSync('contracts/http/openapi.yaml','utf8');
const generated = readFileSync('src/generated/openapi.ts','utf8');
const catalogController = readFileSync('src/modules/catalog/presentation/catalog.controller.ts','utf8');
const catalogService = readFileSync('src/modules/catalog/application/catalog-query.service.ts','utf8');
const customerController = readFileSync('src/modules/customer/presentation/customer.controller.ts','utf8');
const wishlistService = readFileSync('src/modules/customer/application/customer-wishlist.service.ts','utf8');

test('compare runtime remains backend-authoritative and bounded to four same-category products',()=>{
  assert.match(catalogController,/@Post\('compare\/validate'\)/);
  assert.match(catalogController,/@Public\(\) @Post\('compare'\)/);
  assert.match(catalogService,/ids\.length < 1 \|\| ids\.length > 4/);
  assert.match(catalogService,/new Set\(ids\)/);
  assert.match(catalogService,/COMPARE_CATEGORY_MISMATCH/);
  assert.match(catalogService,/pricing\.getProductPrice/);
  assert.match(catalogService,/filter\(\(attribute: any\) => attribute\.is_comparable\)/);
});

test('compare OpenAPI exposes typed validate and comparison results without a false 202',()=>{
  const validate = openapi.slice(openapi.indexOf('  /compare/validate:'), openapi.indexOf('  /articles:'));
  const compare = openapi.slice(openapi.indexOf('  /compare:'), openapi.indexOf('  /auth/otp/request:'));
  assert.match(validate,/CompareValidationResponse/);
  assert.match(validate,/'404':/);
  assert.match(validate,/'422':/);
  assert.doesNotMatch(validate,/'202':/);
  assert.match(validate,/security: \[\]/);
  assert.match(compare,/CompareResponse/);
  assert.match(compare,/maxItems: 4/);
  assert.match(compare,/uniqueItems: true/);
  assert.match(compare,/'404':/);
  assert.match(compare,/'422':/);
  assert.match(compare,/security: \[\]/);
});

test('wishlist runtime remains customer-only and idempotent with no delete response body',()=>{
  assert.match(customerController,/@CustomerOnly\(\) @Get\('customer\/wishlist'\)/);
  assert.match(customerController,/@RequireIdempotency\('customer\.wishlist\.add'\)/);
  assert.match(customerController,/@HttpCode\(HttpStatus\.OK\) @Post\('customer\/wishlist\/:product_id'\)/);
  assert.match(customerController,/@RequireIdempotency\('customer\.wishlist\.remove'\)/);
  assert.match(customerController,/@HttpCode\(HttpStatus\.NO_CONTENT\) @Delete\('customer\/wishlist\/:product_id'\)/);
  assert.match(wishlistService,/already_present:true/);
  assert.match(wishlistService,/already_absent:true/);
  assert.match(wishlistService,/productExists\(productId\)/);
  assert.match(wishlistService,/CUSTOMER_REQUIRED/);
  assert.match(wishlistService,/CUSTOMER_INACTIVE/);
});

test('wishlist OpenAPI matches auth, idempotency, UUID and status semantics',()=>{
  const wishlist = openapi.slice(openapi.indexOf('  /customer/wishlist:'), openapi.indexOf('  /customer/product-alerts:'));
  assert.match(wishlist,/WishlistListResponse/);
  assert.match(wishlist,/WishlistAddResponse/);
  assert.match(wishlist,/IdempotencyKey/);
  assert.match(wishlist,/\$ref: '#\/components\/schemas\/EntityId'/);
  assert.match(wishlist,/'400':/);
  assert.match(wishlist,/'401':/);
  assert.match(wishlist,/'404':/);
  assert.match(wishlist,/'422':/);
  assert.doesNotMatch(wishlist,/'202':/);
  const del = wishlist.slice(wishlist.indexOf('    delete:'));
  assert.match(del,/'204':/);
  assert.doesNotMatch(del,/WishlistAddResponse/);
});

test('generated OpenAPI contains the Step 62 Compare/Wishlist types',()=>{
  for(const name of ['CompareVariantView','CompareProductView','CompareResponse','CompareValidationResponse','WishlistItem','WishlistListResponse','WishlistAddResponse']){
    assert.match(generated,new RegExp(name));
  }
  assert.match(generated,/content: \{\s*"application\/json": components\["schemas"\]\["CompareResponse"\]/s);
  assert.match(generated,/content: \{\s*"application\/json": components\["schemas"\]\["WishlistListResponse"\]/s);
  assert.match(generated,/product_id: components\["schemas"\]\["EntityId"\]/);
});

test('generated contract is byte-for-byte reproducible from canonical OpenAPI',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eqcofe-step62-openapi-'));
  const output=join(dir,'openapi.ts');
  const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
  try{
    execFileSync(pnpm,['exec','openapi-typescript','contracts/http/openapi.yaml','-o',output],{stdio:'pipe'});
    assert.equal(readFileSync('src/generated/openapi.ts','utf8'),readFileSync(output,'utf8'));
  }finally{
    rmSync(dir,{recursive:true,force:true});
  }
});
