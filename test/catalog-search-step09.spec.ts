import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service';

function service(overrides:Record<string,unknown>={}){
  const repo:any={
    searchPublic:async()=>({data:[{id:'p1',slug:'tamper',name_fa:'تمپر',brand_id:'b1',brand_name:'برند',brand_slug:'brand',category_id:'c1',category_name:'ابزار',category_slug:'tools',effective_sales_enabled:true}],nextCursor:null,hasMore:false}),
    searchSuggestions:async()=>[{label:'تمپر',kind:'product',slug:'tamper'}],
    ...overrides,
  };
  const pricing:any={getProductPrices:async()=>({p1:{amount_toman:1000}})};
  return new CatalogQueryService(repo,pricing);
}

test('Step 09 search rejects an empty query and bounds query length',async()=>{
  const query=service();
  await assert.rejects(()=>query.search({q:'   '}),/عبارت جستجو الزامی است/);
  await assert.rejects(()=>query.search({q:'x'.repeat(201)}),/بیش از حد طولانی/);
});

test('Step 09 search returns priced public read models with cursor pagination',async()=>{
  let received:any;
  const query=service({searchPublic:async(opts:any)=>{received=opts;return{data:[{id:'p1',slug:'tamper',name_fa:'تمپر',brand_id:'b1',brand_name:'برند',brand_slug:'brand',category_id:'c1',category_name:'ابزار',category_slug:'tools',effective_sales_enabled:true}],nextCursor:'next',hasMore:true};}});
  const result=await query.search({q:'  تمپر  ',limit:500,cursor:'cursor'});
  assert.deepEqual(received,{query:'تمپر',limit:100,cursor:'cursor'});
  assert.equal(result.query,'تمپر');
  assert.equal(result.items[0].price.amount_toman,1000);
  assert.deepEqual(result.pagination,{next_cursor:'next',has_more:true});
});

test('Step 09 suggestions are safe for blank input and bounded for populated input',async()=>{
  let calls=0;
  const query=service({searchSuggestions:async(q:string,limit:number)=>{calls++;assert.equal(q,'آسیاب');assert.equal(limit,20);return[{label:'آسیاب',kind:'product',slug:'grinder'}];}});
  assert.deepEqual(await query.suggestions({q:' '}),{query:'',suggestions:[]});
  const result=await query.suggestions({q:' آسیاب ',limit:99});
  assert.equal(calls,1);
  assert.equal(result.suggestions[0].slug,'grinder');
});

test('Step 09 public HTTP routes delegate to the Catalog-owned query boundary',()=>{
  const controller=readFileSync('src/modules/catalog/presentation/catalog.controller.ts','utf8');
  const repository=readFileSync('src/modules/catalog/infrastructure/catalog.repository.ts','utf8');
  assert.match(controller,/@Public\(\) @Get\('search'\) search/);
  assert.match(controller,/@Public\(\) @Get\('search\/suggestions'\) searchSuggestions/);
  assert.match(repository,/p\.status='published'/);
  assert.doesNotMatch(repository,/INSERT INTO search\.|UPDATE search\.|DELETE FROM search\./i);
});
