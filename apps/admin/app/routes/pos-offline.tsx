import { useEffect, useRef, useState } from "react";
import { Link, data, redirect, useFetcher, useLoaderData, useNavigation } from "react-router";
import type { ApiComponents } from "../platform/api/contract.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { readAdminAuthorizationContext } from "../platform/auth/context.server.js";
import { createAdminStepUpChallenge, verifyAdminStepUp } from "../platform/auth/step-up-credentials.server.js";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client.js";
import { isTrustedOperationsFormOrigin, operationsInteger, operationsUuid } from "../operations/operations-form.server.js";
import {
  captureOfflineCommand, inspectCommand, listFailedCommands, recoverOfflineCommand, syncOfflineCommand,
  validateOfflinePayload, validateNote, type CommandView, type HistoryView, type MutationResult,
} from "../operations/pos-offline.server.js";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";
import { ActionReviewDialog } from "../security/ActionReviewDialog.js";

type StepUpBody=ApiComponents["schemas"]["PostAdminAuthStepUpVerifyRequest"];
type ActionData=
  |{kind:"challenge";mode:"retry"|"abandon";commandId:string;note:string|null;challengeId:string;options:Record<string,unknown>}
  |{kind:"confirmed"|"unknown"|"failure"|"conflict";message:string;requestId:string|null;key?:string|null;command?:CommandView;requiresOwnerSync?:boolean};
type RecoveryIntent={mode:"retry"|"abandon";commandId:string;note:string};
const headersFor=(cookies:readonly string[])=>{const h=new Headers();appendAdminAuthSetCookies(h,cookies);return h;};
const bad=(message:string,status=422)=>data<ActionData>({kind:"failure",message,requestId:null},{status});
const parseJson=(v:FormDataEntryValue|null,max=20000):unknown=>{
  if(typeof v!=="string"||v.length<1||v.length>max)return null;
  try{return JSON.parse(v);}catch{return null;}
};
function issue(message:string,requestId:string|null=null,status=503,cookies:readonly string[]=[]){
  return data<ActionData>({kind:"failure",message,requestId},{status,headers:headersFor(cookies)});
}
function resultData(r:MutationResult,cookies:readonly string[]){
  const h=headersFor([...cookies,...r.setCookies]);
  if(r.kind==="confirmed")return data<ActionData>({kind:"confirmed",message:r.requiresOwnerSync?"بازیابی توسط Backend ثبت شد؛ فرمان فقط باید با شناسه صاحب اولیه همگام شود.":"نتیجه قطعی عملیات از Backend تأیید شد.",requestId:r.requestId,key:r.key,command:r.command,requiresOwnerSync:r.requiresOwnerSync},{headers:h});
  if(r.kind==="unknown_outcome")return data<ActionData>({kind:"unknown",message:"نتیجه شبکه نامعلوم است؛ هیچ retry خودکاری انجام نمی‌شود. قبل از هر اقدام، شناسه فرمان را در سوابق معتبر بررسی کنید.",requestId:r.requestId,key:r.key},{status:503,headers:h});
  if(r.kind==="conflict")return data<ActionData>({kind:"conflict",message:"وضعیت فرمان تغییر کرده است. ابتدا جزئیات را دوباره بخوانید.",requestId:r.requestId},{status:409,headers:h});
  const message=r.kind==="denied"||r.kind==="step_up_required"?"مجوز یا احراز مجدد معتبر نیست.":r.kind==="not_found"?"فرمان پیدا نشد.":r.kind==="invalid"?"ورودی معتبر نیست.":"سرویس عملیات آفلاین در دسترس نیست.";
  return data<ActionData>({kind:"failure",message,requestId:r.requestId},{status:r.kind==="denied"||r.kind==="step_up_required"?403:r.kind==="not_found"?404:r.kind==="invalid"?422:503,headers:h});
}

