import type { ReactNode } from "react";
import { data, redirect, useLoaderData } from "react-router";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server";
import { readAdminAuthorizationContext } from "../platform/auth/context.server";
import { findPermittedDestination, getAdminGroupLabel } from "../navigation/destination-policy";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState";
import {
  isStep69FoundationSurface,
  readStep69Foundation,
  type Step69FoundationRead,
} from "../pricing/pricing-foundation.server";
import {
  isStep70FoundationSurface,
  readStep70Foundation,
} from "../operations/step70-foundation.server";

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

  const destinationView={surface:destination.surface,label:destination.label,groupLabel};
  if(isStep69FoundationSurface(destination.surface)){
    const foundation=await readStep69Foundation(request,destination.surface);
    appendAdminAuthSetCookies(headers,foundation.setCookies);

    if(foundation.kind==="denied"){
      return data({kind:"denied" as const},{status:403,headers});
    }
    if(foundation.kind==="unavailable"){
      return data({
        kind:"step69-unavailable" as const,
        destination:destinationView,
        requestId:foundation.requestId,
      },{status:503,headers});
    }
    if(foundation.kind==="action_only"){
      return data({
        kind:"step69-action-only" as const,
        destination:destinationView,
        reason:foundation.reason,
      },{headers});
    }
    return data({
      kind:"step69-ready" as const,
      destination:destinationView,
      summary:summarizeStep69Read(foundation),
      requestId:foundation.requestId,
    },{headers});
  }

  if(isStep70FoundationSurface(destination.surface)){
    const foundation=await readStep70Foundation(request,destination.surface);
    appendAdminAuthSetCookies(headers,foundation.setCookies);

    if(foundation.kind==="denied"){
      return data({kind:"denied" as const},{status:403,headers});
    }
    if(foundation.kind==="unavailable"){
      return data({
        kind:"step70-unavailable" as const,
        destination:destinationView,
        requestId:foundation.requestId,
      },{status:503,headers});
    }
    if(foundation.kind==="boundary"){
      return data({
        kind:"step70-boundary" as const,
        destination:destinationView,
        reason:foundation.reason,
      },{headers});
    }
    return data({
      kind:"step70-ready" as const,
      destination:destinationView,
      endpoint:foundation.endpoint,
      status:foundation.status,
      requestId:foundation.requestId,
    },{headers});
  }

  return data({
    kind:"authorized" as const,
    destination:destinationView
  },{headers});
}

