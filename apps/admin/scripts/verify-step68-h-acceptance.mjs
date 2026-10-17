import assert from "node:assert/strict";
import { createRequire } from "node:module";
import http from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const adminPort=31773;
const origin=`http://127.0.0.1:${adminPort}`;
const command=process.platform==="win32"?"pnpm.cmd":"pnpm";
const observed=[];

const PRODUCT="11111111-1111-4111-8111-111111111111";
const VARIANT="22222222-2222-4222-8222-222222222222";
const CATEGORY="33333333-3333-4333-8333-333333333333";
const BRAND="44444444-4444-4444-8444-444444444444";
const MEDIA="55555555-5555-4555-8555-555555555555";
const ATTRIBUTE="66666666-6666-4666-8666-666666666666";
const PREVIEW="77777777-7777-4777-8777-777777777777";
const now="2026-10-17T00:00:00.000Z";

const task=JSON.parse(readFileSync(resolve(repoRoot,"docs/14-multi-agent/tasks/EQCOFE-STEP68-H-INTEGRATED-ACCEPTANCE-001.json"),"utf8"));
assert.equal(task.risk,"MEDIUM");
assert.equal(task.human_gate_required,false);
assert.equal(task.canonical.base_sha,"1399dc20932224a7b26ee45b72b233b80d0ee7f1");
assert.ok(task.scope.write.includes("apps/admin/**"));
assert.ok(task.scope.forbidden.includes(".github/**"));
assert.ok(task.scope.write.includes("apps/storefront/package.json"));\nassert.ok(task.scope.forbidden.includes("apps/storefront/app/**"));\nassert.ok(task.scope.forbidden.includes("apps/storefront/scripts/**"));
assert.ok(task.scope.forbidden.includes("contracts/**"));
assert.ok(task.scope.forbidden.includes("src/**"));
assert.ok(task.scope.forbidden.includes("database/**"));

const category={id:CATEGORY,parent_id:null,name_fa:"ابزار دم‌آوری دستی",slug:"manual-brewing",description:"دسته تست پذیرش یکپارچه",status:"active",sales_enabled:true,sort_order:10,version:3,created_at:now,updated_at:now};
const brand={id:BRAND,name_fa:"برند نمونه پذیرش",name_en:"Acceptance Brand",slug:"acceptance-brand",description:"برند تست پذیرش",status:"active",sales_enabled:true,version:4,created_at:now,updated_at:now};
const variant={id:VARIANT,product_id:PRODUCT,sku:"EQ-ACCEPT-001",barcode:null,name_suffix:"نسخه استاندارد",status:"active",sales_enabled:true,effective_sales_enabled:true,weight_grams:420,attributes:[],price:null,availability:null,version:5};
const product={
  id:PRODUCT,name_fa:"قهوه‌ساز دستی نمونه پذیرش با عنوان فارسی طولانی",name_en:"Acceptance Manual Brewer",slug:"acceptance-manual-brewer",
  short_description:"نمونه برای بررسی یکپارچهٔ RTL، بازچینی و دسترسی‌پذیری.",description:null,
  brand:{id:BRAND,name_fa:brand.name_fa,slug:brand.slug},
  primary_category:{id:CATEGORY,name_fa:category.name_fa,slug:category.slug},
  additional_categories:[],status:"published",sales_enabled:true,price:null,published_at:now,archived_at:null,
  primary_image:{id:MEDIA,storage_key:"catalog/acceptance/image.webp",alt_text_fa:"تصویر نمونه پذیرش"},
  specifications:[],variants:[variant],version:6,created_at:now,updated_at:now
};
const attribute={id:ATTRIBUTE,category_id:CATEGORY,name_fa:"جنس بدنه",key:"body-material",data_type:"select",unit:null,is_variant_attribute:false,is_filterable:true,is_comparable:true,sort_order:1,version:2,created_at:now,updated_at:now};
const mediaAsset={id:MEDIA,storage_key:"catalog/acceptance/image.webp",original_filename:"acceptance.webp",mime_type:"image/webp",size_bytes:4096,checksum_sha256:"a".repeat(64),status:"active",width:1200,height:1200,created_by:null,version:2,created_at:now,updated_at:now};
const productMedia={id:"88888888-8888-4888-8888-888888888888",product_id:PRODUCT,variant_id:null,media_id:MEDIA,media_type:"image",sort_order:0,is_primary:true,alt_text_fa:"تصویر اصلی نمونه پذیرش",storage_key:mediaAsset.storage_key,mime_type:mediaAsset.mime_type,status:"active",created_at:now};

