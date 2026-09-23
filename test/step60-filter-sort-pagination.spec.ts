import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service';

const ids={
  p1:'11111111-1111-4111-8111-111111111111',
  p2:'22222222-2222-4222-8222-222222222222',
  p3:'33333333-3333-4333-8333-333333333333',
  b1:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  b2:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  c1:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  a1:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  red:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  blue:'ffffffff-ffff-4fff-8fff-ffffffffffff',
};

function row(id:string,brand:string,brandName:string,created:string,rank=2){
  return {
    id,
    slug:'product-'+id.slice(0,4),
    name_fa:'محصول '+id.slice(0,4),
    brand_id:brand,
    brand_name:brandName,
    brand_slug:brand===ids.b1?'brand-a':'brand-b',
    category_id:ids.c1,
    category_name:'ابزار',
    category_slug:'tools',
    effective_sales_enabled:true,
    created_at:created,
    search_rank:rank,
  };
}

function harness(candidateOverride?:any[]){
  const candidates=candidateOverride??[
    row(ids.p1,ids.b1,'برند الف','2026-09-23T03:00:00.000Z',0),
    row(ids.p2,ids.b2,'برند ب','2026-09-23T02:00:00.000Z',1),
    row(ids.p3,ids.b1,'برند الف','2026-09-23T01:00:00.000Z',2),
  ];
  let priceCalls=0,inventoryCalls=0,catalogVariantCalls=0;
  const repo:any={
    listPublic:async()=>({data:candidates.slice(0,2),nextCursor:null,hasMore:false}),
    searchPublic:async()=>({data:candidates.slice(0,2),nextCursor:null,hasMore:false}),
    listPublicCandidates:async()=>candidates,
    searchPublicCandidates:async()=>candidates,
    listSellableVariantsForProducts:async(productIds:string[])=>{
      catalogVariantCalls++;
      return productIds.map((id,index)=>({id:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,product_id:id}));
    },
    publicAttributeValues:async()=>[
      {product_id:ids.p1,attribute_value_id:ids.red},
      {product_id:ids.p2,attribute_value_id:ids.blue},
      {product_id:ids.p3,attribute_value_id:ids.red},
    ],
    categoryBySlug:async(slug:string)=>slug==='tools'?{id:ids.c1,name_fa:'ابزار',slug,status:'active',sales_enabled:true}:null,
    categoryFilters:async()=>[{
      id:ids.a1,key:'color',name_fa:'رنگ',data_type:'text',unit:null,is_variant_attribute:false,
      values:[
        {id:ids.red,value_text:'قرمز',sort_order:1},
        {id:ids.blue,value_text:'آبی',sort_order:2},
      ],
    }],
    brandBySlug:async(slug:string)=>({id:ids.b1,slug}),
    searchSuggestions:async()=>[],
  };
  const pricing:any={
    getProductPrices:async()=>{
      priceCalls++;
      return {
        [ids.p1]:{current_toman:300000,old_toman:null,discount_percent:null},
        [ids.p2]:{current_toman:100000,old_toman:null,discount_percent:null},
        [ids.p3]:{current_toman:200000,old_toman:null,discount_percent:null},
      };
    },
    getProductPrice:async()=>null,
    getVariantPrice:async()=>null,
  };
  const inventory:any={
    getOnlineSellableQuantities:async(variantIds:string[])=>{
      inventoryCalls++;
      return Object.fromEntries(variantIds.map((id,index)=>[id,index===1?0:5]));
    },
  };
  return {
    service:new CatalogQueryService(repo,pricing,inventory),
    counts:()=>({priceCalls,inventoryCalls,catalogVariantCalls}),
  };
}

test('Step 60-F applies authoritative price availability brand and attribute filters server-side',async()=>{
  const h=harness();
  const result=await h.service.categoryProducts('tools',{
    brand:'brand-a',
    min_price:'150000',
    max_price:'350000',
    available:'true',
    attribute_value:ids.red,
    sort:'price_asc',
    limit:25,
  });
  assert.deepEqual(result.items.map((x:any)=>x.id),[ids.p3,ids.p1]);
  assert.deepEqual(result.items.map((x:any)=>x.price.current_toman),[200000,300000]);
  assert.equal(result.items.every((x:any)=>x.availability.in_stock),true);
  assert.equal(result.facets.filtering_available,true);
  assert.deepEqual(result.facets.price_range,{min_toman:100000,max_toman:300000});
  assert.deepEqual(h.counts(),{priceCalls:1,inventoryCalls:1,catalogVariantCalls:1});
});

