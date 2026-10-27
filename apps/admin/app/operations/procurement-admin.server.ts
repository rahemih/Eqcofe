import { randomUUID } from "node:crypto";
import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type SupplierCreateBody=ApiComponents["schemas"]["PostAdminProcurementSuppliersRequest"];
export type SupplierUpdateBody=ApiComponents["schemas"]["PatchAdminProcurementSuppliersIdRequest"];
export type PurchaseRequestCreateBody=ApiComponents["schemas"]["PostAdminProcurementPurchaseRequestsRequest"];
export type PurchaseRequestUpdateBody=ApiComponents["schemas"]["PatchAdminProcurementPurchaseRequestsIdRequest"];
export type PurchaseOrderCreateBody=ApiComponents["schemas"]["PurchaseOrderCreateRequest"];
export type PurchaseOrderUpdateBody=ApiComponents["schemas"]["PatchAdminProcurementPurchaseOrdersIdRequest"];
type RejectBody=ApiComponents["schemas"]["RejectRequest"];
type CancelBody=ApiComponents["schemas"]["CancelRequest"];
type ResolveBody=ApiComponents["schemas"]["ResolveRequest"];
type FieldError=ApiComponents["schemas"]["FieldError"];

export type ProcurementView="suppliers"|"requests"|"orders";
export type ProcurementReadResult=
  | {kind:"ready";endpoint:string;status:number;requestId:string|null;setCookies:readonly string[]}
  | {kind:"denied"|"not_found"|"unavailable";requestId:string|null;setCookies:readonly string[]};

export type ProcurementMutationResult=
  | {kind:"confirmed";requestId:string|null;idempotencyKey:string|null;setCookies:readonly string[]}
  | {kind:"invalid";requestId:string|null;fieldErrors:readonly FieldError[];idempotencyKey:string|null;setCookies:readonly string[]}
  | {kind:"denied"|"not_found"|"conflict"|"unknown_outcome"|"unavailable";requestId:string|null;idempotencyKey:string|null;setCookies:readonly string[]};

export function validateSupplierCreate(input:SupplierCreateBody){
  const errors:FieldError[]=[];
  if(!String(input.code??"").trim())errors.push(field("code","REQUIRED","کد تأمین‌کننده الزامی است."));
  if(!String(input.name_fa??"").trim())errors.push(field("name_fa","REQUIRED","نام فارسی تأمین‌کننده الزامی است."));
  if(input.payment_terms_days!==undefined&&(!Number.isSafeInteger(input.payment_terms_days)||input.payment_terms_days<0))errors.push(field("payment_terms_days","INVALID_PAYMENT_TERMS","مهلت پرداخت باید عدد صحیح نامنفی باشد."));
  if(input.email&& !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))errors.push(field("email","INVALID_EMAIL","ایمیل معتبر نیست."));
  return errors.length?{ok:false as const,fieldErrors:Object.freeze(errors)}:{ok:true as const,body:input};
}

export function validateSupplierUpdate(input:SupplierUpdateBody){
  const errors:FieldError[]=[];
  const known=["name_fa","legal_name","national_id","mobile","phone","email","payment_terms_days","notes"];
  if(Object.keys(input as object).some(key=>!known.includes(key)))errors.push(field("body","UNSUPPORTED_FIELD","فیلد خارج از قرارداد در به‌روزرسانی تأمین‌کننده مجاز نیست."));
  if(!Object.values(input as Record<string,unknown>).some(v=>v!==undefined))errors.push(field("body","CHANGE_REQUIRED","حداقل یک تغییر الزامی است."));
  if(input.name_fa!==undefined&&!String(input.name_fa).trim())errors.push(field("name_fa","INVALID_NAME","نام فارسی خالی مجاز نیست."));
  if(input.payment_terms_days!==undefined&&(!Number.isSafeInteger(input.payment_terms_days)||input.payment_terms_days<0))errors.push(field("payment_terms_days","INVALID_PAYMENT_TERMS","مهلت پرداخت باید عدد صحیح نامنفی باشد."));
  if(input.email&& !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))errors.push(field("email","INVALID_EMAIL","ایمیل معتبر نیست."));
  return errors.length?{ok:false as const,fieldErrors:Object.freeze(errors)}:{ok:true as const,body:input};
}