export async function loader({request}:{request:Request}){
  const auth=await readAdminAuthorizationContext(request),headers=headersFor(auth.setCookies);
  if(auth.kind==="unauthenticated")throw redirect("/login",{headers});
  if(auth.kind==="unavailable")return data({kind:"unavailable" as const,requestId:auth.requestId,canSell:false,canReconcile:false},{status:503,headers});
  const canSell=auth.permissions.includes("pos.sell"),canReconcile=auth.permissions.includes("pos.reconcile");
  if(!canSell&&!canReconcile)return data({kind:"denied" as const,requestId:null,canSell:false,canReconcile:false},{status:403,headers});
  const params=new URL(request.url).searchParams,rawId=params.get("command_id"),rawLimit=params.get("limit");
  const commandId=rawId===null?null:operationsUuid(rawId);
  const limit=rawLimit===null?25:operationsInteger(rawLimit);
  if(rawId!==null&&!commandId||limit===null||limit<1||limit>100)return data({kind:"invalid" as const,requestId:null,canSell,canReconcile},{status:400,headers});
  if(rawId!==null&&!canReconcile)return data({kind:"denied" as const,requestId:null,canSell,canReconcile},{status:403,headers});
  let failed:CommandView[]|null=null,history:HistoryView[]|null=null,selected:CommandView|null=null;
  if(canReconcile){
    const list=await listFailedCommands(request,limit);
    appendAdminAuthSetCookies(headers,list.setCookies);
    if(list.kind!=="ready")return data({kind:list.kind==="invalid"?"invalid" as const:list.kind==="denied"?"denied" as const:"unavailable" as const,requestId:list.requestId,canSell,canReconcile},{status:list.kind==="denied"?403:list.kind==="invalid"?400:503,headers});
    failed=list.value;
    if(commandId){
      const detail=await inspectCommand(request,commandId);
      appendAdminAuthSetCookies(headers,detail.setCookies);
      if(detail.kind!=="ready")return data({kind:detail.kind==="not_found"?"not_found" as const:"unavailable" as const,requestId:detail.requestId,canSell,canReconcile},{status:detail.kind==="not_found"?404:503,headers});
      selected=detail.value.command;history=detail.value.history;
    }
  }
  return data({kind:"ready" as const,requestId:null,canSell,canReconcile,failed,selected,history},{headers});
}

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedOperationsFormOrigin(request))return bad("مبدأ درخواست معتبر نیست.",403);
  const auth=await readAdminAuthorizationContext(request);
  if(auth.kind!=="authorized")return issue("نشست و مجوز قابل تأیید نیست.",auth.kind==="unavailable"?auth.requestId:null,auth.kind==="unavailable"?503:403,auth.setCookies);
  const form=await request.formData(),intent=form.get("intent");
  const canSell=auth.permissions.includes("pos.sell"),canReconcile=auth.permissions.includes("pos.reconcile");
  const commandId=operationsUuid(form.get("client_command_id"));
  if(intent==="capture"){
    if(!canSell)return issue("دسترسی pos.sell لازم است.",null,403,auth.setCookies);
    const lines=parseJson(form.get("lines_json"));
    const body={warehouse_id:operationsUuid(form.get("warehouse_id")),customer_type:form.get("customer_type"),
      payment_method:form.get("payment_method"),external_reference:form.get("external_reference")===""?null:form.get("external_reference"),
      lines};
    const check=validateOfflinePayload(body);
    if(!commandId||!check.ok)return bad("شناسه ثابت فرمان، انبار، اقلام ۱ تا ۱۰۰ یا روش پرداخت معتبر نیست.");
    return resultData(await captureOfflineCommand(request,commandId,check.body),auth.setCookies);
  }
  if(intent==="sync"){
    if(!canSell)return issue("دسترسی pos.sell لازم است.",null,403,auth.setCookies);
    if(!commandId)return bad("شناسه فرمان نامعتبر است.");
    return resultData(await syncOfflineCommand(request,commandId),auth.setCookies);
  }
  if(intent==="begin-retry"||intent==="begin-abandon"||intent==="verify-retry"||intent==="verify-abandon"){
    if(!canReconcile)return issue("دسترسی pos.reconcile لازم است.",null,403,auth.setCookies);
    const mode=intent.endsWith("retry")?"retry":"abandon",note=validateNote(form.get("note"));
    if(!commandId||!note.ok)return bad("شناسه فرمان یا یادداشت حداکثر ۵۰۰ نویسه معتبر نیست.");
    const fresh=await inspectCommand(request,commandId);
    if(fresh.kind!=="ready")return issue("وضعیت معتبر فرمان قابل بررسی نیست.",fresh.requestId,503,[...auth.setCookies,...fresh.setCookies]);
    if(fresh.value.command.status!=="failed"||(mode==="retry"&&fresh.value.command.recoveryCount>=5))
      return issue("فقط فرمان ناموفق با ظرفیت بازیابی معتبر قابل اقدام است.",fresh.requestId,409,[...auth.setCookies,...fresh.setCookies]);
    if(intent.startsWith("begin-")){
      const challenge=await createAdminStepUpChallenge(request);
      if(!challenge.ok)return issue("صدور چالش کلید امنیتی ناموفق بود.",challenge.requestId,403,auth.setCookies);
      return data<ActionData>({kind:"challenge",mode,commandId,note:typeof note.body.note==="string"?note.body.note:null,
        challengeId:challenge.challengeId,options:challenge.options},{headers:headersFor(auth.setCookies)});
    }
    const credential=parseJson(form.get("credential"),40000);
    if(!credential||typeof credential!=="object"||Array.isArray(credential))return bad("پاسخ احراز مجدد نامعتبر است.");
    const verified=await verifyAdminStepUp(request,credential as StepUpBody);
    if(!verified.ok)return issue("احراز مجدد معتبر نیست یا منقضی شده است.",verified.requestId,403,auth.setCookies);
    // Only the server sees the verified step-up token. Never send token to a browser response.
    return resultData(await recoverOfflineCommand(request,commandId,mode,note.body,verified.token),auth.setCookies);
  }
  return bad("عملیات در قرارداد POS تعریف نشده است.",400);
}