test('Step 60-F search preserves relevance by default and supports explicit price sort',async()=>{
  const relevance=harness();
  const defaultResult=await relevance.service.search({q:'محصول',limit:25});
  assert.deepEqual(defaultResult.items.map((x:any)=>x.id),[ids.p1,ids.p2]);

  const priced=harness();
  const sorted=await priced.service.search({q:'محصول',sort:'price_desc',limit:25});
  assert.deepEqual(sorted.items.map((x:any)=>x.id),[ids.p1,ids.p3,ids.p2]);
});

test('Step 60-F filtered cursor is bound to the full query fingerprint',async()=>{
  const h=harness();
  const first=await h.service.categoryProducts('tools',{sort:'price_asc',limit:1});
  assert.equal(first.pagination.has_more,true);
  assert.ok(first.pagination.next_cursor);

  const second=await h.service.categoryProducts('tools',{
    sort:'price_asc',
    limit:1,
    cursor:first.pagination.next_cursor,
  });
  assert.equal(second.items[0].id,ids.p3);

  await assert.rejects(
    ()=>h.service.categoryProducts('tools',{
      sort:'price_desc',
      limit:1,
      cursor:first.pagination.next_cursor,
    }),
    /نشانگر صفحه با فیلترهای فعلی سازگار نیست/,
  );
});

test('Step 60-F advanced filtering fails closed above candidate safety bound while basic pagination remains available',async()=>{
  const many=Array.from({length:501},(_,index)=>row(
    `${String(index+1).padStart(8,'0')}-1111-4111-8111-${String(index+1).padStart(12,'0')}`,
    ids.b1,
    'برند الف',
    new Date(Date.UTC(2026,8,23,0,0,0)-index*1000).toISOString(),
  ));
  const advanced=harness(many);
  await assert.rejects(
    ()=>advanced.service.listProducts({available:'true',limit:25}),
    /دامنه فهرست.*بیش از حد بزرگ/,
  );

  const basic=harness(many);
  const result=await basic.service.listProducts({limit:25});
  assert.equal(result.items.length,2);
  assert.equal(result.facets.filtering_available,false);
  assert.match(result.facets.disabled_reason,/بیش از حد بزرگ/);
});

test('Step 60-F validates category attribute selections and integer Toman bounds fail closed',async()=>{
  const h=harness();
  await assert.rejects(
    ()=>h.service.categoryProducts('tools',{attribute_value:'99999999-9999-4999-8999-999999999999'}),
    /مقدار فیلتر ویژگی برای این دسته معتبر نیست/,
  );
  await assert.rejects(()=>h.service.listProducts({min_price:'1.5'}),/عدد صحیح تومان/);
  await assert.rejects(()=>h.service.listProducts({min_price:'200',max_price:'100'}),/بازه قیمت نامعتبر/);
});

test('Step 60-F implementation does not write or import Pricing or Inventory internals',()=>{
  const service=readFileSync('src/modules/catalog/application/catalog-query.service.ts','utf8');
  const repository=readFileSync('src/modules/catalog/infrastructure/catalog.repository.ts','utf8');
  const task=JSON.parse(readFileSync('docs/14-multi-agent/tasks/EQCOFE-STEP60-F-FILTER-SORT-PAGE-001.json','utf8'));
  assert.match(service,/PRICING_PUBLIC_PORT/);
  assert.match(service,/INVENTORY_AVAILABILITY_PORT/);
  assert.doesNotMatch(repository,/pricing\.|inventory\.stock_balances|inventory\.warehouses/);
  assert(task.scope.forbidden.includes('src/modules/pricing/**'));
  assert(task.scope.forbidden.includes('src/modules/inventory/**'));
});
