import { useEffect, useRef, useState, type MouseEvent } from "react";
import { data, useFetcher } from "react-router";
import {
  applyBulkPricing,
  previewBulkPricing,
  readBulkPricingStatus,
  validateBulkApplyInput,
  validateBulkPreviewInput,
  type BulkApplyData,
  type BulkChangeType,
  type BulkPreviewData,
  type BulkScope,
} from "../pricing/pricing-bulk.server.js";
import { isTrustedPricingFormOrigin } from "../pricing/pricing-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { createAdminStepUpChallenge, verifyAdminStepUp } from "../platform/auth/step-up-credentials.server.js";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client";
import { ActionReviewDialog } from "../security/ActionReviewDialog";

type BulkContext={
  preview_id:string;
  affected_count:number;
  expires_at:string;
  reason:string;
  idempotency_key:string;
};
type ActionData=
  | {kind:"preview";preview:BulkPreviewData;reason:string;requestId:string|null}
  | {kind:"step-up-challenge";context:BulkContext;challengeId:string;options:Record<string,unknown>;recovery:boolean}
  | {kind:"success";result:BulkApplyData;requestId:string|null}
  | {kind:"unknown";message:string;context:BulkContext;requestId:string|null}
  | {kind:"status";message:string;context:BulkContext;operationStatus:"previewed"|"running"|"completed"|"failed"|"expired";requestId:string|null;canRetry:boolean}
  | {kind:"expired";message:string;requestId:string|null}
  | {kind:"failure";message:string;requestId:string|null;issues?:readonly {field:string;message:string}[]};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY=/^[A-Za-z0-9._:-]{8,200}$/;
