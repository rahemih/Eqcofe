import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type CurrencyRateRecord=ApiComponents["schemas"]["AdminPricingCurrencyRateRecord"];
export type CurrencyRateRegistrationData=ApiComponents["schemas"]["AdminPricingCurrencyRateRegistrationData"];
export type CurrencyRuleRecord=ApiComponents["schemas"]["AdminPricingCurrencyRuleRecord"];
export type CurrencyImpactPreviewData=ApiComponents["schemas"]["AdminPricingCurrencyImpactPreviewData"];
export type FxRefreshData=ApiComponents["schemas"]["AdminPricingFxRefreshData"];
export type CurrencyApplyData=ApiComponents["schemas"]["AdminPricingCurrencyApplyData"];
export type RefreshCurrencyBody=ApiComponents["schemas"]["PostAdminPricingCurrencyRatesRefreshRequest"];
export type SelectCurrencyBody=ApiComponents["schemas"]["PostAdminPricingCurrencyRatesIdSelectRequest"];
export type RejectCurrencyBody=ApiComponents["schemas"]["RejectRequest"];
export type RegisterCurrencyBody=ApiComponents["schemas"]["RegisterCurrencyRateRequest"];
export type CurrencyImpactBody=ApiComponents["schemas"]["PostAdminPricingCurrencyImpactPreviewRequest"];
export type CurrencyApplyBody=ApiComponents["schemas"]["PostAdminPricingCurrencyApplyRequest"];
export type CurrencyRuleCreateBody=ApiComponents["schemas"]["CurrencyPricingRuleRequest"];
export type CurrencyRuleUpdateBody=ApiComponents["schemas"]["PatchCurrencyPricingRuleRequest"];
type FieldError=ApiComponents["schemas"]["FieldError"];

type Common={requestId:string|null;setCookies:readonly string[]};
type ReadFailure=
  |({kind:"denied"}&Common)
  |({kind:"not_found"}&Common)
  |({kind:"unavailable"}&Common);

export type CurrencyRatesRead=
  |({kind:"ready";rates:readonly CurrencyRateRecord[];current:CurrencyRateRecord|null;sourceCurrencyCode:string}&Common)
  |ReadFailure;
export type CurrencyRulesRead=
  |({kind:"ready";rules:readonly CurrencyRuleRecord[]}&Common)
  |ReadFailure;
export type CurrencyRuleDetailRead=
  |({kind:"ready";rule:CurrencyRuleRecord}&Common)
  |ReadFailure;

export type FxMutationFailure=
  |({kind:"denied"|"conflict"|"expired"|"blocked"|"step_up_required"|"not_found"|"review_required"|"provider_unavailable"|"unknown_outcome"|"unavailable"}&Common)
  |({kind:"invalid";fieldErrors:readonly FieldError[]}&Common);

export type FxRefreshResult=({kind:"ready";refresh:FxRefreshData}&Common)|FxMutationFailure;
export type CurrencyRateMutationResult=
  |({kind:"confirmed";rate:CurrencyRateRecord}&Common)
  |FxMutationFailure;
export type CurrencyRateRegistrationResult=
  |({kind:"confirmed";registration:CurrencyRateRegistrationData}&Common)
  |FxMutationFailure;
export type CurrencyImpactResult=
  |({kind:"ready";preview:CurrencyImpactPreviewData}&Common)
  |FxMutationFailure;
export type CurrencyApplyResult=
  |({kind:"confirmed";result:CurrencyApplyData}&Common)
  |FxMutationFailure;
export type CurrencyRuleMutationResult=
  |({kind:"confirmed";rule:CurrencyRuleRecord}&Common)
  |FxMutationFailure;

