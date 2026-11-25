import { randomUUID } from "node:crypto";
import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type OfflineBody=ApiComponents["schemas"]["AdminPosOfflineSaleSyncRequest"];
export type NoteBody=ApiComponents["schemas"]["AdminPosReconciliationNoteRequest"];
export type CommandView={id:string;clientCommandId:string;status:"queued"|"applied"|"failed"|"abandoned";errorCode:string|null;recoveryCount:number};
export type HistoryView={action:"retry_requested"|"abandoned";recoveryCount:number;priorErrorCode:string;note:string|null;createdAt:string};
export type InspectionView={command:CommandView;history:HistoryView[]};
export type ReadResult<T>={kind:"ready";value:T;requestId:string|null;setCookies:readonly string[]}|{kind:"invalid"|"denied"|"not_found"|"unavailable";requestId:string|null;setCookies:readonly string[]};
export type MutationResult={kind:"confirmed"|"invalid"|"denied"|"not_found"|"conflict"|"step_up_required"|"unknown_outcome"|"unavailable";command?:CommandView;requiresOwnerSync?:true;requestId:string|null;key:string|null;setCookies:readonly string[]};
type Valid<T>={ok:true;body:T}|{ok:false};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==="string"&&UUID.test(v);
const integer=(v:unknown,min:number,max:number)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const only=(v:Record<string,unknown>,fields:string[])=>Object.keys(v).every(k=>fields.includes(k));
const cleanText=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length>0&&v.trim().length<=max&&![...v].some(ch=>{const code=ch.charCodeAt(0);return code<32||code===127;});
const invalid=<T>():Valid<T>=>({ok:false});
const localInvalid=():MutationResult=>({kind:"invalid",key:null,requestId:null,setCookies:[]});
export function validateClientCommandId(v:unknown):v is string{return uuid(v);}
export function validateLimit(v:unknown):v is number{return integer(v,1,100);}
export function validateNote(value:unknown):Valid<NoteBody>{
  if(value===null||value===undefined||value==="")return{ok:true,body:{}};
  if(!cleanText(value,500))return invalid();
  return{ok:true,body:{note:(value as string).trim()}};
}
export function validateOfflinePayload(raw:unknown):Valid<OfflineBody>{
  if(!object(raw)||!only(raw,["warehouse_id","customer_type","payment_method","external_reference","lines"])
    ||!uuid(raw.warehouse_id)||(raw.customer_type!=="retail"&&raw.customer_type!=="wholesale")
    ||(raw.payment_method!=="cash"&&raw.payment_method!=="card")
    ||(raw.external_reference!==undefined&&raw.external_reference!==null&&!cleanText(raw.external_reference,120))
    ||!Array.isArray(raw.lines)||raw.lines.length<1||raw.lines.length>100)return invalid();
  const sum=new Map<string,number>();
  for(const line of raw.lines){
    if(!object(line)||!only(line,["variant_id","quantity"])||!uuid(line.variant_id)||!integer(line.quantity,1,999))return invalid();
    const next=(sum.get(line.variant_id)??0)+(line.quantity as number);
    if(next>999)return invalid();
    sum.set(line.variant_id,next);
  }
  const lines=[...sum.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([variant_id,quantity])=>({variant_id,quantity}));
  return{ok:true,body:{warehouse_id:raw.warehouse_id as string,customer_type:raw.customer_type as "retail"|"wholesale",
    payment_method:raw.payment_method as "cash"|"card",...(typeof raw.external_reference==="string"?{external_reference:raw.external_reference.trim()}:{}),lines}};
}
export function projectCommand(raw:unknown):CommandView|null{
  if(!object(raw)||!uuid(raw.id)||!uuid(raw.client_command_id)||raw.command_type!=="sale.sync"
    ||!["queued","applied","failed","abandoned"].includes(String(raw.status))
    ||!integer(raw.recovery_count,0,5)
    ||(raw.error_code!==undefined&&raw.error_code!==null&&(typeof raw.error_code!=="string"||raw.error_code.length>120)))return null;
  return{id:raw.id,clientCommandId:raw.client_command_id,status:raw.status as CommandView["status"],
    errorCode:typeof raw.error_code==="string"?raw.error_code:null,recoveryCount:raw.recovery_count as number};
}
export function projectFailedList(raw:unknown):CommandView[]|null{
  if(!Array.isArray(raw)||raw.length>100)return null;
  const result:CommandView[]=[];
  for(const item of raw){const cmd=projectCommand(item);if(!cmd||cmd.status!=="failed")return null;result.push(cmd);}
  return result;
}
export function projectInspection(raw:unknown):InspectionView|null{
  if(!object(raw))return null;
  const command=projectCommand(raw.command);
  if(!command||!Array.isArray(raw.history)||raw.history.length>50)return null;
  const history:HistoryView[]=[];
  for(const item of raw.history){
    if(!object(item)||!["retry_requested","abandoned"].includes(String(item.action))||!integer(item.recovery_count,0,5)
      ||typeof item.prior_error_code!=="string"||item.prior_error_code.length>120
      ||(item.note!==undefined&&item.note!==null&&!cleanText(item.note,500))
      ||typeof item.created_at!=="string"||!Number.isFinite(Date.parse(item.created_at)))return null;
    history.push({action:item.action as HistoryView["action"],recoveryCount:item.recovery_count as number,
      priorErrorCode:item.prior_error_code,note:typeof item.note==="string"?item.note:null,createdAt:item.created_at});
  }
  return{command,history};
}
function readError<T>(error:unknown,cookies:readonly string[]):ReadResult<T>{
  if(error instanceof ApiClientError&&error.kind==="http"){
    if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,setCookies:cookies};
    if(error.status===404)return{kind:"not_found",requestId:error.requestId,setCookies:cookies};
    if(error.status===400||error.status===422)return{kind:"invalid",requestId:error.requestId,setCookies:cookies};
  }
  return{kind:"unavailable",requestId:error instanceof ApiClientError?error.requestId:null,setCookies:cookies};
}
function mutationError(error:unknown,key:string,cookies:readonly string[]):MutationResult{
  if(error instanceof ApiClientError){
    if(error.kind==="http"){
      if(error.code==="STEP_UP_REQUIRED")return{kind:"step_up_required",requestId:error.requestId,key,setCookies:cookies};
      if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,key,setCookies:cookies};
      if(error.status===404)return{kind:"not_found",requestId:error.requestId,key,setCookies:cookies};
      if(error.status===400||error.status===422)return{kind:"invalid",requestId:error.requestId,key,setCookies:cookies};
      if([409,412,428].includes(error.status??0))return{kind:"conflict",requestId:error.requestId,key,setCookies:cookies};
      if(error.status===408||(typeof error.status==="number"&&error.status>=500))return{kind:"unknown_outcome",requestId:error.requestId,key,setCookies:cookies};
    }
    if(["network","timeout","aborted"].includes(error.kind))return{kind:"unknown_outcome",requestId:error.requestId,key,setCookies:cookies};
    return{kind:"unavailable",requestId:error.requestId,key,setCookies:cookies};
  }
  return{kind:"unknown_outcome",requestId:null,key,setCookies:cookies};
}
export async function listFailedCommands(request:Pick<Request,"headers">,limit:number):Promise<ReadResult<CommandView[]>>{
  if(!validateLimit(limit))return{kind:"invalid",requestId:null,setCookies:[]};
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const r=await bridge.client.request("get","/admin/pos/reconciliation/failed",{query:{limit}});
    const value=projectFailedList(r.data.data);
    return value?{kind:"ready",value,requestId:r.requestId,setCookies:bridge.takeSetCookies()}:{kind:"unavailable",requestId:r.requestId,setCookies:bridge.takeSetCookies()};
  }catch(e){return readError(e,bridge?.takeSetCookies()??[]);}
}
export async function inspectCommand(request:Pick<Request,"headers">,commandId:string):Promise<ReadResult<InspectionView>>{
  if(!uuid(commandId))return{kind:"invalid",requestId:null,setCookies:[]};
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const r=await bridge.client.request("get","/admin/pos/reconciliation/{clientCommandId}",{pathParams:{clientCommandId:commandId}});
    const value=projectInspection(r.data.data);
    return value?{kind:"ready",value,requestId:r.requestId,setCookies:bridge.takeSetCookies()}:{kind:"unavailable",requestId:r.requestId,setCookies:bridge.takeSetCookies()};
  }catch(e){return readError(e,bridge?.takeSetCookies()??[]);}
}
async function mutate(request:Pick<Request,"headers">,key:string,expectedClientCommandId:string,stepUpToken:string|undefined,
  call:(bridge:ReturnType<typeof createAdminAuthBridge>)=>Promise<{requestId:string|null;data:unknown;recovery:boolean}>):Promise<MutationResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request,stepUpToken?{stepUpToken}:{});
    const r=await call(bridge);
    const source=r.recovery&&object(r.data)?r.data.command:r.data;
    const command=projectCommand(source);
    if(!command||command.clientCommandId.toLowerCase()!==expectedClientCommandId.toLowerCase()||(r.recovery&&(!object(r.data)||r.data.requires_owner_sync!==true)))return{kind:"unknown_outcome",requestId:r.requestId,key,setCookies:bridge.takeSetCookies()};
    return{kind:"confirmed",command,...(r.recovery?{requiresOwnerSync:true as const}:{}),requestId:r.requestId,key,setCookies:bridge.takeSetCookies()};
  }catch(e){return mutationError(e,key,bridge?.takeSetCookies()??[]);}
}
export async function captureOfflineCommand(request:Pick<Request,"headers">,commandId:string,body:OfflineBody):Promise<MutationResult>{
  if(!uuid(commandId)||!validateOfflinePayload(body).ok)return localInvalid();
  // The offline terminal's immutable client_command_id is the Backend's idempotency identity.
  // Do NOT mint a different UUID for each capture attempt; ambiguous outcomes require reconciliation.
  return mutate(request,commandId,commandId,undefined,async bridge=>{
    const r=await bridge.client.request("post","/admin/pos/offline/commands",{headers:{"Idempotency-Key":commandId},body});
    return{requestId:r.requestId,data:r.data.data,recovery:false};
  });
}
export async function syncOfflineCommand(request:Pick<Request,"headers">,commandId:string):Promise<MutationResult>{
  if(!uuid(commandId))return localInvalid();
  const key=randomUUID();
  return mutate(request,key,commandId,undefined,async bridge=>{
    const r=await bridge.client.request("post","/admin/pos/offline/commands/{clientCommandId}/sync",{pathParams:{clientCommandId:commandId},headers:{"Idempotency-Key":key}});
    return{requestId:r.requestId,data:r.data.data,recovery:false};
  });
}
export async function recoverOfflineCommand(request:Pick<Request,"headers">,commandId:string,mode:"retry"|"abandon",note:NoteBody,stepUpToken:string):Promise<MutationResult>{
  if(!uuid(commandId)||!validateNote(note.note).ok||!stepUpToken)return localInvalid();
  const key=randomUUID();
  return mutate(request,key,commandId,stepUpToken,async bridge=>{
    const path=mode==="retry"?"/admin/pos/reconciliation/{clientCommandId}/retry" as const:"/admin/pos/reconciliation/{clientCommandId}/abandon" as const;
    if(path==="/admin/pos/reconciliation/{clientCommandId}/retry"){
      const r=await bridge.client.request("post",path,{pathParams:{clientCommandId:commandId},headers:{"Idempotency-Key":key},body:note});
      return{requestId:r.requestId,data:r.data.data,recovery:true};
    }
    const r=await bridge.client.request("post",path,{pathParams:{clientCommandId:commandId},headers:{"Idempotency-Key":key},body:note});
    return{requestId:r.requestId,data:r.data.data,recovery:false};
  });
}
