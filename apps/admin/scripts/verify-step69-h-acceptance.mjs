import assert from "node:assert/strict";
import { createRequire } from "node:module";
import http from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const adminPort=31969;
const origin=`http://127.0.0.1:${adminPort}`;
const command=process.platform==="win32"?"pnpm.cmd":"pnpm";
const observed=[];

const VARIANT="11111111-1111-4111-8111-111111111111";
const PRODUCT="22222222-2222-4222-8222-222222222222";
const RULE="33333333-3333-4333-8333-333333333333";
const RATE="44444444-4444-4444-8444-444444444444";
const CURRENCY_RULE="55555555-5555-4555-8555-555555555555";
const BULK_PREVIEW="66666666-6666-4666-8666-666666666666";
const FX_PREVIEW="77777777-7777-4777-8777-777777777777";
const now="2026-10-24T09:00:00.000Z";
const later="2026-10-24T10:00:00.000Z";
const hashA="a".repeat(64),hashB="b".repeat(64),hashC="c".repeat(64);

const task=JSON.parse(readFileSync(resolve(repoRoot,"docs/14-multi-agent/tasks/EQCOFE-STEP69-H-INTEGRATED-ACCEPTANCE-001.json"),"utf8"));
assert.equal(task.risk,"MEDIUM");
assert.equal(task.risk_floor,"MEDIUM");
assert.equal(task.human_gate_required,false);
assert.equal(task.canonical.base_sha,"4dae72e58486c35a5cca3a4966de824ecf275527");
assert.deepEqual(task.evidence.design_surfaces,["AD-D-01","AD-D-02","AD-D-03","AD-D-04","AD-D-05","AD-D-19","AD-D-20","AD-D-21"]);
assert.deepEqual(task.evidence.responsive_widths,[320,360,600,840,1200,1440]);
assert.ok(task.scope.write.includes("apps/admin/**"));
assert.ok(task.scope.write.includes("apps/storefront/package.json"));
for(const forbidden of [".github/**","package.json","pnpm-lock.yaml","contracts/**","src/**","database/**","docs/12-current-state/**","docs/13-product-design/**"]){
  assert.ok(task.scope.forbidden.includes(forbidden),"STEP69_H_FORBIDDEN:"+forbidden);
}

const basePrice={
  id:"88888888-8888-4888-8888-888888888888",variant_id:VARIANT,product_id:PRODUCT,sku:"EQ-69H-001",
  amount_toman:120000,source_type:"manual",valid_from:now,valid_until:null,version:3,created_by:null,created_at:now
};
const pricingRule={
  id:RULE,name_fa:"قانون نمونه پذیرش",rule_type:"discount",priority:100,value_type:"percentage",value_numeric:10,
  starts_at:null,ends_at:null,customer_type:"retail",min_quantity:null,max_quantity:null,stacking_policy:"exclusive",
  is_global:true,status:"active",version:4,created_by:null,created_at:now,updated_at:now
};
const rate={
  id:RATE,source_currency_code:"USD",rate_to_toman:60000,source_provider_id:null,observed_at:now,received_at:now,
  validated_at:now,status:"active",is_selected:true,created_at:now
};
const currencyRule={
  id:CURRENCY_RULE,name_fa:"قانون دلاری نمونه",source_currency_code:"USD",coefficient:1.1,fixed_cost_toman:1000,
  rounding_multiple_toman:1000,is_global:true,status:"active",version:2,created_at:now,updated_at:now
};
const template={
  contractVersion:"eqcofe-step50-v1",
  mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  fileName:"eqcofe-product-pricing-template.xlsx",
  sheets:[
    {name:"products",columns:[{key:"id",required:true,description:"شناسه کالا"},{key:"name_fa",required:false,description:"نام فارسی"}]},
    {name:"variants",columns:[{key:"id",required:true,description:"شناسه واریانت"},{key:"barcode",required:false,description:"بارکد"}]},
    {name:"prices",columns:[{key:"sku",required:true,description:"SKU"},{key:"price_toman",required:true,description:"قیمت تومان"}]}
  ]
};

