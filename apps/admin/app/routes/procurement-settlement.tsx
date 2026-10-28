import { useEffect, useRef, useState } from "react";
import { data, Form, Link, useFetcher, useLoaderData, useNavigation } from "react-router";
import {
  approvePurchaseReturn, completePurchaseReturn, createInvoice, createLandedCost,
  createPurchaseReturn, createReceipt, matchInvoice, postReceipt, readSettlement,
  shipPurchaseReturn, submitReceipt, updateReceipt,
  validateInvoiceCreate, validateLandedCreate, validateReceiptCreate, validateReceiptUpdate, validateReturnCreate,
  type InvoiceCreate, type LandedCreate, type ReceiptCreate, type ReceiptUpdate,
  type ReturnCreate, type SettlementMutation, type SettlementView,
} from "../operations/procurement-settlement.server.js";
import { isTrustedOperationsFormOrigin, operationsInteger, operationsUuid } from "../operations/operations-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { createAdminStepUpChallenge, verifyAdminStepUp } from "../platform/auth/step-up-credentials.server.js";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client";

type Context={entity:"receipt"|"return";transition:"post"|"approve"|"ship";id:string;version:number};
type ActionData=
  |{kind:"challenge";challengeId:string;options:Record<string,unknown>;context:Context}
  |{kind:"confirmed"|"unknown"|"conflict"|"failure";message:string;requestId:string|null;key?:string|null;issues?:readonly {field:string;message:string}[]};
