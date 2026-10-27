import { randomUUID } from "node:crypto";
import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type TransferCreateBody=ApiComponents["schemas"]["InventoryTransferCreateRequest"];
export type ReservationCreateBody=ApiComponents["schemas"]["InventoryReservationRequest"];
export type AllocationCreateBody=ApiComponents["schemas"]["InventoryAllocationRequest"];
export type ConsumeSaleBody=ApiComponents["schemas"]["InventoryConsumeSaleRequest"];
type FieldError=ApiComponents["schemas"]["FieldError"];

export type FlowReadResult=
  | {kind:"ready";endpoint:string;status:number;requestId:string|null;setCookies:readonly string[]}
  | {kind:"denied"|"not_found"|"unavailable";requestId:string|null;setCookies:readonly string[]};

export type FlowMutationResult=
  | {kind:"confirmed";requestId:string|null;idempotencyKey:string|null;setCookies:readonly string[]}
  | {kind:"invalid";requestId:string|null;fieldErrors:readonly FieldError[];idempotencyKey:string|null;setCookies:readonly string[]}
  | {kind:"denied"|"not_found"|"conflict"|"unknown_outcome"|"unavailable";requestId:string|null;idempotencyKey:string|null;setCookies:readonly string[]};

export function validateTransferCreate(input:TransferCreateBody):{ok:true;body:TransferCreateBody}|{ok:false;fieldErrors:readonly FieldError[]}{
  const errors:FieldError[]=[];
  if(!isUuid(input.source_warehouse_id))errors.push(field("source_warehouse_id","INVALID_WAREHOUSE_ID","شناسهٔ انبار مبدا معتبر نیست."));
  if(!isUuid(input.destination_warehouse_id))errors.push(field("destination_warehouse_id","INVALID_WAREHOUSE_ID","شناسهٔ انبار مقصد معتبر نیست."));
  if(input.source_warehouse_id===input.destination_warehouse_id)errors.push(field("destination_warehouse_id","SAME_WAREHOUSE","انبار مبدا و مقصد باید متفاوت باشند."));
  if(!Array.isArray(input.items)||input.items.length===0)errors.push(field("items","ITEMS_REQUIRED","حداقل یک قلم انتقال الزامی است."));
  if(Array.isArray(input.items)){
    const ids:string[]=[];
    for(const [index,item] of input.items.entries()){
      if(!isUuid(item.variant_id))errors.push(field(`items.${index}.variant_id`,"INVALID_VARIANT_ID","شناسهٔ واریانت معتبر نیست."));
      if(!Number.isSafeInteger(item.quantity)||item.quantity<=0)errors.push(field(`items.${index}.quantity`,"INVALID_QUANTITY","تعداد انتقال باید عدد صحیح مثبت باشد."));
      ids.push(item.variant_id);
    }
    if(new Set(ids).size!==ids.length)errors.push(field("items","DUPLICATE_TRANSFER_ITEM","هر واریانت فقط یک بار در انتقال مجاز است."));
  }
  return errors.length?{ok:false,fieldErrors:Object.freeze(errors)}:{ok:true,body:input};
}

export function validateReservationCreate(input:ReservationCreateBody,nowMs=Date.now()):{ok:true;body:ReservationCreateBody}|{ok:false;fieldErrors:readonly FieldError[]}{
  const errors:FieldError[]=[];
  for(const [name,value] of [["cart_id",input.cart_id],["order_id",input.order_id],["customer_id",input.customer_id]] as const){
    if(value!==undefined&&value!==null&&!isUuid(value))errors.push(field(name,"INVALID_UUID","شناسهٔ اختیاری معتبر نیست."));
  }
  const expires=Date.parse(input.expires_at);
  if(!Number.isFinite(expires)||expires<=nowMs)errors.push(field("expires_at","INVALID_RESERVATION_EXPIRY","زمان انقضای رزرو باید معتبر و در آینده باشد."));
  if(input.payment_grace_until!==undefined&&input.payment_grace_until!==null){
    const grace=Date.parse(input.payment_grace_until);
    if(!Number.isFinite(grace)||!Number.isFinite(expires)||grace<expires)errors.push(field("payment_grace_until","INVALID_PAYMENT_GRACE","مهلت پرداخت باید برابر یا بعد از انقضای رزرو باشد."));
  }
  if(!Array.isArray(input.items)||input.items.length===0)errors.push(field("items","ITEMS_REQUIRED","حداقل یک قلم رزرو الزامی است."));
  if(Array.isArray(input.items)){
    const keys:string[]=[];
    for(const [index,item] of input.items.entries()){
      if(!isUuid(item.warehouse_id))errors.push(field(`items.${index}.warehouse_id`,"INVALID_WAREHOUSE_ID","شناسهٔ انبار معتبر نیست."));
      if(!isUuid(item.variant_id))errors.push(field(`items.${index}.variant_id`,"INVALID_VARIANT_ID","شناسهٔ واریانت معتبر نیست."));
      if(!Number.isSafeInteger(item.quantity)||item.quantity<=0)errors.push(field(`items.${index}.quantity`,"INVALID_QUANTITY","تعداد رزرو باید عدد صحیح مثبت باشد."));
      keys.push(item.warehouse_id+":"+item.variant_id);
    }
    if(new Set(keys).size!==keys.length)errors.push(field("items","DUPLICATE_RESERVATION_ITEM","ترکیب انبار و واریانت در رزرو نباید تکرار شود."));
  }
  return errors.length?{ok:false,fieldErrors:Object.freeze(errors)}:{ok:true,body:input};
}

