import { useEffect, useRef, useState, type MouseEvent } from "react";
import { data, useFetcher } from "react-router";
import {
  applyAdminSalesControl,
  previewAdminSalesControl,
  validateSalesApplyInput,
  validateSalesPreviewInput,
  type SalesApplyResponse,
  type SalesPreview,
  type SalesScope,
} from "../catalog/sales-control.server.js";
import { isTrustedCatalogFormOrigin } from "../catalog/catalog-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { createAdminStepUpChallenge, verifyAdminStepUp } from "../platform/auth/step-up-credentials.server.js";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client";
import { ActionReviewDialog } from "../security/ActionReviewDialog";

type PreviewContext={
  preview_id:string;
  scope_type:SalesScope;
  scope_id:string|null;
  sales_enabled:boolean;
  affected_count:number;
  expires_at:string;
  reason:string;
};
type ActionData=
  | {kind:"preview";preview:PreviewContext;requestId:string|null}
  | {kind:"step-up-challenge";preview:PreviewContext;challengeId:string;options:Record<string,unknown>}
  | {kind:"success";result:SalesApplyResponse;requestId:string|null}
  | {kind:"expired";message:string;requestId:string|null}
  | {kind:"unknown";message:string;requestId:string|null}
  | {kind:"failure";message:string;requestId:string|null;issues?:readonly {field:string;message:string}[]};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REASON_MAX_LENGTH=500;

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedCatalogFormOrigin(request)){
    return data<ActionData>({kind:"failure",message:"درخواست کنترل فروش معتبر نیست.",requestId:null},{status:403});
  }
  const form=await request.formData();
  const intent=String(form.get("intent")??"");

  if(intent==="preview"){
    const scopeType=String(form.get("scope_type")??"");
    const rawScopeId=String(form.get("scope_id")??"").trim();
    const reason=String(form.get("reason")??"").trim();
    const salesEnabled=form.get("sales_enabled")==="true";
    if(!reason){
      return data<ActionData>({kind:"failure",message:"برای ثبت پیش‌نمایش، دلیل تغییر را وارد کنید.",requestId:null,issues:[{field:"reason",message:"دلیل تغییر الزامی است."}]},{status:400});
    }
    const valid=validateSalesPreviewInput({scopeType,scopeId:rawScopeId||null,salesEnabled,reason});
    if(!valid.ok){
      return data<ActionData>({kind:"failure",message:"اطلاعات پیش‌نمایش معتبر نیست.",requestId:null,issues:valid.fieldErrors.map(item=>({field:item.field,message:item.message}))},{status:400});
    }
    const result=await previewAdminSalesControl(request,valid.body);
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="ready"){
      return data<ActionData>({
        kind:"preview",
        preview:previewContext(result.preview,reason),
        requestId:result.requestId,
      },{headers});
    }
    return failureResponse(result,headers,"preview");
  }

  if(intent==="begin-apply"){
    const preview=parsePreviewContext(form);
    if(!preview) return data<ActionData>({kind:"failure",message:"زمینه پیش‌نمایش معتبر نیست. پیش‌نمایش تازه بگیرید.",requestId:null},{status:400});
    if(Date.parse(preview.expires_at)<=Date.now()){
      return data<ActionData>({kind:"expired",message:"مهلت پیش‌نمایش در این صفحه پایان یافته است. پیش‌نمایش تازه بگیرید و اثر را دوباره بررسی کنید.",requestId:null},{status:409});
    }
    const challenge=await createAdminStepUpChallenge(request);
    if(!challenge.ok){
      if(challenge.code==="STEP_UP_REQUIRED"||challenge.code==="FIDO_FAILED"){
        return data<ActionData>({kind:"failure",message:"احراز مجدد قابل شروع نیست. وضعیت کلید امنیتی را بررسی کنید.",requestId:challenge.requestId},{status:403});
      }
      return data<ActionData>({kind:"failure",message:challenge.code==="UNAUTHENTICATED"?"نشست مدیریت معتبر نیست.":"احراز مجدد فعلاً در دسترس نیست.",requestId:challenge.requestId},{status:challenge.code==="UNAUTHENTICATED"?401:503});
    }
    return data<ActionData>({kind:"step-up-challenge",preview,challengeId:challenge.challengeId,options:challenge.options});
  }

  if(intent==="verify-step-up"){
    const preview=parsePreviewContext(form);
    const credential=parseCredential(form.get("credential"));
    if(!preview||!credential){
      return data<ActionData>({kind:"failure",message:"پاسخ احراز مجدد یا زمینه پیش‌نمایش معتبر نیست.",requestId:null},{status:400});
    }
    if(Date.parse(preview.expires_at)<=Date.now()){
      return data<ActionData>({kind:"expired",message:"پیش‌نمایش پیش از اعمال منقضی شد. اعمال انجام نشد؛ پیش‌نمایش تازه بگیرید.",requestId:null},{status:409});
    }
    const stepped=await verifyAdminStepUp(request,credential);
    if(!stepped.ok){
      return data<ActionData>({kind:"failure",message:stepUpFailureMessage(stepped.code),requestId:stepped.requestId},{status:stepped.code==="UNAUTHENTICATED"?401:403});
    }
    const valid=validateSalesApplyInput({
      previewId:preview.preview_id,
      reason:preview.reason,
      expectedAffectedCount:preview.affected_count,
    });
    if(!valid.ok){
      return data<ActionData>({kind:"failure",message:"زمینه اعمال کنترل فروش معتبر نیست.",requestId:null,issues:valid.fieldErrors.map(item=>({field:item.field,message:item.message}))},{status:400});
    }
    const result=await applyAdminSalesControl(request,stepped.token,valid.body);
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="confirmed"){
      return data<ActionData>({kind:"success",result:result.result,requestId:result.requestId},{headers});
    }
    return failureResponse(result,headers,"apply");
  }

  return data<ActionData>({kind:"failure",message:"مرحله کنترل فروش شناخته‌شده نیست.",requestId:null},{status:400});
}

