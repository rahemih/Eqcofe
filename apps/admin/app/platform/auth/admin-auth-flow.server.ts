import type { ApiComponents } from "../api/contract.js";
import { ApiClientError } from "../api/errors.js";
import { appendAdminAuthSetCookies, createAdminAuthBridge } from "./admin-cookie.server.js";

type LoginEnvelope = ApiComponents["schemas"]["AdminLoginResponse"];
type FidoChallengeEnvelope = ApiComponents["schemas"]["AdminFidoChallengeResponse"];
type SessionEnvelope = ApiComponents["schemas"]["AdminSessionEstablishedResponse"];
type VerifyBody = ApiComponents["schemas"]["PostAdminAuthFidoVerifyRequest"];

export type AdminAuthFailureCode =
  | "INVALID_INPUT"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "PREAUTH_REQUIRED"
  | "ENROLLMENT_TOKEN_REQUIRED"
  | "FIDO_FAILED"
  | "SESSION_EXPIRED"
  | "UNAVAILABLE";

export type AdminAuthFailure = { ok: false; code: AdminAuthFailureCode; requestId: string | null };
export type AdminLoginSuccess = { ok: true; phase: "preauth"; expiresInSeconds: number; setCookies: readonly string[] };
export type AdminChallengeSuccess = { ok: true; phase: "challenge"; mode: "registration" | "authentication"; challengeId: string; options: Record<string, unknown>; setCookies: readonly string[] };
export type AdminVerifySuccess = { ok: true; phase: "authenticated"; expiresAt: string; setCookies: readonly string[] };
export type AdminLogoutSuccess = { ok: true; phase: "logged-out"; setCookies: readonly string[] };

export async function beginAdminLogin(request: Pick<Request, "headers">, username: string, password: string): Promise<AdminLoginSuccess | AdminAuthFailure> {
  if (!username.trim() || password.length < 8 || username.length > 320 || password.length > 1024) return failure("INVALID_INPUT");
  const bridge=createAdminAuthBridge(request);
  try {
    const result=await bridge.client.request("post","/admin/auth/login",{body:{username:username.trim(),password}});
    const envelope=result.data as LoginEnvelope;
    return {ok:true,phase:"preauth",expiresInSeconds:envelope.data.expires_in_seconds,setCookies:bridge.takeSetCookies()};
  } catch(error) { return mapFailure(error,bridge.takeSetCookies()); }
}

export async function requestAdminFidoChallenge(request: Pick<Request, "headers">, enrollmentToken?: string | null): Promise<AdminChallengeSuccess | AdminAuthFailure> {
  const token=enrollmentToken?.trim()||undefined;
  if (token && (token.length < 32 || token.length > 256)) return failure("INVALID_INPUT");
  const bridge=createAdminAuthBridge(request);
  try {
    const result=await bridge.client.request("post","/admin/auth/fido/challenge",token?{body:{enrollment_token:token}}:{});
    const envelope=result.data as FidoChallengeEnvelope;
    const data=envelope.data;
    if ((data.mode!=="registration"&&data.mode!=="authentication")||!data.challenge_id||!isRecord(data.options)) return failure("UNAVAILABLE",result.requestId);
    return {ok:true,phase:"challenge",mode:data.mode,challengeId:data.challenge_id,options:data.options,setCookies:bridge.takeSetCookies()};
  } catch(error) { return mapFailure(error,bridge.takeSetCookies()); }
}

export async function verifyAdminFido(request: Pick<Request, "headers">, body: VerifyBody): Promise<AdminVerifySuccess | AdminAuthFailure> {
  if (!body.challenge_id || !body.credential_id || !body.client_data_json) return failure("INVALID_INPUT");
  const bridge=createAdminAuthBridge(request);
  try {
    const result=await bridge.client.request("post","/admin/auth/fido/verify",{body});
    const envelope=result.data as SessionEnvelope;
    if (!envelope.data.expires_at) return failure("UNAVAILABLE",result.requestId);
    return {ok:true,phase:"authenticated",expiresAt:envelope.data.expires_at,setCookies:bridge.takeSetCookies()};
  } catch(error) { return mapFailure(error,bridge.takeSetCookies()); }
}

export async function logoutAdmin(request: Pick<Request, "headers">): Promise<AdminLogoutSuccess | AdminAuthFailure> {
  const bridge=createAdminAuthBridge(request);
  try {
    await bridge.client.request("post","/admin/auth/logout",{});
    return {ok:true,phase:"logged-out",setCookies:bridge.takeSetCookies()};
  } catch(error) { return mapFailure(error,bridge.takeSetCookies()); }
}

export function applyAdminAuthCookies(headers: Headers, values: readonly string[]): Headers {
  appendAdminAuthSetCookies(headers,values);
  return headers;
}

function mapFailure(error: unknown, setCookies: readonly string[]): AdminAuthFailure {
  void setCookies;
  if (!(error instanceof ApiClientError)) return failure("UNAVAILABLE");
  if (error.kind==="http") {
    if (error.status===429 || error.code==="LOGIN_RATE_LIMITED") return failure("RATE_LIMITED",error.requestId);
    if (error.code==="INVALID_CREDENTIALS") return failure("INVALID_CREDENTIALS",error.requestId);
    if (error.code==="ADMIN_PRE_AUTH_REQUIRED") return failure("PREAUTH_REQUIRED",error.requestId);
    if (error.code==="FIDO2_ENROLLMENT_TOKEN_REQUIRED") return failure("ENROLLMENT_TOKEN_REQUIRED",error.requestId);
    if (error.code.startsWith("FIDO2_")) return failure("FIDO_FAILED",error.requestId);
    if (error.status===401 || error.status===403) return failure("SESSION_EXPIRED",error.requestId);
  }
  return failure("UNAVAILABLE",error.requestId);
}
function failure(code:AdminAuthFailureCode,requestId:string|null=null):AdminAuthFailure{return {ok:false,code,requestId};}
function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==="object"&&value!==null&&!Array.isArray(value);}