export function validateAllocationCreate(input:AllocationCreateBody):{ok:true;body:AllocationCreateBody}|{ok:false;fieldErrors:readonly FieldError[]}{
  const errors:FieldError[]=[];
  if(!isUuid(input.order_item_id))errors.push(field("order_item_id","INVALID_ORDER_ITEM_ID","شناسهٔ OrderItem معتبر نیست."));
  if(!isUuid(input.warehouse_id))errors.push(field("warehouse_id","INVALID_WAREHOUSE_ID","شناسهٔ انبار معتبر نیست."));
  if(!isUuid(input.variant_id))errors.push(field("variant_id","INVALID_VARIANT_ID","شناسهٔ واریانت معتبر نیست."));
  if(!Number.isSafeInteger(input.quantity)||input.quantity<=0)errors.push(field("quantity","INVALID_QUANTITY","تعداد تخصیص باید عدد صحیح مثبت باشد."));
  if(input.reservation_id!==undefined&&input.reservation_id!==null&&!isUuid(input.reservation_id))errors.push(field("reservation_id","INVALID_RESERVATION_ID","شناسهٔ رزرو معتبر نیست."));
  return errors.length?{ok:false,fieldErrors:Object.freeze(errors)}:{ok:true,body:input};
}

export function validateConsumeSale(input:ConsumeSaleBody):{ok:true;body:ConsumeSaleBody}|{ok:false;fieldErrors:readonly FieldError[]}{
  if(!isUuid(input.allocation_id))return{ok:false,fieldErrors:Object.freeze([field("allocation_id","INVALID_ALLOCATION_ID","شناسهٔ تخصیص معتبر نیست.")])};
  return{ok:true,body:input};
}

export async function readTransferList(request:Pick<Request,"headers">):Promise<FlowReadResult>{
  return performRead(request,"/admin/inventory/transfers",()=>"/admin/inventory/transfers",bridge=>bridge.client.request("get","/admin/inventory/transfers",{}));
}
export async function readTransferDetail(request:Pick<Request,"headers">,id:string):Promise<FlowReadResult>{
  if(!isUuid(id))return{kind:"not_found",requestId:null,setCookies:[]};
  return performRead(request,"/admin/inventory/transfers/"+id,()=>"/admin/inventory/transfers/"+id,bridge=>bridge.client.request("get","/admin/inventory/transfers/{id}",{pathParams:{id}}));
}
export async function readReservationList(request:Pick<Request,"headers">,status:string|null):Promise<FlowReadResult>{
  const query=status?{status}:undefined;
  return performRead(request,"/admin/inventory/reservations",()=>"/admin/inventory/reservations",bridge=>bridge.client.request("get","/admin/inventory/reservations",{...(query?{query}: {})}));
}
export async function readReservationDetail(request:Pick<Request,"headers">,id:string):Promise<FlowReadResult>{
  if(!isUuid(id))return{kind:"not_found",requestId:null,setCookies:[]};
  return performRead(request,"/admin/inventory/reservations/"+id,()=>"/admin/inventory/reservations/"+id,bridge=>bridge.client.request("get","/admin/inventory/reservations/{id}",{pathParams:{id}}));
}
export async function readAllocationList(request:Pick<Request,"headers">,orderItemId:string|null):Promise<FlowReadResult>{
  const query=orderItemId?{order_item_id:orderItemId}:undefined;
  return performRead(request,"/admin/inventory/allocations",()=>"/admin/inventory/allocations",bridge=>bridge.client.request("get","/admin/inventory/allocations",{...(query?{query}: {})}));
}

export async function createTransfer(request:Pick<Request,"headers">,body:TransferCreateBody):Promise<FlowMutationResult>{
  return performIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/transfers",{headers:{"Idempotency-Key":bridge.key},body}));
}
export async function transitionTransfer(request:Pick<Request,"headers">,id:string,action:"approve"|"ship"|"receive"|"cancel"):Promise<FlowMutationResult>{
  if(!isUuid(id))return invalidId("id");
  if(action==="ship")return performIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/transfers/{id}/ship",{pathParams:{id},headers:{"Idempotency-Key":bridge.key}}));
  if(action==="receive")return performIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/transfers/{id}/receive",{pathParams:{id},headers:{"Idempotency-Key":bridge.key}}));
  if(action==="approve")return performNonIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/transfers/{id}/approve",{pathParams:{id}}));
  return performNonIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/transfers/{id}/cancel",{pathParams:{id}}));
}