const REASON_MAX=500;
const SCOPE_IDS_MAX_TEXT=40000;

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedPricingFormOrigin(request)){
    return data<ActionData>({kind:"failure",message:"درخواست عملیات گروهی قیمت معتبر نیست.",requestId:null},{status:403});
  }
  const form=await request.formData();
  const intent=String(form.get("intent")??"");

  if(intent==="preview"){
    const scopeType=String(form.get("scope_type")??"");
    const scopeIds=parseScopeIds(form.get("scope_ids"));
    const changeType=String(form.get("change_type")??"");
    const value=Number(form.get("value"));
    const roundingRule=String(form.get("rounding_rule")??"none");
    const reason=String(form.get("reason")??"").trim();
    if(scopeIds===null){
      return data<ActionData>({kind:"failure",message:"فهرست شناسه‌های دامنه معتبر نیست.",requestId:null,issues:[{field:"scope_ids",message:"شناسه‌ها را با خط جدید یا ویرگول جدا کنید؛ متن بیش از حد بزرگ یا دارای نویسه نامعتبر پذیرفته نمی‌شود."}]},{status:400});
    }
    const valid=validateBulkPreviewInput({scopeType,scopeIds,changeType,value,roundingRule,reason});
    if(!valid.ok){
      return invalidResponse("ورودی پیش‌نمایش عملیات گروهی نیاز به اصلاح دارد.",valid.fieldErrors);
    }
    const result=await previewBulkPricing(request,valid.body);
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="ready"){
      return data<ActionData>({kind:"preview",preview:result.preview,reason,requestId:result.requestId},{headers});
    }
    return failureResponse(result,headers,"preview");
  }

  if(intent==="begin-apply"){
    const context=parseContext(form,false);
    if(!context)return data<ActionData>({kind:"failure",message:"زمینه پیش‌نمایش معتبر نیست؛ پیش‌نمایش تازه بگیرید.",requestId:null},{status:400});
    if(Date.parse(context.expires_at)<=Date.now()){
      return data<ActionData>({kind:"expired",message:"پیش‌نمایش منقضی شده است؛ پیش‌نمایش تازه بگیرید و اثر را دوباره بازبینی کنید.",requestId:null},{status:409});
    }
    const challenge=await createAdminStepUpChallenge(request);
    if(!challenge.ok)return stepUpStartFailure(challenge);
    return data<ActionData>({
      kind:"step-up-challenge",
      context:{...context,idempotency_key:createIdempotencyKey()},
      challengeId:challenge.challengeId,
      options:challenge.options,
      recovery:false,
    });
  }

  if(intent==="status-check"){
    const context=parseContext(form,true);
    if(!context)return data<ActionData>({kind:"failure",message:"اطلاعات بازیابی نتیجه معتبر نیست.",requestId:null},{status:400});
    return statusResponse(request,context);
  }

  if(intent==="begin-retry"){
    const context=parseContext(form,true);
    if(!context)return data<ActionData>({kind:"failure",message:"اطلاعات بازیابی نتیجه معتبر نیست.",requestId:null},{status:400});
    const status=await readBulkPricingStatus(request,context.preview_id);
    const headers=cookieHeaders(status.setCookies);
    if(status.kind!=="ready")return failureResponse(status,headers,"status");
    if(
      status.operation.operation_type!=="bulk_price"||
      status.operation.status!=="previewed"||
      Date.parse(status.operation.expires_at)<=Date.now()||
      status.operation.affected_count!==context.affected_count
    ){
      return data<ActionData>({
        kind:"status",
        message:"وضعیت authoritative دیگر اجازهٔ replay همان Apply را نمی‌دهد؛ پیش‌نمایش تازه بگیرید یا وضعیت نهایی را بررسی کنید.",
        context,
        operationStatus:status.operation.status,
        requestId:status.requestId,
        canRetry:false,
      },{status:409,headers});
    }
    const challenge=await createAdminStepUpChallenge(request);
    if(!challenge.ok)return stepUpStartFailure(challenge,headers);
    return data<ActionData>({
      kind:"step-up-challenge",
      context,
      challengeId:challenge.challengeId,
      options:challenge.options,
      recovery:true,
    },{headers});
  }

  if(intent==="verify-step-up"){
    const context=parseContext(form,true);
    const credential=parseCredential(form.get("credential"));
    if(!context||!credential){
      return data<ActionData>({kind:"failure",message:"پاسخ احراز مجدد یا زمینه Apply معتبر نیست.",requestId:null},{status:400});
    }
    if(Date.parse(context.expires_at)<=Date.now()){
      return data<ActionData>({kind:"expired",message:"پیش‌نمایش پیش از Apply منقضی شد؛ Apply ارسال نشد.",requestId:null},{status:409});
    }
    const stepped=await verifyAdminStepUp(request,credential);
    if(!stepped.ok){
      return data<ActionData>({kind:"failure",message:stepUpFailureMessage(stepped.code),requestId:stepped.requestId},{status:stepped.code==="UNAUTHENTICATED"?401:403});
    }
    const valid=validateBulkApplyInput({
      previewId:context.preview_id,
      reason:context.reason,
      expectedAffectedCount:context.affected_count,
    });
    if(!valid.ok)return invalidResponse("زمینه Apply معتبر نیست.",valid.fieldErrors);
    const result=await applyBulkPricing(request,stepped.token,context.idempotency_key,valid.body);
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="confirmed"){
      return data<ActionData>({kind:"success",result:result.result,requestId:result.requestId},{headers});
    }
    if(result.kind==="unknown_outcome"){
      return data<ActionData>({
        kind:"unknown",
        message:"نتیجه Apply قطعی نیست. درخواست خودکار تکرار نمی‌شود؛ ابتدا وضعیت همین عملیات را بخوانید.",
        context,
        requestId:result.requestId,
      },{status:503,headers});
    }
    return failureResponse(result,headers,"apply");
  }

  return data<ActionData>({kind:"failure",message:"مرحله عملیات گروهی قیمت شناخته‌شده نیست.",requestId:null},{status:400});
}

