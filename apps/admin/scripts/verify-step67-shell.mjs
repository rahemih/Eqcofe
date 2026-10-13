import { spawn } from "node:child_process";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const scriptDir=dirname(fileURLToPath(import.meta.url)),adminRoot=resolve(scriptDir,"..");
const port=41741,command=process.platform==="win32"?"pnpm.cmd":"pnpm";
const server=spawn(command,["exec","react-router-serve","./build/server/index.js"],{cwd:adminRoot,env:{...process.env,HOST:"127.0.0.1",PORT:String(port),NODE_ENV:"production"},stdio:["ignore","pipe","pipe"]});
let output="";server.stdout.on("data",chunk=>{output+=chunk.toString();});server.stderr.on("data",chunk=>{output+=chunk.toString();});
try{await waitForServer();const response=await request("/");assert(response.status===200,"ADMIN_SSR_ROOT_FAILED:"+response.status);assert(response.body.includes('<html lang="fa-IR" dir="rtl"'),"ADMIN_RTL_ROOT_MISSING");assert(response.body.includes('href="#admin-main"'),"ADMIN_SKIP_LINK_MISSING");assert(count(response.body,'<main id="admin-main"')===1,"ADMIN_MAIN_LANDMARK_INVALID");assert(count(response.body,"<h1")===1,"ADMIN_H1_COUNT_INVALID");assert(response.body.includes("admin-header"),"ADMIN_HEADER_MISSING");assert(response.body.includes('aria-label="ناوبری مدیریت"'),"ADMIN_NAV_LANDMARK_MISSING");assert(response.body.includes("67-C"),"ADMIN_STAGE_BADGE_MISSING");assert(!response.body.includes("/admin/dashboard"),"DASHBOARD_CONSUMPTION_FORBIDDEN");console.log(JSON.stringify({status:"PASS",stage:"67-C",ssr:true,locale:"fa-IR",direction:"rtl",authRuntimeDeferred:true},null,2));}finally{server.kill("SIGTERM");}
async function waitForServer(){for(let attempt=0;attempt<60;attempt+=1){try{const response=await request("/");if(response.status===200)return;}catch{}await new Promise(resolvePromise=>setTimeout(resolvePromise,250));}throw new Error("ADMIN_SERVER_START_TIMEOUT\n"+output);}
function request(pathname){return new Promise((resolvePromise,rejectPromise)=>{const url=new URL(pathname,`http://127.0.0.1:${port}`);const req=http.get(url,{headers:{accept:"text/html"}},res=>{let body="";res.setEncoding("utf8");res.on("data",chunk=>{body+=chunk;});res.on("end",()=>resolvePromise({status:res.statusCode??0,body}));});req.on("error",rejectPromise);});}
function count(text,needle){return text.split(needle).length-1;}
function assert(condition,code){if(!condition)throw new Error(code);}
