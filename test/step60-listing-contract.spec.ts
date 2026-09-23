import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service';

function productRow(){
  return {
    id:'p1',slug:'tamper',name_fa:'تمپر',brand_id:'b1',brand_name:'برند',brand_slug:'brand',
    category_id:'c1',category_name:'ابزار',category_slug:'tools',effective_sales_enabled:true,
    created_at:'2026-09-23T00:00:00.000Z',
  };
}

function service(overrides:Record<string,unknown>={},quantity=2){
  const repo:any={
    listPublic:async()=>({data:[productRow()],nextCursor:null,hasMore:false}),
    listPublicCandidates:async()=>[productRow()],
    searchPublic:async()=>({data:[productRow()],nextCursor:null,hasMore:false}),
    searchPublicCandidates:async()=>[{...productRow(),search_rank:0}],
    publicAttributeValues:async()=>[],
    searchSuggestions:async()=>[{label:'تمپر',kind:'product',slug:'tamper'}],
    listSellableVariantsForProducts:async()=>[{id:'v1',product_id:'p1'}],
    categoryBySlug:async()=>({id:'c1',name_fa:'ابزار',slug:'tools',status:'active',sales_enabled:true}),
    categoryFilters:async()=>[{id:'a1',key:'material',name_fa:'جنس',data_type:'text',unit:null,is_variant_attribute:false,values:null}],
    ...overrides,
  };
  const pricing:any={
    getProductPrices:async()=>({p1:{current_toman:125000,old_toman:null,discount_percent:null}}),
    getProductPrice:async()=>({current_toman:125000}),
    getVariantPrice:async()=>({current_toman:125000}),
  };
  const inventory:any={getOnlineSellableQuantities:async()=>({v1:quantity})};
  return new CatalogQueryService(repo,pricing,inventory);
}

test('Step 60-B listing uses authoritative inventory availability and canonical cursor payload',async()=>{
  let received:any;
  const query=service({listPublic:async(opts:any)=>{received=opts;return{data:[productRow()],nextCursor:'next',hasMore:true};}});
  const result=await query.listProducts({category:'tools',brand:'brand',limit:25,cursor:'cursor'});
  assert.deepEqual(received,{category:'tools',brand:'brand',limit:25,cursor:'cursor'});
  assert.equal(result.items[0].price.current_toman,125000);
  assert.equal(result.items[0].availability.sales_enabled,true);
  assert.equal(result.items[0].availability.in_stock,true);
  assert.deepEqual(result.pagination,{next_cursor:'next',has_more:true});
});

test('Step 60-B/60-F listing rejects undeclared keys and malformed advanced values',async()=>{
  const query=service();
  await assert.rejects(()=>query.listProducts({unknown:'x'}),/پارامتر پشتیبانی‌نشده: unknown/);
  await assert.rejects(()=>query.listProducts({sort:'alphabetical'}),/مرتب‌سازی نامعتبر/);
  await assert.rejects(()=>query.listProducts({min_price:'12.5'}),/عدد صحیح تومان/);
  await assert.rejects(()=>query.search({q:'تمپر',available:'maybe'}),/فیلتر موجودی نامعتبر/);
  await assert.rejects(()=>query.listProducts({limit:'abc'}),/محدوده باید عدد صحیح/);
  await assert.rejects(()=>query.search({q:'تمپر',limit:0}),/محدوده باید عدد صحیح/);
  await assert.rejects(()=>query.suggestions({q:'تمپر',limit:21}),/محدوده باید عدد صحیح/);
});

test('Step 60-B category filter response normalizes missing value arrays',async()=>{
  const result=await service().categoryFilters('tools');
  assert.equal(result.category_id,'c1');
  assert.deepEqual(result.filters[0].values,[]);
});

test('Step 60-B OpenAPI exposes typed Search, Category, Brand, Filter and Suggestion contracts',()=>{
  const source=readFileSync('contracts/http/openapi.yaml','utf8');
  const generated=readFileSync('src/generated/openapi.ts','utf8');
  assert.match(source,/SearchResponse:/);
  assert.match(source,/CategoryFiltersResponse:/);
  assert.match(source,/SearchSuggestionsResponse:/);
  assert.match(source,/operationId: getCategoriesSlugProducts[\s\S]*ProductListResponse/);
  assert.match(source,/operationId: getCategoriesSlugFilters[\s\S]*CategoryFiltersResponse/);
  assert.match(source,/operationId: getBrandsSlugProducts[\s\S]*ProductListResponse/);
  assert.match(source,/operationId: getSearchSuggestions[\s\S]*SearchSuggestionsResponse/);
  const products=source.slice(source.indexOf('  \/products:'),source.indexOf('  \/products\/{slug}:'));
  assert.match(products,/name: min_price/);
  assert.match(products,/name: max_price/);
  assert.match(products,/name: available/);
  assert.match(products,/name: sort/);
  assert.match(products,/name: attribute_value/);
  assert.match(source,/ListingFacets:/);
  assert.match(generated,/"application\/json": components\["schemas"\]\["SearchResponse"\]/);
  assert.match(generated,/"application\/json": components\["schemas"\]\["CategoryFiltersResponse"\]/);
  assert.match(generated,/"application\/json": components\["schemas"\]\["SearchSuggestionsResponse"\]/);
});