export default function PosOfflineRoute(){
  const state=useLoaderData<typeof loader>(),fetcher=useFetcher<typeof action>(),navigation=useNavigation();
  const [review,setReview]=useState<RecoveryIntent|null>(null),[clientError,setClientError]=useState<string|null>(null),[noteInput,setNoteInput]=useState("");
  const handled=useRef<string|null>(null);
  const busy=fetcher.state!=="idle"||navigation.state!=="idle";
  useEffect(()=>{
    const r=fetcher.data;
    if(!r||r.kind!=="challenge"||r.challengeId===handled.current)return;
    handled.current=r.challengeId;
    void runAdminWebAuthn("authentication",r.challengeId,r.options).then(credential=>{
      const f=new FormData();f.set("intent",r.mode==="retry"?"verify-retry":"verify-abandon");
      f.set("client_command_id",r.commandId);f.set("note",r.note??"");f.set("credential",JSON.stringify(credential));
      fetcher.submit(f,{method:"post"});
    }).catch(()=>{handled.current=null;setClientError("احراز مجدد لغو شد یا کلید امنیتی پاسخ نداد؛ هیچ بازیابی ارسال نشد.");});
  },[fetcher.data,fetcher]);
  const recover=()=>{
    if(!review||busy)return;
    const f=new FormData();f.set("intent",review.mode==="retry"?"begin-retry":"begin-abandon");
    f.set("client_command_id",review.commandId);f.set("note",review.note);
    setClientError(null);handled.current=null;fetcher.submit(f,{method:"post"});setReview(null);
  };
  return <section className="pricing-page" dir="rtl" aria-labelledby="pos-offline-title">
    <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><Link to="/">مدیریت</Link><span>/</span><Link to="/pos/sales">فروش حضوری</Link><span>/</span><span>همگام‌سازی و مغایرت‌ها</span></nav>
    <header className="pricing-heading"><p className="destination-kicker">Step 70-H2 · AD-E-11</p>
      <h1 id="pos-offline-title">فرمان‌های آفلاین و تطبیق فروش</h1>
      <p>هیچ فرمانی به‌شکل خودکار تکرار نمی‌شود. در وضعیت نامعلوم، شناسه فرمان را از Backend بررسی کنید. بازیابی و کنارگذاری فقط با کلید امنیتی و مجوز مستقل امکان‌پذیر است.</p>
    </header>
    {state.kind==="denied"?<AdminSurfaceState kind="denied"/>:state.kind==="unavailable"?<AdminSurfaceState kind="error" requestId={state.requestId}/>:state.kind==="invalid"?<p role="alert">پارامترهای درخواست معتبر نیستند.</p>:state.kind==="not_found"?<p role="alert">فرمان در سوابق معتبر سرور پیدا نشد.</p>:null}
    {state.kind==="ready"&&state.canSell?<section aria-labelledby="offline-sell-title"><h2 id="offline-sell-title">ثبت و همگام‌سازی با مجوز pos.sell</h2>
      <p>شناسه فرمان باید از دستگاه آفلاین آمده و در ارسال دوباره ثابت بماند. هر شناسه فقط برای همان payload مجاز است؛ تاریخچه فروش را پیش از ارسال مجدد بررسی کنید.</p>
      <fetcher.Form method="post" className="pricing-actions"><input type="hidden" name="intent" value="capture"/>
        <label>شناسه ثابت فرمان آفلاین <input name="client_command_id" placeholder="UUID" required/></label>
        <label>شناسه انبار مجاز <input name="warehouse_id" placeholder="UUID" required/></label>
        <label>نوع مشتری <select name="customer_type"><option value="retail">خرده</option><option value="wholesale">عمده</option></select></label>
        <label>پرداخت <select name="payment_method"><option value="cash">نقد</option><option value="card">کارت</option></select></label>
        <label>مرجع اختیاری <input name="external_reference" maxLength={120}/></label>
        <label>اقلام معتبر در قالب JSON <textarea name="lines_json" rows={4} maxLength={20000} required placeholder={'[{"variant_id":"UUID","quantity":1}]'}/></label>
        <button type="submit" disabled={busy}>ثبت فرمان در Backend</button>
      </fetcher.Form>
      <fetcher.Form method="post" className="pricing-actions"><input type="hidden" name="intent" value="sync"/>
        <label>شناسه فرمان متعلق به کاربر <input name="client_command_id" placeholder="UUID" required/></label>
        <button type="submit" disabled={busy}>همگام‌سازی یک‌باره فرمان</button>
      </fetcher.Form>
    </section>:null}
    {state.kind==="ready"&&state.canReconcile?<section aria-labelledby="reconcile-title"><h2 id="reconcile-title">فرمان‌های ناموفق با مجوز pos.reconcile</h2>
      <form method="get" className="pricing-actions"><label>حد نمایش <input name="limit" type="number" min={1} max={100} defaultValue={25}/></label>
        <label>شناسه فرمان برای مشاهده تاریخچه <input name="command_id" placeholder="UUID" defaultValue={state.selected?.clientCommandId??""}/></label>
        <button type="submit">خواندن سوابق معتبر</button>
      </form>
      {state.failed?.length?<ul className="pricing-list">{state.failed.map(cmd=><li key={cmd.id}>
        <bdi>{cmd.clientCommandId}</bdi> — خطا: {cmd.errorCode??"نامشخص"} — بازیابی: {cmd.recoveryCount} از ۵
        <Link to={"/pos/offline?command_id="+encodeURIComponent(cmd.clientCommandId)}>مشاهده جزئیات</Link>
      </li>)}</ul>:<p>در پاسخ فعلی هیچ فرمان ناموفقی دریافت نشد؛ این به معنی نبود خطا در تمام تاریخچه نیست.</p>}
      {state.selected?<section aria-labelledby="detail-title"><h3 id="detail-title">جزئیات فرمان معتبر</h3>
        <p>شناسه: <bdi>{state.selected.clientCommandId}</bdi> · وضعیت: {state.selected.status} · کد خطا: {state.selected.errorCode??"ندارد"} · بازیابی: {state.selected.recoveryCount} از ۵</p>
        {state.history?.length?<ol>{state.history.map((entry,i)=><li key={entry.createdAt+"-"+i}>{entry.action} · تعداد {entry.recoveryCount} · {entry.createdAt} · {entry.note??"بدون یادداشت"}</li>)}</ol>:<p>تاریخچه مدیریتی ثبت نشده است.</p>}
        {state.selected.status==="failed"?<div className="pricing-actions">
          <label>یادداشت بازیابی اختیاری <input id="pos-recovery-note" maxLength={500} placeholder="حداکثر ۵۰۰ نویسه" value={noteInput} onChange={e=>setNoteInput(e.currentTarget.value)}/></label>
          <button type="button" disabled={busy||state.selected.recoveryCount>=5} onClick={()=>setReview({mode:"retry",commandId:state.selected!.clientCommandId,note:noteInput})}>تلاش بازیابی با WebAuthn</button>
          <button type="button" disabled={busy} onClick={()=>setReview({mode:"abandon",commandId:state.selected!.clientCommandId,note:noteInput})}>کنارگذاری با WebAuthn</button>
        </div>:<p>فقط وضعیت failed برای اقدام مدیریتی مجاز است.</p>}
      </section>:null}
    </section>:null}
    {fetcher.data&&fetcher.data.kind!=="challenge"?<section role="status" aria-live="polite" aria-label="نتیجه عملیات آفلاین">
      <p>{fetcher.data.message}</p>{"command" in fetcher.data&&fetcher.data.command?<p>فرمان: <bdi>{fetcher.data.command.clientCommandId}</bdi> · وضعیت: {fetcher.data.command.status} · بازیابی: {fetcher.data.command.recoveryCount}</p>:null}
      {"key" in fetcher.data&&fetcher.data.key?<p>شناسه پیگیری/Idempotency: <bdi>{fetcher.data.key}</bdi></p>:null}
      {fetcher.data.requestId?<p>درخواست: <bdi>{fetcher.data.requestId}</bdi></p>:null}
    </section>:null}
    {clientError?<p role="alert">{clientError}</p>:null}
    <ActionReviewDialog open={review!==null} title={review?.mode==="abandon"?"کنارگذاری فرمان ناموفق":"بازکردن فرمان برای تلاش مجدد"}
      description="این اقدام بعد از احراز مجدد WebAuthn روی Backend انجام می‌شود و نتیجه نامعلوم هرگز خودکار تکرار نخواهد شد."
      confirmLabel={review?.mode==="abandon"?"تأیید کنارگذاری با کلید":"تأیید بازیابی با کلید"}
      destructive={review?.mode==="abandon"} busy={busy} onConfirm={recover} onClose={()=>{if(!busy)setReview(null);}}>
      <p>فرمان: <bdi>{review?.commandId}</bdi></p>
    </ActionReviewDialog>
    <p>فروشگاه/شیفت/سفارش بدون Backend معتبر ساخته نشده‌اند؛ کنترل قیمت و موجودی فقط در سرویس مرجع است.</p>
  </section>;
}
