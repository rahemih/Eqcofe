import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSearchRouteData } from "../app/features/search/search-data.server.js";
import { loadCategoryRouteData } from "../app/features/category/category-data.server.js";
import {
  parseListingUrlState,
  serializeListingUrlState,
  updateListingUrlState,
} from "../app/features/listing/listing-url-state.js";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const controls=readFileSync(resolve(root,"app/features/listing/ListingControls.tsx"),"utf8");
const pagination=readFileSync(resolve(root,"app/features/listing/ListingPagination.tsx"),"utf8");
const searchRoute=readFileSync(resolve(root,"app/routes/search.tsx"),"utf8");
const categoryRoute=readFileSync(resolve(root,"app/routes/category.tsx"),"utf8");
const css=readFileSync(resolve(root,"app/styles/listing-controls.css"),"utf8");
const messages=readFileSync(resolve(root,"app/i18n/fa-IR.ts"),"utf8");
const openapi=readFileSync(resolve(root,"../../contracts/http/openapi.yaml"),"utf8");
const generated=readFileSync(resolve(root,"../../src/generated/openapi.ts"),"utf8");

const red="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const blue="ffffffff-ffff-4fff-8fff-ffffffffffff";
const parsed=parseListingUrlState(
  `?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8&brand=valid-brand&min_price=100000&max_price=500000&available=true&sort=price_asc&limit=25`,
  "search",
);
assert.equal(parsed.q,"آسیاب");
assert.equal(parsed.brand,"valid-brand");
assert.equal(parsed.minPrice,100000);
assert.equal(parsed.maxPrice,500000);
assert.equal(parsed.available,true);
assert.equal(parsed.sort,"price_asc");
assert.throws(
  ()=>parseListingUrlState(`?q=test&attribute_value=${red}`,"search"),
  /Attribute filters require a category listing/,
);

const collection=parseListingUrlState(
  `?brand=valid-brand&available=true&attribute_value=${blue}&attribute_value=${red}&cursor=opaque`,
  "collection",
);
assert.deepEqual(collection.attributeValueIds,[red,blue].sort());
assert.equal(
  serializeListingUrlState(collection),
  `brand=valid-brand&available=true&attribute_value=${red}&attribute_value=${blue}&cursor=opaque`,
);
assert.equal(updateListingUrlState(collection,{brand:"other"}).cursor,undefined);
assert.equal(updateListingUrlState(collection,{available:undefined}).cursor,undefined);
assert.equal(updateListingUrlState(collection,{cursor:"next"}).cursor,"next");

let searchCalls=0;
const search=await loadSearchRouteData(
  new Request("https://store.example/search?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8&brand=valid-brand&min_price=100000&max_price=500000&available=true&sort=price_desc&limit=25"),
  {
    config:{baseUrl:"https://api.example.test"},
    fetchImpl:async(input)=>{
      searchCalls++;
      const url=new URL(String(input));
      assert.equal(url.pathname,"/search");
      assert.equal(url.searchParams.get("q"),"آسیاب");
      assert.equal(url.searchParams.get("brand"),"valid-brand");
      assert.equal(url.searchParams.get("min_price"),"100000");
      assert.equal(url.searchParams.get("max_price"),"500000");
      assert.equal(url.searchParams.get("available"),"true");
      assert.equal(url.searchParams.get("sort"),"price_desc");
      return jsonResponse(200,searchPayload());
    },
  },
);
assert.equal(searchCalls,1);
assert.equal(search.data.listing?.facets.filtering_available,true);
assert.equal(search.data.urlState.sort,"price_desc");

const categoryCalls:string[]=[];
const category=await loadCategoryRouteData(
  new Request(`https://store.example/category/grinders?brand=valid-brand&available=true&sort=price_asc&attribute_value=${red}`),
  "grinders",
  {
    config:{baseUrl:"https://api.example.test"},
    fetchImpl:async(input)=>{
      const url=new URL(String(input));
      categoryCalls.push(url.pathname);
      if(url.pathname==="/categories/grinders") return jsonResponse(200,categoryPayload());
      if(url.pathname==="/categories/grinders/filters") return jsonResponse(200,filterPayload());
      if(url.pathname==="/categories/grinders/products"){
        assert.equal(url.searchParams.get("brand"),"valid-brand");
        assert.equal(url.searchParams.get("available"),"true");
        assert.equal(url.searchParams.get("sort"),"price_asc");
        assert.deepEqual(url.searchParams.getAll("attribute_value"),[red]);
        return jsonResponse(200,categoryPayloadProducts());
      }
      return jsonResponse(404,{error:"unexpected"});
    },
  },
);
assert.deepEqual(categoryCalls,[
  "/categories/grinders",
  "/categories/grinders/filters",
  "/categories/grinders/products",
]);
assert.equal(category.data.categoryFilters?.filters[0].values[0].id,red);
assert.equal(category.data.listing?.facets.filtering_available,true);

