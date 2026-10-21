import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type BulkScope = "all" | "category" | "brand" | "product";
export type BulkChangeType =
  | "set_price"
  | "increase_percent"
  | "decrease_percent"
  | "increase_fixed"
  | "decrease_fixed";
export type BulkPreviewBody = ApiComponents["schemas"]["PostAdminPricingBulkPreviewRequest"];
export type BulkApplyBody = ApiComponents["schemas"]["PostAdminPricingBulkApplyRequest"];
export type BulkPreviewData = ApiComponents["schemas"]["AdminPricingBulkPreviewData"];
export type BulkApplyData = ApiComponents["schemas"]["AdminPricingBulkApplyData"];
export type BulkOperationData = ApiComponents["schemas"]["AdminPricingBulkOperationData"];
type FieldError = ApiComponents["schemas"]["FieldError"];

export type BulkFailure =
  | { kind: "denied" | "expired" | "conflict" | "blocked" | "step_up_required" | "not_found" | "unknown_outcome" | "unavailable"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "invalid"; requestId: string | null; fieldErrors: readonly FieldError[]; setCookies: readonly string[] };

export type BulkPreviewResult =
  | { kind: "ready"; preview: BulkPreviewData; requestId: string | null; setCookies: readonly string[] }
  | BulkFailure;

export type BulkApplyResult =
  | { kind: "confirmed"; result: BulkApplyData; requestId: string | null; setCookies: readonly string[] }
  | BulkFailure;

export type BulkStatusResult =
  | { kind: "ready"; operation: BulkOperationData; requestId: string | null; setCookies: readonly string[] }
  | BulkFailure;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCOPES=new Set<BulkScope>(["all","category","brand","product"]);
const CHANGES=new Set<BulkChangeType>(["set_price","increase_percent","decrease_percent","increase_fixed","decrease_fixed"]);
const ROUNDING=new Set(["none","nearest_1000","nearest_10000","nearest_100000"]);
const MAX_SCOPE_IDS=500;
const MAX_REASON=500;

export function validateBulkPreviewInput(input:{
  scopeType:string;
  scopeIds:readonly string[];
  changeType:string;
  value:number;
  roundingRule:string;
  reason:string;
}):{ok:true;body:BulkPreviewBody}|{ok:false;fieldErrors:readonly FieldError[]}{
  const errors:FieldError[]=[];
  const scope=input.scopeType as BulkScope;
  const change=input.changeType as BulkChangeType;
  const ids=[...new Set(input.scopeIds.map(x=>x.trim()).filter(Boolean))];
  const reason=input.reason.trim();

  if(!SCOPES.has(scope))errors.push(fieldError("scope_type","INVALID_SCOPE","دامنه عملیات گروهی معتبر نیست."));
  if(scope==="all"&&ids.length)errors.push(fieldError("scope_ids","ALL_SCOPE_IDS_FORBIDDEN","دامنه همه کالاها شناسه هدف نمی‌پذیرد."));
  if(scope!=="all"&&!ids.length)errors.push(fieldError("scope_ids","SCOPE_IDS_REQUIRED","برای این دامنه حداقل یک شناسه معتبر لازم است."));
  if(ids.length>MAX_SCOPE_IDS)errors.push(fieldError("scope_ids","SCOPE_IDS_TOO_MANY","در این فرم حداکثر ۵۰۰ شناسه دامنه پذیرفته می‌شود."));
  if(ids.some(id=>!UUID.test(id)))errors.push(fieldError("scope_ids","INVALID_SCOPE_ID","همه شناسه‌های دامنه باید UUID معتبر باشند."));
  if(!CHANGES.has(change))errors.push(fieldError("change_type","INVALID_CHANGE_TYPE","نوع تغییر قیمت معتبر نیست."));
  if(!Number.isFinite(input.value)||input.value<0)errors.push(fieldError("value","INVALID_VALUE","مقدار تغییر باید عدد نامنفی معتبر باشد."));
  if((change==="set_price"||change==="increase_fixed"||change==="decrease_fixed")&&!Number.isSafeInteger(input.value)){
    errors.push(fieldError("value","MONEY_INTEGER_REQUIRED","مقادیر تومانی باید عدد صحیح باشند."));
  }
  if(!ROUNDING.has(input.roundingRule))errors.push(fieldError("rounding_rule","INVALID_ROUNDING","قاعده گردکردن معتبر نیست."));
  if(!reason||reason.length>MAX_REASON||hasControlCharacters(reason)){
    errors.push(fieldError("reason","INVALID_REASON","دلیل عملیات الزامی است و باید حداکثر ۵۰۰ نویسه معتبر باشد."));
  }
  if(errors.length)return{ok:false,fieldErrors:Object.freeze(errors)};

  return{
    ok:true,
    body:{
      scope_type:scope,
      ...(scope!=="all"?{scope_ids:ids}:{}),
      change_type:change,
      value:input.value,
      rounding_rule:input.roundingRule,
      reason,
    },
  };
}

export function validateBulkApplyInput(input:{
  previewId:string;
  reason:string;
  expectedAffectedCount:number;
}):{ok:true;body:BulkApplyBody}|{ok:false;fieldErrors:readonly FieldError[]}{
  const errors:FieldError[]=[];
  const previewId=input.previewId.trim();
  const reason=input.reason.trim();
  if(!UUID.test(previewId))errors.push(fieldError("preview_id","INVALID_PREVIEW_ID","شناسه پیش‌نمایش معتبر نیست."));
  if(!reason||reason.length>MAX_REASON||hasControlCharacters(reason))errors.push(fieldError("reason","INVALID_REASON","دلیل اعمال معتبر نیست."));
  if(!Number.isSafeInteger(input.expectedAffectedCount)||input.expectedAffectedCount<0){
    errors.push(fieldError("expected_affected_count","INVALID_AFFECTED_COUNT","تعداد بازبینی‌شده معتبر نیست."));
  }
  if(errors.length)return{ok:false,fieldErrors:Object.freeze(errors)};
  return{ok:true,body:{preview_id:previewId,reason,expected_affected_count:input.expectedAffectedCount}};
}

