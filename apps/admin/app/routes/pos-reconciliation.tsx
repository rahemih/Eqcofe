import { useEffect, useRef, useState } from "react";
import { data, Link, redirect, useFetcher, useLoaderData, useNavigation, useRevalidator } from "react-router";
import type { ApiComponents } from "../platform/api/contract.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { readAdminAuthorizationContext } from "../platform/auth/context.server.js";
import { createAdminStepUpChallenge, verifyAdminStepUp } from "../platform/auth/step-up-credentials.server.js";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client.js";
import { isTrustedOperationsFormOrigin, operationsInteger, operationsUuid } from "../operations/operations-form.server.js";
import { inspectReconciliationCommand, listFailedReconciliationCommands, recoverReconciliationCommand, validateReconciliationNote, type CommandView, type HistoryView, type MutationResult } from "../operations/pos-reconciliation.server.js";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";
import { ActionReviewDialog } from "../security/ActionReviewDialog.js";

type StepUpBody=ApiComponents["schemas"]["PostAdminAuthStepUpVerifyRequest"];
type ActionData=
 |{kind:"challenge";mode:"retry"|"abandon";commandId:string;note:string|null;challengeId:string;options:Record<string,unknown>}
 |{kind:"confirmed"|"unknown"|"failure"|"conflict";message:string;requestId:string|null;key?:string|null;command?:CommandView;requiresOwnerSync?:boolean};