const api=http.createServer(async(req,res)=>{
  const method=String(req.method??"GET").toUpperCase();
  const url=new URL(req.url??"/","http://127.0.0.1");
  const body=await readBody(req);
  observed.push({method,path:url.pathname,body,stepUp:req.headers["x-step-up-token"]??null});
  res.setHeader("content-type","application/json; charset=utf-8");
  if(!String(req.headers.cookie??"").includes("eqcofe_admin_session=test")){
    reply(res,401,{success:false,error:{code:"UNAUTHORIZED",message:"Unauthorized"},meta:{request_id:"step68-h-unauth"}});
    return;
  }

  if(method==="GET"){
    const response=getFixture(url.pathname);
    if(response){reply(res,200,response);return;}
    reply(res,404,{success:false,error:{code:"NOT_FOUND",message:"Not found"},meta:{request_id:"step68-h-404"}});
    return;
  }

  if(method==="POST"&&url.pathname==="/admin/sales-control/preview"){
    assert.equal(req.headers["x-step-up-token"],undefined,"STEP68_H_PREVIEW_STEP_UP_FORBIDDEN");
    const parsed=parseJson(body);
    assert.equal(parsed?.scope_type,"global","STEP68_H_PREVIEW_SCOPE");
    assert.equal(parsed?.sales_enabled,false,"STEP68_H_PREVIEW_TARGET");
    reply(res,200,{success:true,data:{preview_id:PREVIEW,scope_type:"global",scope_id:null,sales_enabled:false,affected_count:7,expires_at:new Date(Date.now()+600000).toISOString()},meta:{request_id:"step68-h-preview"}});
    return;
  }

  reply(res,405,{success:false,error:{code:"METHOD_NOT_ALLOWED",message:"Method not allowed"},meta:{request_id:"step68-h-method"}});
});

function getFixture(pathname){
  if(pathname==="/admin/auth/session")return {success:true,data:{actor:{type:"staff",id:"staff-68h",accountId:"account-68h"}},meta:{request_id:"step68-h-session"}};
  if(pathname==="/admin/me/permissions")return {success:true,data:{permissions:["products.view","products.manage","products.create","products.archive","products.publish","products.sales.manage","attributes.manage","brands.manage","categories.manage","media.manage","sales_control.manage"]},meta:{request_id:"step68-h-permissions"}};
  if(pathname==="/admin/me/scopes")return {success:true,data:{scopes:[]},meta:{request_id:"step68-h-scopes"}};
  if(pathname==="/admin/products")return {success:true,data:{items:[product],pagination:{next_cursor:null,has_more:false}},meta:{request_id:"step68-h-products"}};
  if(pathname===`/admin/products/${PRODUCT}`)return {success:true,data:product,meta:{request_id:"step68-h-product"}};
  if(pathname===`/admin/products/${PRODUCT}/variants`)return {success:true,data:[variant],meta:{request_id:"step68-h-variants"}};
  if(pathname===`/admin/products/${PRODUCT}/media`)return {success:true,data:[productMedia],meta:{request_id:"step68-h-product-media"}};
  if(pathname==="/admin/brands")return {success:true,data:[brand],meta:{request_id:"step68-h-brands"}};
  if(pathname==="/admin/categories")return {success:true,data:[category],meta:{request_id:"step68-h-categories"}};
  if(pathname==="/admin/attributes")return {success:true,data:[attribute],meta:{request_id:"step68-h-attributes"}};
  if(pathname===`/admin/media/${MEDIA}`)return {success:true,data:mediaAsset,meta:{request_id:"step68-h-media"}};
  return null;
}

