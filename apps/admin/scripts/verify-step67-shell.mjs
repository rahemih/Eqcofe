import { spawn } from "node:child_process";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const scriptDir=dirname(fileURLToPath(import.meta.url)),adminRoot=resolve(scriptDir,"..");
const adminPort=41741,apiPort=41742,command=process.platform==="win32"?"pnpm.cmd":"pnpm";
const requestId=(suffix)=>`req-67e-${suffix}`;
const api=http.createServer((req,res)=>{
  const cookie=String(req.headers.cookie??"");
  res.setHeader("content-type","application/json");
  if(!cookie.includes("eqcofe_admin_session=test")){
    res.statusCode=401;
    res.end(JSON.stringify({success:false,error:{code:"UNAUTHORIZED",message:"Unauthorized"},meta:{request_id:requestId("unauth")}}));
    return;
  }
  if(req.url==="/admin/auth/session"){
    res.statusCode=200;
    res.end(JSON.stringify({success:true,data:{actor:{type:"staff",id:"staff-67e",accountId:"account-67e"}},meta:{request_id:requestId("session")}}));
    return;
  }
  if(req.url==="/admin/me/permissions"){
    res.statusCode=200;
    res.end(JSON.stringify({success:true,data:{permissions:["products.view","inventory.view","configuration.view"]},meta:{request_id:requestId("permissions")}}));
    return;
  }
  if(req.url==="/admin/me/scopes"){
    res.statusCode=200;
    res.end(JSON.stringify({success:true,data:{scopes:["warehouse:11111111-1111-4111-8111-111111111111"]},meta:{request_id:requestId("scopes")}}));
    return;
  }
  res.statusCode=404;
  res.end(JSON.stringify({success:false,error:{code:"NOT_FOUND",message:"Not found"},meta:{request_id:requestId("404")}}));
});
await new Promise((resolvePromise,rejectPromise)=>{api.once("error",rejectPromise);api.listen(apiPort,"127.0.0.1",resolvePromise);});
const server=spawn(command,["exec","react-router-serve","./build/server/index.js"],{cwd:adminRoot,env:{...process.env,HOST:"127.0.0.1",PORT:String(adminPort),NODE_ENV:"production",EQCOFE_API_BASE_URL:`http://127.0.0.1:${apiPort}`},stdio:["ignore","pipe","pipe"]});
let output="";server.stdout.on("data",chunk=>{output+=chunk.toString();});server.stderr.on("data",chunk=>{output+=chunk.toString();});
try{
  await waitForServer();
  const login=await request("/login");
  assert(login.status===200,"ADMIN_LOGIN_SSR_FAILED:"+login.status);
  assert(login.body.includes('<html lang="fa-IR" dir="rtl"'),"ADMIN_RTL_ROOT_MISSING");
  assert(login.body.includes("ورود امن مدیریت"),"ADMIN_LOGIN_TITLE_MISSING");
  assert(!login.body.includes("admin-sidebar"),"ADMIN_SHELL_LEAKED_TO_PUBLIC_LOGIN");

  const unauthenticated=await request("/");
  assert(unauthenticated.status===302||unauthenticated.status===303,"ADMIN_UNAUTHENTICATED_REDIRECT_MISSING:"+unauthenticated.status);
  assert(unauthenticated.location==="/login","ADMIN_UNAUTHENTICATED_REDIRECT_TARGET_INVALID:"+unauthenticated.location);

  const headers={"cookie":"eqcofe_admin_session=test"};
  const authenticated=await request("/",headers);
  assert(authenticated.status===200,"ADMIN_AUTHENTICATED_ROOT_FAILED:"+authenticated.status);
  assert(authenticated.body.includes('href="#admin-main"'),"ADMIN_SKIP_LINK_MISSING");
  assert(count(authenticated.body,'<main id="admin-main"')===1,"ADMIN_MAIN_LANDMARK_INVALID");
  assert(count(authenticated.body,"<h1")===1,"ADMIN_H1_COUNT_INVALID");
  assert(authenticated.body.includes("admin-header"),"ADMIN_HEADER_MISSING");
  assert(authenticated.body.includes('aria-label="ناوبری مدیریت"'),"ADMIN_NAV_LANDMARK_MISSING");
  assert(authenticated.body.includes("67-E"),"ADMIN_STAGE_BADGE_MISSING");
  assert(authenticated.body.includes("staff-67e"),"ADMIN_PROVEN_ACTOR_MISSING");
  assert(authenticated.body.includes("کالا و چرخه انتشار"),"PERMITTED_PRODUCT_DESTINATION_MISSING");
  assert(authenticated.body.includes("موجودی، گردش و لایه‌های بهای تمام‌شده"),"PERMITTED_INVENTORY_DESTINATION_MISSING");
  assert(authenticated.body.includes("تنظیمات، پیش‌نمایش و بازگردانی"),"PERMITTED_CONFIGURATION_DESTINATION_MISSING");
  assert(!authenticated.body.includes(">برندها<"),"UNAUTHORIZED_BRAND_DESTINATION_LEAKED");
  assert(authenticated.body.includes("انبار"),"ASSIGNED_SCOPE_CONTEXT_MISSING");
  assert(authenticated.body.includes("11111111-1111-4111-8111-111111111111"),"ASSIGNED_SCOPE_ID_MISSING");
  assert(!authenticated.body.includes("/admin/dashboard"),"DASHBOARD_CONSUMPTION_FORBIDDEN");

  const permitted=await request("/destinations/AD-C-01",headers);
  assert(permitted.status===200,"PERMITTED_HANDOFF_FAILED:"+permitted.status);
  assert(permitted.body.includes("کالا و چرخه انتشار"),"PERMITTED_HANDOFF_LABEL_MISSING");
  assert(permitted.body.includes("فقط ناوبری و ارجاع"),"PERMITTED_HANDOFF_BOUNDARY_MISSING");

  const deniedKnown=await request("/destinations/AD-C-05",headers);
  const deniedUnknown=await request("/destinations/AD-Z-99",headers);
  assert(deniedKnown.status===403&&deniedUnknown.status===403,"NEUTRAL_DENIAL_STATUS_INVALID");
  const neutralText="این مقصد در زمینهٔ فعلی در دسترس نیست";
  assert(deniedKnown.body.includes(neutralText)&&deniedUnknown.body.includes(neutralText),"NEUTRAL_DENIAL_COPY_MISMATCH");
  assert(!deniedKnown.body.includes("برندها")&&!deniedUnknown.body.includes("AD-Z-99"),"DENIAL_LEAKED_DESTINATION_IDENTITY");

  console.log(JSON.stringify({
    status:"PASS",stage:"67-E",ssr:true,locale:"fa-IR",direction:"rtl",
    publicLogin:true,unauthenticatedFailClosed:true,permissionAwareShell:true,
    scopeContextReadOnly:true,authorizedHandoff:true,neutralDeepLinkDenial:true,dashboardDeferred:true
  },null,2));
}finally{server.kill("SIGTERM");api.close();}
async function waitForServer(){for(let attempt=0;attempt<60;attempt+=1){try{const response=await request("/login");if(response.status===200)return;}catch{}await new Promise(resolvePromise=>setTimeout(resolvePromise,250));}throw new Error("ADMIN_SERVER_START_TIMEOUT\n"+output);}
function request(pathname,headers={}){return new Promise((resolvePromise,rejectPromise)=>{const url=new URL(pathname,`http://127.0.0.1:${adminPort}`);const req=http.get(url,{headers:{accept:"text/html",...headers}},res=>{let body="";res.setEncoding("utf8");res.on("data",chunk=>{body+=chunk;});res.on("end",()=>resolvePromise({status:res.statusCode??0,body,location:res.headers.location??null}));});req.on("error",rejectPromise);});}
function count(text,needle){return text.split(needle).length-1;}
function assert(condition,code){if(!condition)throw new Error(code);}
