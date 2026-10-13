/// <reference lib="dom" />
import type { ApiComponents } from "../api/contract.js";

type VerifyBody = ApiComponents["schemas"]["PostAdminAuthFidoVerifyRequest"];
export type AdminFidoMode = "registration" | "authentication";

export async function runAdminWebAuthn(mode:AdminFidoMode,challengeId:string,rawOptions:Record<string,unknown>):Promise<VerifyBody>{
  if(typeof window==="undefined"||!window.PublicKeyCredential||!navigator.credentials) throw new Error("WEBAUTHN_UNAVAILABLE");
  if(!challengeId) throw new Error("WEBAUTHN_CHALLENGE_MISSING");
  if(mode==="registration"){
    const publicKey=toCreationOptions(rawOptions);
    const credential=await navigator.credentials.create({publicKey});
    if(!(credential instanceof PublicKeyCredential)||!(credential.response instanceof AuthenticatorAttestationResponse)) throw new Error("WEBAUTHN_REGISTRATION_CANCELLED");
    const response=credential.response;
    const transports=typeof response.getTransports==="function"?response.getTransports():[];
    return {
      challenge_id:challengeId,
      credential_id:credential.id,
      client_data_json:toBase64Url(response.clientDataJSON),
      attestation_object:toBase64Url(response.attestationObject),
      transports,
      device_name:"Security key"
    };
  }
  const publicKey=toRequestOptions(rawOptions);
  const credential=await navigator.credentials.get({publicKey});
  if(!(credential instanceof PublicKeyCredential)||!(credential.response instanceof AuthenticatorAssertionResponse)) throw new Error("WEBAUTHN_AUTHENTICATION_CANCELLED");
  const response=credential.response;
  return {
    challenge_id:challengeId,
    credential_id:credential.id,
    client_data_json:toBase64Url(response.clientDataJSON),
    authenticator_data:toBase64Url(response.authenticatorData),
    signature:toBase64Url(response.signature),
    user_handle:response.userHandle?toBase64Url(response.userHandle):null
  };
}

export function toCreationOptions(raw:Record<string,unknown>):PublicKeyCredentialCreationOptions{
  const options=cloneRecord(raw);
  if(typeof options.challenge!=="string"||!isRecord(options.user)||typeof options.user.id!=="string") throw new Error("WEBAUTHN_OPTIONS_INVALID");
  const user={...options.user,id:fromBase64Url(options.user.id)};
  const excludeCredentials=Array.isArray(options.excludeCredentials)?options.excludeCredentials.map(toDescriptor):undefined;
  return {...options,challenge:fromBase64Url(options.challenge),user,...(excludeCredentials?{excludeCredentials}:{})} as PublicKeyCredentialCreationOptions;
}

export function toRequestOptions(raw:Record<string,unknown>):PublicKeyCredentialRequestOptions{
  const options=cloneRecord(raw);
  if(typeof options.challenge!=="string") throw new Error("WEBAUTHN_OPTIONS_INVALID");
  const allowCredentials=Array.isArray(options.allowCredentials)?options.allowCredentials.map(toDescriptor):undefined;
  return {...options,challenge:fromBase64Url(options.challenge),...(allowCredentials?{allowCredentials}:{})} as PublicKeyCredentialRequestOptions;
}

export function toBase64Url(buffer:ArrayBuffer):string{
  const bytes=new Uint8Array(buffer);
  let binary="";
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export function fromBase64Url(value:string):ArrayBuffer{
  if(!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) throw new Error("WEBAUTHN_BASE64URL_INVALID");
  const normalized=value.replace(/-/g,"+").replace(/_/g,"/");
  const padded=normalized+"=".repeat((4-normalized.length%4)%4);
  let binary:string;
  try{binary=atob(padded);}catch{throw new Error("WEBAUTHN_BASE64URL_INVALID");}
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);
  return bytes.buffer;
}
function toDescriptor(value:unknown):PublicKeyCredentialDescriptor{
  if(!isRecord(value)||typeof value.id!=="string"||typeof value.type!=="string") throw new Error("WEBAUTHN_CREDENTIAL_DESCRIPTOR_INVALID");
  return {...value,id:fromBase64Url(value.id)} as PublicKeyCredentialDescriptor;
}
function cloneRecord(value:Record<string,unknown>):Record<string,unknown>{return JSON.parse(JSON.stringify(value)) as Record<string,unknown>;}
function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==="object"&&value!==null&&!Array.isArray(value);}
