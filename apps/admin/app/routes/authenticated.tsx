import { data, redirect, useLoaderData } from "react-router";
import { AdminShell } from "../shell/AdminShell";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server";
import { probeAdminSession } from "../platform/auth/session.server";

export async function loader({request}:{request:Request}){
  const probe=await probeAdminSession(request);
  const headers=new Headers();
  appendAdminAuthSetCookies(headers,probe.setCookies);
  if(probe.kind==="unauthenticated") throw redirect("/login",{headers});
  if(probe.kind==="unavailable") return data({kind:"unavailable" as const,requestId:probe.requestId},{status:503,headers});
  return data({kind:"authenticated" as const,actor:probe.actor},{headers});
}

export default function AuthenticatedAdminLayout(){
  const state=useLoaderData<typeof loader>();
  if(state.kind==="unavailable"){
    return (
      <main className="auth-state-page" id="admin-main">
        <section className="auth-state-card" role="status" aria-labelledby="auth-unavailable-title">
          <p className="auth-kicker">پنل مدیریت</p>
          <h1 id="auth-unavailable-title">بررسی نشست فعلاً ممکن نیست</h1>
          <p>برای جلوگیری از نمایش اطلاعات مدیریتی، دسترسی تا تأیید دوباره نشست متوقف شده است.</p>
          {state.requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{state.requestId}</bdi></p> : null}
          <a className="auth-secondary-link" href="/">تلاش دوباره</a>
        </section>
      </main>
    );
  }
  return <AdminShell actor={state.actor}/>;
}