export default function CatalogSalesControlRoute(){
  const fetcher=useFetcher<typeof action>();
  const [scope,setScope]=useState<SalesScope>("global");
  const [preview,setPreview]=useState<PreviewContext|null>(null);
  const [reviewOpen,setReviewOpen]=useState(false);
  const [clientError,setClientError]=useState<string|null>(null);
  const [now,setNow]=useState(()=>Date.now());
  const launcherRef=useRef<HTMLButtonElement|null>(null);
  const handledChallenge=useRef<string|null>(null);
  const outcomeRef=useRef<HTMLDivElement|null>(null);
  const busy=fetcher.state!=="idle";

  useEffect(()=>{
    if(!preview)return;
    setNow(Date.now());
    const timer=window.setInterval(()=>setNow(Date.now()),1000);
    return()=>window.clearInterval(timer);
  },[preview]);

  useEffect(()=>{
    const payload=fetcher.data;
    if(!payload)return;
    if(payload.kind==="preview"){
      setPreview(payload.preview);
      setReviewOpen(false);
      setClientError(null);
      queueMicrotask(()=>outcomeRef.current?.focus());
      return;
    }
    if(payload.kind==="step-up-challenge"&&handledChallenge.current!==payload.challengeId){
      handledChallenge.current=payload.challengeId;
      setClientError(null);
      void runAdminWebAuthn("authentication",payload.challengeId,payload.options)
        .then((credential)=>{
          const form=contextForm(payload.preview,"verify-step-up");
          form.set("credential",JSON.stringify(credential));
          fetcher.submit(form,{method:"post"});
        })
        .catch(()=>{
          handledChallenge.current=null;
          setClientError("احراز مجدد لغو شد یا کلید امنیتی پاسخ نداد. درخواست اعمال ارسال نشد.");
        });
      return;
    }
    if(payload.kind==="success"){
      handledChallenge.current=null;
      setPreview(null);
      setReviewOpen(false);
      setClientError(null);
      queueMicrotask(()=>outcomeRef.current?.focus());
      return;
    }
    if(payload.kind==="expired"||payload.kind==="unknown"){
      handledChallenge.current=null;
      setPreview(null);
      setReviewOpen(false);
      queueMicrotask(()=>outcomeRef.current?.focus());
    }
  },[fetcher.data,fetcher]);

  const expired=preview?Date.parse(preview.expires_at)<=now:false;
  const openReview=(event:MouseEvent<HTMLButtonElement>)=>{
    launcherRef.current=event.currentTarget;
    setClientError(null);
    setReviewOpen(true);
  };
  const closeReview=()=>{
    if(busy)return;
    setReviewOpen(false);
    setClientError(null);
    queueMicrotask(()=>launcherRef.current?.focus());
  };
  const confirmReview=()=>{
    if(!preview||busy||expired)return;
    handledChallenge.current=null;
    fetcher.submit(contextForm(preview,"begin-apply"),{method:"post"});
  };
  const response=fetcher.data;
  const failure=response?.kind==="failure"?response:null;
  const terminal=response&&(response.kind==="success"||response.kind==="expired"||response.kind==="unknown")?response:null;

  return (
    <section className="catalog-sales-control-page" aria-labelledby="sales-control-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><a href="/">مدیریت</a><span aria-hidden="true">/</span><span aria-current="page">کنترل فروش</span></nav>
      <div className="catalog-sales-control-heading">
        <div>
          <p className="destination-kicker">AD-C-08 · Catalog</p>
          <h1 id="sales-control-title">پیش‌نمایش و کنترل توقف فروش</h1>
          <p>ابتدا اثر تغییر را از Backend پیش‌نمایش کنید. اعمال تغییر فقط پس از بازبینی و احراز مجدد با کلید امنیتی انجام می‌شود.</p>
        </div>
      </div>

      <div ref={outcomeRef} tabIndex={-1} className="catalog-sales-control-outcome">
        {terminal?.kind==="success"?(
          <div className="auth-alert" role="status">
            <p>{terminal.result.sales_enabled?"فروش در دامنه تأییدشده فعال شد.":"فروش در دامنه تأییدشده متوقف شد."}</p>
            <p>تعداد ثبت‌شده توسط سرور: <bdi>{formatNumber(terminal.result.affected_count)}</bdi></p>
            {terminal.requestId?<p className="auth-request-id">شناسه پیگیری: <bdi>{terminal.requestId}</bdi></p>:null}
          </div>
        ):terminal?.kind==="expired"?(
          <div className="auth-alert" role="alert"><p>{terminal.message}</p>{terminal.requestId?<p className="auth-request-id">شناسه پیگیری: <bdi>{terminal.requestId}</bdi></p>:null}</div>
        ):terminal?.kind==="unknown"?(
          <div className="auth-alert" role="alert"><p>{terminal.message}</p><p>درخواست را تکرار نکنید؛ وضعیت هدف را از مسیر مجاز Catalog بررسی کنید و در نبود read معتبر، پیگیری دستی انجام دهید.</p>{terminal.requestId?<p className="auth-request-id">شناسه پیگیری: <bdi>{terminal.requestId}</bdi></p>:null}</div>
        ):null}
      </div>

      {(failure||clientError)?(
        <div className="auth-alert" role="alert">
          <p>{failure?.message??clientError}</p>
          {failure?.issues?.length?<ul>{failure.issues.map((issue,index)=><li key={issue.field+"-"+index}>{issue.message}</li>)}</ul>:null}
          {failure?.requestId?<p className="auth-request-id">شناسه پیگیری: <bdi>{failure.requestId}</bdi></p>:null}
        </div>
      ):null}

      <fetcher.Form method="post" className="catalog-sales-control-form">
        <input type="hidden" name="intent" value="preview"/>
        <fieldset disabled={busy}>
          <legend>۱. دامنه و هدف تغییر</legend>
          <label>
            دامنه
            <select name="scope_type" value={scope} onChange={(event)=>setScope(event.target.value as SalesScope)}>
              <option value="global">همه کالاها</option>
              <option value="brand">برند</option>
              <option value="category">دسته</option>
              <option value="product">کالا</option>
              <option value="variant">گونه</option>
            </select>
          </label>
          <label>
            شناسه هدف
            <input name="scope_id" dir="ltr" inputMode="text" disabled={scope==="global"} required={scope!=="global"} pattern="[0-9a-fA-F-]{36}" placeholder={scope==="global"?"برای دامنه همه لازم نیست":"UUID هدف"}/>
            <small>برای برند، دسته، کالا یا گونه، شناسه canonical همان هدف را وارد کنید.</small>
          </label>
          <label>
            هدف
            <select name="sales_enabled" defaultValue="false">
              <option value="false">توقف فروش</option>
              <option value="true">ازسرگیری فروش</option>
            </select>
          </label>
          <label>
            دلیل ثبت در رویداد
            <textarea name="reason" maxLength={REASON_MAX_LENGTH} required rows={3} placeholder="دلیل کوتاه و عملیاتی تغییر را بنویسید."/>
          </label>
          <button type="submit" className="catalog-sales-control-primary">{busy?"در حال دریافت…":"دریافت پیش‌نمایش"}</button>
        </fieldset>
      </fetcher.Form>

      {preview?(
        <section className="catalog-sales-control-preview" aria-labelledby="sales-preview-title">
          <div>
            <p className="destination-kicker">۲. بازبینی اثر تغییر</p>
            <h2 id="sales-preview-title">پیش‌نمایش authoritative</h2>
          </div>
          <dl>
            <div><dt>دامنه</dt><dd>{scopeLabel(preview.scope_type)}</dd></div>
            <div><dt>شناسه هدف</dt><dd><bdi>{preview.scope_id??"همه"}</bdi></dd></div>
            <div><dt>هدف</dt><dd>{preview.sales_enabled?"ازسرگیری فروش":"توقف فروش"}</dd></div>
            <div><dt>تعداد پیش‌نمایش</dt><dd>{formatNumber(preview.affected_count)}</dd></div>
            <div><dt>اعتبار تا</dt><dd>{formatDate(preview.expires_at)}</dd></div>
          </dl>
          <p className="catalog-sales-control-note">این عدد همان count ذخیره‌شده در preview است؛ سیستم ادعای شمارش تازه در لحظه Apply یا اتصال preview به requester را ندارد.</p>
          {expired?<p className="auth-alert" role="alert">مهلت نمایش‌داده‌شده پایان یافته است. برای اعمال، پیش‌نمایش تازه بگیرید.</p>:null}
          <button type="button" onClick={openReview} disabled={busy||expired}>ادامه به احراز مجدد</button>
        </section>
      ):null}

      <ActionReviewDialog
        open={reviewOpen&&preview!==null}
        title={preview?.sales_enabled?"تأیید ازسرگیری فروش":"تأیید توقف فروش"}
        description="اثر و دامنه را دوباره بررسی کنید. پس از تأیید، WebAuthn Step-Up انجام می‌شود و درخواست Apply فقط یک بار ارسال خواهد شد."
        confirmLabel="احراز مجدد و اعمال"
        destructive={preview?.sales_enabled===false}
        busy={busy}
        onConfirm={confirmReview}
        onClose={closeReview}
      >
        {preview?(
          <dl className="catalog-sales-control-review">
            <div><dt>دامنه</dt><dd>{scopeLabel(preview.scope_type)}</dd></div>
            <div><dt>هدف</dt><dd><bdi>{preview.scope_id??"همه"}</bdi></dd></div>
            <div><dt>تعداد</dt><dd>{formatNumber(preview.affected_count)}</dd></div>
            <div><dt>دلیل</dt><dd>{preview.reason}</dd></div>
          </dl>
        ):null}
      </ActionReviewDialog>
    </section>
  );
}

