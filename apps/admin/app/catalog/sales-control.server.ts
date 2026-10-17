import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type SalesScope = "global" | "brand" | "category" | "product" | "variant";
export type SalesPreviewRequest = ApiComponents["schemas"]["PostAdminSalesControlPreviewRequest"];
export type SalesPreview = ApiComponents["schemas"]["AdminSalesControlPreviewResponse"];
export type SalesApplyRequest = ApiComponents["schemas"]["PostAdminSalesControlApplyRequest"];
export type SalesApplyResponse = ApiComponents["schemas"]["AdminSalesControlApplyResponse"];
type FieldError = ApiComponents["schemas"]["FieldError"];

export type SalesControlFailure =
  | { kind: "denied" | "conflict" | "expired" | "step_up_required" | "unknown_outcome" | "unavailable"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "invalid"; requestId: string | null; fieldErrors: readonly FieldError[]; setCookies: readonly string[] };

export type SalesPreviewResult =
  | { kind: "ready"; preview: SalesPreview; requestId: string | null; setCookies: readonly string[] }
  | SalesControlFailure;

export type SalesApplyResult =
  | { kind: "confirmed"; result: SalesApplyResponse; requestId: string | null; setCookies: readonly string[] }
  | SalesControlFailure;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPES=new Set<SalesScope>(["global","brand","category","product","variant"]);

export function validateSalesPreviewInput(input: {
  scopeType: string;
  scopeId: string | null;
  salesEnabled: boolean;
  reason: string | null;
}): { ok: true; body: SalesPreviewRequest } | { ok: false; fieldErrors: readonly FieldError[] } {
  const errors: FieldError[]=[];
  const scope=input.scopeType as SalesScope;
  if(!SCOPES.has(scope)) errors.push(fieldError("scope_type","INVALID_SALES_SCOPE","دامنه کنترل فروش معتبر نیست."));
  const scopeId=input.scopeId?.trim()||null;
  if(scope!=="global"&&(!scopeId||!UUID.test(scopeId))) errors.push(fieldError("scope_id","INVALID_SCOPE_ID","برای این دامنه شناسه معتبر هدف الزامی است."));
  if(scope==="global"&&scopeId) errors.push(fieldError("scope_id","GLOBAL_SCOPE_ID_FORBIDDEN","دامنه همه کالاها شناسه هدف نمی‌پذیرد."));
  const reason=input.reason?.trim()||null;
  if(reason&&reason.length>500) errors.push(fieldError("reason","REASON_TOO_LONG","دلیل تغییر در این فرم حداکثر ۵۰۰ نویسه است."));
  if(reason&&hasControlCharacters(reason)) errors.push(fieldError("reason","REASON_CONTROL_CHARACTER","دلیل تغییر شامل نویسه نامعتبر است."));
  if(errors.length) return {ok:false,fieldErrors:Object.freeze(errors)};
  return {
    ok:true,
    body:{
      scope_type:scope,
      ...(scopeId?{scope_id:scopeId}:{}),
      sales_enabled:input.salesEnabled,
      ...(reason?{reason}:{})
    }
  };
}

export function validateSalesApplyInput(input: {
  previewId: string;
  reason: string;
  expectedAffectedCount: number;
}): { ok: true; body: SalesApplyRequest } | { ok: false; fieldErrors: readonly FieldError[] } {
  const errors: FieldError[]=[];
  const previewId=input.previewId.trim();
  const reason=input.reason.trim();
  if(!UUID.test(previewId)) errors.push(fieldError("preview_id","INVALID_PREVIEW_ID","شناسه پیش‌نمایش معتبر نیست."));
  if(!reason) errors.push(fieldError("reason","REASON_REQUIRED","ثبت دلیل برای اعمال تغییر الزامی است."));
  if(reason.length>500||hasControlCharacters(reason)) errors.push(fieldError("reason","REASON_INVALID","دلیل تغییر معتبر نیست یا بیش از ۵۰۰ نویسه است."));
  if(!Number.isSafeInteger(input.expectedAffectedCount)||input.expectedAffectedCount<0) errors.push(fieldError("expected_affected_count","INVALID_AFFECTED_COUNT","تعداد اقلام پیش‌نمایش معتبر نیست."));
  if(errors.length) return {ok:false,fieldErrors:Object.freeze(errors)};
  return {ok:true,body:{preview_id:previewId,reason,expected_affected_count:input.expectedAffectedCount}};
}

