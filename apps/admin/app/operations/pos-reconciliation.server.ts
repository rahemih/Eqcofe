import { randomUUID } from "node:crypto";
import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type NoteBody=ApiComponents["schemas"]["AdminPosReconciliationNoteRequest"];
export type CommandView={id:string;clientCommandId:string;status:"queued"|"applied"|"failed"|"abandoned";errorCode:string|null;recoveryCount:number};
export type HistoryView={action:"retry_requested"|"abandoned";recoveryCount:number;priorErrorCode:string;note:string|null;createdAt:string};
export type InspectionView={command:CommandView;history:HistoryView[]};
export type ReadResult<T>={kind:"ready";value:T;requestId:string|null;setCookies:readonly string[]}|{kind:"invalid"|"denied"|"not_found"|"unavailable";requestId:string|null;setCookies:readonly string[]};
export type MutationResult={kind:"confirmed"|"invalid"|"denied"|"not_found"|"conflict"|"step_up_required"|"unknown_outcome"|"unavailable";command?:CommandView;requiresOwnerSync?:true;requestId:string|null;key:string|null;setCookies:readonly string[]};
type Valid<T>={ok:true;body:T}|{ok:false};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==="string"&&UUID.test(v);
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const clean=(v:string,max:number)=>v.trim().length>0&&v.trim().length<=max&&![...v].some(ch=>{const c=ch.charCodeAt(0);return c<32||c===127;});
export function validateReconciliationId(v:unknown):v is string{return uuid(v);}
export function validateReconciliationLimit(v:unknown):v is number{return integer(v,1,100);}
export function validateReconciliationNote(v:unknown):Valid<NoteBody>{
 if(v==null||v==="")return {ok:true,body:{}};
 if(typeof v!=="string"||!clean(v,500))return{ok:false};
 return{ok:true,body:{note:v.trim()}};
}
export function projectReconciliationCommand(raw:unknown):CommandView|null{
 if(!record(raw)||!uuid(raw.id)||!uuid(raw.client_command_id)||raw.command_type!=="sale.sync"
 ||!["queued","applied","failed","abandoned"].includes(String(raw.status))
 ||!integer(raw.recovery_count,0,5)
 ||(raw.error_code!=null&&(typeof raw.error_code!=="string"||raw.error_code.length>120||![...raw.error_code].every(ch=>{const code=ch.charCodeAt(0);return code>=32&&code!==127;}))))return null;
 return{id:raw.id,clientCommandId:raw.client_command_id,status:raw.status as CommandView["status"],errorCode:typeof raw.error_code==="string"?raw.error_code:null,recoveryCount:raw.recovery_count as number};
}
export function projectReconciliationFailedList(raw:unknown):CommandView[]|null{
 if(!Array.isArray(raw)||raw.length>100)return null;
 const commands:CommandView[]=[];
 for(const item of raw){const command=projectReconciliationCommand(item);if(!command||command.status!=="failed")return null;commands.push(command);}
 return commands;
}
export function projectReconciliationInspection(raw:unknown):InspectionView|null{
 if(!record(raw))return null;
 const command=projectReconciliationCommand(raw.command);
 if(!command||!Array.isArray(raw.history)||raw.history.length>50)return null;
 const history:HistoryView[]=[];
 for(const x of raw.history){
  if(!record(x)||!["retry_requested","abandoned"].includes(String(x.action))||!integer(x.recovery_count,0,5)
  ||typeof x.prior_error_code!=="string"||x.prior_error_code.length>120||![...x.prior_error_code].every(ch=>{const n=ch.charCodeAt(0);return n>=32&&n!==127;})
  ||(x.note!=null&&(typeof x.note!=="string"||!clean(x.note,500)))
  ||typeof x.created_at!=="string"||x.created_at.length>45||!Number.isFinite(Date.parse(x.created_at)))return null;
  history.push({action:x.action as HistoryView["action"],recoveryCount:x.recovery_count as number,priorErrorCode:x.prior_error_code,note:typeof x.note==="string"?x.note:null,createdAt:x.created_at});
 }
 return{command,history};
}
function readError<T>(e:unknown,cookies:readonly string[]):ReadResult<T>{
 if(e instanceof ApiClientError&&e.kind==="http"){
  if(e.status===401||e.status===403)return{kind:"denied",requestId:e.requestId,setCookies:cookies};
  if(e.status===404)return{kind:"not_found",requestId:e.requestId,setCookies:cookies};
  if(e.status===400||e.status===422)return{kind:"invalid",requestId:e.requestId,setCookies:cookies};
 }
 return{kind:"unavailable",requestId:e instanceof ApiClientError?e.requestId:null,setCookies:cookies};
}
function mutationError(e:unknown,key:string,cookies:readonly string[]):MutationResult{
 if(e instanceof ApiClientError){
  if(e.kind==="http"){
   if(e.code==="STEP_UP_REQUIRED")return{kind:"step_up_required",requestId:e.requestId,key,setCookies:cookies};
   if(e.status===401||e.status===403)return{kind:"denied",requestId:e.requestId,key,setCookies:cookies};
   if(e.status===404)return{kind:"not_found",requestId:e.requestId,key,setCookies:cookies};
   if(e.status===400||e.status===422)return{kind:"invalid",requestId:e.requestId,key,setCookies:cookies};
   if([409,412,428].includes(e.status??0))return{kind:"conflict",requestId:e.requestId,key,setCookies:cookies};
   if(e.status===408||(typeof e.status==="number"&&e.status>=500))return{kind:"unknown_outcome",requestId:e.requestId,key,setCookies:cookies};
  }
  if(["network","timeout","aborted"].includes(e.kind))return{kind:"unknown_outcome",requestId:e.requestId,key,setCookies:cookies};
  return{kind:"unavailable",requestId:e.requestId,key,setCookies:cookies};
 }
 return{kind:"unknown_outcome",requestId:null,key,setCookies:cookies};
}
export async function listFailedReconciliationCommands(request:Pick<Request,"headers">,limit:number):Promise<ReadResult<CommandView[]>>{
 if(!validateReconciliationLimit(limit))return{kind:"invalid",requestId:null,setCookies:[]};
 let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
 try{
  bridge=createAdminAuthBridge(request);
  const response=await bridge.client.request("get","/admin/pos/reconciliation/failed",{query:{limit}});
  const value=projectReconciliationFailedList(response.data.data);
  return value?{kind:"ready",value,requestId:response.requestId,setCookies:bridge.takeSetCookies()}:{kind:"unavailable",requestId:response.requestId,setCookies:bridge.takeSetCookies()};
 }catch(e){return readError(e,bridge?.takeSetCookies()??[]);}
}
export async function inspectReconciliationCommand(request:Pick<Request,"headers">,id:string):Promise<ReadResult<InspectionView>>{
 if(!validateReconciliationId(id))return{kind:"invalid",requestId:null,setCookies:[]};
 let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
 try{
  bridge=createAdminAuthBridge(request);
  const response=await bridge.client.request("get","/admin/pos/reconciliation/{clientCommandId}",{pathParams:{clientCommandId:id}});
  const value=projectReconciliationInspection(response.data.data);
  return value&&value.command.clientCommandId.toLowerCase()===id.toLowerCase()?{kind:"ready",value,requestId:response.requestId,setCookies:bridge.takeSetCookies()}:{kind:"unavailable",requestId:response.requestId,setCookies:bridge.takeSetCookies()};
 }catch(e){return readError(e,bridge?.takeSetCookies()??[]);}
}
export async function recoverReconciliationCommand(request:Pick<Request,"headers">,id:string,mode:"retry"|"abandon",note:NoteBody,stepUpToken:string):Promise<MutationResult>{
 const checkedNote=validateReconciliationNote(note.note);
 if(!validateReconciliationId(id)||!checkedNote.ok||typeof stepUpToken!=="string"||stepUpToken.length<16||stepUpToken.length>8192)return{kind:"invalid",requestId:null,key:null,setCookies:[]};
 // Mint a mutation key only on explicit authenticated user action. Never automatically replay an ambiguous result.
 const key=randomUUID();
 let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
 try{
  bridge=createAdminAuthBridge(request,{stepUpToken});
  let raw:unknown,requestId:string|null;
  if(mode==="retry"){
   const response=await bridge.client.request("post","/admin/pos/reconciliation/{clientCommandId}/retry",{pathParams:{clientCommandId:id},headers:{"Idempotency-Key":key},body:checkedNote.body});
   raw=response.data.data;requestId=response.requestId;
  }else{
   const response=await bridge.client.request("post","/admin/pos/reconciliation/{clientCommandId}/abandon",{pathParams:{clientCommandId:id},headers:{"Idempotency-Key":key},body:checkedNote.body});
   raw=response.data.data;requestId=response.requestId;
  }
  const source=mode==="retry"&&record(raw)?raw.command:raw;
  const command=projectReconciliationCommand(source);
  const trusted=Boolean(command&&command.clientCommandId.toLowerCase()===id.toLowerCase()&&(mode==="retry"?(command.status==="queued"&&record(raw)&&raw.requires_owner_sync===true):command.status==="abandoned"));
  const setCookies=bridge.takeSetCookies();
  if(!trusted)return{kind:"unknown_outcome",key,requestId,setCookies};
  return{kind:"confirmed",command:command!,requiresOwnerSync:mode==="retry"?true:undefined,key,requestId,setCookies};
 }catch(e){return mutationError(e,key,bridge?.takeSetCookies()??[]);}
}
