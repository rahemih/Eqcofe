import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadCategoryRouteData,
} from "../app/features/category/category-data.server.js";
import {
  describeCategoryState,
  selectCategoryProducts,
} from "../app/features/category/category-state.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const routeSource = readFileSync(resolve(storefrontRoot, "app/routes/category.tsx"), "utf8");
const dataSource = readFileSync(resolve(storefrontRoot, "app/features/category/category-data.server.ts"), "utf8");
const stateSource = readFileSync(resolve(storefrontRoot, "app/features/category/category-state.ts"), "utf8");
const stateComponentSource = readFileSync(resolve(storefrontRoot, "app/features/category/CategoryState.tsx"), "utf8");
const css = readFileSync(resolve(storefrontRoot, "app/styles/category.css"), "utf8");
const messages = readFileSync(resolve(storefrontRoot, "app/i18n/fa-IR.ts"), "utf8");

let calls: string[] = [];
const ready = await loadCategoryRouteData(
  new Request("https://store.example/category/grinders?cursor=opaque-token&limit=25"),
  "grinders",
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async (input) => {
      const url = new URL(String(input));
      calls.push(url.pathname + url.search);
      if (url.pathname === "/categories/grinders") return jsonResponse(200, categoryPayload());
      if (url.pathname === "/categories/grinders/products") {
        assert.equal(url.searchParams.get("cursor"), "opaque-token");
        assert.equal(url.searchParams.get("limit"), "25");
        assert.equal(url.searchParams.has("brand"), false);
        return jsonResponse(200, productPayload(1));
      }
      return jsonResponse(404, { error: "unexpected" });
    },
  },
);
assert.deepEqual(calls.map((value)=>value.split("?")[0]), [
  "/categories/grinders",
  "/categories/grinders/products",
]);
assert.equal(ready.data.issue, null);
assert.equal(ready.data.category?.name_fa, "آسیاب");
assert.equal(ready.data.canonicalSearch, "cursor=opaque-token&limit=25");
assert.equal(ready.data.products.status, "ready");
assert.equal(selectCategoryProducts(ready.data.products)?.items.length, 1);
assert.equal(describeCategoryState(ready.data.products, null), null);

calls = [];
const invalid = await loadCategoryRouteData(
  new Request("https://store.example/category/grinders?brand=acme"),
  "grinders",
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async (input) => {
      calls.push(String(input));
      throw new Error("INVALID_QUERY_MUST_NOT_FETCH");
    },
  },
);
assert.equal(calls.length, 0);
assert.equal(invalid.data.issue, "invalid-query");

calls = [];
const missing = await loadCategoryRouteData(
  new Request("https://store.example/category/"),
  undefined,
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async (input) => {
      calls.push(String(input));
      throw new Error("MISSING_SLUG_MUST_NOT_FETCH");
    },
  },
);
assert.equal(calls.length, 0);
assert.equal(missing.data.issue, "missing-slug");

calls = [];
const notFound = await loadCategoryRouteData(
  new Request("https://store.example/category/missing"),
  "missing",
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async (input) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      return jsonResponse(404, { error: "missing" }, { "x-request-id": "REQ-60-E-404" });
    },
  },
);
assert.deepEqual(calls, ["/categories/missing"]);
assert.equal(notFound.data.issue, "not-found");
assert.equal(describeCategoryState(notFound.data.products, "not-found")?.title, "دسته پیدا نشد");

calls = [];
const empty = await loadCategoryRouteData(
  new Request("https://store.example/category/grinders"),
  "grinders",
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async (input) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      if (url.pathname === "/categories/grinders") return jsonResponse(200, categoryPayload());
      return jsonResponse(200, productPayload(0));
    },
  },
);
assert.deepEqual(calls, ["/categories/grinders", "/categories/grinders/products"]);
assert.equal(empty.data.products.status, "empty");
assert.equal(describeCategoryState(empty.data.products, null)?.title, "محصولی در این دسته پیدا نشد");

calls = [];
const recovery = await loadCategoryRouteData(
  new Request("https://store.example/category/grinders"),
  "grinders",
  {
    config: { baseUrl: "https://api.example.test" },
    fetchImpl: async (input) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      if (url.pathname === "/categories/grinders") return jsonResponse(200, categoryPayload());
      return jsonResponse(503, { error: "temporary" }, { "x-request-id": "REQ-60-E-503" });
    },
  },
);
assert.deepEqual(calls, [
  "/categories/grinders",
  "/categories/grinders/products",
  "/categories/grinders/products",
]);
assert.equal(recovery.data.products.status, "recovery");
const recoveryView=describeCategoryState(recovery.data.products,null);
assert.equal(recoveryView?.retryAllowed,true);
assert.equal(recoveryView?.requestId,"REQ-60-E-503");