export default function PricingBulkRoute(){
  const fetcher=useFetcher<typeof action>();
  const [scope,setScope]=useState<BulkScope>("all");
  const [preview,setPreview]=useState<{data:BulkPreviewData;reason:string}|null>(null);
  const [reviewOpen,setReviewOpen]=useState(false);
  const [clientError,setClientError]=useState<string|null>(null);
  const [now,setNow]=useState(()=>Date.now());
  const launcherRef=useRef<HTMLButtonElement|null>(null);
  const handledChallenge=useRef<string|null>(null);
  const outcomeRef=useRef<HTMLDivElement|null>(null);
  const busy=fetcher.state!=="idle";

  useEffect(()=>{
    if(!preview)return;
    const timer=window.setInterval(()=>setNow(Date.now()),1000);
    return()=>window.clearInterval(timer);
  },[preview]);

  useEffect(()=>{
    const payload=fetcher.data;
    if(!payload)return;
    if(payload.kind==="preview"){
      queueMicrotask(()=>{
        setPreview({data:payload.preview,reason:payload.reason});
        setReviewOpen(false);
        setClientError(null);
        outcomeRef.current?.focus();
      });
      return;
    }
    if(payload.kind==="step-up-challenge"&&handledChallenge.current!==payload.challengeId){
      handledChallenge.current=payload.challengeId;
      queueMicrotask(()=>setClientError(null));
      void runAdminWebAuthn("authentication",payload.challengeId,payload.options)
        .then((credential)=>{
          const form=contextForm(payload.context,"verify-step-up");
          form.set("credential",JSON.stringify(credential));
          fetcher.submit(form,{method:"post"});
        })
        .catch(()=>{
          handledChallenge.current=null;
          setClientError("احراز مجدد لغو شد یا کلید امنیتی پاسخ نداد. Apply ارسال نشد.");
        });
      return;
    }
    if(payload.kind==="success"){
      handledChallenge.current=null;
      queueMicrotask(()=>{
        setPreview(null);
        setReviewOpen(false);
        setClientError(null);
        outcomeRef.current?.focus();
      });
      return;
    }
    if(payload.kind==="unknown"||payload.kind==="status"){
      handledChallenge.current=null;
      queueMicrotask(()=>{
        setReviewOpen(false);
        setClientError(null);
        outcomeRef.current?.focus();
      });
      return;
    }
    if(payload.kind==="expired"){
      handledChallenge.current=null;
      queueMicrotask(()=>{
        setPreview(null);
        setReviewOpen(false);
        outcomeRef.current?.focus();
      });
    }
  },[fetcher.data,fetcher]);

  const expired=preview?Date.parse(preview.data.expires_at)<=now:false;
  const blocked=preview?preview.data.warnings.length>0||preview.data.items.some(item=>item.guardStatus==="blocked"||item.guardStatus==="unavailable"):false;
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
    if(!preview||busy||expired||blocked)return;
    handledChallenge.current=null;
    fetcher.submit(contextForm({
      preview_id:preview.data.preview_id,
      affected_count:preview.data.affected_count,
      expires_at:preview.data.expires_at,
      reason:preview.reason,
      idempotency_key:"",
    },"begin-apply"),{method:"post"});
  };
  const response=fetcher.data;
  const failure=response?.kind==="failure"?response:null;
  const status=response?.kind==="status"?response:null;
  const unknown=response?.kind==="unknown"?response:null;
  const success=response?.kind==="success"?response:null;

  return (
    <section className="pricing-page pricing-bulk-page" aria-labelledby="pricing-bulk-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><a href="/">مدیریت</a><span aria-hidden="true">/</span><span>قیمت‌گذاری</span><span aria-hidden="true">/</span><span aria-current="page">تغییر گروهی</span></nav>
      <header className="pricing-heading">
        <p className="destination-kicker">AD-D-03 · Pricing</p>
        <h1 id="pricing-bulk-title">پیش‌نمایش و اعمال گروهی قیمت</h1>
        <p>ابتدا دامنه و تغییر را برای Backend ارسال کنید. Apply فقط پس از بازبینی، WebAuthn Step-Up و با کلید idempotency انجام می‌شود.</p>
      </header>

      <div ref={outcomeRef} tabIndex={-1} className="pricing-bulk-outcome">
        {success?<div className="pricing-success" role="status">
          <strong>اعمال گروهی قیمت با پاسخ قطعی سرور تکمیل شد.</strong>
          <span>شناسه عملیات: <bdi>{success.result.operation_id}</bdi></span>
          <span>تعداد ثبت‌شده: <bdi>{formatNumber(success.result.affected_count)}</bdi></span>
          {success.requestId?<span>شناسه پیگیری: <bdi>{success.requestId}</bdi></span>:null}
        </div>:null}
        {unknown?<div className="pricing-error-summary" role="alert">
          <h2>نتیجه Apply نامشخص است</h2>
          <p>{unknown.message}</p>
          <p>همان Idempotency-Key حفظ شده است؛ پیش از هر replay باید وضعیت authoritative خوانده شود.</p>
          {unknown.requestId?<p>شناسه پیگیری: <bdi>{unknown.requestId}</bdi></p>:null}
          <fetcher.Form method="post">
            {contextInputs(unknown.context)}
            <button type="submit" name="intent" value="status-check" disabled={busy}>بررسی وضعیت عملیات</button>
          </fetcher.Form>
        </div>:null}
        {status?<div className="pricing-bulk-status" role={status.operationStatus==="completed"?"status":"alert"}>
          <h2>وضعیت authoritative: <bdi>{status.operationStatus}</bdi></h2>
          <p>{status.message}</p>
          {status.requestId?<p>شناسه پیگیری: <bdi>{status.requestId}</bdi></p>:null}
          <div className="pricing-actions">
            <fetcher.Form method="post">
              {contextInputs(status.context)}
              <button type="submit" name="intent" value="status-check" disabled={busy}>خواندن دوباره وضعیت</button>
            </fetcher.Form>
            {status.canRetry?<fetcher.Form method="post">
              {contextInputs(status.context)}
              <button type="submit" name="intent" value="begin-retry" disabled={busy}>احراز مجدد و replay همان درخواست</button>
            </fetcher.Form>:null}
          </div>
        </div>:null}
      </div>

      {(failure||clientError)?<div className="pricing-error-summary" role="alert">
        <h2>عملیات ادامه پیدا نکرد</h2>
        <p>{failure?.message??clientError}</p>
        {failure?.issues?.length?<ul>{failure.issues.map((issue,index)=><li key={issue.field+"-"+index}>{issue.message}</li>)}</ul>:null}
        {failure?.requestId?<p>شناسه پیگیری: <bdi>{failure.requestId}</bdi></p>:null}
      </div>:null}

      <section className="pricing-card" aria-labelledby="bulk-preview-form-title">
        <h2 id="bulk-preview-form-title">۱. تعریف دامنه و تغییر</h2>
        <p>Backend دامنه‌های بیش از ۵۰۰۰ واریانت را رد می‌کند. فهرست قابل نمایش پیش‌نمایش حداکثر ۲۰۰ ردیف است و با تعداد کل اثر یکسان فرض نمی‌شود.</p>
        <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
          <input type="hidden" name="intent" value="preview"/>
          <label>
            <span>دامنه</span>
            <select name="scope_type" value={scope} onChange={event=>setScope(event.target.value as BulkScope)} disabled={busy}>
              <option value="all">همه واریانت‌ها</option>
              <option value="category">دسته</option>
              <option value="brand">برند</option>
              <option value="product">کالا</option>
            </select>
          </label>
          <label className="pricing-form-wide">
            <span>شناسه‌های دامنه</span>
            <textarea name="scope_ids" rows={4} disabled={scope==="all"||busy} required={scope!=="all"} maxLength={SCOPE_IDS_MAX_TEXT} placeholder={scope==="all"?"برای دامنه همه لازم نیست":"هر UUID در یک خط یا جداشده با ویرگول"}/>
          </label>
          <label>
            <span>نوع تغییر</span>
            <select name="change_type" defaultValue="set_price" disabled={busy}>
              <option value="set_price">قیمت ثابت جدید</option>
              <option value="increase_percent">افزایش درصدی</option>
              <option value="decrease_percent">کاهش درصدی</option>
              <option value="increase_fixed">افزایش مبلغ ثابت</option>
              <option value="decrease_fixed">کاهش مبلغ ثابت</option>
            </select>
          </label>
          <label>
            <span>مقدار</span>
            <input name="value" type="number" min="0" step="any" required disabled={busy}/>
          </label>
          <label>
            <span>قاعده گردکردن</span>
            <select name="rounding_rule" defaultValue="none" disabled={busy}>
              <option value="none">بدون گردکردن</option>
              <option value="nearest_1000">نزدیک‌ترین ۱٬۰۰۰ تومان</option>
              <option value="nearest_10000">نزدیک‌ترین ۱۰٬۰۰۰ تومان</option>
              <option value="nearest_100000">نزدیک‌ترین ۱۰۰٬۰۰۰ تومان</option>
            </select>
          </label>
          <label className="pricing-form-wide">
            <span>دلیل عملیات</span>
            <textarea name="reason" maxLength={REASON_MAX} required rows={3} disabled={busy}/>
          </label>
          <div className="pricing-actions pricing-form-wide">
            <button type="submit" disabled={busy}>{busy?"در حال دریافت…":"دریافت پیش‌نمایش"}</button>
          </div>
        </fetcher.Form>
      </section>

      {preview?<section className="pricing-card pricing-bulk-preview" aria-labelledby="bulk-review-title">
        <div className="pricing-section-heading">
          <div>
            <p className="destination-kicker">۲. بازبینی اثر</p>
            <h2 id="bulk-review-title">پیش‌نمایش authoritative</h2>
          </div>
          <dl>
            <div><dt>تعداد کل اثر</dt><dd><bdi>{formatNumber(preview.data.affected_count)}</bdi></dd></div>
            <div><dt>ردیف‌های نمایش‌داده‌شده</dt><dd><bdi>{formatNumber(preview.data.items.length)}</bdi></dd></div>
            <div><dt>اعتبار تا</dt><dd>{formatDate(preview.data.expires_at)}</dd></div>
          </dl>
        </div>
        {preview.data.affected_count>preview.data.items.length?<p className="pricing-inline-warning">فهرست زیر کامل نیست؛ Backend فقط {formatNumber(preview.data.items.length)} مورد از {formatNumber(preview.data.affected_count)} مورد تحت تأثیر را بازگردانده است.</p>:null}
        {preview.data.warnings.length?<div className="pricing-error-summary" role="alert">
          <h3>هشدارهای Profit Guard</h3>
          <p>تا رفع هشدارهای ذخیره‌شده، Apply مجاز نیست.</p>
          <ul>{preview.data.warnings.slice(0,50).map((warning,index)=><li key={index}><bdi>{String(warning.variant_id??"—")}</bdi> · {String(warning.code??"هشدار")}</li>)}</ul>
        </div>:null}
        <div className="pricing-bulk-table-wrap" tabIndex={0} aria-label="نمونه اقلام تحت تأثیر">
          <table className="pricing-bulk-table">
            <thead><tr><th>واریانت</th><th>قیمت فعلی</th><th>قیمت پیشنهادی</th><th>Guard</th></tr></thead>
            <tbody>{preview.data.items.map(item=><tr key={item.variantId}>
              <td><bdi>{item.variantId}</bdi></td>
              <td>{formatToman(item.oldPriceToman)}</td>
              <td>{formatToman(item.proposedPriceToman)}</td>
              <td><bdi>{item.guardStatus}</bdi>{item.guardReason?" · "+item.guardReason:""}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="pricing-inline-warning">Apply قیمت فعلی هر ردیف را دوباره با قیمت ذخیره‌شده در preview مقایسه می‌کند؛ اما این UI ادعای requester-binding یا اجرای Profit Guard تازه و عمومی در لحظه Apply ندارد.</p>
        {expired?<p className="pricing-error-summary" role="alert">مهلت پیش‌نمایش پایان یافته است. پیش‌نمایش تازه بگیرید.</p>:null}
        <div className="pricing-actions">
          <button ref={launcherRef} type="button" onClick={openReview} disabled={busy||expired||blocked}>ادامه به بازبینی نهایی و احراز مجدد</button>
        </div>
      </section>:null}

      <ActionReviewDialog
        open={reviewOpen&&preview!==null}
        title="تأیید اعمال گروهی قیمت"
        description="تعداد، نمونه اقلام و دلیل را دوباره بررسی کنید. پس از تأیید، WebAuthn Step-Up انجام می‌شود و Apply با یک Idempotency-Key ثابت ارسال خواهد شد."
        confirmLabel="احراز مجدد و اعمال"
        destructive
        busy={busy}
        onConfirm={confirmReview}
        onClose={closeReview}
      >
        {preview?<dl className="pricing-bulk-review">
          <div><dt>تعداد کل اثر</dt><dd>{formatNumber(preview.data.affected_count)}</dd></div>
          <div><dt>موارد نمایش‌داده‌شده</dt><dd>{formatNumber(preview.data.items.length)}</dd></div>
          <div><dt>دلیل</dt><dd>{preview.reason}</dd></div>
        </dl>:null}
      </ActionReviewDialog>
    </section>
  );
}

async function statusResponse(request:Request,context:BulkContext){
  const result=await readBulkPricingStatus(request,context.preview_id);
  const headers=cookieHeaders(result.setCookies);
  if(result.kind!=="ready")return failureResponse(result,headers,"status");
  const operation=result.operation;
  if(operation.status==="completed"){
    return data<ActionData>({
      kind:"success",
      result:{operation_id:operation.id,affected_count:operation.affected_count},
      requestId:result.requestId,
    },{headers});
  }
  const canRetry=operation.status==="previewed"
    &&Date.parse(operation.expires_at)>Date.now()
    &&operation.affected_count===context.affected_count;
  const message=canRetry
    ?"عملیات هنوز previewed و معتبر است. در صورت نیاز می‌توانید فقط همان payload را با همان Idempotency-Key و پس از Step-Up تازه replay کنید."
    :operation.status==="running"
      ?"Backend عملیات را در وضعیت running گزارش می‌کند؛ replay انجام ندهید و وضعیت را دوباره بخوانید."
      :"عملیات دیگر در وضعیت امن برای replay نیست. درخواست تازه نسازید مگر با پیش‌نمایش تازه.";
  return data<ActionData>({kind:"status",message,context,operationStatus:operation.status,requestId:result.requestId,canRetry},{headers});
}

function contextForm(context:BulkContext,intent:string):FormData{
  const form=new FormData();
  form.set("intent",intent);
  form.set("preview_id",context.preview_id);
  form.set("affected_count",String(context.affected_count));
  form.set("expires_at",context.expires_at);
  form.set("reason",context.reason);
  if(context.idempotency_key)form.set("idempotency_key",context.idempotency_key);
  return form;
}
function contextInputs(context:BulkContext){
  return <>
    <input type="hidden" name="preview_id" value={context.preview_id}/>
    <input type="hidden" name="affected_count" value={context.affected_count}/>
    <input type="hidden" name="expires_at" value={context.expires_at}/>
    <input type="hidden" name="reason" value={context.reason}/>
    <input type="hidden" name="idempotency_key" value={context.idempotency_key}/>
  </>;
}
function parseContext(form:FormData,requireKey:boolean):BulkContext|null{
  const previewId=String(form.get("preview_id")??"").trim();
  const affectedCount=Number(form.get("affected_count"));
  const expiresAt=String(form.get("expires_at")??"").trim();
  const reason=String(form.get("reason")??"").trim();
  const key=String(form.get("idempotency_key")??"").trim();
  if(!UUID.test(previewId)||!Number.isSafeInteger(affectedCount)||affectedCount<0)return null;
  if(!expiresAt||!Number.isFinite(Date.parse(expiresAt)))return null;
  if(!reason||reason.length>REASON_MAX||hasControlCharacters(reason))return null;
  if(requireKey&&!IDEMPOTENCY.test(key))return null;
  if(!requireKey&&key)return null;
  return{preview_id:previewId,affected_count:affectedCount,expires_at:expiresAt,reason,idempotency_key:key};
}
function parseScopeIds(value:FormDataEntryValue|null):readonly string[]|null{
  if(value===null||value==="")return[];
  if(typeof value!=="string"||value.length>SCOPE_IDS_MAX_TEXT||hasUnsafeMultilineControls(value))return null;
  return value.split(/\r?\n|,/).map(x=>x.trim()).filter(Boolean);
}
function parseCredential(value:FormDataEntryValue|null){
  if(typeof value!=="string"||value.length>100000)return null;
  try{
    const parsed=JSON.parse(value);
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return null;
    return parsed as {challenge_id:string;credential_id:string;client_data_json:string;authenticator_data:string;signature:string;user_handle?:string|null};
  }catch{return null;}
}
function createIdempotencyKey():string{return "pricing-bulk-"+globalThis.crypto.randomUUID();}
function invalidResponse(message:string,errors:readonly {field:string;message:string}[]){
  return data<ActionData>({kind:"failure",message,requestId:null,issues:errors.map(x=>({field:x.field,message:x.message}))},{status:400});
}
function failureResponse(
  result:Exclude<Awaited<ReturnType<typeof previewBulkPricing>>|Awaited<ReturnType<typeof readBulkPricingStatus>>|Awaited<ReturnType<typeof applyBulkPricing>>,{kind:"ready"}|{kind:"confirmed"}>,
  headers:Headers,
  phase:"preview"|"apply"|"status",
){
  if(result.kind==="invalid")return data<ActionData>({kind:"failure",message:"Backend یا فرم ورودی را نپذیرفت.",requestId:result.requestId,issues:result.fieldErrors.map(x=>({field:x.field,message:x.message||"مقدار معتبر نیست."}))},{status:422,headers});
  if(result.kind==="expired")return data<ActionData>({kind:"expired",message:"پیش‌نمایش معتبر نیست یا منقضی شده است؛ Apply انجام نشد.",requestId:result.requestId},{status:409,headers});
  if(result.kind==="conflict")return data<ActionData>({kind:"failure",message:"قیمت یا تعداد اقلام از زمان پیش‌نمایش تغییر کرده است؛ پیش‌نمایش تازه بگیرید.",requestId:result.requestId},{status:409,headers});
  if(result.kind==="blocked")return data<ActionData>({kind:"failure",message:"Profit Guard ذخیره‌شده اجازه Apply نمی‌دهد؛ تغییر انجام نشد.",requestId:result.requestId},{status:409,headers});
  if(result.kind==="step_up_required")return data<ActionData>({kind:"failure",message:"احراز مجدد معتبر نیست؛ Apply ارسال نشد.",requestId:result.requestId},{status:403,headers});
  if(result.kind==="not_found")return data<ActionData>({kind:"failure",message:"عملیات موردنظر در مرجع سرور پیدا نشد.",requestId:result.requestId},{status:404,headers});
  if(result.kind==="unknown_outcome")return data<ActionData>({kind:"failure",message:phase==="apply"?"نتیجه Apply نامشخص است؛ replay خودکار ممنوع است.":"نتیجه درخواست قطعی نیست و خودکار تکرار نمی‌شود.",requestId:result.requestId},{status:503,headers});
  return data<ActionData>({kind:"failure",message:result.kind==="denied"?"مجوز عملیات گروهی قیمت برای این نشست تأیید نشد.":"سرویس عملیات گروهی قیمت در دسترس نیست.",requestId:result.requestId},{status:result.kind==="denied"?403:503,headers});
}
function stepUpStartFailure(challenge:{ok:false;code:string;requestId:string|null},headers=new Headers()){
  return data<ActionData>({kind:"failure",message:stepUpFailureMessage(challenge.code),requestId:challenge.requestId},{status:challenge.code==="UNAUTHENTICATED"?401:403,headers});
}
function stepUpFailureMessage(code:string):string{
  if(code==="UNAUTHENTICATED")return"نشست مدیریت معتبر نیست.";
  if(code==="FIDO_FAILED")return"تأیید کلید امنیتی انجام نشد؛ Apply ارسال نشد.";
  return"احراز مجدد کامل نشد؛ Apply ارسال نشد.";
}
function cookieHeaders(values:readonly string[]):Headers{const headers=new Headers();appendAdminAuthSetCookies(headers,values);return headers;}
function formatNumber(value:number):string{return new Intl.NumberFormat("fa-IR").format(value);}
function formatToman(value:string|number):string{const n=Number(value);return Number.isFinite(n)?new Intl.NumberFormat("fa-IR").format(n)+" تومان":String(value);}
function formatDate(value:string):string{const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"}).format(d):"نامعتبر";}
function hasControlCharacters(value:string):boolean{for(const character of value){const code=character.charCodeAt(0);if(code<=0x1f||code===0x7f)return true;}return false;}
function hasUnsafeMultilineControls(value:string):boolean{for(const character of value){const code=character.charCodeAt(0);if((code<=0x1f&&character!=="\n"&&character!=="\r")||code===0x7f)return true;}return false;}
