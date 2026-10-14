import assert from "node:assert/strict";
import { createRequire } from "node:module";
import http from "node:http";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const adminRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(adminRoot,"../..");
const adminPort=41771;
const apiPort=41772;
const origin=`http://127.0.0.1:${adminPort}`;
const command=process.platform==="win32"?"pnpm.cmd":"pnpm";
const observed=[];

const task=JSON.parse(await import("node:fs").then(({readFileSync})=>readFileSync(resolve(repoRoot,"docs/14-multi-agent/tasks/EQCOFE-STEP67-H-ADMIN-ACCEPTANCE-001.json"),"utf8")));
assert.equal(task.risk,"MEDIUM");
assert.equal(task.human_gate_required,false);
assert.equal(task.canonical.base_sha,"9079f210c21a629df3f82dd377a6e2b46b651e33");
assert.ok(task.scope.write.includes("apps/admin/**"));
assert.ok(task.scope.write.includes("apps/storefront/package.json"));
assert.ok(task.scope.forbidden.includes("contracts/**"));
assert.ok(task.scope.forbidden.includes("src/**"));
assert.ok(task.scope.forbidden.includes("database/**"));

const api=http.createServer((req,res)=>{
  const method=String(req.method??"GET");
  const url=new URL(req.url??"/","http://127.0.0.1");
  observed.push({method,path:url.pathname});
  res.setHeader("content-type","application/json; charset=utf-8");
  if(!String(req.headers.cookie??"").includes("eqcofe_admin_session=test")){
    res.statusCode=401;
    res.end(JSON.stringify({success:false,error:{code:"UNAUTHORIZED",message:"Unauthorized"},meta:{request_id:"step67-h-unauth"}}));
    return;
  }
  if(method!=="GET"){
    res.statusCode=405;
    res.end(JSON.stringify({success:false,error:{code:"METHOD_NOT_ALLOWED",message:"Method not allowed"},meta:{request_id:"step67-h-method"}}));
    return;
  }
  const response=fixture(url.pathname);
  if(!response){
    res.statusCode=404;
    res.end(JSON.stringify({success:false,error:{code:"NOT_FOUND",message:"Not found"},meta:{request_id:"step67-h-404"}}));
    return;
  }
  res.statusCode=200;
  res.end(JSON.stringify(response));
});

function fixture(pathname){
  if(pathname==="/admin/auth/session") return {success:true,data:{actor:{type:"staff",id:"staff-67h",accountId:"account-67h"}},meta:{request_id:"step67-h-session"}};
  if(pathname==="/admin/me/permissions") return {success:true,data:{permissions:["products.view","inventory.view","configuration.view"]},meta:{request_id:"step67-h-permissions"}};
  if(pathname==="/admin/me/scopes") return {success:true,data:{scopes:["warehouse:11111111-1111-4111-8111-111111111111"]},meta:{request_id:"step67-h-scopes"}};
  if(pathname==="/admin/auth/fido/credentials") return {success:true,data:[{id:"22222222-2222-4222-8222-222222222222",device_name:"کلید تست مدیر",credential_device_type:"singleDevice",backed_up:false,last_used_at:null,created_at:"2026-10-14T00:00:00.000Z"}],meta:{request_id:"step67-h-credentials"}};
  return null;
}