function previewContext(preview:SalesPreview,reason:string):PreviewContext{
  return {
    preview_id:preview.preview_id,
    scope_type:preview.scope_type,
    scope_id:preview.scope_id??null,
    sales_enabled:preview.sales_enabled,
    affected_count:preview.affected_count,
    expires_at:preview.expires_at,
    reason,
  };
}

function contextForm(preview:PreviewContext,intent:string):FormData{
  const form=new FormData();
  form.set("intent",intent);
  form.set("preview_id",preview.preview_id);
  form.set("scope_type",preview.scope_type);
  if(preview.scope_id)form.set("scope_id",preview.scope_id);
  form.set("sales_enabled",String(preview.sales_enabled));
  form.set("affected_count",String(preview.affected_count));
  form.set("expires_at",preview.expires_at);
  form.set("reason",preview.reason);
  return form;
}

function parsePreviewContext(form:FormData):PreviewContext|null{
  const previewId=String(form.get("preview_id")??"");
  const scopeType=String(form.get("scope_type")??"") as SalesScope;
  const scopeId=String(form.get("scope_id")??"").trim()||null;
  const salesEnabled=String(form.get("sales_enabled")??"")==="true";
  const affectedCount=Number(form.get("affected_count"));
  const expiresAt=String(form.get("expires_at")??"");
  const reason=String(form.get("reason")??"").trim();
  if(!UUID.test(previewId)||!["global","brand","category","product","variant"].includes(scopeType))return null;
  if(scopeType==="global"&&scopeId!==null)return null;
  if(scopeType!=="global"&&(!scopeId||!UUID.test(scopeId)))return null;
  if(!Number.isSafeInteger(affectedCount)||affectedCount<0||!Number.isFinite(Date.parse(expiresAt)))return null;
  if(!reason||reason.length>REASON_MAX_LENGTH||hasControlCharacters(reason))return null;
  return {preview_id:previewId,scope_type:scopeType,scope_id:scopeId,sales_enabled:salesEnabled,affected_count:affectedCount,expires_at:expiresAt,reason};
}