test('Step 60-B generated OpenAPI is byte-for-byte reproducible from canonical source',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eqcofe-openapi-'));
  const output=join(dir,'openapi.ts');
  const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
  try{
    execFileSync(pnpm,['exec','openapi-typescript','contracts/http/openapi.yaml','-o',output],{stdio:'pipe'});
    const actual=readFileSync('src/generated/openapi.ts','utf8');
    const expected=readFileSync(output,'utf8');
    if(actual!==expected){
      const a=actual.split('\\n');
      const e=expected.split('\\n');
      const diffs=[] as string[];
      const max=Math.max(a.length,e.length);
      for(let i=0;i<max&&diffs.length<120;i++){
        if(a[i]!==e[i]) diffs.push(`L${i+1} CURRENT=${JSON.stringify(a[i]??'')} EXPECTED=${JSON.stringify(e[i]??'')}`);
      }
      assert.fail(`generated OpenAPI drift (first ${diffs.length} differing lines)\\n${diffs.join('\\n')}`);
    }
  }finally{
    rmSync(dir,{recursive:true,force:true});
  }
});

test('Step 60-B listing availability uses two bounded batch calls and mandatory authority',async()=>{
  let catalogBatchCalls=0;
  let inventoryBatchCalls=0;
  const query=service({
    listPublic:async()=>({data:[productRow(),{...productRow(),id:'p2',slug:'grinder'}],nextCursor:null,hasMore:false}),
    listPublicCandidates:async()=>[productRow(),{...productRow(),id:'p2',slug:'grinder'}],
    listSellableVariantsForProducts:async()=>{catalogBatchCalls++;return[{id:'v1',product_id:'p1'},{id:'v2',product_id:'p2'},{id:'v3',product_id:'p2'}];},
  });
  (query as any).inventory.getOnlineSellableQuantities=async()=>{inventoryBatchCalls++;return{v1:2,v2:0,v3:4};};
  const result=await query.listProducts({});
  assert.equal(catalogBatchCalls,1);
  assert.equal(inventoryBatchCalls,1);
  assert.equal(result.items[0].availability.in_stock,true);
  assert.equal(result.items[1].availability.in_stock,true);
  const source=readFileSync('src/modules/catalog/application/catalog-query.service.ts','utf8');
  assert.doesNotMatch(source,/Optional\(\).*INVENTORY_AVAILABILITY_PORT/s);
  assert.match(source,/getOnlineSellableQuantities/);
});

test('Step 60-B repository uses stable composite cursors and fail-closed decoders',async()=>{
  const repository=await import('../src/modules/catalog/infrastructure/catalog.repository');
  const list=Buffer.from(JSON.stringify({v:1,kind:'list',category:'tools',brand:null,created_at:'2026-09-21T00:00:00.000Z',id:'11111111-1111-4111-8111-111111111111'})).toString('base64url');
  assert.equal(repository.decodeListCursor(list,'TOOLS',undefined)?.id,'11111111-1111-4111-8111-111111111111');
  assert.throws(()=>repository.decodeListCursor('not-json','tools',undefined),/نشانگر صفحه نامعتبر/);
  assert.throws(()=>repository.decodeListCursor(list,'other',undefined),/با فیلترهای فعلی سازگار نیست/);
  const search=Buffer.from(JSON.stringify({v:1,kind:'search',query:'تمپر',rank:1,created_at:'2026-09-21T00:00:00.000Z',id:'11111111-1111-4111-8111-111111111111'})).toString('base64url');
  assert.equal(repository.decodeSearchCursor(search,'تمپر')?.rank,1);
  assert.throws(()=>repository.decodeSearchCursor(search,'آسیاب'),/با عبارت فعلی سازگار نیست/);
  const source=readFileSync('src/modules/catalog/infrastructure/catalog.repository.ts','utf8');
  assert.match(source,/p\.created_at = .*p\.id </s);
  assert.match(source,/search_rank,p\.created_at DESC,p\.id DESC/);
});

test('Step 60-B scoped listing routes reject path-scope overrides and invalid slugs',async()=>{
  const query=service({
    categoryBySlug:async(slug:string)=>slug==='tools'?{id:'c1',slug}:null,
    brandBySlug:async(slug:string)=>slug==='brand'?{id:'b1',slug}:null,
  });
  await assert.rejects(()=>query.categoryProducts('tools',{category:'other'}),/پارامتر پشتیبانی‌نشده: category/);
  await assert.rejects(()=>query.brandProducts('brand',{brand:'other'}),/پارامتر پشتیبانی‌نشده: brand/);
  await assert.rejects(()=>query.listProducts({category:'TOOLS'}),/دسته نامعتبر است/);
  await assert.rejects(()=>query.listProducts({brand:'x'.repeat(181)}),/برند نامعتبر است/);
});

test('Step 60-B cursor input is bounded before base64 decoding',async()=>{
  const repository=await import('../src/modules/catalog/infrastructure/catalog.repository');
  assert.throws(()=>repository.decodeListCursor('x'.repeat(1025),undefined,undefined),/نشانگر صفحه نامعتبر/);
  const source=readFileSync('src/modules/catalog/infrastructure/catalog.repository.ts','utf8');
  assert.match(source,/raw\.length>1024[\s\S]*Buffer\.from\(raw,'base64url'\)/);
  const openapi=readFileSync('contracts/http/openapi.yaml','utf8');
  assert.match(openapi,/Cursor:\s+[\s\S]*?minLength: 1\s+[\s\S]*?maxLength: 1024/);
  assert.match(openapi,/\/brands\/\{slug\}\/products:[\s\S]*?ProductListResponse/);
});