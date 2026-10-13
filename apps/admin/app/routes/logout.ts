import { redirect } from "react-router";
import { applyAdminAuthCookies, logoutAdmin } from "../platform/auth/admin-auth-flow.server";

export async function loader(){throw redirect("/");}

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedFormOrigin(request)) throw redirect("/");
  const result=await logoutAdmin(request);
  const headers=applyAdminAuthCookies(new Headers(),result.setCookies);
  if(result.ok||result.code==="SESSION_EXPIRED") throw redirect("/login",{headers});
  throw redirect("/?auth_error=logout",{headers});
}

function isTrustedFormOrigin(request:Request):boolean{
  const origin=request.headers.get("origin");
  if(origin)return origin===new URL(request.url).origin;
  const site=request.headers.get("sec-fetch-site");
  return site==="same-origin"||site==="none";
}
