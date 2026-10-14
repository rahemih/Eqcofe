import { data, redirect, useLoaderData } from "react-router";
import { AdminShell } from "../shell/AdminShell";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server";
import { readAdminAuthorizationContext } from "../platform/auth/context.server";
import { getPermittedGroups } from "../navigation/destination-policy";

export async function loader({request}:{request:Request}){
  const context=await readAdminAuthorizationContext(request);
  const headers=new Headers();
  appendAdminAuthSetCookies(headers,context.setCookies);
  if(context.kind==="unauthenticated") throw redirect("/login",{headers});
  if(context.kind==="unavailable") return data({kind:"unavailable" as const,requestId:context.requestId},{status:503,headers});
  const groups=getPermittedGroups(context.permissions);
  return data({
    kind:"authenticated" as const,
    actor:context.actor,
    scopes:context.scopes,
    groups
  },{headers});
}

export default function AuthenticatedAdminLayout(){
  const state=useLoaderData<typeof loader>();
  if(state.kind==="unavailable"){
    return (
      <main className="auth-state-page" id="admin-main">
        <AdminSurfaceState
          kind="error"
          title="بررسی دسترسی مدیریت فعلاً ممکن نیست"
          description="برای جلوگیری از نمایش مقصدهای مدیریتی با اطلاعات قدیمی، دسترسی تا تأیید دوباره نشست و مجوزها متوقف شده است."
          requestId={state.requestId}
          action={{href:"/",label:"تلاش دوباره"}}
        />
      </main>
    );
  }
  return <AdminShell actor={state.actor} scopes={state.scopes} groups={state.groups}/>;
}