await new Promise((ok,fail)=>{api.once("error",fail);api.listen(apiPort,"127.0.0.1",ok);});
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

  const login=await request("/login");
  assert.equal(login.status,200,"STEP67_H_LOGIN_STATUS");
  assert.match(login.body,/<html lang="fa-IR" dir="rtl"/);
  assert.equal(count(login.body,"<h1"),1,"STEP67_H_LOGIN_H1");
  assert.ok(!login.body.includes("admin-sidebar"),"STEP67_H_PUBLIC_SHELL_LEAK");

  const unauth=await request("/");
  assert.ok(unauth.status===302||unauth.status===303,"STEP67_H_UNAUTH_REDIRECT");
  assert.equal(unauth.location,"/login","STEP67_H_UNAUTH_TARGET");

  const headers={cookie:"eqcofe_admin_session=test"};
  const overview=await request("/",headers);
  assert.equal(overview.status,200,"STEP67_H_OVERVIEW_STATUS");
  for(const expected of ["67-H","نمای کلی مدیریت","داده‌های داشبورد هنوز در دسترس نیست","کالا و چرخه انتشار","موجودی، گردش و لایه‌های بهای تمام‌شده"]){
    assert.ok(overview.body.includes(expected),"STEP67_H_OVERVIEW_MISSING:"+expected);
  }
  assert.ok(overview.body.includes('data-admin-state="unavailable"'),"STEP67_H_DASHBOARD_UNAVAILABLE_STATE");
  assert.ok(!overview.body.includes("/admin/dashboard"),"STEP67_H_DASHBOARD_RUNTIME_CONSUMED");
  assert.ok(!overview.body.includes(">برندها<"),"STEP67_H_UNAUTHORIZED_DESTINATION_LEAK");
  for(const fabricated of ["فروش امروز","درآمد امروز","سفارش‌های امروز","سلامت سرویس"]){
    assert.ok(!overview.body.includes(fabricated),"STEP67_H_FABRICATED_METRIC:"+fabricated);
  }

  const keys=await request("/security-keys",headers);
  assert.equal(keys.status,200,"STEP67_H_SECURITY_KEYS_STATUS");
  assert.ok(keys.body.includes("کلیدهای امنیتی من"),"STEP67_H_SECURITY_KEYS_TITLE");
  assert.ok(keys.body.includes("کلید تست مدیر"),"STEP67_H_SECURITY_KEY_SUMMARY");
  for(const secret of ["credential_id","public_key","sign_count","webauthn_user_id"]){
    assert.ok(!keys.body.includes(secret),"STEP67_H_SECRET_LEAK:"+secret);
  }

  const allowed=await request("/destinations/AD-C-01",headers);
  assert.equal(allowed.status,200,"STEP67_H_ALLOWED_DESTINATION");
  const deniedKnown=await request("/destinations/AD-C-05",headers);
  const deniedUnknown=await request("/destinations/AD-Z-99",headers);
  assert.equal(deniedKnown.status,403,"STEP67_H_DENIED_KNOWN_STATUS");
  assert.equal(deniedUnknown.status,403,"STEP67_H_DENIED_UNKNOWN_STATUS");
  const denial="این مقصد در زمینهٔ فعلی در دسترس نیست";
  assert.ok(deniedKnown.body.includes(denial)&&deniedUnknown.body.includes(denial),"STEP67_H_NEUTRAL_DENIAL");
  assert.ok(!deniedKnown.body.includes("برندها")&&!deniedUnknown.body.includes("AD-Z-99"),"STEP67_H_DENIAL_IDENTITY_LEAK");

  assert.ok(observed.every(item=>item.method==="GET"),"STEP67_H_BACKEND_MUTATION_OBSERVED:"+JSON.stringify(observed));
  assert.ok(!observed.some(item=>item.path==="/admin/dashboard"),"STEP67_H_DASHBOARD_API_OBSERVED");

  const qaRoot=process.env.EQCOFE_BROWSER_QA_ROOT;
  if(qaRoot){
    const qaRequire=createRequire(resolve(qaRoot,"package.json"));
    const {chromium}=qaRequire("playwright");
    const axe=qaRequire("axe-core");
    const browser=await chromium.launch({headless:true});
    try{
      for(const width of [320,1200]){
        const context=await browser.newContext({viewport:{width,height:1000},locale:"fa-IR",reducedMotion:"reduce"});
        const page=await context.newPage();

        await page.goto(origin+"/login",{waitUntil:"networkidle"});
        await pageBasics(page,`${width}:/login`);
        await runAxe(page,axe,`${width}:/login`);
        axeRuns+=1;

        await context.addCookies([{name:"eqcofe_admin_session",value:"test",url:origin,httpOnly:true,sameSite:"Lax"}]);

        for(const pathname of ["/","/security-keys","/destinations/AD-C-01"]){
          await page.goto(origin+pathname,{waitUntil:"networkidle"});
          await pageBasics(page,`${width}:${pathname}`);
          await runAxe(page,axe,`${width}:${pathname}`);
          axeRuns+=1;
        }

        await page.goto(origin+"/",{waitUntil:"networkidle"});
        assert.equal(await page.locator('[data-admin-state="unavailable"]').count(),1,"STEP67_H_BROWSER_UNAVAILABLE_DASHBOARD:"+width);
        assert.equal(await page.locator("text=فروش امروز").count(),0,"STEP67_H_BROWSER_FAKE_METRIC:"+width);
        const storage=await page.evaluate(()=>({
          local:Object.fromEntries(Array.from({length:localStorage.length},(_,index)=>{const key=localStorage.key(index)??"";return [key,localStorage.getItem(key)??""];})),
          session:Object.fromEntries(Array.from({length:sessionStorage.length},(_,index)=>{const key=sessionStorage.key(index)??"";return [key,sessionStorage.getItem(key)??""];})),
        }));
        const storageText=JSON.stringify(storage);
        for(const forbidden of ["eqcofe_admin_session","pre_auth_token","session_token","step_up_token","credential_id","public_key","Authorization","Bearer "]){
          assert.ok(!storageText.includes(forbidden),"STEP67_H_BROWSER_AUTH_STORAGE_LEAK:"+forbidden+":"+width);
        }

        await page.keyboard.press("Tab");
        const focus=await page.evaluate(()=>{
          const el=document.activeElement;
          const style=el?getComputedStyle(el):null;
          return {className:String(el?.className??""),outline:style?.outlineStyle??"none",shadow:style?.boxShadow??"none"};
        });
        assert.ok(focus.className.includes("admin-skip-link"),"STEP67_H_FIRST_FOCUS_NOT_SKIP_LINK:"+width);
        assert.ok(focus.outline!=="none"||focus.shadow!=="none","STEP67_H_FOCUS_NOT_VISIBLE:"+width);

        const deniedResponse=await page.goto(origin+"/destinations/AD-Z-99",{waitUntil:"networkidle"});
        assert.equal(deniedResponse?.status(),403,"STEP67_H_BROWSER_DENIED_STATUS:"+width);
        assert.equal(await page.locator("text="+denial).count(),1,"STEP67_H_BROWSER_DENIAL_COPY:"+width);
        assert.equal(await page.locator("text=AD-Z-99").count(),0,"STEP67_H_BROWSER_DENIAL_LEAK:"+width);
        await runAxe(page,axe,`${width}:/denied`);
        axeRuns+=1;

        await context.close();
      }
      browserVerified=true;
    }finally{
      await browser.close();
    }
  }

  console.log(JSON.stringify({
    status:"PASS",
    stage:"67-H",
    gate:"integrated-admin-production-browser-acceptance",
    productionBuild:true,
    ssr:true,
    rtl:true,
    accessibility:true,
    responsiveWidths:browserVerified?[320,1200]:[],
    browser:browserVerified,
    axeRuns,
    security:{
      unauthenticatedFailClosed:true,
      permissionAwareNavigation:true,
      neutralDeniedDeepLink:true,
      secretCredentialFieldsExposed:false,
      browserStoragePersistence:false,
      dashboardRuntimeConsumed:false,
      backendMutationObserved:false
    },
    dashboardAuthority:"UNAVAILABLE_ONLY",
    humanGateRequired:false,
    finalClosureDeferredTo67I:true
  },null,2));
}finally{
  server.kill("SIGTERM");
  await new Promise(done=>api.close(done));
}

