import assert from "node:assert/strict";
import { createRequire } from "node:module";
import http from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const task=JSON.parse(readFileSync(resolve(repoRoot,"docs/14-multi-agent/tasks/EQCOFE-STEP70-I-INTEGRATED-ACCEPTANCE-001.json"),"utf8"));
assert.equal(task.risk,"MEDIUM");
assert.equal(task.risk_floor,"MEDIUM");
assert.equal(task.human_gate_required,false);
assert.equal(task.canonical.base_sha,"2a7a0151af2bc4f1aa29c61f8c2511a36f761ca0");
const forbidden=[".github/**","database/**","contracts/**","src/**","test/**","scripts/**","apps/api/**","apps/worker/**","apps/scheduler/**","apps/admin/app/routes/**","apps/admin/app/operations/**","apps/admin/app/platform/**","apps/admin/app/navigation/**","apps/admin/app/security/**","apps/admin/app/shell/**","apps/storefront/app/**","docs/12-current-state/**","docs/13-product-design/**","graphify-out/**"];
for(const path of forbidden)assert.ok(task.scope.forbidden.includes(path),"STEP70_I_FORBIDDEN_SCOPE:"+path);

const routes=[
  ["/inventory/overview","AD-D-06"],
  ["/inventory/adjustment","AD-D-07"],
  ["/inventory/warehouses","AD-D-11"],
  ["/inventory-flows/transfers","AD-D-08"],
  ["/inventory-flows/reservations","AD-D-09"],
  ["/inventory-flows/allocations","AD-D-10"],
  ["/procurement/suppliers","AD-D-12"],
  ["/procurement/requests","AD-D-13"],
  ["/procurement/orders","AD-D-14"],
  ["/procurement-settlement/receipts","AD-D-15"],
  ["/procurement-settlement/landed-costs","AD-D-16"],
  ["/procurement-settlement/invoices","AD-D-17"],
  ["/procurement-settlement/returns","AD-D-18"],
  ["/pos/sales","AD-E-10"],
  ["/pos/offline","AD-E-11"],
  ["/pos/reconciliation","AD-E-11"]
];
assert.equal(routes.length,16,"STEP70_I_ROUTE_COUNT");
const surfaces=[...new Set(routes.map(([,id])=>id))].sort();
assert.deepEqual(surfaces,task.evidence.surfaces.slice().sort(),"STEP70_I_SURFACE_AUTHORITY");