const labels:Record<SettlementView,string>={
  receipts:"رسید کالا", "landed-costs":"هزینه جانبی خرید", invoices:"فاکتور تأمین‌کننده", returns:"مرجوعی خرید",
};
const initial:Record<SettlementView,string>={
  receipts:JSON.stringify({supplier_id:"",warehouse_id:"",items:[{variant_id:"",received_quantity:1,accepted_quantity:1,quarantine_quantity:0,rejected_quantity:0,unit_cost_toman:0}]},null,2),
  "landed-costs":JSON.stringify({goods_receipt_id:"",cost_type:"shipping",amount_toman:0,allocation_method:"quantity"},null,2),
  invoices:JSON.stringify({supplier_id:"",invoice_number:"",invoice_date:"",amount_toman:0},null,2),
  returns:JSON.stringify({supplier_id:"",warehouse_id:"",reason:"",items:[{variant_id:"",quantity:1,stock_bucket:"quarantine"}]},null,2),
};
const allowedTransitions:Record<SettlementView,readonly {value:string;label:string}[]>={
  receipts:[{value:"submit",label:"ارسال رسید"},{value:"post",label:"ثبت قطعی رسید (کلید امنیتی)"}],
  "landed-costs":[],
  invoices:[{value:"match",label:"تطبیق فاکتور"}],
  returns:[{value:"approve",label:"تأیید مرجوعی (کلید امنیتی)"},{value:"ship",label:"ارسال مرجوعی (کلید امنیتی)"},{value:"complete",label:"تکمیل مرجوعی"}],
};
function viewOf(value?:string):SettlementView{
  return value==="landed-costs"||value==="invoices"||value==="returns"?value:"receipts";
}
function cookies(values:readonly string[]){const headers=new Headers();appendAdminAuthSetCookies(headers,values);return headers;}
function bad(message:string,status=422){return data<ActionData>({kind:"failure",message,requestId:null},{status});}
function parseJson(value:FormDataEntryValue|null):Record<string,unknown>|null{
  if(typeof value!=="string"||value.length>100000||!value.trim())return null;
  try{const parsed:unknown=JSON.parse(value);return parsed!==null&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed as Record<string,unknown>:null;}
  catch{return null;}
}
function target(form:FormData){
  const id=operationsUuid(form.get("id")),v=operationsInteger(form.get("version"));
  return id!==null&&v!==null&&v>0?{id,v}:null;
}
function parseContext(form:FormData):Context|null{
  const entity=form.get("entity"),transition=form.get("transition"),t=target(form);
  if(!t)return null;
  if(entity==="receipt"&&transition==="post")return{entity,transition,id:t.id,version:t.v};
  if(entity==="return"&&(transition==="approve"||transition==="ship"))return{entity,transition,id:t.id,version:t.v};
  return null;
}
async function challenge(request:Request,context:Context){
  const result=await createAdminStepUpChallenge(request);
  if(!result.ok)return bad("احراز مجدد آغاز نشد؛ عملیات ارسال نشده است.",403);
  return data<ActionData>({kind:"challenge",challengeId:result.challengeId,options:result.options,context});
}
function outcome(result:SettlementMutation,title:string){
  const headers=cookies(result.setCookies);
  if(result.kind==="confirmed")return data<ActionData>({kind:"confirmed",message:title+" با پاسخ قطعی Backend ثبت شد. وضعیت را بازخوانی کنید.",requestId:result.requestId,key:result.idempotencyKey},{headers});
  if(result.kind==="unknown_outcome")return data<ActionData>({kind:"unknown",message:"نتیجه عملیات نامعلوم است؛ هیچ retry خودکاری مجاز نیست. ابتدا وضعیت معتبر را دوباره بخوانید.",requestId:result.requestId,key:result.idempotencyKey},{status:503,headers});
  if(result.kind==="conflict")return data<ActionData>({kind:"conflict",message:"نسخه یا وضعیت تغییر کرده است؛ داده‌ای بازنویسی نشد.",requestId:result.requestId},{status:409,headers});
  if(result.kind==="invalid")return data<ActionData>({kind:"failure",message:"Backend ورودی را نپذیرفت.",requestId:result.requestId,issues:result.issues},{status:422,headers});
  return data<ActionData>({kind:"failure",message:result.kind==="denied"?"مجوز دسترسی کافی نیست.":result.kind==="not_found"?"مرجع یافت نشد.":"سرویس در دسترس نیست.",requestId:result.requestId},{status:result.kind==="denied"?403:result.kind==="not_found"?404:503,headers});
}
export async function loader({request,params}:{request:Request;params:{view?:string}}){
  const view=viewOf(params.view),id=new URL(request.url).searchParams.get("id");
  if(id&&!operationsUuid(id))return data({kind:"invalid" as const,view},{status:400});
  const result=await readSettlement(request,view,id||null),headers=cookies(result.setCookies);
  if(result.kind!=="ready")return data({kind:result.kind,view,requestId:result.requestId},{status:result.kind==="denied"?403:result.kind==="not_found"?404:503,headers});
  return data({kind:"ready" as const,view,endpoint:result.endpoint,requestId:result.requestId,status:result.status,records:result.records,total:result.total},{headers});
}
export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedOperationsFormOrigin(request))return bad("درخواست از مبدأ معتبر ارسال نشده است.",403);
  const form=await request.formData(),intent=String(form.get("intent")??"");
  if(intent==="create"){
    const view=viewOf(String(form.get("view")??"")),body=parseJson(form.get("body_json"));
    if(!body)return bad("بدنه JSON معتبر نیست.");
    try{
      if(view==="receipts"){const v=validateReceiptCreate(body as ReceiptCreate);return v.ok?outcome(await createReceipt(request,v.body),"ایجاد رسید"):data<ActionData>({kind:"failure",message:"خطای اعتبارسنجی رسید",requestId:null,issues:v.issues});}
      if(view==="landed-costs"){const v=validateLandedCreate(body as LandedCreate);return v.ok?outcome(await createLandedCost(request,v.body),"ثبت هزینه جانبی"):data<ActionData>({kind:"failure",message:"خطای اعتبارسنجی هزینه جانبی",requestId:null,issues:v.issues});}
      if(view==="invoices"){const v=validateInvoiceCreate(body as InvoiceCreate);return v.ok?outcome(await createInvoice(request,v.body),"ایجاد فاکتور"):data<ActionData>({kind:"failure",message:"خطای اعتبارسنجی فاکتور",requestId:null,issues:v.issues});}
      const v=validateReturnCreate(body as ReturnCreate);return v.ok?outcome(await createPurchaseReturn(request,v.body),"ایجاد مرجوعی"):data<ActionData>({kind:"failure",message:"خطای اعتبارسنجی مرجوعی",requestId:null,issues:v.issues});
    }catch{return bad("ساختار JSON با قرارداد داده‌ها سازگار نیست.");}
  }
  if(intent==="receipt-update"){
    const t=target(form),body=parseJson(form.get("body_json"));
    if(!t||!body)return bad("شناسه، نسخه و JSON الزامی و معتبر باشند.");
    try{const valid=validateReceiptUpdate(body as ReceiptUpdate);return valid.ok?outcome(await updateReceipt(request,t.id,t.v,valid.body),"ویرایش رسید"):data<ActionData>({kind:"failure",message:"اعتبارسنجی اقلام ناموفق",requestId:null,issues:valid.issues});}
    catch{return bad("JSON اقلام معتبر نیست.");}
  }
  if(intent==="transition"){
    const t=target(form),view=String(form.get("view")??""),transition=String(form.get("transition")??"");
    if(!t)return bad("شناسه و نسخه معتبر لازم است.");
    if(view==="receipts"&&transition==="submit")return outcome(await submitReceipt(request,t.id,t.v),"ارسال رسید");
    if(view==="receipts"&&transition==="post")return challenge(request,{entity:"receipt",transition:"post",id:t.id,version:t.v});
    if(view==="invoices"&&transition==="match")return outcome(await matchInvoice(request,t.id,t.v),"تطبیق فاکتور");
    if(view==="returns"&&transition==="complete")return outcome(await completePurchaseReturn(request,t.id,t.v),"تکمیل مرجوعی");
    if(view==="returns"&&(transition==="approve"||transition==="ship"))return challenge(request,{entity:"return",transition,id:t.id,version:t.v});
    return bad("این انتقال به علت ناسازگاری قرارداد/Backend یا خارج‌بودن از محدوده مجاز مسدود است.",403);
  }
  if(intent==="verify-stepup"){
    const context=parseContext(form),credential=parseJson(form.get("credential"));
    if(!context||!credential)return bad("نتیجه WebAuthn یا مشخصات عملیات معتبر نیست.",400);
    const verified=await verifyAdminStepUp(request,credential as Parameters<typeof verifyAdminStepUp>[1]);
    if(!verified.ok)return bad("کلید امنیتی تأیید نشد؛ عملیات ارسال نشده است.",403);
    if(context.entity==="receipt")return outcome(await postReceipt(request,context.id,context.version,verified.token),"ثبت قطعی رسید");
    if(context.transition==="approve")return outcome(await approvePurchaseReturn(request,context.id,context.version,verified.token),"تأیید مرجوعی");
    return outcome(await shipPurchaseReturn(request,context.id,context.version,verified.token),"ارسال مرجوعی");
  }
  return bad("عملیات ناشناخته یا مسدود است.",400);
}
export default function ProcurementSettlementRoute(){
  const state=useLoaderData<typeof loader>(),fetcher=useFetcher<typeof action>(),navigation=useNavigation();
  const done=useRef<string|null>(null),feedback=useRef<HTMLDivElement|null>(null),[clientError,setClientError]=useState<string|null>(null);
  useEffect(()=>{
    const value=fetcher.data;
    if(!value)return;
    if(value.kind==="challenge"&&done.current!==value.challengeId){
      done.current=value.challengeId;
      void runAdminWebAuthn("authentication",value.challengeId,value.options).then(credential=>{
        const form=new FormData();
        form.set("intent","verify-stepup");form.set("entity",value.context.entity);form.set("transition",value.context.transition);
        form.set("id",value.context.id);form.set("version",String(value.context.version));form.set("credential",JSON.stringify(credential));
        fetcher.submit(form,{method:"post"});
      }).catch(()=>{done.current=null;setClientError("تأیید WebAuthn لغو شد؛ عملیات ارسال نشده است.");feedback.current?.focus();});
    }else if(value.kind!=="challenge"){done.current=null;feedback.current?.focus();}
  },[fetcher.data,fetcher]);
  const view=state.view,busy=fetcher.state!=="idle"||navigation.state!=="idle"||state.kind!=="ready";
  return <section className="pricing-page" aria-labelledby="settlement-title" dir="rtl">
    <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><Link to="/">مدیریت</Link><span>/</span><Link to="/procurement/orders">تدارکات</Link><span>/</span><span>{labels[view]}</span></nav>
    <header className="pricing-heading"><p className="destination-kicker">Step 70-G · AD-D-15–18</p><h1 id="settlement-title">مدیریت تکمیلی تدارکات — {labels[view]}</h1>
      <p>داده‌ها از API رسمی خوانده می‌شوند؛ وضعیت ناشناخته هیچ‌گاه خودکار تکرار نمی‌شود. نسخهٔ عملیات باید از وضعیت معتبر Backend دریافت شده باشد.</p></header>
    <nav className="pricing-actions" aria-label="بخش‌های تسویه تدارکات">
      {(Object.keys(labels) as SettlementView[]).map(item=><Link key={item} to={`/procurement-settlement/${item}`} aria-current={view===item?"page":undefined}>{labels[item]}</Link>)}
    </nav>
    {state.kind==="ready"?<section aria-label="نتیجه خواندن داده">
      <p role="status">خواندن مسیر مجاز با HTTP {state.status} انجام شد.</p>
      <p>مسیر: <bdi>{state.endpoint}</bdi></p>{state.requestId?<p>شناسه درخواست: <bdi>{state.requestId}</bdi></p>:null}
      {state.records===null?<p role="status">قرارداد پاسخ این منبع، جزئیات قابل‌نمایش تأییدشده ندارد؛ فقط نتیجهٔ HTTP قطعی است.</p>:
        <section aria-label="فهرست شناسه‌ها و نسخه‌های معتبر">
          <p>{state.total===null?"تعداد مشخص نیست":`تعداد ردیف پاسخ: ${state.total}؛ حداکثر ۱۰۰ ردیف اول نمایش داده می‌شود.`}</p>
          {state.records.length===0?<p>هیچ ردیف معتبر دارای شناسه UUID در پاسخ یافت نشد؛ نتیجه به‌معنای خالی بودن قطعی پایگاه داده نیست.</p>:
          <table><caption>شناسه، مرجع، وضعیت و نسخه از پاسخ فعلی Backend</caption><thead><tr><th scope="col">شناسه</th><th scope="col">مرجع</th><th scope="col">وضعیت</th><th scope="col">نسخه</th><th scope="col">جزئیات</th></tr></thead>
            <tbody>{state.records.map(item=><tr key={item.id}>
              <td><bdi>{item.id}</bdi></td><td>{item.reference??"—"}</td><td>{item.status??"نامشخص"}</td><td>{item.version??"نامشخص"}</td>
              <td>{view==="invoices"?"مسیر جزئیات وجود ندارد":<Link to={`?id=${item.id}`}>مشاهده</Link>}</td>
            </tr>)}</tbody></table>}
        </section>}
      <Form method="get"><label htmlFor="settlement-detail">شناسه UUID برای مشاهده جزئیات (فاکتور جزئیات ندارد)</label>
        <input id="settlement-detail" name="id" placeholder="UUID" disabled={view==="invoices"}/><button type="submit" disabled={view==="invoices"}>بازخوانی مرجع</button></Form>
    </section>:<p role="alert">{state.kind==="invalid"?"UUID معتبر نیست.":state.kind==="denied"?"مجوز خواندن وجود ندارد.":state.kind==="not_found"?"مرجع پیدا نشد.":"خواندن وضعیت معتبر Backend امکان‌پذیر نیست."}</p>}
    <section aria-labelledby="create-title"><h2 id="create-title">ایجاد سند {labels[view]}</h2>
      <p>شناسه‌ها را از فهرست‌های معتبر سیستم وارد کنید. برای اقلام از JSON قراردادی استفاده می‌شود.</p>
      <fetcher.Form method="post"><input type="hidden" name="intent" value="create"/><input type="hidden" name="view" value={view}/>
        <label htmlFor="settlement-body">بدنه JSON مجاز</label><textarea id="settlement-body" key={view} name="body_json" defaultValue={initial[view]} rows={11} dir="ltr" spellCheck={false} required/>
        <button type="submit" disabled={busy}>ثبت سند</button>
      </fetcher.Form>
    </section>
    {view==="receipts"?<section aria-labelledby="update-title"><h2 id="update-title">ویرایش اقلام پیش‌نویس رسید</h2>
      <fetcher.Form method="post"><input type="hidden" name="intent" value="receipt-update"/>
        <label htmlFor="receipt-id">شناسه رسید</label><input id="receipt-id" name="id" required placeholder="UUID"/>
        <label htmlFor="receipt-version">نسخه فعلی</label><input id="receipt-version" name="version" type="number" min="1" step="1" required/>
        <label htmlFor="receipt-items">JSON اقلام (فقط items)</label><textarea id="receipt-items" name="body_json" rows={6} defaultValue={JSON.stringify({items:JSON.parse(initial.receipts).items},null,2)} dir="ltr"/>
        <button type="submit" disabled={busy}>ثبت ویرایش</button></fetcher.Form>
    </section>:null}
    {allowedTransitions[view].length?<section aria-labelledby="transition-title"><h2 id="transition-title">انتقال وضعیت</h2>
      <p>فقط با نسخه معتبر از Backend؛ برای عملیات حساس تأیید سخت‌افزاری لازم است.</p>
      <fetcher.Form method="post"><input type="hidden" name="intent" value="transition"/><input type="hidden" name="view" value={view}/>
        <label htmlFor="settlement-id">شناسه سند</label><input id="settlement-id" name="id" required placeholder="UUID"/>
        <label htmlFor="settlement-version">نسخه فعلی</label><input id="settlement-version" name="version" type="number" min="1" step="1" required/>
        <label htmlFor="settlement-transition">عملیات مجاز</label><select id="settlement-transition" name="transition">{allowedTransitions[view].map(x=><option value={x.value} key={x.value}>{x.label}</option>)}</select>
        <button type="submit" disabled={busy}>بررسی و اجرای انتقال</button>
      </fetcher.Form>
    </section>:null}
    <section aria-label="محدودیت‌های امنیتی"><h2>عملیات مسدود تا اصلاح Backend</h2><p>برگشت رسید، نهایی‌سازی/پیش‌نمایش هزینه جانبی، اختلاف/لغو فاکتور و تخصیص وزنی بدون قرارداد اجرایی منطبق فعال نمی‌شوند. هیچ پاسخ جعلی یا مسیر دورزنندهٔ Backend وجود ندارد.</p></section>
    <div ref={feedback} tabIndex={-1} aria-live="polite">
      {clientError?<p role="alert">{clientError}</p>:null}
      {fetcher.data&&fetcher.data.kind!=="challenge"?<p role={fetcher.data.kind==="confirmed"?"status":"alert"}>
        {fetcher.data.message} {fetcher.data.requestId?<span>شناسه درخواست: <bdi>{fetcher.data.requestId}</bdi></span>:null}
        {fetcher.data.kind==="unknown"&&fetcher.data.key?<span> کلید رهگیری فقط جهت تطبیق: <bdi>{fetcher.data.key}</bdi></span>:null}
        {fetcher.data.issues?.map((x,i)=><span key={i}> {x.field}: {x.message}؛ </span>)}
      </p>:null}
    </div>
  </section>;
}
