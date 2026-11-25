import {data,redirect,useFetcher,useLoaderData,Link} from "react-router";
import {appendAdminAuthSetCookies} from "../platform/auth/admin-cookie.server.js";
import {readAdminAuthorizationContext} from "../platform/auth/context.server.js";
import {isTrustedOperationsFormOrigin,operationsUuid,operationsText} from "../operations/operations-form.server.js";
import {captureOffline,syncOffline,listFailedOffline,inspectOffline,validateOfflineBody,type OfflineResult} from "../operations/pos-offline.server.js";
import {AdminSurfaceState} from "../platform/state/AdminSurfaceState.js";
const headersFor=(cookies:readonly string[])=>{const h=new Headers();appendAdminAuthSetCookies(h,cookies);return h;};
type Feedback={kind:"confirmed"|"unknown"|"failure"|"conflict";message:string;requestId:string|null;key:string|null;commandId?:string;status?:string};
const failed=(message:string,status=422)=>data<Feedback>({kind:"failure",message,requestId:null,key:null},{status});
export async function loader({request}:{request:Request}){
  const auth=await readAdminAuthorizationContext(request),headers=headersFor(auth.setCookies);
  if(auth.kind==="unauthenticated")throw redirect("/login",{headers});
  if(auth.kind==="unavailable")return data({kind:"unavailable" as const,requestId:auth.requestId,canSell:false,canReconcile:false,commands:[],command:null,warehouses:[] as string[]},{status:503,headers});
  const canSell=auth.permissions.includes("pos.sell"),canReconcile=auth.permissions.includes("pos.reconcile");
  if(!canSell&&!canReconcile)return data({kind:"denied" as const,requestId:null,canSell,canReconcile,commands:[],command:null,warehouses:[] as string[]},{status:403,headers});
  const warehouses=auth.scopes.filter(x=>x.type==="warehouse").map(x=>x.id);
  const inspection=new URL(request.url).searchParams.get("inspect");
  if(inspection!==null&&!canReconcile)return data({kind:"denied" as const,requestId:null,canSell,canReconcile,commands:[],command:null,warehouses},{status:403,headers});
  const result=canReconcile?(inspection!==null?await inspectOffline(request,inspection):await listFailedOffline(request,50)):null;
  if(result)appendAdminAuthSetCookies(headers,result.setCookies);
  if(result&&result.kind!=="ready")return data({kind:result.kind==="denied"?"denied" as const:"unavailable" as const,requestId:result.requestId,canSell,canReconcile,commands:[],command:null,warehouses},{status:result.kind==="denied"?403:503,headers});
  return data({kind:"ready" as const,requestId:result?.requestId??null,canSell,canReconcile,commands:result?.commands??[],command:result?.command??null,warehouses},{headers});
}
export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedOperationsFormOrigin(request))return failed("درخواست از مبدأ معتبر نیست.",403);
  const auth=await readAdminAuthorizationContext(request);
  if(auth.kind!=="authorized"||!auth.permissions.includes("pos.sell"))return data<Feedback>({kind:"failure",message:"مجوز pos.sell برای این عملیات موجود نیست.",requestId:null,key:null},{status:auth.kind==="unavailable"?503:403,headers:headersFor(auth.setCookies)});
  const form=await request.formData(),intent=form.get("intent");
  let result:OfflineResult;
  if(intent==="capture"){
    const warehouse=operationsUuid(form.get("warehouse_id"));
    if(!warehouse||!auth.scopes.some(x=>x.type==="warehouse"&&x.id.toLowerCase()===warehouse.toLowerCase()))return failed("انبار خارج از محدوده مجاز کاربر است.",403);
    const source=form.get("lines");
    if(typeof source!=="string"||source.length>16000)return failed("فهرست اقلام نامعتبر یا بیش از حد بزرگ است.");
    let lines:unknown;try{lines=JSON.parse(source);}catch{return failed("ساختار JSON اقلام نامعتبر است.");}
    const raw={warehouse_id:warehouse,customer_type:form.get("customer_type"),payment_method:form.get("payment_method"),lines,...(form.get("external_reference")?{external_reference:operationsText(form.get("external_reference"),120)}:{})};
    const v=validateOfflineBody(raw);
    if(!v.ok)return failed("اطلاعات فروش آفلاین معتبر نیست یا شامل فیلد اضافی است.");
    result=await captureOffline(request,v.body);
  }else if(intent==="sync"){
    const id=operationsUuid(form.get("client_command_id"));if(!id)return failed("شناسه فرمان معتبر نیست.");
    result=await syncOffline(request,id);
  }else return failed("عملیات ناشناخته یا حساس H2B مسدود است.",400);
  const headers=headersFor([...auth.setCookies,...result.setCookies]);
  if(result.kind==="confirmed")return data<Feedback>({kind:"confirmed",message:"پاسخ قطعی از سرور دریافت شد؛ تأیید پرداخت یا تحویل فقط بر اساس وضعیت معتبر Backend است.",requestId:result.requestId,key:result.key,commandId:result.command?.client_command_id,status:result.command?.status},{headers});
  if(result.kind==="unknown_outcome")return data<Feedback>({kind:"unknown",message:"نتیجه نامعلوم است؛ هیچ تلاش مجدد خودکاری انجام نشد. پیش از هر اقدام، وضعیت سرور را تطبیق دهید.",requestId:result.requestId,key:result.key},{status:503,headers});
  if(result.kind==="conflict")return data<Feedback>({kind:"conflict",message:"تعارض نسخه یا فرمان؛ بدون تطبیق مستقل تکرار نکنید.",requestId:result.requestId,key:result.key},{status:409,headers});
  return data<Feedback>({kind:"failure",message:"عملیات به تأیید قطعی سرور نرسید؛ وضعیت را از مسیر معتبر بررسی کنید.",requestId:result.requestId,key:result.key},{status:result.kind==="denied"?403:result.kind==="not_found"?404:result.kind==="invalid"?422:503,headers});
}
export default function PosOfflineRoute(){
  const state=useLoaderData<typeof loader>(),fetcher=useFetcher<typeof action>(),busy=fetcher.state!=="idle";
  return <section className="pricing-page" dir="rtl" aria-labelledby="pos-offline-title">
    <nav className="admin-breadcrumb"><Link to="/">مدیریت</Link><span>/</span><Link to="/pos/sales">فروش حضوری</Link><span>/</span><span>فرمان آفلاین</span></nav>
    <header className="pricing-heading"><p className="destination-kicker">Step 70-H2A · AD-E-11</p><h1 id="pos-offline-title">فرمان‌های آفلاین و بررسی مغایرت POS</h1>
      <p>ثبت فرمان فقط با اتصال به سرور انجام می‌شود؛ این صفحه صف محلی بدون اینترنت ایجاد نمی‌کند. عملیات حساس بازیابی H2B هنوز فعال نیستند.</p></header>
    {state.kind==="denied"?<AdminSurfaceState kind="denied"/>:state.kind==="unavailable"?<AdminSurfaceState kind="error" requestId={state.requestId}/>:null}
    {state.kind==="ready"&&state.canSell?<section aria-labelledby="offline-capture-title"><h2 id="offline-capture-title">ثبت فرمان فروش برای همگام‌سازی</h2>
      {state.warehouses.length===0?<p role="alert">انبار مجاز ندارید؛ امکان ثبت فرمان غیرفعال است.</p>:null}
      <fetcher.Form method="post" className="pricing-actions">
        <input type="hidden" name="intent" value="capture"/>
        <label>انبار مجاز <select name="warehouse_id" required>{state.warehouses.map(id=><option key={id} value={id}>{id}</option>)}</select></label>
        <label>نوع مشتری <select name="customer_type"><option value="retail">خرده‌فروشی</option><option value="wholesale">عمده</option></select></label>
        <label>پرداخت <select name="payment_method"><option value="cash">نقدی</option><option value="card">کارت</option></select></label>
        <label>مرجع پرداخت اختیاری <input name="external_reference" maxLength={120}/></label>
        <label>اقلام (JSON؛ ۱ تا ۱۰۰ ردیف، هر ردیف دارای variant_id و quantity)
          <textarea name="lines" rows={4} maxLength={16000} required placeholder='[{"variant_id":"UUID","quantity":1}]'/></label>
        <button type="submit" disabled={busy||state.warehouses.length===0}>ثبت فرمان در سرور</button>
      </fetcher.Form>
      <h2>همگام‌سازی دستی فرمان موجود</h2>
      <p>فقط پس از تأیید وضعیت ثبت در Backend اقدام کنید؛ هیچ تکرار خودکاری وجود ندارد.</p>
      <fetcher.Form method="post" className="pricing-actions">
        <input type="hidden" name="intent" value="sync"/>
        <label>شناسه client_command_id <input name="client_command_id" required placeholder="UUID"/></label>
        <button type="submit" disabled={busy}>همگام‌سازی صریح</button>
      </fetcher.Form>
    </section>:null}
    {state.kind==="ready"&&state.canReconcile?<section aria-labelledby="offline-failed-title"><h2 id="offline-failed-title">بررسی فرمان‌های ناموفق</h2>
      <p>فهرست فقط ۵۰ رکورد ناموفق را نمایش می‌دهد. اطلاعات محرمانه payload در این صفحه نمایش داده نمی‌شوند.</p>
      <ul>{state.commands.map(c=><li key={c.client_command_id}><Link to={"/pos/offline?inspect="+encodeURIComponent(c.client_command_id)}><bdi>{c.client_command_id}</bdi></Link> · {c.status} · دفعات بازیابی {c.recovery_count}</li>)}</ul>
      {state.command?<p role="status">فرمان <bdi>{state.command.client_command_id}</bdi> · وضعیت {state.command.status} · کد خطا {state.command.error_code??"ندارد"} · دفعات بازیابی {state.command.recovery_count}</p>:null}
      <p>تلاش مجدد مدیریتی و کنارگذاری تنها پس از توسعه مستقل H2B با WebAuthn فعال خواهند شد.</p>
    </section>:null}
    {fetcher.data?<section role="status" aria-live="polite"><h2>نتیجه عملیات</h2><p>{fetcher.data.message}</p>{fetcher.data.commandId?<p>شناسه فرمان: <bdi>{fetcher.data.commandId}</bdi></p>:null}{fetcher.data.key?<p>کلید پیگیری: <bdi>{fetcher.data.key}</bdi></p>:null}{fetcher.data.requestId?<p>شناسه درخواست: <bdi>{fetcher.data.requestId}</bdi></p>:null}</section>:null}
  </section>;
}