const basePort=31770;
const origin="http://127.0.0.1:"+basePort;
const now="2026-11-28T12:00:00.000Z";
const observed=[];
const readPaths=new Set([
  "/admin/inventory","/admin/inventory/warehouses",
  "/admin/inventory/transfers","/admin/inventory/reservations","/admin/inventory/allocations",
  "/admin/procurement/suppliers","/admin/procurement/purchase-requests","/admin/procurement/purchase-orders",
  "/admin/procurement/goods-receipts","/admin/procurement/landed-costs",
  "/admin/procurement/supplier-invoices","/admin/procurement/purchase-returns",
  "/admin/pos/reconciliation/failed"
]);
const permissions=[
  "inventory.view","inventory.adjust","inventory.transfer","inventory.reservation","inventory.allocation",
  "inventory.manage","inventory.protection","procurement.view","procurement.manage",
  "pos.view","pos.sell","pos.reconcile"
];
const ok=(data,id)=>({success:true,data,meta:{request_id:id,timestamp:now}});
function respond(res,status,payload){
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
  res.end(JSON.stringify(payload));
}
const api=http.createServer((req,res)=>{
  const path=new URL(req.url??"/","http://127.0.0.1").pathname;
  const method=String(req.method??"GET").toUpperCase();
  const cookie=String(req.headers.cookie??"");
  observed.push({method,path,limited:cookie.includes("eqcofe_admin_session=limited"),stepUp:req.headers["x-step-up-token"]??null,idempotency:req.headers["idempotency-key"]??null});
  if(method!=="GET"){
    respond(res,405,{success:false,error:{code:"METHOD_NOT_ALLOWED",message:"No mutations allowed in 70-I"},meta:{request_id:"step70-i-blocked"}});
    return;
  }
  if(!cookie.includes("eqcofe_admin_session=test")&&!cookie.includes("eqcofe_admin_session=limited")){
    respond(res,401,{success:false,error:{code:"UNAUTHORIZED",message:"Unauthorized"},meta:{request_id:"step70-i-unauth"}});
    return;
  }
  if(path==="/admin/auth/session"){respond(res,200,ok({actor:{type:"staff",id:"staff-70i",accountId:"account-70i"}},"step70-i-session"));return;}
  if(path==="/admin/me/permissions"){respond(res,200,ok({permissions:cookie.includes("eqcofe_admin_session=limited")?[]:permissions},"step70-i-permissions"));return;}
  if(path==="/admin/me/scopes"){respond(res,200,ok({scopes:["warehouse:11111111-1111-4111-8111-111111111111","physical_store:22222222-2222-4222-8222-222222222222"]},"step70-i-scopes"));return;}
  if(readPaths.has(path)){respond(res,200,ok([],"step70-i-read"));return;}
  respond(res,404,{success:false,error:{code:"NOT_FOUND",message:"Unsupported test authority"},meta:{request_id:"step70-i-404"}});
});
await new Promise((yes,no)=>{api.once("error",no);api.listen(0,"127.0.0.1",yes);});
const bind=api.address();
assert.ok(bind&&typeof bind==="object","STEP70_I_API_BIND");
const command=process.platform==="win32"?"pnpm.cmd":"pnpm";
const server=spawn(command,["exec","react-router-serve","./build/server/index.js"],{
  cwd:adminRoot,
  env:{...process.env,HOST:"127.0.0.1",PORT:String(basePort),NODE_ENV:"production",EQCOFE_API_BASE_URL:"http://127.0.0.1:"+bind.port},
  stdio:["ignore","pipe","pipe"]
});
let logs="";
server.stdout.on("data",chunk=>{logs+=chunk.toString();});
server.stderr.on("data",chunk=>{logs+=chunk.toString();});
async function request(path,{cookie=null,method="GET",headers={},body=null}={}){
  return new Promise((yes,no)=>{
    const h={"accept":"text/html",...headers};
    if(cookie)h.cookie="eqcofe_admin_session="+cookie;
    const req=http.request(new URL(path,origin),{method,headers:h},res=>{
      let value="";
      res.setEncoding("utf8");
      res.on("data",v=>{value+=v;});
      res.on("end",()=>yes({status:res.statusCode??0,location:res.headers.location??null,body:value}));
    });
    req.on("error",no);
    if(body!==null)req.write(body);
    req.end();
  });
}
async function waitForApp(){
  for(let i=0;i<100;i++){
    try{if((await request("/login")).status===200)return;}catch{}
    await new Promise(ok=>setTimeout(ok,200));
  }
  throw new Error("STEP70_I_PRODUCTION_START_FAILED\n"+logs.slice(-5000));
}
const browserRoot=process.env.EQCOFE_BROWSER_QA_ROOT;
let axeRuns=0,browserVerified=false,securityCases=0;
try{
  await waitForApp();
  const login=await request("/login");
  assert.equal(login.status,200,"STEP70_I_LOGIN");
  assert.match(login.body,/<html lang="fa-IR" dir="rtl"/,"STEP70_I_LOGIN_RTL");
  for(const [path] of routes){
    const noCookie=await request(path);
    assert.ok([302,303].includes(noCookie.status),"STEP70_I_UNAUTH_STATUS:"+path+":"+noCookie.status);
    assert.equal(noCookie.location,"/login","STEP70_I_UNAUTH_TARGET:"+path);
    const ready=await request(path,{cookie:"test"});
    assert.equal(ready.status,200,"STEP70_I_SSR_STATUS:"+path+":"+ready.status);
    assert.match(ready.body,/<html lang="fa-IR" dir="rtl"/,"STEP70_I_RTL:"+path);
    assert.equal(ready.body.split("<h1").length-1,1,"STEP70_I_ONE_H1:"+path);
  }
  const before=observed.filter(x=>x.path==="/admin/pos/reconciliation/failed").length;
  for(const path of ["/pos/sales","/pos/offline","/pos/reconciliation"]){
    const restricted=await request(path,{cookie:"limited"});
    assert.equal(restricted.status,403,"STEP70_I_PERMISSION_DENIAL:"+path);
  }
  assert.equal(observed.filter(x=>x.path==="/admin/pos/reconciliation/failed").length,before,"STEP70_I_DENIED_POS_DATA_READ");
  const invalid=await request("/pos/reconciliation?limit=101",{cookie:"test"});
  assert.equal(invalid.status,400,"STEP70_I_INVALID_RECON_LIMIT");
  const invalidId=await request("/pos/reconciliation?command_id=not-a-uuid",{cookie:"test"});
  assert.equal(invalidId.status,400,"STEP70_I_INVALID_RECON_UUID");
  securityCases+=5;
  for(const path of ["/inventory/adjustment","/pos/offline","/pos/reconciliation"]){
    const invalidOrigin=await request(path,{
      cookie:"test",method:"POST",
      headers:{"origin":"https://untrusted.invalid","content-type":"application/x-www-form-urlencoded"},
      body:"intent=retry&client_command_id=11111111-1111-4111-8111-111111111111"
    });
    assert.ok([400,403].includes(invalidOrigin.status),"STEP70_I_CSRF_FAIL_CLOSED:"+path+":"+invalidOrigin.status);
    securityCases++;
  }
  if(browserRoot){
    const load=createRequire(resolve(browserRoot,"package.json"));
    const {chromium}=load("playwright");
    const axe=load("axe-core");
    const browser=await chromium.launch({headless:true});
    try{
      for(const width of [320,360,600,840,1200,1440]){
        const context=await browser.newContext({viewport:{width,height:1100},locale:"fa-IR",reducedMotion:"reduce"});
        await context.addCookies([{name:"eqcofe_admin_session",value:"test",url:origin,httpOnly:true,sameSite:"Lax"}]);
        const page=await context.newPage();
        const selected=width===320||width===1440?routes:routes.filter(([path])=>[
          "/inventory/overview","/inventory-flows/transfers","/procurement/suppliers",
          "/procurement-settlement/receipts","/pos/sales","/pos/offline","/pos/reconciliation"
        ].includes(path));
        for(const [path] of selected){
          const response=await page.goto(origin+path,{waitUntil:"networkidle"});
          assert.equal(response?.status(),200,"STEP70_I_BROWSER_SSR:"+width+":"+path);
          assert.equal(await page.locator("html").getAttribute("lang"),"fa-IR","STEP70_I_BROWSER_LANG:"+path);
          assert.equal(await page.locator("html").getAttribute("dir"),"rtl","STEP70_I_BROWSER_DIR:"+path);
          assert.equal(await page.locator("h1").count(),1,"STEP70_I_BROWSER_H1:"+path);
          const metrics=await page.evaluate(()=>{
            const viewport=innerWidth,root=document.documentElement.scrollWidth,body=document.body.scrollWidth;
            const overflowing= root>viewport+1||body>viewport+1 ? [...document.querySelectorAll('body *')].flatMap(el=>{
              const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
              if(style.display==='none'||rect.width<=0||rect.height<=0||rect.right<=viewport+1&&rect.left>=-1)return [];
              return [{tag:el.tagName,className:typeof el.className==='string'?el.className:'',width:Math.round(rect.width),left:Math.round(rect.left),right:Math.round(rect.right),text:(el.textContent??'').trim().slice(0,75)}];
            }).slice(0,12) : [];
            return{viewport,root,body,overflowing};
          });
          assert.ok(metrics.root<=metrics.viewport+1&&metrics.body<=metrics.viewport+1,"STEP70_I_BROWSER_OVERFLOW:"+width+":"+path+":"+JSON.stringify(metrics));
          const tiny=await page.evaluate(()=>{
            const sel='a[href],button,input,select,textarea,summary,[role="button"]';
            return [...document.querySelectorAll(sel)].flatMap(el=>{
              const css=getComputedStyle(el),r=el.getBoundingClientRect();
              if(css.display==="none"||css.visibility==="hidden"||r.width<=0||r.height<=0||el.closest('dialog:not([open])'))return [];
              if(r.width+0.5>=44&&r.height+0.5>=44)return [];
              return [{type:el.tagName,size:[r.width,r.height],text:(el.textContent??"").slice(0,45)}];
            });
          });
          assert.deepEqual(tiny,[],"STEP70_I_TARGET_44:"+width+":"+path);
          await page.addScriptTag({content:axe.source});
          const violations=await page.evaluate(async()=>{
            const r=await globalThis.axe.run(document,{resultTypes:["violations"]});
            return r.violations.filter(v=>v.tags.some(t=>t.startsWith("wcag"))).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
          });
          assert.deepEqual(violations,[],"STEP70_I_AXE:"+width+":"+path);
          axeRuns++;
        }
        const secrets=await page.evaluate(()=>JSON.stringify({local:Object.fromEntries(Object.entries(localStorage)),session:Object.fromEntries(Object.entries(sessionStorage))}));
        for(const marker of ["eqcofe_admin_session","pre_auth_token","session_token","step_up_token","credential_id","Authorization","Bearer ","Idempotency-Key","idempotency"])assert.ok(!secrets.includes(marker),"STEP70_I_BROWSER_SECRET_STORAGE:"+width+":"+marker);
        await context.close();
      }
      browserVerified=true;
    }finally{await browser.close();}
  }
  assert.ok(observed.some(x=>x.path==="/admin/pos/reconciliation/failed"&&!x.limited),"STEP70_I_AUTHORITATIVE_POS_READ_MISSING");
  assert.ok(observed.every(x=>x.method==="GET"),"STEP70_I_UNEXPECTED_BACKEND_MUTATION:"+JSON.stringify(observed.filter(x=>x.method!=="GET")));
  assert.ok(observed.every(x=>x.stepUp===null&&x.idempotency===null),"STEP70_I_SECRET_API_LEAK");
  assert.ok(observed.every(x=>readPaths.has(x.path)||[
    "/admin/auth/session","/admin/me/permissions","/admin/me/scopes"
  ].includes(x.path)),"STEP70_I_SOURCE_UNPROVEN_BACKEND_GET:"+JSON.stringify(observed.filter(x=>!readPaths.has(x.path)&&![
    "/admin/auth/session","/admin/me/permissions","/admin/me/scopes"
  ].includes(x.path))));
  console.log(JSON.stringify({
    status:"PASS",stage:"70-I",gate:"integrated-inventory-procurement-pos-production-acceptance",
    canonicalRoutes:routes.length,surfaces,ssr:true,rtl:true,
    browser:browserVerified,responsiveWidths:browserVerified?[320,360,600,840,1200,1440]:[],
    axeRuns,securityCases,adminMutationCount:0,sourceUnprovenReads:0,
    authentication:"fail-closed",permissionDenials:"enforced",csrf:"rejected",
    secretPersistence:false,humanGateRequired:false,finalClosureDeferredTo70J:true
  },null,2));
}finally{
  server.kill("SIGTERM");
  await new Promise(ok=>api.close(ok));
}
