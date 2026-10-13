import { data, redirect, useLoaderData } from "react-router";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server";
import { readAdminAuthorizationContext } from "../platform/auth/context.server";
import { findPermittedDestination, getAdminGroupLabel } from "../navigation/destination-policy";

export async function loader({request,params}:{request:Request;params:{surfaceId?:string}}){
  const context=await readAdminAuthorizationContext(request);
  const headers=new Headers();
  appendAdminAuthSetCookies(headers,context.setCookies);
  if(context.kind==="unauthenticated") throw redirect("/login",{headers});
  if(context.kind==="unavailable"){
    return data({kind:"unavailable" as const,requestId:context.requestId},{status:503,headers});
  }

  const destination=findPermittedDestination(params.surfaceId??"",context.permissions);
  if(!destination){
    return data({kind:"denied" as const},{status:403,headers});
  }
  const groupLabel=getAdminGroupLabel(destination.group);
  if(!groupLabel)return data({kind:"denied" as const},{status:403,headers});

  return data({
    kind:"authorized" as const,
    destination:{surface:destination.surface,label:destination.label,groupLabel}
  },{headers});
}

export default function AdminDestinationRoute(){
  const state=useLoaderData<typeof loader>();
  if(state.kind==="unavailable"){
    return (
      <section className="destination-state" role="status" aria-labelledby="destination-unavailable-title">
        <p className="destination-kicker">مسیر مدیریت</p>
        <h1 id="destination-unavailable-title">بررسی دسترسی فعلاً ممکن نیست</h1>
        <p>تا زمانی که مجوزها و دامنهٔ نشست دوباره از سرور تأیید نشوند، این مقصد نمایش داده نمی‌شود.</p>
        {state.requestId?<p className="auth-request-id">شناسه پیگیری: <bdi>{state.requestId}</bdi></p>:null}
      </section>
    );
  }
  if(state.kind==="denied"){
    return (
      <section className="destination-state destination-denied" role="status" aria-labelledby="destination-denied-title">
        <p className="destination-kicker">مسیر مدیریت</p>
        <h1 id="destination-denied-title">این مقصد در زمینهٔ فعلی در دسترس نیست</h1>
        <p>برای حفظ حریم اطلاعات مدیریتی، دربارهٔ وجود یا جزئیات مقصد اطلاعات بیشتری نمایش داده نمی‌شود.</p>
        <a className="auth-secondary-link" href="/">بازگشت به نمای کلی</a>
      </section>
    );
  }

  return (
    <section className="destination-handoff" aria-labelledby="destination-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <a href="/">مدیریت</a>
        <span aria-hidden="true">/</span>
        <span>{state.destination.groupLabel}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{state.destination.label}</span>
      </nav>
      <p className="destination-kicker">ارجاع امن مقصد</p>
      <h1 id="destination-title">{state.destination.label}</h1>
      <p>این صفحه فقط مقصد مجاز را در پوستهٔ مدیریت مشخص می‌کند. فضای کاری و عملیات دامنه‌ای آن در قدم مربوط به همان دامنه پیاده‌سازی می‌شود.</p>
      <dl className="destination-reference">
        <div><dt>شناسهٔ طراحی</dt><dd><bdi>{state.destination.surface}</bdi></dd></div>
        <div><dt>وضعیت</dt><dd>فقط ناوبری و ارجاع؛ بدون داده یا عملیات دامنه‌ای</dd></div>
      </dl>
      <a className="auth-secondary-link" href="/">بازگشت به نمای کلی</a>
    </section>
  );
}
