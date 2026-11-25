import {randomUUID} from "node:crypto";
import type {ApiComponents} from "../platform/api/contract.js";
import {ApiClientError} from "../platform/api/errors.js";
import {createAdminAuthBridge} from "../platform/auth/admin-cookie.server.js";
export type OfflineBody=ApiComponents["schemas"]["AdminPosOfflineSaleSyncRequest"];
export type OfflineCommand={client_command_id:string;status:"queued"|"applied"|"failed"|"abandoned";recovery_count:number;error_code:string|null};
export type OfflineResult={kind:"confirmed"|"ready"|"invalid"|"denied"|"not_found"|"conflict"|"unknown_outcome"|"unavailable";requestId:string|null;key:string|null;setCookies:readonly string[];command?:OfflineCommand;commands?:OfflineCommand[]};
type Valid<T>={ok:true;body:T}|{ok:false};
const uuid=(x:unknown):x is string=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).every(k=>keys.includes(k));
const integer=(v:unknown,min:number,max:number)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validateOfflineBody(raw:unknown):Valid<OfflineBody>{
  if(!record(raw)||!exact(raw,["warehouse_id","customer_type","payment_method","external_reference","lines"])||!uuid(raw.warehouse_id)||!["retail","wholesale"].includes(String(raw.customer_type))||!["cash","card"].includes(String(raw.payment_method)))return {ok:false};
  if(raw.external_reference!==undefined&&(typeof raw.external_reference!=="string"||raw.external_reference.trim().length<1||raw.external_reference.trim().length>120||[...raw.external_reference].some(ch=>ch.charCodeAt(0)<32||ch.charCodeAt(0)===127)))return {ok:false};
  if(!Array.isArray(raw.lines)||raw.lines.length<1||raw.lines.length>100)return {ok:false};
  const lines:Array<{variant_id:string;quantity:number}>=[];
  for(const line of raw.lines){
    if(!record(line)||!exact(line,["variant_id","quantity"])||!uuid(line.variant_id)||!integer(line.quantity,1,999))return {ok:false};
    lines.push({variant_id:line.variant_id,quantity:line.quantity as number});
  }
  return {ok:true,body:{warehouse_id:raw.warehouse_id,customer_type:raw.customer_type as "retail"|"wholesale",payment_method:raw.payment_method as "cash"|"card",lines,...(typeof raw.external_reference==="string"?{external_reference:raw.external_reference.trim()}:{})}};
}
export function projectOffline(raw:unknown):OfflineCommand|null{
  if(!record(raw)||!uuid(raw.client_command_id)||!["queued","applied","failed","abandoned"].includes(String(raw.status))||!integer(raw.recovery_count,0,5))return null;
  if(raw.error_code!==null&&raw.error_code!==undefined&&(typeof raw.error_code!=="string"||raw.error_code.length>120))return null;
  return {client_command_id:raw.client_command_id,status:raw.status as OfflineCommand["status"],recovery_count:raw.recovery_count as number,error_code:typeof raw.error_code==="string"?raw.error_code:null};
}
const fallback=(kind:OfflineResult["kind"],cookies:readonly string[]=[],key:string|null=null,requestId:string|null=null):OfflineResult=>({kind,setCookies:cookies,key,requestId});
type RequestInfo=Pick<Request,"headers">;
export async function captureOffline(request:RequestInfo,raw:unknown):Promise<OfflineResult>{
  const v=validateOfflineBody(raw);if(!v.ok)return fallback("invalid");
  const key=randomUUID();let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{bridge=createAdminAuthBridge(request);
    const r=await bridge.client.request("post","/admin/pos/offline/commands",{headers:{"Idempotency-Key":key},body:v.body});
    const cookies=bridge.takeSetCookies(),command=projectOffline(r.data.data);
    return command?{kind:"confirmed",command,requestId:r.requestId,key,setCookies:cookies}:fallback("unknown_outcome",cookies,key,r.requestId);
  }catch(e){return mutationError(e,key,bridge?.takeSetCookies()??[]);}
}
export async function syncOffline(request:RequestInfo,id:unknown):Promise<OfflineResult>{
  if(!uuid(id))return fallback("invalid");
  const key=randomUUID();let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{bridge=createAdminAuthBridge(request);
    const r=await bridge.client.request("post","/admin/pos/offline/commands/{clientCommandId}/sync",{pathParams:{clientCommandId:id},headers:{"Idempotency-Key":key}});
    const cookies=bridge.takeSetCookies(),command=projectOffline(r.data.data);
    return command?{kind:"confirmed",command,requestId:r.requestId,key,setCookies:cookies}:fallback("unknown_outcome",cookies,key,r.requestId);
  }catch(e){return mutationError(e,key,bridge?.takeSetCookies()??[]);}
}
export async function listFailedOffline(request:RequestInfo,limit:unknown):Promise<OfflineResult>{
  if(!integer(limit,1,100))return fallback("invalid");
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{bridge=createAdminAuthBridge(request);
    const r=await bridge.client.request("get","/admin/pos/reconciliation/failed",{query:{limit:limit as number}});
    const raw=r.data.data,cookies=bridge.takeSetCookies();
    if(!Array.isArray(raw)||raw.length>100)return fallback("unavailable",cookies,null,r.requestId);
    const commands=raw.map(projectOffline);
    return commands.some(x=>x===null)?fallback("unavailable",cookies,null,r.requestId):{kind:"ready",requestId:r.requestId,key:null,setCookies:cookies,commands:commands as OfflineCommand[]};
  }catch(e){return readError(e,bridge?.takeSetCookies()??[]);}
}
export async function inspectOffline(request:RequestInfo,id:unknown):Promise<OfflineResult>{
  if(!uuid(id))return fallback("invalid");
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{bridge=createAdminAuthBridge(request);
    const r=await bridge.client.request("get","/admin/pos/reconciliation/{clientCommandId}",{pathParams:{clientCommandId:id}});
    const cookies=bridge.takeSetCookies(),command=projectOffline(r.data.data.command);
    return command?{kind:"ready",requestId:r.requestId,key:null,setCookies:cookies,command}:fallback("unavailable",cookies,null,r.requestId);
  }catch(e){return readError(e,bridge?.takeSetCookies()??[]);}
}
function mutationError(e:unknown,key:string,cookies:readonly string[]):OfflineResult{
  if(e instanceof ApiClientError&&e.kind==="http"){
    if(e.status===401||e.status===403)return fallback("denied",cookies,key,e.requestId);
    if(e.status===404)return fallback("not_found",cookies,key,e.requestId);
    if(e.status===400||e.status===422)return fallback("invalid",cookies,key,e.requestId);
    if(e.status===409||e.status===412||e.status===428)return fallback("conflict",cookies,key,e.requestId);
  }
  return fallback("unknown_outcome",cookies,key,e instanceof ApiClientError?e.requestId:null);
}
function readError(e:unknown,cookies:readonly string[]):OfflineResult{
  if(e instanceof ApiClientError&&e.kind==="http"){
    if(e.status===401||e.status===403)return fallback("denied",cookies,null,e.requestId);
    if(e.status===404)return fallback("not_found",cookies,null,e.requestId);
  }
  return fallback("unavailable",cookies,null,e instanceof ApiClientError?e.requestId:null);
}