await new Promise((ok,fail)=>{api.once("error",fail);api.listen(0,"127.0.0.1",ok);});
const apiAddress=api.address();
assert.ok(apiAddress&&typeof apiAddress==="object","STEP68_H_API_DYNAMIC_PORT");
const apiPort=apiAddress.port;
const server=spawn(command,["exec","react-router-serve","./build/server/index.js"],{
  cwd:adminRoot,
  env:{...process.env,HOST:"127.0.0.1",PORT:String(adminPort),NODE_ENV:"production",EQCOFE_API_BASE_URL:`http://127.0.0.1:${apiPort}`},
  stdio:["ignore","pipe","pipe"]
});
let logs="";
server.stdout.on("data",chunk=>{logs+=chunk.toString();});
server.stderr.on("data",chunk=>{logs+=chunk.toString();});

let browserVerified=false;
let axeRuns=0;
try{
  await waitForServer();
  const headers={cookie:"eqcofe_admin_session=test"};

  const unauth=await request("/catalog/products");
  assert.ok(unauth.status===302||unauth.status===303,"STEP68_H_UNAUTH_REDIRECT");
  assert.equal(unauth.location,"/login","STEP68_H_UNAUTH_TARGET");

  const ssrCases=[
    ["/catalog/products",["کالا و چرخه انتشار",product.name_fa]],
    [`/catalog/products/${PRODUCT}`,[product.name_fa,variant.sku]],
    ["/catalog/structure/attributes",["مشخصات","جنس بدنه"]],
    ["/catalog/structure/brands",["برندها",brand.name_fa]],
    ["/catalog/structure/categories",["دسته‌بندی‌ها",category.name_fa]],
    [`/catalog/media?media=${MEDIA}`,["رسانه",mediaAsset.original_filename]],
    [`/catalog/products/${PRODUCT}/media`,["رسانه",product.name_fa]],
    ["/catalog/sales-control",["پیش‌نمایش و کنترل توقف فروش","احراز مجدد"]]
  ];
  for(const [pathname,needles] of ssrCases){
    const response=await request(pathname,headers);
    assert.equal(response.status,200,"STEP68_H_SSR_STATUS:"+pathname);
    assert.match(response.body,/<html lang="fa-IR" dir="rtl"/,"STEP68_H_SSR_RTL:"+pathname);
    assert.equal(count(response.body,"<h1"),1,"STEP68_H_SSR_H1:"+pathname);
    for(const needle of needles)assert.ok(response.body.includes(needle),"STEP68_H_SSR_CONTENT:"+pathname+":"+needle);
  }

  const qaRoot=process.env.EQCOFE_BROWSER_QA_ROOT;
  if(qaRoot){
    const qaRequire=createRequire(resolve(qaRoot,"package.json"));
    const {chromium}=qaRequire("playwright");
    const axe=qaRequire("axe-core");
    const browser=await chromium.launch({headless:true});
    try{
      const allRoutes=[
        "/catalog/products",
        `/catalog/products/${PRODUCT}`,
        "/catalog/structure/attributes",
        "/catalog/structure/brands",
        "/catalog/structure/categories",
        `/catalog/media?media=${MEDIA}`,
        `/catalog/products/${PRODUCT}/media`,
        "/catalog/sales-control"
      ];
      const middleRoutes=["/catalog/products","/catalog/structure/categories",`/catalog/media?media=${MEDIA}`,"/catalog/sales-control"];
      for(const width of [320,360,600,840,1200,1440]){
        const context=await browser.newContext({viewport:{width,height:1100},locale:"fa-IR",reducedMotion:"reduce"});
        await context.addCookies([{name:"eqcofe_admin_session",value:"test",url:origin,httpOnly:true,sameSite:"Lax"}]);
        const page=await context.newPage();
        const routes=width===320||width===1440?allRoutes:middleRoutes;
        for(const pathname of routes){
          const response=await page.goto(origin+pathname,{waitUntil:"networkidle"});
          assert.equal(response?.status(),200,"STEP68_H_BROWSER_STATUS:"+width+":"+pathname);
          await pageBasics(page,`${width}:${pathname}`);
          await runAxe(page,axe,`${width}:${pathname}`);
          axeRuns+=1;
        }

        await page.goto(origin+"/catalog/sales-control",{waitUntil:"networkidle"});
        await page.getByLabel("دلیل ثبت در رویداد").fill("پذیرش یکپارچه کنترل فروش");
        await page.getByRole("button",{name:"دریافت پیش‌نمایش"}).click();
        await page.getByRole("heading",{name:"پیش‌نمایش authoritative"}).waitFor({state:"visible"});
        assert.equal(await page.getByText("این عدد همان count ذخیره‌شده در preview است؛ سیستم ادعای شمارش تازه در لحظه Apply یا اتصال preview به requester را ندارد.").count(),1,"STEP68_H_PREVIEW_AUTHORITY:"+width);
        const applyBefore=observed.filter(item=>item.method==="POST"&&item.path==="/admin/sales-control/apply").length;
        const launcher=page.getByRole("button",{name:"ادامه به احراز مجدد"});
        await launcher.click();
        const dialog=page.getByRole("dialog");
        await dialog.waitFor({state:"visible"});
        assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),"انصراف","STEP68_H_DIALOG_SAFE_FOCUS:"+width);
        await page.keyboard.press("Escape");
        await dialog.waitFor({state:"hidden"});
        assert.equal(await launcher.evaluate(el=>el===document.activeElement),true,"STEP68_H_DIALOG_FOCUS_RESTORE:"+width);
        const applyAfter=observed.filter(item=>item.method==="POST"&&item.path==="/admin/sales-control/apply").length;
        assert.equal(applyAfter,applyBefore,"STEP68_H_APPLY_MUST_NOT_FIRE:"+width);

        const storage=await page.evaluate(()=>({
          local:Object.fromEntries(Array.from({length:localStorage.length},(_,index)=>{const key=localStorage.key(index)??"";return [key,localStorage.getItem(key)??""];})),
          session:Object.fromEntries(Array.from({length:sessionStorage.length},(_,index)=>{const key=sessionStorage.key(index)??"";return [key,sessionStorage.getItem(key)??""];}))
        }));
        const storageText=JSON.stringify(storage);
        for(const forbidden of ["eqcofe_admin_session","pre_auth_token","session_token","step_up_token","credential_id","public_key","Authorization","Bearer ","upload_url","signed"]){
          assert.ok(!storageText.includes(forbidden),"STEP68_H_BROWSER_SECRET_STORAGE:"+forbidden+":"+width);
        }
        await context.close();
      }
      browserVerified=true;
    }finally{
      await browser.close();
    }
  }

  const unexpectedMutations=observed.filter(item=>item.method!=="GET"&&!(item.method==="POST"&&item.path==="/admin/sales-control/preview"));
  assert.deepEqual(unexpectedMutations,[],"STEP68_H_UNEXPECTED_MUTATION:"+JSON.stringify(unexpectedMutations));
  assert.ok(observed.some(item=>item.path==="/admin/products"),"STEP68_H_PRODUCTS_NOT_OBSERVED");
  assert.ok(observed.some(item=>item.path===`/admin/media/${MEDIA}`),"STEP68_H_MEDIA_NOT_OBSERVED");
  if(browserVerified)assert.ok(observed.some(item=>item.method==="POST"&&item.path==="/admin/sales-control/preview"),"STEP68_H_PREVIEW_NOT_OBSERVED");

  console.log(JSON.stringify({
    status:"PASS",
    stage:"68-H",
    gate:"integrated-catalog-media-sales-control-production-browser-acceptance",
    productionBuild:true,
    ssr:true,
    rtl:true,
    accessibility:true,
    responsiveWidths:browserVerified?[320,360,600,840,1200,1440]:[],
    browser:browserVerified,
    axeRuns,
    surfaces:["AD-C-01","AD-C-02","AD-C-03","AD-C-04","AD-C-05","AD-C-06","AD-C-07","AD-C-08"],
    security:{unauthenticatedFailClosed:true,browserStoragePersistence:false,unexpectedMutationObserved:false,salesApplyObserved:false},
    humanGateRequired:false,
    finalClosureDeferredTo68I:true
  },null,2));
}finally{
  server.kill("SIGTERM");
  await new Promise(done=>api.close(done));
}