for (const token of [
  'request("get", "/categories/{slug}"',
  'request("get", "/categories/{slug}/products"',
  "parseListingUrlState",
  "serializeListingUrlState",
  "createCustomerSessionBridge",
  'emptyState("no-result")',
  "classifyApiFailureState",
]) {
  assert.ok(dataSource.includes(token), "STEP60_E_DATA_CONTRACT_MISSING:" + token);
}
assert.doesNotMatch(dataSource, /request\("get", "\/categories\/\{slug\}\/filters"/);
assert.doesNotMatch(dataSource, /brand\s*:/);
assert.doesNotMatch(dataSource, /fetch\s*\(/);

assert.match(routeSource, /useLoaderData<typeof loader>/);
assert.match(routeSource, /<ListingGrid products=\{products\.items\}/);
assert.match(routeSource, /<CategoryState/);
assert.doesNotMatch(routeSource, /RoutePlaceholder|targetStep=\{60\}/);
assert.doesNotMatch(routeSource, /filter|sort|pagination|brand/i);

assert.match(stateComponentSource, /<StatePanel/);
assert.match(stateComponentSource, /reloadDocument/);
assert.doesNotMatch(stateComponentSource + stateSource, /setInterval\s*\(|setTimeout\s*\(|useEffect\s*\(|fetch\s*\(/);

for (const copy of [
  "محصولات این دسته",
  "دسته پیدا نشد",
  "محصولی در این دسته پیدا نشد",
  "پارامترهای دسته معتبر نیستند",
  "دریافت محصولات دسته کامل نشد",
  "تلاش دوباره برای همین دسته",
]) {
  assert.ok(messages.includes(copy), "STEP60_E_PERSIAN_COPY_MISSING:" + copy);
}

for (const requiredCss of [
  ".category-page",
  ".category-state__actions",
  "min-block-size: var(--eq-size-touch-min)",
  "min-inline-size: var(--eq-size-touch-min)",
  "overflow-wrap: anywhere",
  "@media (min-width: 600px)",
  "@media (min-width: 840px)",
]) {
  assert.ok(css.includes(requiredCss), "STEP60_E_CSS_CONTRACT_MISSING:" + requiredCss);
}
assert.equal(/\bbrown\b/i.test(css), false, "STEP60_E_BROWN_FORBIDDEN");
assert.equal(
  /(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css),
  false,
  "STEP60_E_PHYSICAL_RTL_PROPERTY_FOUND",
);

let mode: "ready" | "empty" | "not-found" | "recovery" = "ready";
let apiRequests: string[] = [];
const apiServer=http.createServer((request,response)=>{
  const url=new URL(request.url??"/","http://127.0.0.1");
  apiRequests.push(url.pathname);
  if(request.method!=="GET"){
    sendJson(response,404,{error:"unexpected"});
    return;
  }
  if(url.pathname==="/categories/grinders"){
    if(mode==="not-found"){
      response.setHeader("x-request-id","REQ-60-E-SSR-404");
      sendJson(response,404,{error:"missing"});
      return;
    }
    sendJson(response,200,categoryPayload());
    return;
  }
  if(url.pathname==="/categories/grinders/products"){
    if(mode==="recovery"){
      response.setHeader("x-request-id","REQ-60-E-SSR");
      sendJson(response,503,{error:"temporary"});
      return;
    }
    sendJson(response,200,productPayload(mode==="empty"?0:1));
    return;
  }
  sendJson(response,404,{error:"unexpected"});
});

await new Promise<void>((resolvePromise,rejectPromise)=>{
  apiServer.once("error",rejectPromise);
  apiServer.listen(0,"127.0.0.1",resolvePromise);
});
const address=apiServer.address();
assert.ok(address&&typeof address==="object");
const storefrontPort=41745;
const apiBaseUrl=`http://127.0.0.1:${address.port}`;
const server=spawnStorefront(storefrontPort,apiBaseUrl);
let serverOutput="";
server.stdout.on("data",(chunk)=>{serverOutput+=chunk.toString();});
server.stderr.on("data",(chunk)=>{serverOutput+=chunk.toString();});

try{
  await waitForStorefront();

  apiRequests=[];
  const invalidResponse=await requestStorefront("/category/grinders?brand=blocked");
  assert.equal(invalidResponse.status,200);
  assert(invalidResponse.body.includes("پارامترهای دسته معتبر نیستند"));
  assert.equal(apiRequests.length,0,"STEP60_E_INVALID_QUERY_SSR_MUST_NOT_FETCH");

  mode="ready";
  apiRequests=[];
  const readyResponse=await requestStorefront("/category/grinders");
  assert.equal(readyResponse.status,200);
  assert(readyResponse.body.includes("آسیاب"));
  assert(readyResponse.body.includes("دسته معتبر آسیاب"));
  assert(readyResponse.body.includes("محصول معتبر دسته"));
  assert(readyResponse.body.includes("۱٬۲۵۰٬۰۰۰"));
  assert.deepEqual(apiRequests,["/categories/grinders","/categories/grinders/products"]);

  mode="empty";
  apiRequests=[];
  const emptyResponse=await requestStorefront("/category/grinders");
  assert.equal(emptyResponse.status,200);
  assert(emptyResponse.body.includes("محصولی در این دسته پیدا نشد"));
  assert.equal((emptyResponse.body.match(/class="listing-card"/g)??[]).length,0);
  assert.deepEqual(apiRequests,["/categories/grinders","/categories/grinders/products"]);

  mode="not-found";
  apiRequests=[];
  const notFoundResponse=await requestStorefront("/category/grinders");
  assert.equal(notFoundResponse.status,200);
  assert(notFoundResponse.body.includes("دسته پیدا نشد"));
  assert.deepEqual(apiRequests,["/categories/grinders"]);

  mode="recovery";
  apiRequests=[];
  const recoveryResponse=await requestStorefront("/category/grinders");
  assert.equal(recoveryResponse.status,200);
  assert(recoveryResponse.body.includes("دریافت محصولات دسته کامل نشد"));
  assert(recoveryResponse.body.includes("تلاش دوباره برای همین دسته"));
  assert(recoveryResponse.body.includes("REQ-60-E-SSR"));
  assert.deepEqual(apiRequests,[
    "/categories/grinders",
    "/categories/grinders/products",
    "/categories/grinders/products",
  ]);

  assert.equal(apiRequests.includes("/categories/grinders/filters"),false);

  console.log(JSON.stringify({
    status:"PASS",
    stage:"60-E",
    surface:"/category/:slug",
    authoritativeEndpoints:[
      "GET /categories/{slug}",
      "GET /categories/{slug}/products",
    ],
    generatedContractAuthority:true,
    queryState:["cursor","limit"],
    filtersEndpointCalls:0,
    brandFilterUi:false,
    selectableSort:false,
    paginationControls:false,
    sharedListingFoundationReused:true,
    ssrEvidence:["invalid-query","ready","no-result","not-found","recovery"],
  },null,2));
}finally{
  server.kill("SIGTERM");
  await new Promise<void>((resolvePromise)=>apiServer.close(()=>resolvePromise()));
}

function categoryPayload(){
  return {
    id:"00000000-0000-0000-0000-000000000031",
    parent_id:null,
    name_fa:"آسیاب",
    slug:"grinders",
    description:"دسته معتبر آسیاب",
    status:"active",
    sales_enabled:true,
  };
}

function productPayload(count:number){
  return {
    items:count===0?[]:[{
      id:"00000000-0000-0000-0000-000000000001",
      slug:"category-valid-product",
      name:"محصول معتبر دسته",
      brand:{
        id:"00000000-0000-0000-0000-000000000011",
        name_fa:"برند معتبر",
        slug:"valid-brand",
      },
      primary_category:{
        id:"00000000-0000-0000-0000-000000000031",
        name_fa:"آسیاب",
        slug:"grinders",
      },
      primary_image:null,
      price:{current_toman:1250000},
      availability:{sales_enabled:true,in_stock:true},
    }],
    pagination:{next_cursor:null,has_more:false},
  };
}

function jsonResponse(status:number,body:unknown,headers:Record<string,string>={}){
  return new Response(JSON.stringify(body),{
    status,
    headers:{"content-type":"application/json; charset=utf-8",...headers},
  });
}

function sendJson(response:http.ServerResponse,status:number,body:unknown){
  response.statusCode=status;
  response.setHeader("content-type","application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function spawnStorefront(port:number,apiBaseUrl:string){
  if(process.platform==="win32"){
    return spawn("cmd.exe",["/d","/s","/c",[
      'set "HOST=127.0.0.1"',
      `set "PORT=${port}"`,
      'set "NODE_ENV=production"',
      `set "EQCOFE_API_BASE_URL=${apiBaseUrl}"`,
      'set "EQCOFE_API_TIMEOUT_MS=2500"',
      "pnpm exec react-router-serve ./build/server/index.js",
    ].join("&&")],{cwd:storefrontRoot,stdio:["ignore","pipe","pipe"]});
  }
  return spawn("env",[
    "HOST=127.0.0.1",
    `PORT=${port}`,
    "NODE_ENV=production",
    `EQCOFE_API_BASE_URL=${apiBaseUrl}`,
    "EQCOFE_API_TIMEOUT_MS=2500",
    "pnpm","exec","react-router-serve","./build/server/index.js",
  ],{cwd:storefrontRoot,stdio:["ignore","pipe","pipe"]});
}

async function waitForStorefront(){
  for(let attempt=0;attempt<80;attempt+=1){
    try{
      const response=await requestStorefront("/category/grinders?brand=blocked");
      if(response.status===200)return;
    }catch{}
    await new Promise((resolvePromise)=>setTimeout(resolvePromise,250));
  }
  throw new Error("STEP60_E_SERVER_START_TIMEOUT\n"+serverOutput);
}

function requestStorefront(pathname:string){
  return new Promise<{status:number;body:string}>((resolvePromise,rejectPromise)=>{
    const url=new URL(pathname,`http://127.0.0.1:${storefrontPort}`);
    const req=http.get(url,{headers:{accept:"text/html"}},(response)=>{
      let body="";
      response.setEncoding("utf8");
      response.on("data",(chunk)=>{body+=chunk;});
      response.on("end",()=>resolvePromise({status:response.statusCode??0,body}));
    });
    req.on("error",rejectPromise);
  });
}