export async function previewAdminSalesControl(
  request: Pick<Request,"headers">,
  body: SalesPreviewRequest,
): Promise<SalesPreviewResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/sales-control/preview",{body});
    if(response.status===202||!response.data||!isPreview(response.data)){
      return {kind:"unknown_outcome",requestId:response.requestId,setCookies:bridge.takeSetCookies()};
    }
    return {kind:"ready",preview:Object.freeze({...response.data}),requestId:response.requestId,setCookies:bridge.takeSetCookies()};
  }catch(error){
    return classifyFailure(error,bridge?.takeSetCookies()??[]);
  }
}

export async function applyAdminSalesControl(
  request: Pick<Request,"headers">,
  stepUpToken: string,
  body: SalesApplyRequest,
): Promise<SalesApplyResult> {
  if(typeof stepUpToken!=="string"||stepUpToken.length<16||stepUpToken.length>8192||/[\r\n\0]/.test(stepUpToken)){
    return {kind:"step_up_required",requestId:null,setCookies:[]};
  }
  let bridge: ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request,{stepUpToken});
    const response=await bridge.client.request("post","/admin/sales-control/apply",{body});
    if(response.status===202||!response.data||!isApply(response.data)){
      return {kind:"unknown_outcome",requestId:response.requestId,setCookies:bridge.takeSetCookies()};
    }
    return {kind:"confirmed",result:Object.freeze({...response.data}),requestId:response.requestId,setCookies:bridge.takeSetCookies()};
  }catch(error){
    return classifyFailure(error,bridge?.takeSetCookies()??[]);
  }
}

function classifyFailure(error: unknown,setCookies: readonly string[]): SalesControlFailure {
  if(!(error instanceof ApiClientError)) return {kind:"unknown_outcome",requestId:null,setCookies};
  if(error.kind==="network"||error.kind==="timeout"||error.kind==="aborted") return {kind:"unknown_outcome",requestId:error.requestId,setCookies};
  if(error.kind==="http"){
    if(error.code==="SALES_PREVIEW_EXPIRED") return {kind:"expired",requestId:error.requestId,setCookies};
    if(error.code==="AFFECTED_COUNT_CHANGED") return {kind:"conflict",requestId:error.requestId,setCookies};
    if(error.code==="STEP_UP_REQUIRED") return {kind:"step_up_required",requestId:error.requestId,setCookies};
    if(error.status===401||error.status===403) return {kind:"denied",requestId:error.requestId,setCookies};
    if(error.status===400||error.status===422) return {kind:"invalid",requestId:error.requestId,fieldErrors:Object.freeze([...error.fieldErrors]),setCookies};
    if(error.status===409) return {kind:"conflict",requestId:error.requestId,setCookies};
    if(error.status===408||(typeof error.status==="number"&&error.status>=500)) return {kind:"unknown_outcome",requestId:error.requestId,setCookies};
  }
  return {kind:"unavailable",requestId:error.requestId,setCookies};
}

function isPreview(value: SalesPreview): boolean {
  return UUID.test(String(value.preview_id??""))
    && SCOPES.has(value.scope_type)
    && (value.scope_type==="global"?(value.scope_id==null):(typeof value.scope_id==="string"&&UUID.test(value.scope_id)))
    && typeof value.sales_enabled==="boolean"
    && Number.isSafeInteger(value.affected_count)
    && value.affected_count>=0
    && typeof value.expires_at==="string"
    && Number.isFinite(Date.parse(value.expires_at));
}

function isApply(value: SalesApplyResponse): boolean {
  return value.applied===true
    && SCOPES.has(value.scope_type)
    && (value.scope_type==="global"?(value.scope_id==null):(typeof value.scope_id==="string"&&UUID.test(value.scope_id)))
    && typeof value.sales_enabled==="boolean"
    && Number.isSafeInteger(value.affected_count)
    && value.affected_count>=0;
}

function fieldError(field:string,code:string,message:string):FieldError{return {field,code,message};}
function hasControlCharacters(value:string):boolean{
  for(const character of value){const code=character.charCodeAt(0);if(code<=0x1f||code===0x7f)return true;}
  return false;
}
