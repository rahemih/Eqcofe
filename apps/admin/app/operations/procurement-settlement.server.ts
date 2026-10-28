import { randomUUID } from "node:crypto";
import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type SettlementView="receipts"|"landed-costs"|"invoices"|"returns";
export type ReceiptCreate=ApiComponents["schemas"]["GoodsReceiptCreateRequest"];
export type ReceiptUpdate=ApiComponents["schemas"]["PatchAdminProcurementGoodsReceiptsIdRequest"];
export type LandedCreate=ApiComponents["schemas"]["PostAdminProcurementLandedCostsRequest"];
export type InvoiceCreate=ApiComponents["schemas"]["SupplierInvoiceCreateRequest"];
export type ReturnCreate=ApiComponents["schemas"]["PurchaseReturnCreateRequest"];
type Issue={field:string;code:string;message:string};
export type Validation<T>={ok:true;body:T}|{ok:false;issues:Issue[]};
export type SettlementRecord={id:string;status:string|null;version:number|null;reference:string|null};
export type SettlementRead=
  |{kind:"ready";endpoint:string;requestId:string|null;status:number;setCookies:readonly string[];records:readonly SettlementRecord[]|null;total:number|null}
  |{kind:"denied"|"not_found"|"unavailable";requestId:string|null;setCookies:readonly string[]};
export type SettlementMutation=
  |{kind:"confirmed";requestId:string|null;idempotencyKey:string|null;setCookies:readonly string[]}
  |{kind:"invalid";requestId:string|null;idempotencyKey:string|null;setCookies:readonly string[];issues:readonly Issue[]}
  |{kind:"denied"|"not_found"|"conflict"|"unknown_outcome"|"unavailable";requestId:string|null;idempotencyKey:string|null;setCookies:readonly string[]};

const uuid=(x:unknown):x is string=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const money=(x:unknown)=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=0;
const quantity=(x:unknown)=>typeof x==="number"&&Number.isSafeInteger(x)&&x>0;
const error=(field:string,code:string,message:string):Issue=>({field,code,message});
const valid=<T>(body:T):Validation<T>=>({ok:true,body});
const invalid=<T>(issues:Issue[]):Validation<T>=>({ok:false,issues});
const hasOnly=(input:object,fields:readonly string[])=>Object.keys(input).every(x=>fields.includes(x));
const optionalId=(x:unknown)=>x===undefined||x===null||uuid(x);
const versionHeader=(n:number)=>{if(!Number.isSafeInteger(n)||n<1)throw new Error("INVALID_EXPECTED_VERSION");return `"${n}"`;};