export async function readCurrencyRates(
  request:Pick<Request,"headers">,
  sourceCurrencyCode="USD",
):Promise<CurrencyRatesRead>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const code=normalizeCurrencyCode(sourceCurrencyCode);
    const [rates,current]=await Promise.all([
      bridge.client.request("get","/admin/pricing/currency-rates",{query:{source_currency_code:code}}),
      bridge.client.request("get","/admin/pricing/currency-rates/current",{query:{source_currency_code:code}}),
    ]);
    return{
      kind:"ready",
      rates:Object.freeze([...rates.data.data]),
      current:current.data.data?Object.freeze({...current.data.data}):null,
      sourceCurrencyCode:code,
      requestId:rates.requestId??current.requestId??rates.data.meta.request_id??current.data.meta.request_id,
      setCookies:bridge.takeSetCookies(),
    };
  }catch(error){return classifyReadFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function refreshCurrencyRate(
  request:Pick<Request,"headers">,
  body:RefreshCurrencyBody,
):Promise<FxRefreshResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/pricing/currency-rates/refresh",{body});
    return{kind:"ready",refresh:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutationFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function registerCurrencyRate(
  request:Pick<Request,"headers">,
  body:RegisterCurrencyBody,
):Promise<CurrencyRateRegistrationResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/pricing/currency-rates/register",{body});
    return{kind:"confirmed",registration:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutationFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function selectCurrencyRate(
  request:Pick<Request,"headers">,
  rateId:string,
  stepUpToken:string,
  body:SelectCurrencyBody,
):Promise<CurrencyRateMutationResult>{
  if(!isStepUpToken(stepUpToken))return{kind:"step_up_required",requestId:null,setCookies:[]};
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request,{stepUpToken});
    const response=await bridge.client.request("post","/admin/pricing/currency-rates/{id}/select",{pathParams:{id:rateId},body});
    return{kind:"confirmed",rate:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutationFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function rejectCurrencyRate(
  request:Pick<Request,"headers">,
  rateId:string,
  body:RejectCurrencyBody,
):Promise<CurrencyRateMutationResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/pricing/currency-rates/{id}/reject",{pathParams:{id:rateId},body});
    return{kind:"confirmed",rate:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutationFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function previewCurrencyImpact(
  request:Pick<Request,"headers">,
  body:CurrencyImpactBody,
):Promise<CurrencyImpactResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/pricing/currency/impact-preview",{body});
    return{kind:"ready",preview:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutationFailure(error,bridge?.takeSetCookies()??[]);}
}

export function currencyApplyIdempotencyKey(previewId:string):string{
  if(!isUuid(previewId))throw new Error("FX_PREVIEW_ID_INVALID");
  return "pricing-currency:"+previewId.toLowerCase();
}

export async function applyCurrencyImpact(
  request:Pick<Request,"headers">,
  stepUpToken:string,
  idempotencyKey:string,
  body:CurrencyApplyBody,
):Promise<CurrencyApplyResult>{
  if(!isStepUpToken(stepUpToken))return{kind:"step_up_required",requestId:null,setCookies:[]};
  if(!isIdempotencyKey(idempotencyKey))return{kind:"invalid",requestId:null,fieldErrors:[fieldError("idempotency_key","INVALID_IDEMPOTENCY_KEY","کلید idempotency معتبر نیست.")],setCookies:[]};
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request,{stepUpToken});
    const response=await bridge.client.request("post","/admin/pricing/currency/apply",{headers:{"Idempotency-Key":idempotencyKey},body});
    return{kind:"confirmed",result:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutationFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function readCurrencyRules(request:Pick<Request,"headers">):Promise<CurrencyRulesRead>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("get","/admin/pricing/currency-rules",{});
    return{kind:"ready",rules:Object.freeze([...response.data.data]),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyReadFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function readCurrencyRule(request:Pick<Request,"headers">,ruleId:string):Promise<CurrencyRuleDetailRead>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("get","/admin/pricing/currency-rules/{id}",{pathParams:{id:ruleId}});
    return{kind:"ready",rule:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyReadFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function createCurrencyRule(
  request:Pick<Request,"headers">,
  body:CurrencyRuleCreateBody,
):Promise<CurrencyRuleMutationResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("post","/admin/pricing/currency-rules",{body});
    return{kind:"confirmed",rule:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutationFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function updateCurrencyRule(
  request:Pick<Request,"headers">,
  ruleId:string,
  version:number,
  body:CurrencyRuleUpdateBody,
):Promise<CurrencyRuleMutationResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const response=await bridge.client.request("patch","/admin/pricing/currency-rules/{id}",{
      pathParams:{id:ruleId},
      headers:{"If-Match":formatCurrencyIfMatch(version)},
      body,
    });
    return{kind:"confirmed",rule:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutationFailure(error,bridge?.takeSetCookies()??[]);}
}

export async function setCurrencyRuleStatus(
  request:Pick<Request,"headers">,
  ruleId:string,
  status:"active"|"inactive",
):Promise<CurrencyRuleMutationResult>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const endpoint=status==="active"?"/admin/pricing/currency-rules/{id}/activate":"/admin/pricing/currency-rules/{id}/deactivate";
    const response=endpoint.endsWith("/activate")
      ?await bridge.client.request("post","/admin/pricing/currency-rules/{id}/activate",{pathParams:{id:ruleId}})
      :await bridge.client.request("post","/admin/pricing/currency-rules/{id}/deactivate",{pathParams:{id:ruleId}});
    return{kind:"confirmed",rule:Object.freeze({...response.data.data}),requestId:response.requestId??response.data.meta.request_id,setCookies:bridge.takeSetCookies()};
  }catch(error){return classifyMutationFailure(error,bridge?.takeSetCookies()??[]);}
}

export function formatCurrencyIfMatch(version:number):string{
  if(!Number.isSafeInteger(version)||version<1)throw new Error("FX_RULE_VERSION_INVALID");
  return `"${version}"`;
}

function classifyReadFailure(error:unknown,setCookies:readonly string[]):ReadFailure{
  if(error instanceof ApiClientError&&error.kind==="http"){
    if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,setCookies};
    if(error.status===404)return{kind:"not_found",requestId:error.requestId,setCookies};
  }
  return{kind:"unavailable",requestId:error instanceof ApiClientError?error.requestId:null,setCookies};
}

function classifyMutationFailure(error:unknown,setCookies:readonly string[]):FxMutationFailure{
  if(!(error instanceof ApiClientError))return{kind:"unknown_outcome",requestId:null,setCookies};
  if(error.kind==="network"||error.kind==="timeout"||error.kind==="aborted")return{kind:"unknown_outcome",requestId:error.requestId,setCookies};
  if(error.kind==="http"){
    if(error.code==="PRICING_PREVIEW_EXPIRED")return{kind:"expired",requestId:error.requestId,setCookies};
    if(error.code==="AFFECTED_COUNT_CHANGED"||error.code==="VERSION_CONFLICT")return{kind:"conflict",requestId:error.requestId,setCookies};
    if(error.code==="PROFIT_GUARD_FAILED"||error.code==="CURRENCY_RATE_NOT_VALIDATED")return{kind:"blocked",requestId:error.requestId,setCookies};
    if(error.code==="STEP_UP_REQUIRED")return{kind:"step_up_required",requestId:error.requestId,setCookies};
    if(error.code==="FX_RATE_REQUIRES_REVIEW")return{kind:"review_required",requestId:error.requestId,setCookies};
    if(error.code==="FX_RATE_FETCH_FAILED"||error.code==="CURRENCY_PROVIDER_NOT_CONFIGURED")return{kind:"provider_unavailable",requestId:error.requestId,setCookies};
    if(error.status===401||error.status===403)return{kind:"denied",requestId:error.requestId,setCookies};
    if(error.status===404)return{kind:"not_found",requestId:error.requestId,setCookies};
    if(error.status===409||error.status===412||error.status===428)return{kind:"conflict",requestId:error.requestId,setCookies};
    if(error.status===400||error.status===422)return{kind:"invalid",requestId:error.requestId,fieldErrors:Object.freeze([...error.fieldErrors]),setCookies};
    if(error.status===408||(typeof error.status==="number"&&error.status>=500))return{kind:"unknown_outcome",requestId:error.requestId,setCookies};
  }
  return{kind:"unavailable",requestId:error.requestId,setCookies};
}

function normalizeCurrencyCode(value:string):string{
  const code=value.trim().toUpperCase();
  if(!/^[A-Z]{3}$/.test(code))throw new Error("FX_CURRENCY_CODE_INVALID");
  return code;
}
function isUuid(value:string):boolean{return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function isStepUpToken(value:string):boolean{return typeof value==="string"&&value.length>=8&&value.length<=4096&&!hasControlCharacters(value);}
function isIdempotencyKey(value:string):boolean{return typeof value==="string"&&value.length>=8&&value.length<=200&&/^[A-Za-z0-9._:-]+$/.test(value);}
function hasControlCharacters(value:string):boolean{for(const ch of value){const code=ch.charCodeAt(0);if(code<=0x1f||code===0x7f)return true;}return false;}
function fieldError(field:string,code:string,message:string):FieldError{return{field,code,message};}