function parseCredential(value:FormDataEntryValue|null){
  if(typeof value!=="string"||value.length>100000)return null;
  try{
    const parsed=JSON.parse(value);
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return null;
    return parsed as {
      challenge_id:string;
      credential_id:string;
      client_data_json:string;
      authenticator_data:string;
      signature:string;
      user_handle?:string|null;
    };
  }catch{return null;}
}

function failureResponse(
  result:Exclude<Awaited<ReturnType<typeof previewAdminSalesControl>>|Awaited<ReturnType<typeof applyAdminSalesControl>>,{kind:"ready"}|{kind:"confirmed"}>,
  headers:Headers,
  phase:"preview"|"apply",
){
  if(result.kind==="expired"){
    return data<ActionData>({kind:"expired",message:"پیش‌نمایش معتبر نیست یا قبلاً مصرف شده است. اعمال دوباره انجام نمی‌شود؛ پیش‌نمایش تازه بگیرید.",requestId:result.requestId},{status:409,headers});
  }
  if(result.kind==="unknown_outcome"){
    return data<ActionData>({kind:"unknown",message:phase==="apply"?"نتیجه اعمال تغییر نامشخص است. درخواست Apply دوباره ارسال نمی‌شود.":"نتیجه ساخت پیش‌نمایش نامشخص است. درخواست Preview خودکار تکرار نمی‌شود.",requestId:result.requestId},{status:503,headers});
  }
  if(result.kind==="invalid"){
    return data<ActionData>({kind:"failure",message:"Backend ورودی کنترل فروش را نپذیرفت.",requestId:result.requestId,issues:result.fieldErrors.map(item=>({field:item.field,message:item.message||"مقدار معتبر نیست."}))},{status:422,headers});
  }
  if(result.kind==="conflict"){
    return data<ActionData>({kind:"expired",message:"اثر یا وضعیت پیش‌نمایش دیگر قابل اعمال نیست. پیش‌نمایش تازه بگیرید و دوباره بازبینی کنید.",requestId:result.requestId},{status:409,headers});
  }
  if(result.kind==="step_up_required"){
    return data<ActionData>({kind:"failure",message:"احراز مجدد منقضی یا نامعتبر است. Apply ارسال نشد؛ فرآیند را از بازبینی آغاز کنید.",requestId:result.requestId},{status:403,headers});
  }
  return data<ActionData>({kind:"failure",message:result.kind==="denied"?"مجوز کنترل فروش برای این نشست تأیید نشد.":"کنترل فروش فعلاً در دسترس نیست.",requestId:result.requestId},{status:result.kind==="denied"?403:503,headers});
}

function cookieHeaders(values:readonly string[]):Headers{const headers=new Headers();appendAdminAuthSetCookies(headers,values);return headers;}
function scopeLabel(scope:SalesScope):string{return scope==="global"?"همه کالاها":scope==="brand"?"برند":scope==="category"?"دسته":scope==="product"?"کالا":"گونه";}
function formatNumber(value:number):string{return new Intl.NumberFormat("fa-IR").format(value);}
function formatDate(value:string):string{const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"}).format(date):"نامعتبر";}
function stepUpFailureMessage(code:string):string{
  if(code==="UNAUTHENTICATED")return "نشست مدیریت معتبر نیست.";
  if(code==="STEP_UP_REQUIRED")return "احراز مجدد منقضی یا نامعتبر است. Apply ارسال نشد.";
  if(code==="FIDO_FAILED")return "تأیید کلید امنیتی انجام نشد. Apply ارسال نشد.";
  return "احراز مجدد کامل نشد. Apply ارسال نشد.";
}
function hasControlCharacters(value:string):boolean{for(const character of value){const code=character.charCodeAt(0);if(code<=0x1f||code===0x7f)return true;}return false;}