function receiptItems(items:ReceiptCreate["items"]):Issue[]{
  const issues:Issue[]=[];
  if(!Array.isArray(items)||items.length===0||items.length>1000)return [error("items","ITEMS_REQUIRED","اقلام رسید باید بین ۱ تا ۱۰۰۰ قلم باشند.")];
  const ids:string[]=[];
  for(const [i,x] of items.entries()){
    if(!x||typeof x!=="object"){issues.push(error(`items.${i}`,"INVALID_ITEM","ساختار قلم معتبر نیست."));continue;}
    if(!hasOnly(x,["purchase_order_item_id","variant_id","received_quantity","accepted_quantity","quarantine_quantity","rejected_quantity","unit_cost_toman"]))issues.push(error(`items.${i}`,"UNSUPPORTED_FIELD","فیلد ناشناخته در قلم مجاز نیست."));
    if(!uuid(x.variant_id))issues.push(error(`items.${i}.variant_id`,"INVALID_ID","شناسه کالا معتبر نیست."));
    if(!optionalId(x.purchase_order_item_id))issues.push(error(`items.${i}.purchase_order_item_id`,"INVALID_ID","شناسه قلم سفارش خرید معتبر نیست."));
    if(!quantity(x.received_quantity))issues.push(error(`items.${i}.received_quantity`,"INVALID_QUANTITY","تعداد دریافتی باید مثبت باشد."));
    for(const k of ["accepted_quantity","quarantine_quantity","rejected_quantity"] as const){
      if(!money(x[k]))issues.push(error(`items.${i}.${k}`,"INVALID_QUANTITY","تعداد باید عدد صحیح نامنفی باشد."));
    }
    if(!money(x.unit_cost_toman))issues.push(error(`items.${i}.unit_cost_toman`,"INVALID_MONEY","مبلغ باید عدد صحیح نامنفی تومان باشد."));
    if(Number.isSafeInteger(x.received_quantity)&&Number.isSafeInteger(x.accepted_quantity)&&Number.isSafeInteger(x.quarantine_quantity)&&Number.isSafeInteger(x.rejected_quantity)&&
      x.accepted_quantity+x.quarantine_quantity+x.rejected_quantity!==x.received_quantity)
      issues.push(error(`items.${i}`,"QUANTITY_MISMATCH","جمع پذیرفته، قرنطینه و ردشده باید برابر دریافتی باشد."));
    ids.push(x.variant_id);
  }
  if(new Set(ids).size!==ids.length)issues.push(error("items","DUPLICATE_VARIANT","یک کالا در رسید تکرار شده است."));
  return issues;
}
export function validateReceiptCreate(body:ReceiptCreate):Validation<ReceiptCreate>{
  const issues=receiptItems(body.items);
  if(!uuid(body.supplier_id))issues.push(error("supplier_id","INVALID_ID","شناسه تأمین‌کننده معتبر نیست."));
  if(!uuid(body.warehouse_id))issues.push(error("warehouse_id","INVALID_ID","شناسه انبار معتبر نیست."));
  if(!optionalId(body.purchase_order_id))issues.push(error("purchase_order_id","INVALID_ID","شناسه سفارش خرید معتبر نیست."));
  if(!hasOnly(body,["supplier_id","warehouse_id","purchase_order_id","items"]))issues.push(error("body","UNSUPPORTED_FIELD","فیلد خارج از قرارداد ارسال نشود."));
  return issues.length?invalid(issues):valid(body);
}
export function validateReceiptUpdate(body:ReceiptUpdate):Validation<ReceiptUpdate>{
  if(!hasOnly(body,["items"])||!body.items)return invalid([error("body","UNSUPPORTED_UPDATE","فقط ویرایش اقلام رسید مجاز است.")]);
  const issues=receiptItems(body.items);
  return issues.length?invalid(issues):valid({items:body.items});
}
export function validateLandedCreate(body:LandedCreate):Validation<LandedCreate>{
  const issues:Issue[]=[];
  if(!hasOnly(body,["purchase_order_id","goods_receipt_id","cost_type","amount_toman","allocation_method"]))issues.push(error("body","UNSUPPORTED_FIELD","فیلد خارج از قرارداد."));
  if(!uuid(body.purchase_order_id)&&!uuid(body.goods_receipt_id))issues.push(error("goods_receipt_id","SOURCE_REQUIRED","حداقل رسید یا سفارش خرید لازم است."));
  if(!optionalId(body.purchase_order_id)||!optionalId(body.goods_receipt_id))issues.push(error("source","INVALID_ID","شناسه منبع معتبر نیست."));
  if(!["shipping","insurance","customs","handling","other"].includes(body.cost_type))issues.push(error("cost_type","INVALID_TYPE","نوع هزینه مجاز نیست."));
  if(!money(body.amount_toman))issues.push(error("amount_toman","INVALID_MONEY","مبلغ صحیح نامنفی تومان الزامی است."));
  if(!["quantity","value"].includes(body.allocation_method))issues.push(error("allocation_method","UNSUPPORTED_RUNTIME_METHOD","روش weight پشتیبانی نمی‌شود؛ تخصیص دستی نیز تا اصلاح قرارداد پیش‌نمایش/نهایی‌سازی مسدود است."));
  return issues.length?invalid(issues):valid(body);
}
export function validateInvoiceCreate(body:InvoiceCreate):Validation<InvoiceCreate>{
  const issues:Issue[]=[];
  if(!hasOnly(body,["supplier_id","purchase_order_id","invoice_number","invoice_date","amount_toman"]))issues.push(error("body","UNSUPPORTED_FIELD","فیلد خارج از قرارداد."));
  if(!uuid(body.supplier_id))issues.push(error("supplier_id","INVALID_ID","شناسه تأمین‌کننده معتبر نیست."));
  if(!optionalId(body.purchase_order_id))issues.push(error("purchase_order_id","INVALID_ID","شناسه سفارش خرید معتبر نیست."));
  if(!body.invoice_number?.trim()||body.invoice_number.length>80)issues.push(error("invoice_number","INVALID_INVOICE","شماره فاکتور الزامی است (حداکثر ۸۰ نویسه)."));
  if(!/^\d{4}-\d{2}-\d{2}$/.test(body.invoice_date)||!Number.isFinite(Date.parse(body.invoice_date))||new Date(body.invoice_date).toISOString().slice(0,10)!==body.invoice_date)issues.push(error("invoice_date","INVALID_DATE","تاریخ معتبر لازم است."));
  if(!money(body.amount_toman))issues.push(error("amount_toman","INVALID_MONEY","مبلغ صحیح نامنفی تومان الزامی است."));
  return issues.length?invalid(issues):valid(body);
}
export function validateReturnCreate(body:ReturnCreate):Validation<ReturnCreate>{
  const issues:Issue[]=[];
  if(!hasOnly(body,["supplier_id","warehouse_id","goods_receipt_id","reason","items"]))issues.push(error("body","UNSUPPORTED_FIELD","فیلد خارج از قرارداد."));
  if(!uuid(body.supplier_id)||!uuid(body.warehouse_id)||!optionalId(body.goods_receipt_id))issues.push(error("source","INVALID_ID","شناسه تأمین‌کننده، انبار یا رسید معتبر نیست."));
  if(!body.reason?.trim()||body.reason.trim().length<2||body.reason.length>2000)issues.push(error("reason","REASON_REQUIRED","دلیل مرجوعی ۲ تا ۲۰۰۰ نویسه باشد."));
  if(!Array.isArray(body.items)||!body.items.length||body.items.length>1000)issues.push(error("items","ITEMS_REQUIRED","اقلام مرجوعی لازم است."));
  else {
    const ids:string[]=[];
    for(const [i,x] of body.items.entries()){
      if(!x||typeof x!=="object"){issues.push(error(`items.${i}`,"INVALID_ITEM","ساختار قلم معتبر نیست."));continue;}
      if(!hasOnly(x,["variant_id","quantity","stock_bucket"]))issues.push(error(`items.${i}`,"UNSUPPORTED_FIELD","فیلد ناشناخته در قلم مجاز نیست."));
      if(!uuid(x.variant_id))issues.push(error(`items.${i}.variant_id`,"INVALID_ID","شناسه کالا نامعتبر است."));
      if(!quantity(x.quantity))issues.push(error(`items.${i}.quantity`,"INVALID_QUANTITY","تعداد باید صحیح و مثبت باشد."));
      if(!["sellable","quarantine","damaged"].includes(x.stock_bucket??"quarantine"))issues.push(error(`items.${i}.stock_bucket`,"INVALID_BUCKET","باکت نامعتبر است."));
      ids.push(x.variant_id);
    }
    if(new Set(ids).size!==ids.length)issues.push(error("items","DUPLICATE_VARIANT","کالای تکراری در مرجوعی."));
  }
  return issues.length?invalid(issues):valid({...body,items:body.items.map(x=>({...x,stock_bucket:x.stock_bucket??"quarantine"}))});
}