export async function previewBulkPricing(
  request:Pick<Request,"headers">,
  body:BulkPreviewBody,
):Promise<BulkPreviewResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/pricing/bulk/preview",{body});
    if(!isPreview(response.data.data)){
      return{kind:"unknown_outcome",requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
    }
    return{kind:"ready",preview:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function readBulkPricingStatus(
  request:Pick<Request,"headers">,
  operationId:string,
):Promise<BulkStatusResult>{
  if(!UUID.test(operationId)){
    return{kind:"invalid",requestId:null,fieldErrors:[fieldError("operation_id","INVALID_OPERATION_ID","شناسه عملیات معتبر نیست.")],setCookies:[]};
  }
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("get","/admin/pricing/bulk/{operation_id}",{pathParams:{operation_id:operationId}});
    const operation=response.data.data;
    if(!operation)return{kind:"not_found",requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
    if(!isBulkOperation(operation))return{kind:"unavailable",requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
    return{kind:"ready",operation:Object.freeze({...operation}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function applyBulkPricing(
  request:Pick<Request,"headers">,
  stepUpToken:string,
  idempotencyKey:string,
  body:BulkApplyBody,
):Promise<BulkApplyResult>{
  if(!isStepUpToken(stepUpToken))return{kind:"step_up_required",requestId:null,setCookies:[]};
  if(!isIdempotencyKey(idempotencyKey))return{kind:"invalid",requestId:null,fieldErrors:[fieldError("idempotency_key","INVALID_IDEMPOTENCY_KEY","کلید بازیابی عملیات معتبر نیست.")],setCookies:[]};
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request,{stepUpToken});
    const response=await bridge.client.request("post","/admin/pricing/bulk/apply",{
      headers:{"Idempotency-Key":idempotencyKey},
      body,
    });
    if(!isApply(response.data.data)){
      return{kind:"unknown_outcome",requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
    }
    return{kind:"confirmed",result:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyFailure(error,bridge?.takeSetCookies()??[]);}
}

function classifyFailure(error:unknown,setCookies:readonly string[]):BulkFailure{
  if(!(error instanceof ApiClientError))return{kind:"unknown_outcome",requestId:null,setCookies};
  if(error.kind==="network"||error.kind==="timeout"||error.kind==="aborted")return{kind:"unknown_outcome",requestId:error.requestId,setCookies};
  if(error.kind==="http"){
    if(error.code==="PRICING_PREVIEW_EXPIRED")return{kind:"expired",requestId:error.requestId,setCookies};
    if(error.code==="AFFECTED_COUNT_CHANGED"||error.code==="PRICE_CHANGED_SINCE_PREVIEW")return{kind:"conflict",requestId:error.requestId,setCookies};
    if(error.code==="PROFIT_GUARD_FAILED")return{kind:"blocked",requestId:error.requestId,setCookies};
    if(error.code==="STEP_UP_REQUIRED")return{kind:"step_up_required",requestId:error.requestId,setCookies};
    if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,setCookies};
    if(error.status===404)return{kind:"not_found",requestId:error.requestId,setCookies};
    if(error.status===400||error.status===422)return{kind:"invalid",requestId:error.requestId,fieldErrors:Object.freeze([...error.fieldErrors]),setCookies};
    if(error.status===409||error.status===412||error.status===428)return{kind:"conflict",requestId:error.requestId,setCookies};
    if(error.status===408||(typeof error.status==="number"&&error.status>=500))return{kind:"unknown_outcome",requestId:error.requestId,setCookies};
  }
  return{kind:"unavailable",requestId:error.requestId,setCookies};
}

function isPreview(value:BulkPreviewData):boolean{
  return UUID.test(String(value.preview_id??""))
    && Number.isSafeInteger(value.affected_count)
    && value.affected_count>=0
    && Array.isArray(value.items)
    && value.items.length<=200
    && Array.isArray(value.warnings)
    && typeof value.expires_at==="string"
    && Number.isFinite(Date.parse(value.expires_at));
}
function isApply(value:BulkApplyData):boolean{
  return UUID.test(String(value.operation_id??""))
    && Number.isSafeInteger(value.affected_count)
    && value.affected_count>=0;
}
function isBulkOperation(value:BulkOperationData):boolean{
  return UUID.test(String(value.id??""))
    && value.operation_type==="bulk_price"
    && ["previewed","running","completed","failed","expired"].includes(value.status)
    && Number.isSafeInteger(value.affected_count)
    && value.affected_count>=0
    && Array.isArray(value.items)
    && Array.isArray(value.warnings)
    && typeof value.expires_at==="string"
    && Number.isFinite(Date.parse(value.expires_at));
}
function isStepUpToken(value:string):boolean{return typeof value==="string"&&value.length>=16&&value.length<=8192&&!/[\r\n\0]/.test(value);}
function isIdempotencyKey(value:string):boolean{return typeof value==="string"&&value.length>=8&&value.length<=200&&/^[A-Za-z0-9._:-]+$/.test(value);}
function fieldError(field:string,code:string,message:string):FieldError{return{field,code,message};}
function hasControlCharacters(value:string):boolean{for(const character of value){const code=character.charCodeAt(0);if(code<=0x1f||code===0x7f)return true;}return false;}
