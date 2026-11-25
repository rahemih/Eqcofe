import { randomUUID } from "node:crypto";
import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type OfflineBody=ApiComponents["schemas"]["AdminPosOfflineSaleSyncRequest"];
export type OfflineView={client_command_id:string;status:"queued"|"applied"|"failed"|"abandoned";recovery_count:number;error_code:string|null};
export type OfflineMutation=
  |{kind:"confirmed";command:OfflineView;idempotencyKey:string;requestId:string|null;setCookies:readonly string[]}
  |{kind:"invalid"|"denied"|"not_found"|"conflict"|"unknown_outcome"|"unavailable";idempotencyKey:string|null;requestId:string|null;setCookies:readonly string[]};
type Valid<T>={ok:true;body:T}|{ok:false;reason:string};
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const uuid=(x:unknown):x is string=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const integer=(x:unknown,max:number)=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=1&&x<=max;
const noControl=(x:string)=>!/[\\u0000-\\u001F\\u007F]/.test(x);
export function validateOfflineCapture(value:unknown):Valid<OfflineBody>{
 if(!record(value)||Object.keys(value).some(k=>!["warehouse_id","customer_type","payment_method","external_reference","lines"].includes(k))
 ||!uuid(value.warehouse_id)||(value.customer_type!=="retail"&&value.customer_type!=="wholesale")
 ||(value.payment_method!=="cash"&&value.payment_method!=="card"))return{ok:false,reason:"اطلاعات انبار یا پرداخت نامعتبر است."};
 let external_reference:string|null|undefined;
 if(value.external_reference===undefined||value.external_reference===null)external_reference=null;
 else if(typeof value.external_reference==="string"&&value.external_reference.trim().length>=1&&value.external_reference.trim().length<=120&&noControl(value.external_reference))external_reference=value.external_reference.trim();
 else return{ok:false,reason:"شماره مرجع پرداخت معتبر نیست."};
 if(!Array.isArray(value.lines)||value.lines.length<1||value.lines.length>100)return{ok:false,reason:"تعداد اقلام باید ۱ تا ۱۰۰ باشد."};
 const totals=new Map<string,number>();
 for(const line of value.lines){
   if(!record(line)||Object.keys(line).some(k=>!["variant_id","quantity"].includes(k))||!uuid(line.variant_id)||!integer(line.quantity,999))return{ok:false,reason:"قلم فروش معتبر نیست."};
   const count=(totals.get(line.variant_id)??0)+(line.quantity as number);
   if(count>999)return{ok:false,reason:"جمع تعداد کالا بیش از حد مجاز است."};
   totals.set(line.variant_id,count);
 }
 const lines=[...totals].sort(([a],[b])=>a.localeCompare(b)).map(([variant_id,quantity])=>({variant_id,quantity}));
 return{ok:true,body:{warehouse_id:value.warehouse_id,customer_type:value.customer_type,payment_method:value.payment_method,external_reference,lines}};
}
export function projectOfflineCommand(raw:unknown):OfflineView|null{
 if(!record(raw)||!uuid(raw.client_command_id)||!["queued","applied","failed","abandoned"].includes(String(raw.status))
 ||typeof raw.recovery_count!=="number"||!Number.isSafeInteger(raw.recovery_count)||raw.recovery_count<0||raw.recovery_count>5
 ||(raw.error_code!==undefined&&raw.error_code!==null&&(typeof raw.error_code!=="string"||raw.error_code.length>120||!noControl(raw.error_code))))return null;
 return{client_command_id:raw.client_command_id,status:raw.status as OfflineView["status"],recovery_count:raw.recovery_count,error_code:typeof raw.error_code==="string"?raw.error_code:null};
}
export async function capturePosOffline(request:Pick<Request,"headers">,body:OfflineBody):Promise<OfflineMutation>{
 const valid=validateOfflineCapture(body);if(!valid.ok)return invalid();
 const clientCommandId=randomUUID();
 return mutate(request,clientCommandId,async bridge=>{
  const result=await bridge.client.request("post","/admin/pos/offline/commands",{headers:{"Idempotency-Key":clientCommandId},body:valid.body});
  return{command:projectOfflineCommand(result.data.data),requestId:result.requestId};
 });
}
export async function syncPosOffline(request:Pick<Request,"headers">,clientCommandId:string):Promise<OfflineMutation>{
 if(!uuid(clientCommandId))return invalid();
 const key=randomUUID();
 return mutate(request,key,async bridge=>{
  const result=await bridge.client.request("post","/admin/pos/offline/commands/{clientCommandId}/sync",{pathParams:{clientCommandId},headers:{"Idempotency-Key":key}});
  return{command:projectOfflineCommand(result.data.data),requestId:result.requestId};
 });
}
type Bridge=ReturnType<typeof createAdminAuthBridge>;
async function mutate(request:Pick<Request,"headers">,key:string,invoke:(bridge:Bridge)=>Promise<{command:OfflineView|null;requestId:string|null}>):Promise<OfflineMutation>{
 let bridge:Bridge|null=null;
 try{
  bridge=createAdminAuthBridge(request);
  const result=await invoke(bridge),setCookies=bridge.takeSetCookies();
  if(!result.command)return{kind:"unknown_outcome",idempotencyKey:key,requestId:result.requestId,setCookies};
  return{kind:"confirmed",command:result.command,idempotencyKey:key,requestId:result.requestId,setCookies};
 }catch(error){
  const setCookies=bridge?.takeSetCookies()??[];
  if(error instanceof ApiClientError){
    if(error.kind==="http"){
      if(error.status===401||error.status===403)return{kind:"denied",idempotencyKey:key,requestId:error.requestId,setCookies};
      if(error.status===404)return{kind:"not_found",idempotencyKey:key,requestId:error.requestId,setCookies};
      if(error.status===400||error.status===422)return{kind:"invalid",idempotencyKey:key,requestId:error.requestId,setCookies};
      if(error.status===409||error.status===412||error.status===428)return{kind:"conflict",idempotencyKey:key,requestId:error.requestId,setCookies};
      if(error.status===408||error.status>=500)return{kind:"unknown_outcome",idempotencyKey:key,requestId:error.requestId,setCookies};
    }
    if(error.kind==="timeout"||error.kind==="network"||error.kind==="aborted")return{kind:"unknown_outcome",idempotencyKey:key,requestId:error.requestId,setCookies};
    return{kind:"unavailable",idempotencyKey:key,requestId:error.requestId,setCookies};
  }
  return{kind:"unknown_outcome",idempotencyKey:key,requestId:null,setCookies};
 }
}
function invalid():OfflineMutation{return{kind:"invalid",idempotencyKey:null,requestId:null,setCookies:[]};}
