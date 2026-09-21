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
  };
}

function service(overrides:Record<string,unknown>={},quantity=2){
  const repo:any={
    listPublic:async()=>({data:[productRow()],nextCursor:null,hasMore:false}),
    searchPublic:async()=>({data:[productRow()],nextCursor:null,hasMore:false}),
    searchSuggestions:async()=>[{label:'تمپر',kind:'product',slug:'tamper'}],
    listVariants:async()=>[{id:'v1',status:'active',salesEnabled:true,effectiveSalesEnabled:true}],
    categoryBySlug:async()=>({id:'c1',name_fa:'ابزار',slug:'tools',status:'active',sales_enabled:true}),
    categoryFilters:async()=>[{id:'a1',key:'material',name_fa:'جنس',data_type:'text',unit:null,is_variant_attribute:false,values:null}],
    ...overrides,
  };
  const pricing:any={
    getProductPrices:async()=>({p1:{current_toman:125000,old_toman:null,discount_percent:null}}),
    getProductPrice:async()=>({current_toman:125000}),
    getVariantPrice:async()=>({current_toman:125000}),
  };
  const inventory:any={getOnlineSellableQuantity:async()=>quantity};
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

test('Step 60-B listing rejects undeclared filters instead of silently ignoring them',async()=>{
  const query=service();
  await assert.rejects(()=>query.listProducts({sort:'price_asc'}),/پارامتر پشتیبانی‌نشده: sort/);
  await assert.rejects(()=>query.listProducts({min_price:1000}),/پارامتر پشتیبانی‌نشده: min_price/);
  await assert.rejects(()=>query.search({q:'تمپر',available:true}),/پارامتر پشتیبانی‌نشده: available/);
});

test('Step 60-B category filter response normalizes missing value arrays',async()=>{
  const result=await service().categoryFilters('tools');
  assert.equal(result.category_id,'c1');
  assert.deepEqual(result.filters[0].values,[]);
});

test('Step 60-B OpenAPI exposes typed Search, Category, Filter and Suggestion contracts',()=>{
  const source=readFileSync('contracts/http/openapi.yaml','utf8');
  const generated=readFileSync('src/generated/openapi.ts','utf8');
  assert.match(source,/SearchResponse:/);
  assert.match(source,/CategoryFiltersResponse:/);
  assert.match(source,/SearchSuggestionsResponse:/);
  assert.match(source,/operationId: getCategoriesSlugProducts[\s\S]*ProductListResponse/);
  assert.match(source,/operationId: getCategoriesSlugFilters[\s\S]*CategoryFiltersResponse/);
  assert.match(source,/operationId: getSearchSuggestions[\s\S]*SearchSuggestionsResponse/);
  const products=source.slice(source.indexOf('  \/products:'),source.indexOf('  \/products\/{slug}:'));
  assert.doesNotMatch(products,/min_price|max_price|available|name: sort/);
  assert.match(generated,/'application\/json": components\["schemas"\]\["SearchResponse"\]/);
  assert.match(generated,/'application\/json": components\["schemas"\]\["CategoryFiltersResponse"\]/);
  assert.match(generated,/'application\/json": components\["schemas"\]\["SearchSuggestionsResponse"\]/);
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
