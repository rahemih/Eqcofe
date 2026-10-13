import type { ApiComponents } from "../api/contract.js";
import { ApiClientError } from "../api/errors.js";
import { createAdminAuthBridge } from "./admin-cookie.server.js";

export type AdminContextActor = ApiComponents["schemas"]["AdminSessionActor"];
export type AdminAssignedScope = { type: "warehouse" | "physical_store"; id: string; value: string };
export type AdminAuthorizationContext =
  | { kind: "authorized"; actor: AdminContextActor; permissions: readonly string[]; scopes: readonly AdminAssignedScope[]; setCookies: readonly string[] }
  | { kind: "unauthenticated"; setCookies: readonly string[] }
  | { kind: "unavailable"; requestId: string | null; setCookies: readonly string[] };

const PERMISSION_PATTERN=/^[a-z][a-z0-9_.:-]{0,127}$/;
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_SCOPE_TYPES=new Set(["warehouse","physical_store"]);

export async function readAdminAuthorizationContext(request:Pick<Request,"headers">):Promise<AdminAuthorizationContext>{
  let bridge:ReturnType<typeof createAdminAuthBridge>|null=null;
  try{
    bridge=createAdminAuthBridge(request);
    const session=await bridge.client.request("get","/admin/auth/session",{});
    const actor=session.data.data.actor;
    if(actor.type!=="staff"||!actor.id||!actor.accountId)return unavailable(bridge,session.requestId);

    const [permissionsResult,scopesResult]=await Promise.all([
      bridge.client.request("get","/admin/me/permissions",{}),
      bridge.client.request("get","/admin/me/scopes",{})
    ]);
    const permissions=normalizePermissions(permissionsResult.data.data.permissions);
    const scopes=normalizeScopes(scopesResult.data.data.scopes);
    if(!permissions||!scopes)return unavailable(bridge,permissionsResult.requestId??scopesResult.requestId??session.requestId);

    return {
      kind:"authorized",
      actor,
      permissions:Object.freeze(permissions),
      scopes:Object.freeze(scopes),
      setCookies:bridge.takeSetCookies()
    };
  }catch(error){
    const setCookies=bridge?.takeSetCookies()??[];
    if(error instanceof ApiClientError&&error.kind==="http"&&(error.status===401||error.status===403)){
      return {kind:"unauthenticated",setCookies};
    }
    return {kind:"unavailable",requestId:error instanceof ApiClientError?error.requestId:null,setCookies};
  }
}

function normalizePermissions(value:unknown):string[]|null{
  if(!Array.isArray(value)||value.length>512)return null;
  const output=new Set<string>();
  for(const item of value){
    if(typeof item!=="string")return null;
    const permission=item.trim();
    if(!PERMISSION_PATTERN.test(permission))return null;
    output.add(permission);
  }
  return [...output].sort();
}

function normalizeScopes(value:unknown):AdminAssignedScope[]|null{
  if(!Array.isArray(value)||value.length>256)return null;
  const output=new Map<string,AdminAssignedScope>();
  for(const item of value){
    if(typeof item!=="string")return null;
    const raw=item.trim();
    const separator=raw.indexOf(":");
    if(separator<=0||separator!==raw.lastIndexOf(":"))return null;
    const type=raw.slice(0,separator);
    const id=raw.slice(separator+1);
    if(!ALLOWED_SCOPE_TYPES.has(type)||!UUID_PATTERN.test(id))return null;
    const scope={type:type as AdminAssignedScope["type"],id,value:`${type}:${id}`};
    output.set(scope.value,scope);
  }
  return [...output.values()].sort((a,b)=>a.value.localeCompare(b.value,"en"));
}

function unavailable(bridge:ReturnType<typeof createAdminAuthBridge>,requestId:string|null):AdminAuthorizationContext{
  return {kind:"unavailable",requestId,setCookies:bridge.takeSetCookies()};
}