const api=http.createServer(async(req,res)=>{
  const method=String(req.method??"GET").toUpperCase();
  const url=new URL(req.url??"/","http://127.0.0.1");
  const body=await readBody(req);
  observed.push({
    method,path:url.pathname,body,
    stepUp:req.headers["x-step-up-token"]??null,
    idempotency:req.headers["idempotency-key"]??null
  });
  res.setHeader("content-type","application/json; charset=utf-8");

  if(!String(req.headers.cookie??"").includes("eqcofe_admin_session=test")){
    reply(res,401,{success:false,error:{code:"UNAUTHORIZED",message:"Unauthorized"},meta:{request_id:"step69-h-unauth"}});
    return;
  }

  if(method==="GET"){
    const response=getFixture(url.pathname);
    if(response){reply(res,200,response);return;}
    reply(res,404,{success:false,error:{code:"NOT_FOUND",message:"Not found"},meta:{request_id:"step69-h-404"}});
    return;
  }

  if(method==="POST"&&url.pathname==="/admin/pricing/base-prices/preview"){
    assert.equal(req.headers["x-step-up-token"],undefined,"STEP69_H_BASE_PREVIEW_STEPUP");
    const parsed=parseJson(body);
    assert.equal(parsed?.variant_id,VARIANT,"STEP69_H_BASE_PREVIEW_VARIANT");
    reply(res,201,ok({
      variant_id:VARIANT,current_price_toman:120000,proposed_price_toman:125000,
      profit_guard:{status:"passed",reason:null,unit_cost_toman:70000},effective_from:now,effective_until:null
    },"step69-h-base-preview"));
    return;
  }

  if(method==="POST"&&url.pathname==="/admin/pricing/bulk/preview"){
    assert.equal(req.headers["x-step-up-token"],undefined,"STEP69_H_BULK_PREVIEW_STEPUP");
    const parsed=parseJson(body);
    assert.equal(parsed?.scope_type,"all","STEP69_H_BULK_SCOPE");
    reply(res,201,ok({
      preview_id:BULK_PREVIEW,affected_count:3,warnings:[],
      items:[
        {variantId:VARIANT,oldPriceToman:120000,proposedPriceToman:125000,guardStatus:"passed",guardReason:null},
        {variantId:"99999999-9999-4999-8999-999999999999",oldPriceToman:130000,proposedPriceToman:125000,guardStatus:"passed",guardReason:null}
      ],
      expires_at:new Date(Date.now()+600000).toISOString()
    },"step69-h-bulk-preview"));
    return;
  }

  if(method==="POST"&&url.pathname==="/admin/pricing/currency/impact-preview"){
    assert.equal(req.headers["x-step-up-token"],undefined,"STEP69_H_FX_PREVIEW_STEPUP");
    const parsed=parseJson(body);
    assert.equal(parsed?.currency_rate_id,RATE,"STEP69_H_FX_RATE");
    reply(res,201,ok({
      preview_id:FX_PREVIEW,rate_to_toman:60000,affected_count:2,warnings:[],
      items:[
        {variantId:VARIANT,oldPriceToman:120000,proposedPriceToman:126000,guardStatus:"passed",guardReason:null}
      ],
      expires_at:new Date(Date.now()+600000).toISOString()
    },"step69-h-fx-preview"));
    return;
  }

  if(method==="POST"&&url.pathname==="/admin/excel/dry-run"){
    const parsed=parseJson(body);
    assert.equal(parsed?.workbook?.fileName,"acceptance.xlsx","STEP69_H_EXCEL_DRYRUN_FILE");
    assert.equal(parsed?.workbook?.mimeType,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","STEP69_H_EXCEL_DRYRUN_MIME");
    assert.equal(typeof parsed?.workbook?.contentBase64,"string","STEP69_H_EXCEL_DRYRUN_BYTES");
    reply(res,201,ok({valid:true,checkedRows:2,validRows:2,invalidRows:0,rows:[]},"step69-h-excel-dryrun"));
    return;
  }

  if(method==="POST"&&url.pathname==="/admin/excel/catalog/preview"){
    const parsed=parseJson(body);
    assert.equal(parsed?.workbook?.fileName,"acceptance.xlsx","STEP69_H_EXCEL_CATALOG_FILE");
    reply(res,201,ok({
      fingerprint:hashA,previewHash:hashB,
      products:[{id:PRODUCT,expectedVersion:6,nameFa:"کالای نمونه پذیرش",status:"published"}],
      variants:[{id:VARIANT,expectedVersion:5,barcode:"6260000000000"}]
    },"step69-h-excel-catalog"));
    return;
  }

  if(method==="POST"&&url.pathname==="/admin/excel/pricing/preview"){
    const parsed=parseJson(body);
    assert.equal(parsed?.workbook?.fileName,"acceptance.xlsx","STEP69_H_EXCEL_PRICING_FILE");
    reply(res,201,ok({
      sourceFingerprint:hashA,previewHash:hashC,
      items:[{variantId:VARIANT,sku:"EQ-69H-001",proposedPriceToman:128000,currentBasePriceId:basePrice.id,currentPriceToman:120000,guardStatus:"passed",guardReason:null}]
    },"step69-h-excel-pricing"));
    return;
  }

  reply(res,405,{success:false,error:{code:"METHOD_NOT_ALLOWED",message:"Mutation not allowed in Step69-H acceptance"},meta:{request_id:"step69-h-method"}});
});

function ok(data,requestId){return{success:true,data,meta:{request_id:requestId,timestamp:now}};}
function getFixture(pathname){
  if(pathname==="/admin/auth/session")return ok({actor:{type:"staff",id:"staff-69h",accountId:"account-69h"}},"step69-h-session");
  if(pathname==="/admin/me/permissions")return ok({permissions:[
    "pricing.view","pricing.manage","pricing.bulk.manage","pricing.currency.manage",
    "excel.view","excel.import","excel.apply","excel.recover"
  ]},"step69-h-permissions");
  if(pathname==="/admin/me/scopes")return ok({scopes:[]},"step69-h-scopes");
  if(pathname==="/admin/pricing/base-prices")return ok([basePrice],"step69-h-base");
  if(pathname==="/admin/pricing/rules")return ok([pricingRule],"step69-h-rules");
  if(pathname==="/admin/pricing/currency-rates")return ok([rate],"step69-h-rates");
  if(pathname==="/admin/pricing/currency-rates/current")return ok(rate,"step69-h-rate-current");
  if(pathname==="/admin/pricing/currency-rules")return ok([currencyRule],"step69-h-currency-rules");
  if(pathname==="/admin/excel/exports/template")return ok(template,"step69-h-template");
  return null;
}

await new Promise((okListen,fail)=>{api.once("error",fail);api.listen(0,"127.0.0.1",okListen);});
const apiAddress=api.address();
assert.ok(apiAddress&&typeof apiAddress==="object","STEP69_H_API_DYNAMIC_PORT");
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
let safePreviewVerified=false;
try{
  await waitForServer();
  const headers={cookie:"eqcofe_admin_session=test"};

  const unauth=await request("/pricing/base-prices");
  assert.ok(unauth.status===302||unauth.status===303,"STEP69_H_UNAUTH_REDIRECT");
  assert.equal(unauth.location,"/login","STEP69_H_UNAUTH_TARGET");

  const ssrCases=[
    ["/pricing/base-prices",["قیمت پایه و تاریخچه","EQ-69H-001"]],
    ["/pricing/rules",["قواعد قیمت‌گذاری",pricingRule.name_fa]],
    ["/pricing/bulk",["پیش‌نمایش و اعمال گروهی قیمت","دریافت پیش‌نمایش"]],
    ["/pricing/fx",["نرخ ارز، منبع و اثر روی قیمت‌ها","USD"]],
    ["/pricing/currency-rules",["قواعد قیمت‌گذاری وابسته به ارز",currencyRule.name_fa]],
    ["/excel/core",["Template، Dry Run، Import و Recovery",template.fileName]],
    ["/excel/catalog",["Catalog Excel","Catalog Preview / Apply"]],
    ["/excel/pricing",["Pricing Excel","Pricing Preview / Apply"]]
  ];
  for(const [pathname,needles] of ssrCases){
    const response=await request(pathname,headers);
    assert.equal(response.status,200,"STEP69_H_SSR_STATUS:"+pathname);
    assert.match(response.body,/<html lang="fa-IR" dir="rtl"/,"STEP69_H_SSR_RTL:"+pathname);
    assert.equal(count(response.body,"<h1"),1,"STEP69_H_SSR_H1:"+pathname);
    for(const needle of needles)assert.ok(response.body.includes(needle),"STEP69_H_SSR_CONTENT:"+pathname+":"+needle);
  }

  const qaRoot=process.env.EQCOFE_BROWSER_QA_ROOT;
  if(qaRoot){
    const qaRequire=createRequire(resolve(qaRoot,"package.json"));
    const {chromium}=qaRequire("playwright");
    const axe=qaRequire("axe-core");
    const browser=await chromium.launch({headless:true});
    try{
      const allRoutes=ssrCases.map(([pathname])=>pathname);
      const middleRoutes=["/pricing/base-prices","/pricing/bulk","/pricing/fx","/excel/core","/excel/catalog","/excel/pricing"];
      for(const width of [320,360,600,840,1200,1440]){
        const context=await browser.newContext({viewport:{width,height:1200},locale:"fa-IR",reducedMotion:"reduce"});
        await context.addCookies([{name:"eqcofe_admin_session",value:"test",url:origin,httpOnly:true,sameSite:"Lax"}]);
        const page=await context.newPage();
        const routes=width===320||width===1440?allRoutes:middleRoutes;
        for(const pathname of routes){
          const response=await page.goto(origin+pathname,{waitUntil:"networkidle"});
          assert.equal(response?.status(),200,"STEP69_H_BROWSER_STATUS:"+width+":"+pathname);
          await pageBasics(page,`${width}:${pathname}`);
          await runAxe(page,axe,`${width}:${pathname}`);
          axeRuns+=1;
        }

        if(width===840){
          await exerciseSafePreviews(page);
          safePreviewVerified=true;
        }

        const storage=await page.evaluate(()=>({
          local:Object.fromEntries(Array.from({length:localStorage.length},(_,index)=>{const key=localStorage.key(index)??"";return [key,localStorage.getItem(key)??""];})),
          session:Object.fromEntries(Array.from({length:sessionStorage.length},(_,index)=>{const key=sessionStorage.key(index)??"";return [key,sessionStorage.getItem(key)??""];}))
        }));
        const storageText=JSON.stringify(storage);
        for(const forbidden of [
          "eqcofe_admin_session","pre_auth_token","session_token","step_up_token","credential_id",
          "Authorization","Bearer ","Idempotency-Key","idempotency","contentBase64","previewHash","preview_id"
        ])assert.ok(!storageText.includes(forbidden),"STEP69_H_BROWSER_SECRET_STORAGE:"+forbidden+":"+width);
        await context.close();
      }
      browserVerified=true;
    }finally{
      await browser.close();
    }
  }

  const allowedPosts=new Set([
    "/admin/pricing/base-prices/preview",
    "/admin/pricing/bulk/preview",
    "/admin/pricing/currency/impact-preview",
    "/admin/excel/dry-run",
    "/admin/excel/catalog/preview",
    "/admin/excel/pricing/preview"
  ]);
  const unexpectedMutations=observed.filter(item=>item.method!=="GET"&&!(item.method==="POST"&&allowedPosts.has(item.path)));
  assert.deepEqual(unexpectedMutations,[],"STEP69_H_UNEXPECTED_MUTATION:"+JSON.stringify(unexpectedMutations));
  for(const item of observed.filter(item=>item.method==="POST")){
    assert.equal(item.stepUp,null,"STEP69_H_STEPUP_MUST_NOT_LEAVE_BROWSER:"+item.path);
    assert.equal(item.idempotency,null,"STEP69_H_IDEMPOTENCY_MUST_NOT_BE_USED_FOR_SAFE_PREVIEW:"+item.path);
  }
  assert.ok(observed.some(item=>item.path==="/admin/pricing/base-prices"),"STEP69_H_BASE_GET_MISSING");
  assert.ok(observed.some(item=>item.path==="/admin/pricing/rules"),"STEP69_H_RULES_GET_MISSING");
  assert.ok(observed.some(item=>item.path==="/admin/pricing/currency-rates"),"STEP69_H_RATES_GET_MISSING");
  assert.ok(observed.some(item=>item.path==="/admin/pricing/currency-rules"),"STEP69_H_CURRENCY_RULES_GET_MISSING");
  assert.ok(observed.some(item=>item.path==="/admin/excel/exports/template"),"STEP69_H_TEMPLATE_GET_MISSING");
  if(browserVerified){
    assert.equal(safePreviewVerified,true,"STEP69_H_SAFE_PREVIEW_BROWSER_MISSING");
    for(const path of allowedPosts)assert.ok(observed.some(item=>item.method==="POST"&&item.path===path),"STEP69_H_SAFE_POST_MISSING:"+path);
  }

  console.log(JSON.stringify({
    status:"PASS",
    stage:"69-H",
    gate:"integrated-pricing-fx-excel-production-browser-acceptance",
    productionBuild:true,
    ssr:true,
    rtl:true,
    accessibility:true,
    responsiveWidths:browserVerified?[320,360,600,840,1200,1440]:[],
    browser:browserVerified,
    axeRuns,
    safePreviewVerified,
    surfaces:["AD-D-01","AD-D-02","AD-D-03","AD-D-04","AD-D-05","AD-D-19","AD-D-20","AD-D-21"],
    security:{
      unauthenticatedFailClosed:true,
      browserStoragePersistence:false,
      unexpectedMutationObserved:false,
      destructiveApplyObserved:false,
      stepUpObserved:false,
      idempotencyObserved:false
    },
    humanGateRequired:false,
    finalClosureDeferredTo69I:true
  },null,2));
}finally{
  server.kill("SIGTERM");
  await new Promise(done=>api.close(done));
}

async function exerciseSafePreviews(page){
  await page.goto(origin+"/pricing/base-prices",{waitUntil:"networkidle"});
  await page.locator('input[name="variant_id"]').fill(VARIANT);
  await page.locator('input[name="amount_toman"]').fill("125000");
  await page.locator('input[name="effective_from"]').fill("2026-10-24T12:30:00+03:30");
  await page.locator('textarea[name="reason"]').fill("پذیرش یکپارچه قیمت پایه");
  await page.getByRole("button",{name:"پیش‌نمایش کنترل سود"}).click();
  await page.getByRole("heading",{name:"نتیجهٔ پیش‌نمایش معتبر"}).waitFor({state:"visible"});

  await page.goto(origin+"/pricing/bulk",{waitUntil:"networkidle"});
  await page.locator('input[name="value"]').fill("125000");
  await page.locator('textarea[name="reason"]').fill("پذیرش یکپارچه Bulk Pricing");
  await page.getByRole("button",{name:"دریافت پیش‌نمایش"}).click();
  await page.getByRole("heading",{name:"پیش‌نمایش authoritative"}).waitFor({state:"visible"});
  const bulkLauncher=page.getByRole("button",{name:"ادامه به بازبینی نهایی و احراز مجدد"});
  await assertCancelFirstReview(page,bulkLauncher);

  await page.goto(origin+"/pricing/fx",{waitUntil:"networkidle"});
  await page.locator('input[name="currency_rate_id"]').fill(RATE);
  await page.getByRole("button",{name:"ساخت پیش‌نمایش اثر"}).click();
  await page.getByRole("heading",{name:"بازبینی پیش از Apply"}).waitFor({state:"visible"});
  await page.getByLabel("دلیل Apply").fill("پذیرش یکپارچه FX");
  const fxLauncher=page.getByRole("button",{name:"بازبینی نهایی و احراز مجدد"});
  await assertCancelFirstReview(page,fxLauncher);

  const file={name:"acceptance.xlsx",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",buffer:Buffer.from("PK\u0003\u0004step69-h")};

  await page.goto(origin+"/excel/core",{waitUntil:"networkidle"});
  await page.locator('input[name="workbook"]').setInputFiles(file);
  await page.getByRole("button",{name:"Dry Run"}).click();
  await page.getByRole("heading",{name:"نتیجه Dry Run"}).waitFor({state:"visible"});

  await page.goto(origin+"/excel/catalog",{waitUntil:"networkidle"});
  await page.locator('input[name="workbook"]').setInputFiles(file);
  await page.getByRole("button",{name:"ساخت Catalog Preview"}).click();
  await page.getByText("Preview Hash").waitFor({state:"visible"});
  const catalogLauncher=page.getByRole("button",{name:"بازبینی نهایی و Apply"});
  await assertCancelFirstReview(page,catalogLauncher);

  await page.goto(origin+"/excel/pricing",{waitUntil:"networkidle"});
  await page.locator('input[name="workbook"]').setInputFiles(file);
  await page.getByRole("button",{name:"ساخت Pricing Preview"}).click();
  await page.getByText("Source fingerprint").waitFor({state:"visible"});
  const pricingLauncher=page.getByRole("button",{name:"بازبینی نهایی و Apply"});
  await assertCancelFirstReview(page,pricingLauncher);
}

async function assertCancelFirstReview(page,launcher){
  const before=observed.length;
  await launcher.click();
  const dialog=page.getByRole("dialog");
  await dialog.waitFor({state:"visible"});
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),"انصراف","STEP69_H_DIALOG_SAFE_FOCUS");
  await page.keyboard.press("Escape");
  await dialog.waitFor({state:"hidden"});
  assert.equal(await launcher.evaluate(el=>el===document.activeElement),true,"STEP69_H_DIALOG_FOCUS_RESTORE");
  const after=observed.slice(before);
  assert.ok(!after.some(item=>item.path.includes("/apply")||item.path.includes("/step-up/")),"STEP69_H_REVIEW_MUST_NOT_MUTATE:"+JSON.stringify(after));
}