export function validatePurchaseRequestCreate(input:PurchaseRequestCreateBody){
  const errors:FieldError[]=[];
  if(!isUuid(input.warehouse_id))errors.push(field("warehouse_id","INVALID_WAREHOUSE_ID","شناسهٔ انبار معتبر نیست."));
  if(!String(input.reason??"").trim())errors.push(field("reason","REASON_REQUIRED","دلیل درخواست خرید الزامی است."));
  validateRequestItems(input.items,errors,true);
  return errors.length?{ok:false as const,fieldErrors:Object.freeze(errors)}:{ok:true as const,body:normalizeRequestCreate(input)};
}

export function validatePurchaseRequestUpdate(input:PurchaseRequestUpdateBody){
  const errors:FieldError[]=[];
  const known=["reason","items"];
  if(Object.keys(input as object).some(key=>!known.includes(key)))errors.push(field("body","UNSUPPORTED_FIELD","فیلد خارج از قرارداد در به‌روزرسانی درخواست خرید مجاز نیست."));
  if(input.reason===undefined&&input.items===undefined)errors.push(field("body","CHANGE_REQUIRED","حداقل یک تغییر الزامی است."));
  if(input.items!==undefined)validateRequestItems(input.items,errors,false);
  return errors.length?{ok:false as const,fieldErrors:Object.freeze(errors)}:{ok:true as const,body:normalizeRequestUpdate(input)};
}

export function validatePurchaseOrderCreate(input:PurchaseOrderCreateBody){
  const errors:FieldError[]=[];
  if(!isUuid(input.supplier_id))errors.push(field("supplier_id","INVALID_SUPPLIER_ID","شناسهٔ تأمین‌کننده معتبر نیست."));
  if(!isUuid(input.warehouse_id))errors.push(field("warehouse_id","INVALID_WAREHOUSE_ID","شناسهٔ انبار معتبر نیست."));
  if(input.purchase_request_id!==undefined&&input.purchase_request_id!==null&&!isUuid(input.purchase_request_id))errors.push(field("purchase_request_id","INVALID_REQUEST_ID","شناسهٔ درخواست خرید معتبر نیست."));
  if(input.expected_at!==undefined&&input.expected_at!==null&&!validTimestamp(input.expected_at))errors.push(field("expected_at","INVALID_TIMESTAMP","زمان مورد انتظار معتبر نیست."));
  validateOrderItems(input.items,errors);
  return errors.length?{ok:false as const,fieldErrors:Object.freeze(errors)}:{ok:true as const,body:input};
}

export function validatePurchaseOrderUpdate(input:PurchaseOrderUpdateBody){
  const errors:FieldError[]=[];
  const known=["expected_at","items"];
  if(Object.keys(input as object).some(key=>!known.includes(key)))errors.push(field("body","UNSUPPORTED_FIELD","فیلد خارج از قرارداد در به‌روزرسانی سفارش خرید مجاز نیست."));
  if(input.expected_at===undefined&&input.items===undefined)errors.push(field("body","CHANGE_REQUIRED","حداقل یک تغییر الزامی است."));
  if(input.expected_at!==undefined&&input.expected_at!==null&&!validTimestamp(input.expected_at))errors.push(field("expected_at","INVALID_TIMESTAMP","زمان مورد انتظار معتبر نیست."));
  if(input.items!==undefined)validateOrderItems(input.items,errors);
  return errors.length?{ok:false as const,fieldErrors:Object.freeze(errors)}:{ok:true as const,body:input};
}

export async function readProcurement(request:Pick<Request,"headers">,view:ProcurementView,id:string|null):Promise<ProcurementReadResult>{
  if(id&&!isUuid(id))return{kind:"not_found",requestId:null,setCookies:[]};
  if(view==="suppliers"){
    return id
      ?performRead(request,`/admin/procurement/suppliers/${id}`,bridge=>bridge.client.request("get","/admin/procurement/suppliers/{id}",{pathParams:{id}}))
      :performRead(request,"/admin/procurement/suppliers",bridge=>bridge.client.request("get","/admin/procurement/suppliers",{}));
  }
  if(view==="requests"){
    return id
      ?performRead(request,`/admin/procurement/purchase-requests/${id}`,bridge=>bridge.client.request("get","/admin/procurement/purchase-requests/{id}",{pathParams:{id}}))
      :performRead(request,"/admin/procurement/purchase-requests",bridge=>bridge.client.request("get","/admin/procurement/purchase-requests",{}));
  }
  return id
    ?performRead(request,`/admin/procurement/purchase-orders/${id}`,bridge=>bridge.client.request("get","/admin/procurement/purchase-orders/{id}",{pathParams:{id}}))
    :performRead(request,"/admin/procurement/purchase-orders",bridge=>bridge.client.request("get","/admin/procurement/purchase-orders",{}));
}