type RecoveryIntent={mode:"retry"|"abandon";commandId:string;note:string};
const cookieHeaders=(values:readonly string[])=>{const headers=new Headers();appendAdminAuthSetCookies(headers,values);return headers;};
function denied(message:string,status=403,cookies:readonly string[]=[]){return data<ActionData>({kind:"failure",message,requestId:null},{status,headers:cookieHeaders(cookies)});}
function outcome(result:MutationResult,cookies:readonly string[]){
 const headers=cookieHeaders([...cookies,...result.setCookies]);
 if(result.kind==="confirmed")return data<ActionData>({kind:"confirmed",message:result.requiresOwnerSync?"بازگشایی با تأیید سرور ثبت شد؛ همگام‌سازی فقط توسط مالک اولیه فرمان مجاز است.":"کنارگذاری با تأیید سرور ثبت شد.",requestId:result.requestId,key:result.key,command:result.command,requiresOwnerSync:result.requiresOwnerSync},{headers});
 if(result.kind==="unknown_outcome")return data<ActionData>({kind:"unknown",message:"نتیجه نامعلوم است؛ درخواست را تکرار نکنید. پیش از اقدام جدید وضعیت معتبر فرمان را بازخوانی کنید.",requestId:result.requestId,key:result.key},{status:503,headers});
 if(result.kind==="conflict")return data<ActionData>({kind:"conflict",message:"وضعیت فرمان تغییر کرده است؛ ابتدا سوابق را دوباره بررسی کنید.",requestId:result.requestId},{status:409,headers});
 const message=result.kind==="denied"||result.kind==="step_up_required"?"مجوز pos.reconcile یا احراز مجدد معتبر نیست.":result.kind==="not_found"?"فرمان پیدا نشد.":result.kind==="invalid"?"ورودی معتبر نیست.":"سرویس قابل اعتماد نیست.";
 return data<ActionData>({kind:"failure",message,requestId:result.requestId},{status:result.kind==="denied"||result.kind==="step_up_required"?403:result.kind==="not_found"?404:result.kind==="invalid"?422:503,headers});
}
export async function loader({request}:{request:Request}){
 const auth=await readAdminAuthorizationContext(request),headers=cookieHeaders(auth.setCookies);
 if(auth.kind==="unauthenticated")throw redirect("/login",{headers});
 if(auth.kind==="unavailable")return data({kind:"unavailable" as const,requestId:auth.requestId},{status:503,headers});
 if(!auth.permissions.includes("pos.reconcile"))return data({kind:"denied" as const,requestId:null},{status:403,headers});
 const params=new URL(request.url).searchParams,rawLimit=params.get("limit"),rawId=params.get("command_id");
 const limit=rawLimit===null?25:operationsInteger(rawLimit),commandId=rawId===null?null:operationsUuid(rawId);
 if(limit===null||limit<1||limit>100||(rawId!==null&&!commandId))return data({kind:"invalid" as const,requestId:null},{status:400,headers});
 const list=await listFailedReconciliationCommands(request,limit);
 appendAdminAuthSetCookies(headers,list.setCookies);
 if(list.kind!=="ready")return data({kind:list.kind==="denied"?"denied" as const:list.kind==="invalid"?"invalid" as const:"unavailable" as const,requestId:list.requestId},{status:list.kind==="denied"?403:list.kind==="invalid"?400:503,headers});
 let selected:CommandView|null=null,history:HistoryView[]|null=null;
 if(commandId){
  const detail=await inspectReconciliationCommand(request,commandId);
  appendAdminAuthSetCookies(headers,detail.setCookies);
  if(detail.kind!=="ready")return data({kind:detail.kind==="not_found"?"not_found" as const:detail.kind==="denied"?"denied" as const:"unavailable" as const,requestId:detail.requestId},{status:detail.kind==="not_found"?404:detail.kind==="denied"?403:503,headers});
  selected=detail.value.command;history=detail.value.history;
 }
 return data({kind:"ready" as const,failed:list.value,selected,history,limit,requestId:null},{headers});
}
export async function action({request}:{request:Request}){
 if(request.method!=="POST"||!isTrustedOperationsFormOrigin(request))return denied("درخواست از مبدأ نامعتبر مسدود شد.");
 const auth=await readAdminAuthorizationContext(request);
 if(auth.kind!=="authorized"||!auth.permissions.includes("pos.reconcile"))return denied("مجوز pos.reconcile یا نشست معتبر نیست.",auth.kind==="unavailable"?503:403,auth.setCookies);
 const form=await request.formData(),intent=form.get("intent"),commandId=operationsUuid(form.get("client_command_id"));
 if(!commandId)return denied("شناسه فرمان معتبر نیست.",422,auth.setCookies);
 if(!["begin-retry","begin-abandon","verify-retry","verify-abandon"].includes(String(intent)))return denied("عملیات ناشناخته مسدود شد.",400,auth.setCookies);
 const mode=String(intent).endsWith("retry")?"retry":"abandon",note=validateReconciliationNote(form.get("note"));
 if(!note.ok)return denied("یادداشت نامعتبر است؛ حد مجاز ۵۰۰ نویسه.",422,auth.setCookies);
 // Preflight must re-read the canonical state on BOTH challenge and verified mutation.
 const fresh=await inspectReconciliationCommand(request,commandId);
 const allCookies=[...auth.setCookies,...fresh.setCookies];
 if(fresh.kind!=="ready")return denied("وضعیت معتبر فرمان قابل خواندن نیست؛ اقدامی اجرا نشد.",503,allCookies);
 if(fresh.value.command.status!=="failed"||(mode==="retry"&&fresh.value.command.recoveryCount>=5))return denied("فقط فرمان ناموفق با ظرفیت بازیابی مجاز است.",409,allCookies);
 if(String(intent).startsWith("begin-")){
  const challenge=await createAdminStepUpChallenge(request);
  if(!challenge.ok)return denied("چالش WebAuthn معتبر دریافت نشد.",503,allCookies);
  return data<ActionData>({kind:"challenge",mode,commandId,note:typeof note.body.note==="string"?note.body.note:null,challengeId:challenge.challengeId,options:challenge.options},{headers:cookieHeaders(allCookies)});
 }
 const raw=form.get("credential");
 if(typeof raw!=="string"||raw.length<1||raw.length>40000)return denied("پاسخ WebAuthn معتبر نیست.",422,allCookies);
 let credential:unknown;
 try{credential=JSON.parse(raw);}catch{return denied("پاسخ WebAuthn معتبر نیست.",422,allCookies);}
 if(!credential||typeof credential!=="object"||Array.isArray(credential))return denied("پاسخ WebAuthn معتبر نیست.",422,allCookies);
 const verified=await verifyAdminStepUp(request,credential as StepUpBody);
 if(!verified.ok)return denied("احراز مجدد تأیید نشد؛ هیچ تغییری انجام نشد.",403,allCookies);
 // Step-up token must remain server-side. The backend also requires @RequireStepUp().
 return outcome(await recoverReconciliationCommand(request,commandId,mode,note.body,verified.token),allCookies);
}
export default function PosReconciliationRoute(){
 const state=useLoaderData<typeof loader>(),fetcher=useFetcher<typeof action>(),navigation=useNavigation(),revalidator=useRevalidator();
 const [review,setReview]=useState<RecoveryIntent|null>(null),[noteInput,setNoteInput]=useState(""),[clientError,setClientError]=useState<string|null>(null);
 const handled=useRef<string|null>(null),revalidated=useRef<string|null>(null);
 const busy=fetcher.state!=="idle"||navigation.state!=="idle";
 useEffect(()=>{
  const response=fetcher.data;
  if(!response)return;
  if(response.kind==="challenge"&&handled.current!==response.challengeId){
   handled.current=response.challengeId;
   void runAdminWebAuthn("authentication",response.challengeId,response.options).then(credential=>{
    const form=new FormData();form.set("intent",response.mode==="retry"?"verify-retry":"verify-abandon");
    form.set("client_command_id",response.commandId);form.set("note",response.note??"");form.set("credential",JSON.stringify(credential));
    fetcher.submit(form,{method:"post"});
   }).catch(()=>{handled.current=null;setClientError("WebAuthn لغو شد یا کلید امنیتی پاسخ نداد؛ فرمانی ارسال نشد.");});
  }else if(response.kind==="confirmed"&&response.key&&revalidated.current!==response.key){revalidated.current=response.key;void revalidator.revalidate();}
 },[fetcher.data,fetcher,revalidator]);
 const confirm=()=>{
  if(!review||busy)return;
  const form=new FormData();form.set("intent",review.mode==="retry"?"begin-retry":"begin-abandon");
  form.set("client_command_id",review.commandId);form.set("note",review.note);
  handled.current=null;setClientError(null);fetcher.submit(form,{method:"post"});setReview(null);
 };
 return <section dir="rtl" className="pricing-page" aria-labelledby="pos-reconciliation-title">
  <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><Link to="/">مدیریت</Link><span>/</span><Link to="/pos/offline">فرمان‌های آفلاین</Link><span>/</span><span>مدیریت مغایرت‌ها</span></nav>
  <header className="pricing-heading"><p className="destination-kicker">Step 70-H2B · AD-E-11</p><h1 id="pos-reconciliation-title">مغایرت‌گیری و بازیابی فرمان‌های فروش</h1>
   <p>دسترسی ویژه pos.reconcile؛ فقط وضعیت معتبر سرور نمایش داده می‌شود. هر درخواست بازیابی یا کنارگذاری نیازمند تأیید مجدد WebAuthn است و هیچ retry خودکاری اجرا نمی‌شود.</p></header>
  {state.kind==="denied"?<AdminSurfaceState kind="denied"/>:state.kind==="unavailable"?<AdminSurfaceState kind="error" requestId={state.requestId}/>:state.kind==="invalid"?<p role="alert">پارامترهای درخواست معتبر نیستند.</p>:state.kind==="not_found"?<p role="alert">فرمان پیدا نشد.</p>:null}
  {state.kind==="ready"?<section aria-labelledby="failed-title">
   <h2 id="failed-title">فرمان‌های ناموفق</h2>
   <form method="get" className="pricing-actions">
    <label>حد نمایش <input name="limit" type="number" min={1} max={100} defaultValue={state.limit}/></label>
    <label>شناسه فرمان برای مشاهده تاریخچه <input name="command_id" placeholder="UUID" defaultValue={state.selected?.clientCommandId??""}/></label>
    <button type="submit" disabled={busy}>بازخوانی از سرور</button>
   </form>
   {state.failed.length?<ul className="pricing-list">{state.failed.map(item=><li key={item.id}>
    <bdi>{item.clientCommandId}</bdi> · خطا: {item.errorCode??"نامشخص"} · بازیابی: {item.recoveryCount} از ۵
    <Link to={"/pos/reconciliation?command_id="+encodeURIComponent(item.clientCommandId)}>مشاهده جزئیات</Link>
   </li>)}</ul>:<p>در پاسخ فعلی سرور فرمان ناموفقی دریافت نشد؛ این به معنی نبود خطا در تمام سوابق نیست.</p>}
   {state.selected?<section aria-labelledby="selected-title">
    <h3 id="selected-title">جزئیات فرمان انتخاب‌شده</h3>
    <p>شناسه: <bdi>{state.selected.clientCommandId}</bdi> · وضعیت: {state.selected.status} · خطا: {state.selected.errorCode??"ندارد"} · شمار بازیابی: {state.selected.recoveryCount}</p>
    {state.history?.length?<ol>{state.history.map((entry,i)=><li key={entry.createdAt+"-"+i}>{entry.action} · {entry.createdAt} · {entry.note??"بدون یادداشت"} · بازیابی {entry.recoveryCount}</li>)}</ol>:<p>در پاسخ سرور تاریخچه مدیریتی ثبت نشده است.</p>}
    {state.selected.status==="failed"?<div className="pricing-actions">
     <label>یادداشت اختیاری <input value={noteInput} maxLength={500} onChange={e=>setNoteInput(e.currentTarget.value)} placeholder="حداکثر ۵۰۰ نویسه"/></label>
     <button type="button" disabled={busy||state.selected.recoveryCount>=5} onClick={()=>setReview({mode:"retry",commandId:state.selected!.clientCommandId,note:noteInput})}>بازیابی با WebAuthn</button>
     <button type="button" disabled={busy} onClick={()=>setReview({mode:"abandon",commandId:state.selected!.clientCommandId,note:noteInput})}>کنارگذاری با WebAuthn</button>
    </div>:<p>برای وضعیت‌های غیر failed عملیات تغییردهنده مجاز نیست.</p>}
   </section>:null}
  </section>:null}
  {fetcher.data&&fetcher.data.kind!=="challenge"?<section role="status" aria-live="polite" aria-label="نتیجه عملیات"><p>{fetcher.data.message}</p>
   {fetcher.data.command?<p>فرمان: <bdi>{fetcher.data.command.clientCommandId}</bdi> · وضعیت: {fetcher.data.command.status} · بازیابی: {fetcher.data.command.recoveryCount}</p>:null}
   {fetcher.data.key?<p>Idempotency: <bdi>{fetcher.data.key}</bdi></p>:null}
   {fetcher.data.requestId?<p>شناسه درخواست: <bdi>{fetcher.data.requestId}</bdi></p>:null}
  </section>:null}
  {clientError?<p role="alert">{clientError}</p>:null}
  <ActionReviewDialog open={review!==null} title={review?.mode==="abandon"?"کنارگذاری قطعی فرمان ناموفق":"بازگشایی فرمان ناموفق"} description="پس از تأیید، برای این اقدام از شما WebAuthn خواسته می‌شود. نتیجه نامعلوم را نباید خودکار تکرار کرد." confirmLabel={review?.mode==="abandon"?"تأیید کنارگذاری":"تأیید بازگشایی"} destructive={review?.mode==="abandon"} busy={busy} onConfirm={confirm} onClose={()=>{if(!busy)setReview(null);}}>
   <p>شناسه: <bdi>{review?.commandId}</bdi></p>
  </ActionReviewDialog>
  <p>بازیابی مدیریتی فقط فرمان را برای همگام‌سازی مجدد توسط مالک اولیه آماده می‌کند؛ هیچ تعهد خودکار مالی، قیمت، انبار یا فروش قطعی ایجاد نمی‌کند.</p>
 </section>;
}