export default function AdminDestinationRoute(){
  const state=useLoaderData<typeof loader>();
  if(state.kind==="unavailable"){
    return (
      <AdminSurfaceState
        kind="error"
        title="بررسی دسترسی فعلاً ممکن نیست"
        description="تا زمانی که مجوزها و دامنهٔ نشست دوباره از سرور تأیید نشوند، این مقصد نمایش داده نمی‌شود."
        requestId={state.requestId}
        action={{href:"/",label:"بازخوانی وضعیت"}}
      />
    );
  }
  if(state.kind==="denied"){
    return (
      <AdminSurfaceState
        kind="denied"
        description="برای حفظ حریم اطلاعات مدیریتی، دربارهٔ وجود یا جزئیات مقصد اطلاعات بیشتری نمایش داده نمی‌شود."
        action={{href:"/",label:"بازگشت به نمای کلی"}}
      />
    );
  }
  if(state.kind==="step69-unavailable"){
    return (
      <Step69FoundationFrame destination={state.destination}>
        <AdminSurfaceState
          kind="error"
          title="خواندن وضعیت معتبر این بخش ممکن نشد"
          description="دادهٔ قدیمی یا حدسی جایگزین پاسخ معتبر سرور نمی‌شود. پس از رفع خطا، وضعیت را دوباره از مرجع بخوانید."
          requestId={state.requestId}
          action={{href:"/destinations/"+encodeURIComponent(state.destination.surface),label:"خواندن دوباره"}}
        />
      </Step69FoundationFrame>
    );
  }
  if(state.kind==="step69-action-only"){
    return (
      <Step69FoundationFrame destination={state.destination}>
        <AdminSurfaceState
          kind="unavailable"
          title="خواندن مستقل برای این مقصد تعریف نشده است"
          description={state.reason}
        />
      </Step69FoundationFrame>
    );
  }
  if(state.kind==="step69-ready"){
    return (
      <Step69FoundationFrame destination={state.destination}>
        <section className="destination-reference" aria-labelledby="step69-read-title">
          <p className="destination-kicker">خواندن معتبر مرحله 69-C</p>
          <h2 id="step69-read-title">مرجع سرور با موفقیت خوانده شد</h2>
          <p>{state.summary}</p>
          {state.requestId?<p className="admin-state-request">شناسه پیگیری: <bdi>{state.requestId}</bdi></p>:null}
          <p>در این مرحله هیچ کنترل ایجاد، ویرایش، اعمال، بازیابی یا تکرار خودکار عملیات نمایش داده نمی‌شود.</p>
        </section>
      </Step69FoundationFrame>
    );
  }
  if(state.kind==="step70-unavailable"){
    return (
      <Step70FoundationFrame destination={state.destination}>
        <AdminSurfaceState
          kind="error"
          title="خواندن وضعیت معتبر این بخش ممکن نشد"
          description="دادهٔ قدیمی یا حدسی جایگزین پاسخ معتبر سرور نمی‌شود. پس از رفع خطا، وضعیت را دوباره از مرجع بخوانید."
          requestId={state.requestId}
          action={{href:"/destinations/"+encodeURIComponent(state.destination.surface),label:"خواندن دوباره"}}
        />
      </Step70FoundationFrame>
    );
  }
  if(state.kind==="step70-boundary"){
    return (
      <Step70FoundationFrame destination={state.destination}>
        <AdminSurfaceState
          kind="unavailable"
          title="مرز منبع‌اثبات‌شدهٔ این مقصد"
          description={state.reason}
        />
      </Step70FoundationFrame>
    );
  }
  if(state.kind==="step70-ready"){
    return (
      <Step70FoundationFrame destination={state.destination}>
        <section className="destination-reference" aria-labelledby="step70-read-title">
          <p className="destination-kicker">خواندن معتبر مرحله 70-C</p>
          <h2 id="step70-read-title">مرجع سرور با موفقیت خوانده شد</h2>
          <p>پاسخ منبع‌اثبات‌شده از <bdi>{state.endpoint}</bdi> با وضعیت <bdi>{state.status}</bdi> دریافت شد.</p>
          {state.requestId?<p className="admin-state-request">شناسه پیگیری: <bdi>{state.requestId}</bdi></p>:null}
          <p>این پاسخ فقط بنیاد خواندن و وضعیت است؛ هیچ کنترل تغییردهنده‌ای در 70-C فعال نیست.</p>
        </section>
      </Step70FoundationFrame>
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

function Step69FoundationFrame({
  destination,
  children,
}:{
  destination:{surface:string;label:string;groupLabel:string};
  children:ReactNode;
}){
  return (
    <section className="destination-handoff" aria-labelledby="destination-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <a href="/">مدیریت</a>
        <span aria-hidden="true">/</span>
        <span>{destination.groupLabel}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{destination.label}</span>
      </nav>
      <p className="destination-kicker">بنیاد خواندن امن قیمت، ارز و اکسل</p>
      <h1 id="destination-title">{destination.label}</h1>
      <p>این نمای مرحله 69-C فقط وضعیت منبع‌اثبات‌شده را می‌خواند و هیچ اختیار تغییردهنده‌ای ایجاد نمی‌کند.</p>
      {children}
      <a className="auth-secondary-link" href="/">بازگشت به نمای کلی</a>
    </section>
  );
}

function summarizeStep69Read(read:Extract<Step69FoundationRead,{kind:"ready"}>):string{
  if(read.surface==="AD-D-01"){
    return `${read.records.length} رکورد قیمت پایه در پاسخ فعلی دریافت شد؛ این عدد به‌عنوان شمارش کل کاتالوگ تفسیر نمی‌شود.`;
  }
  if(read.surface==="AD-D-02"){
    return `${read.records.length} قاعدهٔ قیمت‌گذاری در پاسخ فعلی دریافت شد.`;
  }
  if(read.surface==="AD-D-04"){
    return `${read.records.length} مشاهدهٔ نرخ ارز در پاسخ فعلی دریافت شد؛ نرخ منتخب فعلی ${read.current?"وجود دارد":"ثبت نشده است"}.`;
  }
  if(read.surface==="AD-D-05"){
    return `${read.records.length} قاعدهٔ وابسته به ارز در پاسخ فعلی دریافت شد.`;
  }
  return "قالب مرجع اکسل از endpoint خواندن canonical دریافت شد؛ بارگذاری و اعمال فایل در مرحله 69-G باقی می‌ماند.";
}


function Step70FoundationFrame({
  destination,
  children,
}:{
  destination:{surface:string;label:string;groupLabel:string};
  children:ReactNode;
}){
  return (
    <section className="destination-handoff" aria-labelledby="destination-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <a href="/">مدیریت</a>
        <span aria-hidden="true">/</span>
        <span>{destination.groupLabel}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{destination.label}</span>
      </nav>
      <p className="destination-kicker">بنیاد امن موجودی، تأمین و فروش حضوری</p>
      <h1 id="destination-title">{destination.label}</h1>
      <p>مرحلهٔ 70-C فقط خواندن و وضعیت منبع‌اثبات‌شده را فعال می‌کند؛ اختیارهای تغییردهنده در مراحل 70-D تا 70-H باقی می‌مانند.</p>
      {children}
      <a className="auth-secondary-link" href="/">بازگشت به نمای کلی</a>
    </section>
  );
}
