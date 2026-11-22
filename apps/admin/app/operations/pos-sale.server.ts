import { randomUUID } from "node:crypto";
import type { ApiComponents } from "../platform/api/contract.js";
import type { ApiClient } from "../platform/api/request.server.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type AddLine=ApiComponents["schemas"]["AdminPosAddLineRequest"];
export type PriceRequest=ApiComponents["schemas"]["AdminPosPriceRequest"];
export type CommitRequest=ApiComponents["schemas"]["AdminPosCommitRequest"];
export type SaleSummary={id:string;status:"draft"|"committed"|"voided";version:number;total_toman:number};
export type ScanSummary={variantId:string;productId:string;sku:string;barcode:string|null};
export type PriceSummary={sale_id:string;customer_type:"retail"|"wholesale";total_toman:number};
export type PosSaleResult=
  |{kind:"confirmed";requestId:string|null;idempotencyKey:string;sale?:SaleSummary;price?:PriceSummary;setCookies:readonly string[]}
  |{kind:"invalid"|"denied"|"not_found"|"conflict"|"unknown_outcome"|"unavailable";requestId:string|null;idempotencyKey:string|null;setCookies:readonly string[]};
export type PosScanResult=
  |{kind:"ready";requestId:string|null;scan:ScanSummary;setCookies:readonly string[]}
  |{kind:"invalid"|"denied"|"not_found"|"unavailable";requestId:string|null;setCookies:readonly string[]};