export async function createReservation(request:Pick<Request,"headers">,body:ReservationCreateBody):Promise<FlowMutationResult>{
  return performIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/reservations",{headers:{"Idempotency-Key":bridge.key},body}));
}
export async function transitionReservation(request:Pick<Request,"headers">,id:string,action:"begin-payment"|"late-payment-review"|"convert"|"release"|"release-commitment"|"expire"):Promise<FlowMutationResult>{
  if(!isUuid(id))return invalidId("id");
  if(action==="late-payment-review")return performIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/reservations/{id}/late-payment-review",{pathParams:{id},headers:{"Idempotency-Key":bridge.key}}));
  if(action==="convert")return performIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/reservations/{id}/convert",{pathParams:{id},headers:{"Idempotency-Key":bridge.key}}));
  if(action==="begin-payment")return performNonIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/reservations/{id}/begin-payment",{pathParams:{id}}));
  if(action==="release")return performNonIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/reservations/{id}/release",{pathParams:{id}}));
  if(action==="release-commitment")return performNonIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/reservations/{id}/release-commitment",{pathParams:{id}}));
  return performNonIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/reservations/{id}/expire",{pathParams:{id}}));
}

export async function createAllocation(request:Pick<Request,"headers">,body:AllocationCreateBody):Promise<FlowMutationResult>{
  return performIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/allocations",{headers:{"Idempotency-Key":bridge.key},body}));
}
export async function transitionAllocation(request:Pick<Request,"headers">,id:string,action:"pick"|"unpick"|"release"):Promise<FlowMutationResult>{
  if(!isUuid(id))return invalidId("id");
  if(action==="pick")return performNonIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/allocations/{id}/pick",{pathParams:{id}}));
  if(action==="unpick")return performNonIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/allocations/{id}/unpick",{pathParams:{id}}));
  return performNonIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/allocations/{id}/release",{pathParams:{id}}));
}
export async function consumeSale(request:Pick<Request,"headers">,body:ConsumeSaleBody):Promise<FlowMutationResult>{
  return performIdempotent(request,bridge=>bridge.client.request("post","/admin/inventory/consume-sale",{headers:{"Idempotency-Key":bridge.key},body}));
}

async function performRead(
  request:Pick<Request,"headers">,
  endpoint:string,
  endpointFactory:()=>string,
  call:(bridge:ReturnType<typeof createAdminAuthBridge>)=>Promise<{status:number;requestId:string|null}>,
):Promise<FlowReadResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await call(bridge);
    return{kind:"ready",endpoint:endpointFactory()||endpoint,status:response.status,requestId:response.requestId,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyRead(error,bridge?.takeSetCookies()??[]);}
}

async function performIdempotent(
  request:Pick<Request,"headers">,
  call:(bridge:{client:ReturnType<typeof createAdminAuthBridge>["client"];key:string;takeSetCookies:()=>readonly string[]})=>Promise<{requestId:string|null}>,
):Promise<FlowMutationResult>{
  const key=randomUUID();
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await call({client:bridge.client,key,takeSetCookies:()=>bridge!.takeSetCookies()});
    return{kind:"confirmed",requestId:response.requestId,idempotencyKey:key,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutation(error,key,bridge?.takeSetCookies()??[]);}
}

async function performNonIdempotent(
  request:Pick<Request,"headers">,
  call:(bridge:ReturnType<typeof createAdminAuthBridge>)=>Promise<{requestId:string|null}>,
):Promise<FlowMutationResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await call(bridge);
    return{kind:"confirmed",requestId:response.requestId,idempotencyKey:null,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutation(error,null,bridge?.takeSetCookies()??[]);}
}

function classifyRead(error:unknown,setCookies:readonly string[]):FlowReadResult{
  if(error instanceof ApiClientError&&error.kind==="http"){
    if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,setCookies};
    if(error.status===404)return{kind:"not_found",requestId:error.requestId,setCookies};
  }
  return{kind:"unavailable",requestId:error instanceof ApiClientError?error.requestId:null,setCookies};
}
function classifyMutation(error:unknown,key:string|null,setCookies:readonly string[]):FlowMutationResult{
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
function invalidId(name:string):FlowMutationResult{return{kind:"invalid",requestId:null,fieldErrors:Object.freeze([field(name,"INVALID_UUID","شناسه معتبر نیست.")]),idempotencyKey:null,setCookies:[]};}
function isUuid(value:string):boolean{return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function field(fieldName:string,code:string,message:string):FieldError{return{field:fieldName,code,message};}