type Bridge=ReturnType<typeof createAdminAuthBridge>;
/** Project only non-sensitive source-owned identity and version fields. Do not infer a state from absent fields. */
export function projectSettlementRead(payload:unknown):{records:readonly SettlementRecord[]|null;total:number|null}{
  let value:unknown=payload;
  if(value!==null&&typeof value==="object"&&!Array.isArray(value)&&"data" in value)value=(value as {data:unknown}).data;
  if(value!==null&&typeof value==="object"&&!Array.isArray(value)&&"data" in value)value=(value as {data:unknown}).data;
  const raw=Array.isArray(value)?value:value!==null&&typeof value==="object"?[value]:null;
  if(raw===null)return{records:null,total:null};
  const records:SettlementRecord[]=[];
  for(const entry of raw.slice(0,100)){
    if(entry===null||typeof entry!=="object"||Array.isArray(entry))continue;
    const r=entry as Record<string,unknown>;
    if(!uuid(r.id))continue;
    const status=typeof r.status==="string"&&r.status.length<=48&&/^[a-z_]+$/.test(r.status)?r.status:null;
    const version=typeof r.version==="number"&&Number.isSafeInteger(r.version)&&r.version>0?r.version:null;
    const reference=[r.receipt_number,r.return_number,r.invoice_number,r.reference,r.reference_number,r.number]
      .find(x=>typeof x==="string"&&x.length>0&&x.length<=80&&/^[^\r\n\0]+$/.test(x));
    records.push({id:r.id,status,version,reference:typeof reference==="string"?reference:null});
  }
  return{records,total:raw.length};
}
async function read(request:Pick<Request,"headers">,endpoint:string,call:(bridge:Bridge)=>Promise<{status:number;requestId:string|null;data:unknown}>):Promise<SettlementRead>{
  let bridge:Bridge|null=null;
  try{bridge=createAdminAuthBridge(request);const response=await call(bridge);return{kind:"ready",endpoint,status:response.status,requestId:response.requestId,...projectSettlementRead(response.data),setCookies:bridge.takeSetCookies()};}
  catch(err){const cookies=bridge?.takeSetCookies()??[];if(err instanceof ApiClientError&&err.kind==="http"){if(err.status===401||err.status===403)return{kind:"denied",requestId:err.requestId,setCookies:cookies};if(err.status===404)return{kind:"not_found",requestId:err.requestId,setCookies:cookies};}return{kind:"unavailable",requestId:err instanceof ApiClientError?err.requestId:null,setCookies:cookies};}
}
export function readSettlement(request:Pick<Request,"headers">,view:SettlementView,id:string|null):Promise<SettlementRead>{
  if(id&&!uuid(id))return Promise.resolve({kind:"not_found",requestId:null,setCookies:[]});
  if(view==="receipts")return id?read(request,`/admin/procurement/goods-receipts/${id}`,b=>b.client.request("get","/admin/procurement/goods-receipts/{id}",{pathParams:{id}})):read(request,"/admin/procurement/goods-receipts",b=>b.client.request("get","/admin/procurement/goods-receipts",{}));
  if(view==="landed-costs")return id?read(request,`/admin/procurement/landed-costs/${id}`,b=>b.client.request("get","/admin/procurement/landed-costs/{id}",{pathParams:{id}})):read(request,"/admin/procurement/landed-costs",b=>b.client.request("get","/admin/procurement/landed-costs",{}));
  if(view==="returns")return id?read(request,`/admin/procurement/purchase-returns/${id}`,b=>b.client.request("get","/admin/procurement/purchase-returns/{id}",{pathParams:{id}})):read(request,"/admin/procurement/purchase-returns",b=>b.client.request("get","/admin/procurement/purchase-returns",{}));
  if(id)return Promise.resolve({kind:"not_found",requestId:null,setCookies:[]}); // Invoice detail API does not exist.
  return read(request,"/admin/procurement/supplier-invoices",b=>b.client.request("get","/admin/procurement/supplier-invoices",{}));
}
async function mutate(request:Pick<Request,"headers">,idempotent:boolean,stepUpToken:string|null,
  call:(bridge:Bridge,key:string|null)=>Promise<{requestId:string|null}>):Promise<SettlementMutation>{
  const key=idempotent?randomUUID():null;let bridge:Bridge|null=null;
  try{bridge=stepUpToken?createAdminAuthBridge(request,{stepUpToken}):createAdminAuthBridge(request);
    const response=await call(bridge,key);
    return{kind:"confirmed",requestId:response.requestId,idempotencyKey:key,setCookies:bridge.takeSetCookies()};
  }catch(err){
    const cookies=bridge?.takeSetCookies()??[];
    const base={requestId:err instanceof ApiClientError?err.requestId:null,idempotencyKey:key,setCookies:cookies};
    if(!(err instanceof ApiClientError))return{kind:"unknown_outcome",...base};
    if(["network","timeout","aborted"].includes(err.kind))return{kind:"unknown_outcome",...base};
    if(err.kind==="http"){
      if(err.status===401||err.status===403)return{kind:"denied",...base};
      if(err.status===404)return{kind:"not_found",...base};
      if(err.status===409||err.status===412||err.status===428)return{kind:"conflict",...base};
      if(err.status===400||err.status===422)return{kind:"invalid",issues:err.fieldErrors.map(e=>({field:e.field,code:e.code,message:e.message})),...base};
      if(err.status===408||(typeof err.status==="number"&&err.status>=500))return{kind:"unknown_outcome",...base};
    }
    return{kind:"unavailable",...base};
  }
}
export function createReceipt(request:Pick<Request,"headers">,body:ReceiptCreate){
  return mutate(request,true,null,(b,k)=>b.client.request("post","/admin/procurement/goods-receipts",{headers:{"Idempotency-Key":k!},body}));
}
export function updateReceipt(request:Pick<Request,"headers">,id:string,v:number,body:ReceiptUpdate){
  return mutate(request,false,null,b=>b.client.request("patch","/admin/procurement/goods-receipts/{id}",{pathParams:{id},headers:{"If-Match":versionHeader(v)},body}));
}
export function submitReceipt(request:Pick<Request,"headers">,id:string,v:number){
  return mutate(request,false,null,b=>b.client.request("post","/admin/procurement/goods-receipts/{id}/submit",{pathParams:{id},headers:{"If-Match":versionHeader(v)}}));
}
export function postReceipt(request:Pick<Request,"headers">,id:string,v:number,token:string){
  return mutate(request,true,token,(b,k)=>b.client.request("post","/admin/procurement/goods-receipts/{id}/post",{pathParams:{id},headers:{"If-Match":versionHeader(v),"Idempotency-Key":k!}}));
}
export function createLandedCost(request:Pick<Request,"headers">,body:LandedCreate){
  return mutate(request,true,null,(b,k)=>b.client.request("post","/admin/procurement/landed-costs",{headers:{"Idempotency-Key":k!},body}));
}
export function createInvoice(request:Pick<Request,"headers">,body:InvoiceCreate){
  return mutate(request,true,null,(b,k)=>b.client.request("post","/admin/procurement/supplier-invoices",{headers:{"Idempotency-Key":k!},body}));
}
export function matchInvoice(request:Pick<Request,"headers">,id:string,v:number){
  return mutate(request,false,null,b=>b.client.request("post","/admin/procurement/supplier-invoices/{id}/match",{pathParams:{id},headers:{"If-Match":versionHeader(v)}}));
}
export function createPurchaseReturn(request:Pick<Request,"headers">,body:ReturnCreate){
  return mutate(request,true,null,(b,k)=>b.client.request("post","/admin/procurement/purchase-returns",{headers:{"Idempotency-Key":k!},body}));
}
export function approvePurchaseReturn(request:Pick<Request,"headers">,id:string,v:number,token:string){
  return mutate(request,false,token,b=>b.client.request("post","/admin/procurement/purchase-returns/{id}/approve",{pathParams:{id},headers:{"If-Match":versionHeader(v)}}));
}
export function shipPurchaseReturn(request:Pick<Request,"headers">,id:string,v:number,token:string){
  return mutate(request,true,token,(b,k)=>b.client.request("post","/admin/procurement/purchase-returns/{id}/ship",{pathParams:{id},headers:{"If-Match":versionHeader(v),"Idempotency-Key":k!}}));
}
export function completePurchaseReturn(request:Pick<Request,"headers">,id:string,v:number){
  return mutate(request,false,null,b=>b.client.request("post","/admin/procurement/purchase-returns/{id}/complete",{pathParams:{id},headers:{"If-Match":versionHeader(v)}}));
}