type Valid<T>={ok:true;body:T}|{ok:false;reason:string};
const id=(v:unknown):v is string=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).every(k=>keys.includes(k));
const positive=(v:unknown,max:number)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=1&&v<=max;
const money=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;
const text=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length>0&&v.trim().length<=max&&![...v].some(char=>{const point=char.charCodeAt(0);return point<32||point===127;});
const invalid=<T>(reason:string):Valid<T>=>({ok:false,reason});
export function validateScan(kind:unknown,value:unknown):Valid<{kind:"sku"|"barcode";value:string}>{
  if(kind!=="sku"&&kind!=="barcode")return invalid("نوع اسکن فقط SKU یا بارکد است.");
  if(!text(value,120))return invalid("مقدار اسکن باید بین ۱ تا ۱۲۰ نویسه و بدون کاراکتر کنترلی باشد.");
  return{ok:true,body:{kind,value:(value as string).trim()}};
}
export function validateAddLine(input:unknown):Valid<AddLine>{
  if(!record(input)||!exact(input,["variant_id","quantity"])||!id(input.variant_id)||!positive(input.quantity,999))
    return invalid("شناسه کالا و تعداد صحیح ۱ تا ۹۹۹ الزامی است.");
  return{ok:true,body:{variant_id:input.variant_id,quantity:input.quantity as number}};
}
export function validatePrice(input:unknown):Valid<PriceRequest>{
  if(!record(input)||!exact(input,["customer_type"])||(input.customer_type!=="retail"&&input.customer_type!=="wholesale"))
    return invalid("نوع مشتری باید retail یا wholesale باشد.");
  return{ok:true,body:{customer_type:input.customer_type}};
}
export function validateCommit(input:unknown):Valid<CommitRequest>{
  if(!record(input)||!exact(input,["warehouse_id","expected_version","payment_method","external_reference"])
    ||!id(input.warehouse_id)||!positive(input.expected_version,Number.MAX_SAFE_INTEGER)
    ||(input.payment_method!=="cash"&&input.payment_method!=="card")
    ||(input.external_reference!==undefined&&input.external_reference!==null&&!text(input.external_reference,120)))
    return invalid("شناسه انبار، نسخه معتبر، روش نقدی/کارت و مرجع حداکثر ۱۲۰ نویسه الزامی است.");
  return{ok:true,body:{warehouse_id:input.warehouse_id,expected_version:input.expected_version as number,
    payment_method:input.payment_method,...(typeof input.external_reference==="string"?{external_reference:input.external_reference.trim()}:{})}};
}
export function projectSale(raw:unknown):SaleSummary|null{
  if(!record(raw)||!id(raw.id)||!["draft","committed","voided"].includes(String(raw.status))
    ||!positive(raw.version,Number.MAX_SAFE_INTEGER)||!money(raw.total_toman))return null;
  return{id:raw.id,status:raw.status as SaleSummary["status"],version:raw.version as number,total_toman:raw.total_toman as number};
}
export function projectScan(raw:unknown):ScanSummary|null{
  if(!record(raw)||!id(raw.variantId)||!id(raw.productId)||!text(raw.sku,120)
    ||(raw.barcode!==null&&raw.barcode!==undefined&&!text(raw.barcode,120)))return null;
  return{variantId:raw.variantId,productId:raw.productId,sku:raw.sku as string,barcode:typeof raw.barcode==="string"?raw.barcode:null};
}
export function projectPrice(raw:unknown):PriceSummary|null{
  if(!record(raw)||!id(raw.sale_id)||(raw.customer_type!=="retail"&&raw.customer_type!=="wholesale")||!money(raw.total_toman))return null;
  return{sale_id:raw.sale_id,customer_type:raw.customer_type,total_toman:raw.total_toman as number};
}
export async function scanPos(request:Pick<Request,"headers">,kind:unknown,value:unknown):Promise<PosScanResult>{
  const v=validateScan(kind,value);if(!v.ok)return{kind:"invalid",requestId:null,setCookies:[]};
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const result=await bridge.client.request("get","/admin/pos/scan",{query:v.body});
    const scan=projectScan(result.data.data);
    return scan?{kind:"ready",requestId:result.requestId,scan,setCookies:bridge.takeSetCookies()}
      :{kind:"unavailable",requestId:result.requestId,setCookies:bridge.takeSetCookies()};
  }catch(e){return readError(e,bridge?.takeSetCookies()??[]);}
}
export async function createPosSale(request:Pick<Request,"headers">):Promise<PosSaleResult>{
  return mutate(request,async(client,key)=>{
    const r=await client.request("post","/admin/pos/sales",{headers:{"Idempotency-Key":key}});
    return{requestId:r.requestId,sale:projectSale(r.data.data)};
  });
}
export async function addPosLine(request:Pick<Request,"headers">,saleId:string,body:AddLine):Promise<PosSaleResult>{
  if(!id(saleId)||!validateAddLine(body).ok)return localInvalid();
  return mutate(request,async(client,key)=>{
    const r=await client.request("post","/admin/pos/sales/{id}/lines",{pathParams:{id:saleId},headers:{"Idempotency-Key":key},body});
    return{requestId:r.requestId};
  });
}
export async function pricePosSale(request:Pick<Request,"headers">,saleId:string,body:PriceRequest):Promise<PosSaleResult>{
  if(!id(saleId)||!validatePrice(body).ok)return localInvalid();
  return mutate(request,async(client,key)=>{
    const r=await client.request("post","/admin/pos/sales/{id}/price",{pathParams:{id:saleId},headers:{"Idempotency-Key":key},body});
    return{requestId:r.requestId,price:projectPrice(r.data.data)};
  });
}
export async function commitPosSale(request:Pick<Request,"headers">,saleId:string,body:CommitRequest):Promise<PosSaleResult>{
  if(!id(saleId)||!validateCommit(body).ok)return localInvalid();
  return mutate(request,async(client,key)=>{
    const r=await client.request("post","/admin/pos/sales/{id}/commit",{pathParams:{id:saleId},headers:{"Idempotency-Key":key},body});
    return{requestId:r.requestId,sale:projectSale(r.data.data)};
  });
}
async function mutate(request:Pick<Request,"headers">,invoke:(client:ApiClient,key:string)=>Promise<{requestId:string|null;sale?:SaleSummary|null;price?:PriceSummary|null}>):Promise<PosSaleResult>{
  const key=randomUUID();let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const r=await invoke(bridge.client,key);
    // A confirmed HTTP operation with malformed canonical data is not a trusted UI state.
    if(r.sale===null||r.price===null)return{kind:"unknown_outcome",requestId:r.requestId,idempotencyKey:key,setCookies:bridge.takeSetCookies()};
    return{kind:"confirmed",requestId:r.requestId,idempotencyKey:key,...(r.sale?{sale:r.sale}:{}),...(r.price?{price:r.price}:{}),setCookies:bridge.takeSetCookies()};
  }catch(e){return mutationError(e,key,bridge?.takeSetCookies()??[]);}
}
function localInvalid():PosSaleResult{return{kind:"invalid",requestId:null,idempotencyKey:null,setCookies:[]};}
function readError(e:unknown,setCookies:readonly string[]):PosScanResult{
  if(e instanceof ApiClientError&&e.kind==="http"){
    if(e.status===401||e.status===403)return{kind:"denied",requestId:e.requestId,setCookies};
    if(e.status===404)return{kind:"not_found",requestId:e.requestId,setCookies};
  }
  return{kind:"unavailable",requestId:e instanceof ApiClientError?e.requestId:null,setCookies};
}
function mutationError(e:unknown,key:string,setCookies:readonly string[]):PosSaleResult{
  if(e instanceof ApiClientError){
    if(e.kind==="http"){
      if(e.status===401||e.status===403)return{kind:"denied",requestId:e.requestId,idempotencyKey:key,setCookies};
      if(e.status===404)return{kind:"not_found",requestId:e.requestId,idempotencyKey:key,setCookies};
      if(e.status===400||e.status===422)return{kind:"invalid",requestId:e.requestId,idempotencyKey:key,setCookies};
      if(e.status===409||e.status===412||e.status===428)return{kind:"conflict",requestId:e.requestId,idempotencyKey:key,setCookies};
      if(e.status===408||(typeof e.status==="number"&&e.status>=500))return{kind:"unknown_outcome",requestId:e.requestId,idempotencyKey:key,setCookies};
    }
    if(e.kind==="network"||e.kind==="timeout"||e.kind==="aborted")return{kind:"unknown_outcome",requestId:e.requestId,idempotencyKey:key,setCookies};
    return{kind:"unavailable",requestId:e.requestId,idempotencyKey:key,setCookies};
  }
  return{kind:"unknown_outcome",requestId:null,idempotencyKey:key,setCookies};
}