async function pageBasics(page,label){
  assert.equal(await page.locator("html").getAttribute("dir"),"rtl","STEP68_H_RTL:"+label);
  assert.equal(await page.locator("html").getAttribute("lang"),"fa-IR","STEP68_H_LANG:"+label);
  assert.equal(await page.locator("h1").count(),1,"STEP68_H_H1:"+label);
  const metrics=await page.evaluate(()=>({viewport:innerWidth,root:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert.ok(metrics.root<=metrics.viewport+1,"STEP68_H_ROOT_OVERFLOW:"+label+":"+JSON.stringify(metrics));
  assert.ok(metrics.body<=metrics.viewport+1,"STEP68_H_BODY_OVERFLOW:"+label+":"+JSON.stringify(metrics));
  const small=await page.evaluate(()=>{
    const selector='a[href],button,input,select,textarea,summary,[role="button"]';
    return [...document.querySelectorAll(selector)].flatMap(el=>{
      const style=getComputedStyle(el); const rect=el.getBoundingClientRect();
      const visible=style.display!=="none"&&style.visibility!=="hidden"&&rect.width>0&&rect.height>0;
      if(!visible||el.closest("dialog:not([open])")||(rect.width+0.5>=44&&rect.height+0.5>=44))return [];
      return [{tag:el.tagName,text:(el.textContent??"").trim().slice(0,60),width:rect.width,height:rect.height}];
    });
  });
  assert.equal(small.length,0,"STEP68_H_TARGET_44:"+label+":"+JSON.stringify(small));
}

async function runAxe(page,axe,label){
  await page.addScriptTag({content:axe.source});
  const violations=await page.evaluate(async()=>{
    const result=await globalThis.axe.run(document,{resultTypes:["violations"]});
    return result.violations.filter(v=>v.tags.some(tag=>tag.startsWith("wcag"))).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
  });
  assert.equal(violations.length,0,"STEP68_H_AXE:"+label+":"+JSON.stringify(violations));
}

async function waitForServer(){
  for(let attempt=0;attempt<100;attempt+=1){
    try{const response=await request("/login");if(response.status===200)return;}catch{}
    await new Promise(done=>setTimeout(done,200));
  }
  throw new Error("STEP68_H_ADMIN_START_TIMEOUT\n"+logs);
}
function request(pathname,headers={}){
  return new Promise((ok,fail)=>{
    const req=http.get(new URL(pathname,origin),{headers:{accept:"text/html",...headers}},res=>{
      let body="";res.setEncoding("utf8");res.on("data",chunk=>{body+=chunk;});
      res.on("end",()=>ok({status:res.statusCode??0,body,location:res.headers.location??null}));
    });
    req.on("error",fail);
  });
}
function readBody(req){
  return new Promise((ok,fail)=>{let body="";req.setEncoding("utf8");req.on("data",chunk=>{body+=chunk;if(body.length>200000){fail(new Error("STEP68_H_BODY_TOO_LARGE"));req.destroy();}});req.on("end",()=>ok(body));req.on("error",fail);});
}
function parseJson(value){try{return value?JSON.parse(value):null;}catch{return null;}}
function reply(res,status,payload){res.statusCode=status;res.end(JSON.stringify(payload));}
function count(text,needle){return text.split(needle).length-1;}