async function pageBasics(page,label){
  assert.equal(await page.locator("html").getAttribute("dir"),"rtl","STEP67_H_RTL:"+label);
  assert.equal(await page.locator("h1").count(),1,"STEP67_H_H1:"+label);
  const metrics=await page.evaluate(()=>({viewport:innerWidth,root:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert.ok(metrics.root<=metrics.viewport+1,"STEP67_H_ROOT_OVERFLOW:"+label+":"+JSON.stringify(metrics));
  assert.ok(metrics.body<=metrics.viewport+1,"STEP67_H_BODY_OVERFLOW:"+label+":"+JSON.stringify(metrics));
  const small=await page.evaluate(()=>{
    const selector='a[href],button,input,select,textarea,summary,[role="button"]';
    return [...document.querySelectorAll(selector)].flatMap(el=>{
      const style=getComputedStyle(el);
      const rect=el.getBoundingClientRect();
      const visible=style.display!=="none"&&style.visibility!=="hidden"&&rect.width>0&&rect.height>0;
      if(!visible||(rect.width+0.5>=44&&rect.height+0.5>=44)) return [];
      return [{tag:el.tagName,text:(el.textContent??"").trim().slice(0,50),width:rect.width,height:rect.height}];
    });
  });
  assert.equal(small.length,0,"STEP67_H_TARGET_44:"+label+":"+JSON.stringify(small));
}

async function runAxe(page,axe,label){
  await page.addScriptTag({content:axe.source});
  const violations=await page.evaluate(async()=>{
    const result=await globalThis.axe.run(document,{resultTypes:["violations"]});
    return result.violations.filter(v=>v.tags.some(tag=>tag.startsWith("wcag"))).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
  });
  assert.equal(violations.length,0,"STEP67_H_AXE:"+label+":"+JSON.stringify(violations));
}

async function waitForServer(){
  for(let attempt=0;attempt<80;attempt+=1){
    try{const response=await request("/login");if(response.status===200)return;}catch{}
    await new Promise(done=>setTimeout(done,200));
  }
  throw new Error("STEP67_H_ADMIN_START_TIMEOUT\n"+logs);
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
function count(text,needle){return text.split(needle).length-1;}