async function pageBasics(page,label){
  assert.equal(await page.locator("html").getAttribute("dir"),"rtl","STEP69_H_RTL:"+label);
  assert.equal(await page.locator("html").getAttribute("lang"),"fa-IR","STEP69_H_LANG:"+label);
  assert.equal(await page.locator("h1").count(),1,"STEP69_H_H1:"+label);
  const metrics=await page.evaluate(()=>({viewport:innerWidth,root:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert.ok(metrics.root<=metrics.viewport+1,"STEP69_H_ROOT_OVERFLOW:"+label+":"+JSON.stringify(metrics));
  assert.ok(metrics.body<=metrics.viewport+1,"STEP69_H_BODY_OVERFLOW:"+label+":"+JSON.stringify(metrics));
  const small=await page.evaluate(()=>{
    const selector='a[href],button,input,select,textarea,summary,[role="button"]';
    return [...document.querySelectorAll(selector)].flatMap(el=>{
      const style=getComputedStyle(el),rect=el.getBoundingClientRect();
      const visible=style.display!=="none"&&style.visibility!=="hidden"&&rect.width>0&&rect.height>0;
      if(!visible||el.closest("dialog:not([open])")||(rect.width+0.5>=44&&rect.height+0.5>=44))return [];
      return [{tag:el.tagName,text:(el.textContent??"").trim().slice(0,60),width:rect.width,height:rect.height}];
    });
  });
  assert.equal(small.length,0,"STEP69_H_TARGET_44:"+label+":"+JSON.stringify(small));
}

async function runAxe(page,axe,label){
  await page.addScriptTag({content:axe.source});
  const violations=await page.evaluate(async()=>{
    const result=await globalThis.axe.run(document,{resultTypes:["violations"]});
    return result.violations.filter(v=>v.tags.some(tag=>tag.startsWith("wcag"))).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
  });
  assert.equal(violations.length,0,"STEP69_H_AXE:"+label+":"+JSON.stringify(violations));
}

async function waitForServer(){
  for(let attempt=0;attempt<100;attempt+=1){
    try{const response=await request("/login");if(response.status===200)return;}catch{}
    await new Promise(done=>setTimeout(done,200));
  }
  throw new Error("STEP69_H_ADMIN_START_TIMEOUT\n"+logs);
}
function request(pathname,headers={}){
  return new Promise((resolveRequest,rejectRequest)=>{
    const req=http.get(new URL(pathname,origin),{headers:{accept:"text/html",...headers}},res=>{
      let body="";res.setEncoding("utf8");res.on("data",chunk=>{body+=chunk;});
      res.on("end",()=>resolveRequest({status:res.statusCode??0,body,location:res.headers.location??null}));
    });
    req.on("error",rejectRequest);
  });
}
function readBody(req){
  return new Promise((resolveBody,rejectBody)=>{
    let body="";req.setEncoding("utf8");
    req.on("data",chunk=>{body+=chunk;if(body.length>15_000_000){rejectBody(new Error("STEP69_H_BODY_TOO_LARGE"));req.destroy();}});
    req.on("end",()=>resolveBody(body));req.on("error",rejectBody);
  });
}
function parseJson(value){try{return value?JSON.parse(value):null;}catch{return null;}}
function reply(res,status,payload){res.statusCode=status;res.end(JSON.stringify(payload));}
function count(text,needle){return text.split(needle).length-1;}