export async function createSupplier(request:Pick<Request,"headers">,body:SupplierCreateBody):Promise<ProcurementMutationResult>{
  return performIdempotent(request,bridge=>bridge.client.request("post","/admin/procurement/suppliers",{headers:{"Idempotency-Key":bridge.key},body}));
}
export async function updateSupplier(request:Pick<Request,"headers">,id:string,version:number,body:SupplierUpdateBody):Promise<ProcurementMutationResult>{
  return performVersioned(request,null,bridge=>bridge.client.request("patch","/admin/procurement/suppliers/{id}",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)},body}));
}
export async function setSupplierStatus(request:Pick<Request,"headers">,id:string,version:number,action:"activate"|"deactivate"):Promise<ProcurementMutationResult>{
  if(action==="activate")return performVersioned(request,null,bridge=>bridge.client.request("post","/admin/procurement/suppliers/{id}/activate",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)}}));
  return performVersioned(request,null,bridge=>bridge.client.request("post","/admin/procurement/suppliers/{id}/deactivate",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)}}));
}

export async function createPurchaseRequest(request:Pick<Request,"headers">,body:PurchaseRequestCreateBody):Promise<ProcurementMutationResult>{
  return performIdempotent(request,bridge=>bridge.client.request("post","/admin/procurement/purchase-requests",{headers:{"Idempotency-Key":bridge.key},body}));
}
export async function updatePurchaseRequest(request:Pick<Request,"headers">,id:string,version:number,body:PurchaseRequestUpdateBody):Promise<ProcurementMutationResult>{
  return performVersioned(request,null,bridge=>bridge.client.request("patch","/admin/procurement/purchase-requests/{id}",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)},body}));
}
export async function transitionPurchaseRequest(
  request:Pick<Request,"headers">,id:string,version:number,action:"submit"|"approve"|"reject"|"cancel",reason:string|null,stepUpToken:string|null,
):Promise<ProcurementMutationResult>{
  if(action==="approve"){
    if(!stepUpToken)return denied();
    return performVersioned(request,stepUpToken,bridge=>bridge.client.request("post","/admin/procurement/purchase-requests/{id}/approve",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)}}));
  }
  if(action==="reject"){
    if(!stepUpToken)return denied();
    const body:RejectBody={reason:String(reason??"").trim()};
    return performVersioned(request,stepUpToken,bridge=>bridge.client.request("post","/admin/procurement/purchase-requests/{id}/reject",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)},body}));
  }
  if(action==="submit")return performVersioned(request,null,bridge=>bridge.client.request("post","/admin/procurement/purchase-requests/{id}/submit",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)}}));
  const body:CancelBody={reason:String(reason??"").trim()};
  return performVersioned(request,null,bridge=>bridge.client.request("post","/admin/procurement/purchase-requests/{id}/cancel",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)},body}));
}

export async function createPurchaseOrder(request:Pick<Request,"headers">,body:PurchaseOrderCreateBody):Promise<ProcurementMutationResult>{
  return performIdempotent(request,bridge=>bridge.client.request("post","/admin/procurement/purchase-orders",{headers:{"Idempotency-Key":bridge.key},body}));
}
export async function updatePurchaseOrder(request:Pick<Request,"headers">,id:string,version:number,body:PurchaseOrderUpdateBody):Promise<ProcurementMutationResult>{
  return performVersioned(request,null,bridge=>bridge.client.request("patch","/admin/procurement/purchase-orders/{id}",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)},body}));
}
export async function transitionPurchaseOrder(
  request:Pick<Request,"headers">,id:string,version:number,action:"submit"|"approve"|"send"|"cancel"|"close",reason:string|null,stepUpToken:string|null,
):Promise<ProcurementMutationResult>{
  if(action==="approve"){
    if(!stepUpToken)return denied();
    return performVersioned(request,stepUpToken,bridge=>bridge.client.request("post","/admin/procurement/purchase-orders/{id}/approve",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)}}));
  }
  if(action==="submit")return performVersioned(request,null,bridge=>bridge.client.request("post","/admin/procurement/purchase-orders/{id}/submit",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)}}));
  if(action==="send")return performVersioned(request,null,bridge=>bridge.client.request("post","/admin/procurement/purchase-orders/{id}/send",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)}}));
  if(action==="cancel"){
    const body:CancelBody={reason:String(reason??"").trim()};
    return performVersioned(request,null,bridge=>bridge.client.request("post","/admin/procurement/purchase-orders/{id}/cancel",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)},body}));
  }
  const body:ResolveBody={resolution_note:String(reason??"").trim()};
  return performVersioned(request,null,bridge=>bridge.client.request("post","/admin/procurement/purchase-orders/{id}/close",{pathParams:{id},headers:{"If-Match":formatIfMatch(version)},body}));
}

