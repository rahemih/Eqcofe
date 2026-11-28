import { data, Link, redirect, useFetcher, useLoaderData, useNavigation } from "react-router";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { readAdminAuthorizationContext } from "../platform/auth/context.server.js";
import { isTrustedOperationsFormOrigin, operationsUuid } from "../operations/operations-form.server.js";
import { capturePosOffline, syncPosOffline, validateOfflineCapture, type OfflineMutation } from "../operations/pos-offline.server.js";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";

type Result={kind:"confirmed"|"unknown"|"failure"|"conflict";message:string;requestId:string|null;key?:string|null;command?:{client_command_id:string;status:string;recovery_count:number;error_code:string|null}};
const withCookies=(values:readonly string[])=>{const h=new Headers();appendAdminAuthSetCookies(h,values);return h;};
const fail=(message:string,status=422)=>data<Result>({kind:"failure",message,requestId:null},{status});
export async function loader({request}:{request:Request}){
 const auth=await readAdminAuthorizationContext(request),headers=withCookies(auth.setCookies);
 if(auth.kind==="unauthenticated")throw redirect("/login",{headers});
 if(auth.kind==="unavailable")return data({kind:"unavailable" as const,requestId:auth.requestId},{status:503,headers});
 if(!auth.permissions.includes("pos.sell"))return data({kind:"denied" as const,requestId:null},{status:403,headers});
 return data({kind:"ready" as const,requestId:null},{headers});
}
export async function action({request}:{request:Request}){
 if(request.method!=="POST"||!isTrustedOperationsFormOrigin(request))return fail("درخواست POST از مبدأ نامعتبر مسدود شد.",403);
 const auth=await readAdminAuthorizationContext(request);
 if(auth.kind!=="authorized"||!auth.permissions.includes("pos.sell"))return data<Result>({kind:"failure",message:"دسترسی pos.sell تأیید نشد.",requestId:null},{status:auth.kind==="unavailable"?503:403,headers:withCookies(auth.setCookies)});
 const form=await request.formData(),intent=form.get("intent");
 let result:OfflineMutation;
 if(intent==="capture"){
  const raw=form.get("payload_json");
  if(typeof raw!=="string"||raw.length>14000)return fail("حجم payload نامعتبر است.");
  let payload:unknown;
  try{payload=JSON.parse(raw);}catch{return fail("فرمت JSON معتبر نیست.");}
  const checked=validateOfflineCapture(payload);
  if(!checked.ok)return fail(checked.reason);
  result=await capturePosOffline(request,checked.body);
 }else if(intent==="sync"){
  const clientCommandId=operationsUuid(form.get("client_command_id"));
  if(!clientCommandId)return fail("شناسه فرمان معتبر نیست.");
  result=await syncPosOffline(request,clientCommandId);
 }else return fail("عملیات ناشناخته POS مسدود شد.",400);
 const headers=withCookies([...auth.setCookies,...result.setCookies]);
 if(result.kind==="confirmed"){
  const command=result.command;
  const message=command.status==="applied"?"همگام‌سازی با تأیید سرور اعمال شد.":command.status==="queued"?"فرمان در صف معتبر سرور است؛ هنوز فروش قطعی نیست.":command.status==="failed"?"فرمان در سرور ناموفق است؛ فقط reconciliation مجاز است.":"فرمان توسط سرور کنار گذاشته شده است.";
  return data<Result>({kind:"confirmed",message,command,requestId:result.requestId,key:result.idempotencyKey},{headers});
 }
 if(result.kind==="unknown_outcome")return data<Result>({kind:"unknown",message:"نتیجه این فرمان نامعلوم است. هیچ retry خودکاری انجام نشد؛ وضعیت را از منبع معتبر تطبیق دهید.",requestId:result.requestId,key:result.idempotencyKey},{status:503,headers});
 if(result.kind==="conflict")return data<Result>({kind:"conflict",message:"تعارض فرمان؛ بدون بازخوانی وضعیت معتبر تکرار نکنید.",requestId:result.requestId},{status:409,headers});
 return data<Result>({kind:"failure",message:result.kind==="invalid"?"ورودی فرمان معتبر نیست.":result.kind==="denied"?"دسترسی مجاز نیست.":result.kind==="not_found"?"فرمان یافت نشد.":"سرویس قابل اتکا نیست.",requestId:result.requestId},{status:result.kind==="invalid"?422:result.kind==="denied"?403:result.kind==="not_found"?404:503,headers});
}
export default function PosOfflineRoute(){
 const state=useLoaderData<typeof loader>(),fetcher=useFetcher<typeof action>(),navigation=useNavigation();
 const busy=fetcher.state!=="idle"||navigation.state!=="idle";
 return <section dir="rtl" className="pricing-page" aria-labelledby="pos-offline-title">
  <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><Link to="/">مدیریت</Link><span>/</span><Link to="/pos/sales">فروش حضوری</Link><span>/</span><span>فرمان‌های آفلاین</span></nav>
  <header className="pricing-heading"><p className="destination-kicker">Step 70-H2A · AD-E-11</p><h1 id="pos-offline-title">ثبت و همگام‌سازی فروش آفلاین</h1>
   <p>این صفحه فرمان را مستقیماً به سرور ارسال می‌کند؛ فروش آفلاینِ ذخیره‌شده روی مرورگر یا تضمین موجودی محلی ایجاد نمی‌کند. اعتبار قیمت و انبار با Backend است.</p></header>
  {state.kind==="denied"?<AdminSurfaceState kind="denied"/>:state.kind==="unavailable"?<AdminSurfaceState kind="error" requestId={state.requestId}/>:null}
  {state.kind==="ready"?<>
   <section aria-labelledby="capture-title"><h2 id="capture-title">ثبت فرمان sale.sync</h2>
    <p>انبار و اقلام باید قبلاً از مرجع معتبر دریافت شده باشند. هر کلیک یک فرمان تازه تولید می‌کند؛ در صورت نامعلوم بودن نتیجه، مجدداً ثبت نکنید.</p>
    <fetcher.Form method="post" className="pricing-actions"><input type="hidden" name="intent" value="capture"/>
     <label>Payload ساختاریافته JSON
      <textarea name="payload_json" required rows={9} maxLength={14000} defaultValue={JSON.stringify({warehouse_id:"",customer_type:"retail",payment_method:"cash",external_reference:null,lines:[{variant_id:"",quantity:1}]},null,2)}/>
     </label><button type="submit" disabled={busy}>ثبت یک فرمان در سرور</button>
    </fetcher.Form>
   </section>
   <section aria-labelledby="sync-title"><h2 id="sync-title">همگام‌سازی یک فرمان ثبت‌شده</h2>
    <p>فقط برای شناسه فرمان دارای پاسخ معتبر سرور استفاده کنید. اگر نتیجه قبلی نامعلوم است، ابتدا در بخش مغایرت‌ها بررسی کنید.</p>
    <fetcher.Form method="post" className="pricing-actions"><input type="hidden" name="intent" value="sync"/>
     <label>شناسه فرمان آفلاین <input name="client_command_id" required placeholder="UUID"/></label><button type="submit" disabled={busy}>همگام‌سازی با سرور</button>
    </fetcher.Form>
   </section>
  </>:null}
  {fetcher.data?<section aria-label="نتیجه سرور" aria-live="polite" role="status"><h2>نتیجه</h2><p>{fetcher.data.message}</p>
   {fetcher.data.command?<p>شناسه فرمان: <bdi>{fetcher.data.command.client_command_id}</bdi> · وضعیت: <bdi>{fetcher.data.command.status}</bdi> · تلاش‌های بازیابی: {fetcher.data.command.recovery_count}</p>:null}
   {fetcher.data.key?<p>شناسه پیگیری سرور: <bdi>{fetcher.data.key}</bdi></p>:null}
   {fetcher.data.requestId?<p>شناسه درخواست: <bdi>{fetcher.data.requestId}</bdi></p>:null}
  </section>:null}
  <p>بررسی خطا، retry و abandon مستلزم مجوز pos.reconcile و احراز مجدد WebAuthn هستند و در بسته مستقل H2B انجام می‌شوند. هیچ retry خودکاری مجاز نیست.</p>
 </section>;
}
