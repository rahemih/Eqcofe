import type { ApiComponents } from "../api/contract.js";
import { ApiClientError } from "../api/errors.js";
import { createAdminAuthBridge } from "./admin-cookie.server.js";

type CredentialSummary=ApiComponents["schemas"]["AdminFidoCredentialSummary"];
type StepUpVerifyBody=ApiComponents["schemas"]["PostAdminAuthStepUpVerifyRequest"];
type RegistrationVerifyBody=ApiComponents["schemas"]["PostAdminAuthFidoVerifyRequest"];

export type CredentialFlowFailureCode=
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "STEP_UP_REQUIRED"
  | "LAST_CREDENTIAL"
  | "CREDENTIAL_NOT_FOUND"
  | "FIDO_FAILED"
  | "CONFLICT"
  | "UNAVAILABLE";
export type CredentialFlowFailure={ok:false;code:CredentialFlowFailureCode;requestId:string|null};
export type StepUpChallengeSuccess={ok:true;kind:"step-up-challenge";challengeId:string;options:Record<string,unknown>};
export type StepUpVerifySuccess={ok:true;kind:"step-up-verified";token:string};
export type RegistrationChallengeSuccess={ok:true;kind:"registration-challenge";challengeId:string;options:Record<string,unknown>};
export type RegistrationVerifiedSuccess={ok:true;kind:"registered"};
export type CredentialRevokedSuccess={ok:true;kind:"revoked"};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listAdminFidoCredentials(request:Pick<Request,"headers">):Promise<{ok:true;credentials:readonly CredentialSummary[]}|CredentialFlowFailure>{
  const bridge=createAdminAuthBridge(request);
  try{
    const result=await bridge.client.request("get","/admin/auth/fido/credentials",{});
    const credentials=result.data.data;
    if(!Array.isArray(credentials)||credentials.length>32||credentials.some(item=>!isCredentialSummary(item))) return failure("UNAVAILABLE",result.requestId);
    return {ok:true,credentials:Object.freeze(credentials.map(item=>Object.freeze({...item})))};
  }catch(error){return mapFailure(error);}
}

export async function createAdminStepUpChallenge(request:Pick<Request,"headers">):Promise<StepUpChallengeSuccess|CredentialFlowFailure>{
  const bridge=createAdminAuthBridge(request);
  try{
    const result=await bridge.client.request("post","/admin/auth/step-up/challenge",{});
    const value=result.data.data;
    if(!value.challenge_id||!isRecord(value.options))return failure("UNAVAILABLE",result.requestId);
    return {ok:true,kind:"step-up-challenge",challengeId:value.challenge_id,options:value.options};
  }catch(error){return mapFailure(error);}
}

export async function verifyAdminStepUp(request:Pick<Request,"headers">,body:StepUpVerifyBody):Promise<StepUpVerifySuccess|CredentialFlowFailure>{
  if(!isAuthenticationResponse(body))return failure("INVALID_INPUT");
  const bridge=createAdminAuthBridge(request);
  try{
    const result=await bridge.client.request("post","/admin/auth/step-up/verify",{body});
    const token=result.data.data.step_up_token;
    if(typeof token!=="string"||token.length<16||token.length>8192||/[\r\n\0]/.test(token))return failure("UNAVAILABLE",result.requestId);
    return {ok:true,kind:"step-up-verified",token};
  }catch(error){return mapFailure(error);}
}

export async function createAdditionalCredentialChallenge(request:Pick<Request,"headers">,stepUpToken:string):Promise<RegistrationChallengeSuccess|CredentialFlowFailure>{
  const bridge=createAdminAuthBridge(request,{stepUpToken});
  try{
    const result=await bridge.client.request("post","/admin/auth/fido/credentials/register/challenge",{});
    const value=result.data.data;
    if(!value.challenge_id||!isRecord(value.options))return failure("UNAVAILABLE",result.requestId);
    return {ok:true,kind:"registration-challenge",challengeId:value.challenge_id,options:value.options};
  }catch(error){return mapFailure(error);}
}

export async function verifyAdditionalCredential(request:Pick<Request,"headers">,stepUpToken:string,body:RegistrationVerifyBody):Promise<RegistrationVerifiedSuccess|CredentialFlowFailure>{
  if(!body.challenge_id||!body.credential_id||!body.client_data_json||!body.attestation_object)return failure("INVALID_INPUT");
  const bridge=createAdminAuthBridge(request,{stepUpToken});
  try{
    const result=await bridge.client.request("post","/admin/auth/fido/credentials/register/verify",{body});
    if(result.data.data.registered!==true)return failure("UNAVAILABLE",result.requestId);
    return {ok:true,kind:"registered"};
  }catch(error){return mapFailure(error);}
}

export async function revokeAdminFidoCredential(request:Pick<Request,"headers">,stepUpToken:string,credentialId:string):Promise<CredentialRevokedSuccess|CredentialFlowFailure>{
  if(!UUID.test(credentialId))return failure("INVALID_INPUT");
  const bridge=createAdminAuthBridge(request,{stepUpToken});
  try{
    const result=await bridge.client.request("post","/admin/auth/fido/credentials/{id}/revoke",{pathParams:{id:credentialId}});
    if(result.data.data.revoked!==true)return failure("UNAVAILABLE",result.requestId);
    return {ok:true,kind:"revoked"};
  }catch(error){return mapFailure(error);}
}

function mapFailure(error:unknown):CredentialFlowFailure{
  if(!(error instanceof ApiClientError))return failure("UNAVAILABLE");
  if(error.kind==="http"){
    if(error.code==="STEP_UP_REQUIRED")return failure("STEP_UP_REQUIRED",error.requestId);
    if(error.code==="LAST_FIDO2_CREDENTIAL_CANNOT_BE_REVOKED")return failure("LAST_CREDENTIAL",error.requestId);
    if(error.code==="FIDO2_CREDENTIAL_NOT_FOUND")return failure("CREDENTIAL_NOT_FOUND",error.requestId);
    if(error.code.startsWith("FIDO2_"))return failure("FIDO_FAILED",error.requestId);
    if(error.status===401||error.code==="ADMIN_SESSION_REQUIRED")return failure("UNAUTHENTICATED",error.requestId);
    if(error.status===409)return failure("CONFLICT",error.requestId);
    if(error.status===403)return failure("STEP_UP_REQUIRED",error.requestId);
  }
  return failure("UNAVAILABLE",error.requestId);
}
function failure(code:CredentialFlowFailureCode,requestId:string|null=null):CredentialFlowFailure{return {ok:false,code,requestId};}
function isAuthenticationResponse(value:unknown):value is StepUpVerifyBody{
  if(!isRecord(value))return false;
  return typeof value.challenge_id==="string"&&typeof value.credential_id==="string"&&typeof value.client_data_json==="string"&&typeof value.authenticator_data==="string"&&typeof value.signature==="string";
}
function isCredentialSummary(value:unknown):value is CredentialSummary{
  if(!isRecord(value))return false;
  return UUID.test(String(value.id??""))&&typeof value.device_name==="string"&&value.device_name.length>0&&value.device_name.length<=150&&(value.credential_device_type===null||typeof value.credential_device_type==="string")&&typeof value.backed_up==="boolean"&&(value.last_used_at===null||isDateTime(value.last_used_at))&&isDateTime(value.created_at);
}
function isDateTime(value:unknown):value is string{return typeof value==="string"&&Number.isFinite(Date.parse(value));}
function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==="object"&&value!==null&&!Array.isArray(value);}