for(const token of [
  'name="sort"',
  'name="available"',
  'name="brand"',
  'name="min_price"',
  'name="max_price"',
  'name="attribute_value"',
  "clearListingFilters",
  "updateListingUrlState",
]) assert.ok(controls.includes(token),"STEP60_F_CONTROL_MISSING:"+token);
assert.match(controls,/<Form method="get"/);
assert.doesNotMatch(controls,/localStorage|sessionStorage|useState\s*\(/);
assert.match(pagination,/next_cursor/);
assert.match(pagination,/updateListingUrlState/);
assert.match(searchRoute,/ListingControls/);
assert.match(searchRoute,/ListingPagination/);
assert.match(categoryRoute,/ListingControls/);
assert.match(categoryRoute,/ListingPagination/);
assert.doesNotMatch(searchRoute+categoryRoute,/items\.sort\s*\(|items\.filter\s*\(/);

for(const token of [
  "فیلتر و مرتب‌سازی",
  "فقط کالاهای موجود",
  "بازه قیمت",
  "اعمال فیلترها",
  "پاک‌کردن انتخاب‌ها",
  "صفحه بعد",
]) assert.ok(messages.includes(token),"STEP60_F_COPY_MISSING:"+token);

assert.doesNotMatch(css,/\bbrown\b/i);
assert.doesNotMatch(css,/(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m);
assert.match(css,/min-block-size: var\(--eq-size-touch-min\)/);
assert.match(css,/@media \(min-width: 840px\)/);

for(const token of [
  "name: min_price",
  "name: max_price",
  "name: available",
  "name: sort",
  "name: attribute_value",
  "ListingFacets:",
]) assert.ok(openapi.includes(token),"STEP60_F_OPENAPI_MISSING:"+token);
assert.match(generated,/sort\?: "relevance" \| "newest" \| "price_asc" \| "price_desc"/);
assert.match(generated,/attribute_value\?: components\["schemas"\]\["EntityId"\]\[\]/);
assert.match(generated,/filtering_available: boolean/);

console.log(JSON.stringify({
  status:"PASS",
  stage:"60-F",
  backendAuthority:true,
  urlState:["q","brand","min_price","max_price","available","sort","attribute_value","limit","cursor"],
  cursorResetOnFilterChange:true,
  categoryFilterMetadata:"AUTHORITATIVE",
  clientProductReranking:false,
  primaryControls:["sort","availability","brand","price-range","apply","clear","removable-selections"],
  pagination:"opaque-next-cursor",
},null,2));

function facets(){
  return {
    filtering_available:true,
    disabled_reason:null,
    brands:[{id:"00000000-0000-4000-8000-000000000011",name_fa:"برند معتبر",slug:"valid-brand"}],
    price_range:{min_toman:100000,max_toman:500000},
    availability:{in_stock_count:1,out_of_stock_count:0},
  };
}
function card(){
  return {
    id:"00000000-0000-4000-8000-000000000001",
    slug:"valid-product",
    name:"محصول معتبر",
    brand:{id:"00000000-0000-4000-8000-000000000011",name_fa:"برند معتبر",slug:"valid-brand"},
    primary_category:{id:"00000000-0000-4000-8000-000000000031",name_fa:"آسیاب",slug:"grinders"},
    primary_image:null,
    price:{current_toman:200000},
    availability:{sales_enabled:true,in_stock:true},
  };
}
function searchPayload(){
  return {query:"آسیاب",items:[card()],pagination:{next_cursor:"next-token",has_more:true},facets:facets()};
}
function categoryPayload(){
  return {id:"00000000-0000-4000-8000-000000000031",parent_id:null,name_fa:"آسیاب",slug:"grinders",description:null,status:"active",sales_enabled:true};
}
function filterPayload(){
  return {
    category_id:"00000000-0000-4000-8000-000000000031",
    filters:[{
      id:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      key:"color",name_fa:"رنگ",data_type:"text",unit:null,is_variant_attribute:false,
      values:[{id:red,value_text:"قرمز",value_numeric:null,value_boolean:null,normalized_value:"red",sort_order:1}],
    }],
  };
}
function categoryPayloadProducts(){
  return {items:[card()],pagination:{next_cursor:"next-token",has_more:true},facets:facets()};
}
function jsonResponse(status:number,body:unknown){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}});
}