export function formatIfMatch(version:number):string{
  if(!Number.isSafeInteger(version)||version<1)throw new Error("PROCUREMENT_VERSION_INVALID");
  return `"${version}"`;
}

function validateRequestItems(items:PurchaseRequestCreateBody["items"]|NonNullable<PurchaseRequestUpdateBody["items"]>,errors:FieldError[],required:boolean){
  if(!Array.isArray(items)||(required&&items.length===0))errors.push(field("items","ITEMS_REQUIRED","حداقل یک قلم الزامی است."));
  if(!Array.isArray(items))return;
  if(!items.length)errors.push(field("items","ITEMS_REQUIRED","حداقل یک قلم الزامی است."));
  const ids:string[]=[];
  for(const [index,item] of items.entries()){
    if(!isUuid(item.variant_id))errors.push(field(`items.${index}.variant_id`,"INVALID_VARIANT_ID","شناسهٔ واریانت معتبر نیست."));
    if(!Number.isSafeInteger(item.requested_quantity)||item.requested_quantity<=0)errors.push(field(`items.${index}.requested_quantity`,"INVALID_QUANTITY","تعداد درخواست باید عدد صحیح مثبت باشد."));
    if(item.suggested_quantity!==undefined&&item.suggested_quantity!==null)errors.push(field(`items.${index}.suggested_quantity`,"UNSUPPORTED_RUNTIME_FIELD","suggested_quantity در runtime فعلی authority ذخیره‌سازی ندارد و در 70-F ارسال نمی‌شود."));
    ids.push(item.variant_id);
  }
  if(new Set(ids).size!==ids.length)errors.push(field("items","DUPLICATE_ITEM","هر واریانت فقط یک بار مجاز است."));
}
function normalizeRequestCreate(input:PurchaseRequestCreateBody):PurchaseRequestCreateBody{
  return{warehouse_id:input.warehouse_id,reason:input.reason,items:input.items.map(x=>({variant_id:x.variant_id,requested_quantity:x.requested_quantity,...(x.notes===undefined?{}:{notes:x.notes})}))};
}
function normalizeRequestUpdate(input:PurchaseRequestUpdateBody):PurchaseRequestUpdateBody{
  return{...(input.reason===undefined?{}:{reason:input.reason}),...(input.items===undefined?{}:{items:input.items.map(x=>({variant_id:x.variant_id,requested_quantity:x.requested_quantity,...(x.notes===undefined?{}:{notes:x.notes})}))})};
}
function validateOrderItems(items:PurchaseOrderCreateBody["items"],errors:FieldError[]){
  if(!Array.isArray(items)||!items.length){errors.push(field("items","ITEMS_REQUIRED","حداقل یک قلم سفارش خرید الزامی است."));return;}
  const ids:string[]=[];
  for(const [index,item] of items.entries()){
    if(!isUuid(item.variant_id))errors.push(field(`items.${index}.variant_id`,"INVALID_VARIANT_ID","شناسهٔ واریانت معتبر نیست."));
    if(!Number.isSafeInteger(item.ordered_quantity)||item.ordered_quantity<=0)errors.push(field(`items.${index}.ordered_quantity`,"INVALID_QUANTITY","تعداد سفارش باید عدد صحیح مثبت باشد."));
    for(const [name,value] of [["unit_cost_toman",item.unit_cost_toman],["discount_toman",item.discount_toman??0],["tax_toman",item.tax_toman??0]] as const){
      if(!Number.isSafeInteger(value)||value<0)errors.push(field(`items.${index}.${name}`,"INVALID_MONEY","مبلغ باید عدد صحیح نامنفی به تومان باشد."));
    }
    if(Number.isSafeInteger(item.ordered_quantity)&&Number.isSafeInteger(item.unit_cost_toman)){
      const subtotal=item.ordered_quantity*item.unit_cost_toman;
      if(!Number.isSafeInteger(subtotal))errors.push(field(`items.${index}.unit_cost_toman`,"UNSAFE_SUBTOTAL","حاصل مبلغ قلم از محدودهٔ امن عدد صحیح خارج است."));
      else if((item.discount_toman??0)>subtotal)errors.push(field(`items.${index}.discount_toman`,"INVALID_DISCOUNT","تخفیف از مبلغ قلم بیشتر است."));
    }
    ids.push(item.variant_id);
  }
  if(new Set(ids).size!==ids.length)errors.push(field("items","DUPLICATE_ITEM","هر واریانت فقط یک بار در سفارش خرید مجاز است."));
}
async function performRead(
  request:Pick<Request,"headers">,endpoint:string,call:(bridge:ReturnType<typeof createAdminAuthBridge>)=>Promise<{status:number;requestId:string|null}>,
):Promise<ProcurementReadResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await call(bridge);
    return{kind:"ready",endpoint,status:response.status,requestId:response.requestId,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyRead(error,bridge?.takeSetCookies()??[]);}
}
async function performIdempotent(
  request:Pick<Request,"headers">,
  call:(bridge:{client:ReturnType<typeof createAdminAuthBridge>["client"];key:string})=>Promise<{requestId:string|null}>,
):Promise<ProcurementMutationResult>{
  const key=randomUUID();
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await call({client:bridge.client,key});
    return{kind:"confirmed",requestId:response.requestId,idempotencyKey:key,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutation(error,key,bridge?.takeSetCookies()??[]);}
}
async function performVersioned(
  request:Pick<Request,"headers">,stepUpToken:string|null,
  call:(bridge:ReturnType<typeof createAdminAuthBridge>)=>Promise<{requestId:string|null}>,
):Promise<ProcurementMutationResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=stepUpToken?createAdminAuthBridge(request,{stepUpToken}):createAdminAuthBridge(request);
    const response=await call(bridge);
    return{kind:"confirmed",requestId:response.requestId,idempotencyKey:null,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutation(error,null,bridge?.takeSetCookies()??[]);}
}
function classifyRead(error:unknown,setCookies:readonly string[]):ProcurementReadResult{
  if(error instanceof ApiClientError&&error.kind==="http"){
    if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,setCookies};
    if(error.status===404)return{kind:"not_found",requestId:error.requestId,setCookies};
  }
  return{kind:"unavailable",requestId:error instanceof ApiClientError?error.requestId:null,setCookies};
}
function classifyMutation(error:unknown,key:string|null,setCookies:readonly string[]):ProcurementMutationResult{
  if(!(error instanceof ApiClientError))return{kind:"unknown_outcome",requestId:null,idempotencyKey:key,setCookies};
  if(error.kind==="network"||error.kind==="timeout"||error.kind==="aborted")return{kind:"unknown_outcome",requestId:error.requestId,idempotencyKey:key,setCookies};
  if(error.kind==="http"){
    if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,idempotencyKey:key,setCookies};
    if(error.status===404)return{kind:"not_found",requestId:error.requestId,idempotencyKey:key,setCookies};
    if(error.status===409||error.status===412||error.status===428)return{kind:"conflict",requestId:error.requestId,idempotencyKey:key,setCookies};
    if(error.status===400||error.status===422)return{kind:"invalid",requestId:error.requestId,fieldErrors:Object.freeze([...error.fieldErrors]),idempotencyKey:key,setCookies};
    if(error.status===408||(typeof error.status==="number"&&error.status>=500))return{kind:"unknown_outcome",requestId:error.requestId,idempotencyKey:key,setCookies};
  }
  return{kind:"unavailable",requestId:error.requestId,idempotencyKey:key,setCookies};
}
function denied():ProcurementMutationResult{return{kind:"denied",requestId:null,idempotencyKey:null,setCookies:[]};}
function validTimestamp(value:string):boolean{return Number.isFinite(Date.parse(value));}
function isUuid(value:string):boolean{return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function field(fieldName:string,code:string,message:string):FieldError{return{field:fieldName,code,message};}
