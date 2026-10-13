import { data, redirect, useLoaderData } from "react-router";
import { AdminShell } from "../shell/AdminShell";
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
        <section className="auth-state-card" role="status" aria-labelledby="auth-unavailable-title">
          <p className="auth-kicker">پنل مدیریت</p>
          <h1 id="auth-unavailable-title">بررسی دسترسی مدیریت فعلاً ممکن نیست</h1>
          <p>برای جلوگیری از نمایش مقصدهای مدیریتی با اطلاعات قدیمی، دسترسی تا تأیید دوباره نشست و مجوزها متوقف شده است.</p>
          {state.requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{state.requestId}</bdi></p> : null}
          <a className="auth-secondary-link" href="/">تلاش دوباره</a>
        </section>
      </main>
    );
  }
  return <AdminShell actor={state.actor} scopes={state.scopes} groups={state.groups}/>;
}
