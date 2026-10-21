import { useEffect, useRef, useState } from "react";
import { data, Form, useFetcher, useLoaderData } from "react-router";
import {
  applyCurrencyImpact,
  currencyApplyIdempotencyKey,
  previewCurrencyImpact,
  readCurrencyRates,
  refreshCurrencyRate,
  registerCurrencyRate,
  rejectCurrencyRate,
  selectCurrencyRate,
  type CurrencyImpactPreviewData,
  type CurrencyRateRecord,
  type FxMutationFailure,
} from "../pricing/pricing-fx.server.js";
import {
  isTrustedPricingFormOrigin,
  pricingInteger,
  pricingNumber,
  pricingOptionalText,
  pricingText,
  pricingTimestamp,
  pricingUuid,
  type PricingFormIssue,
} from "../pricing/pricing-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { createAdminStepUpChallenge, verifyAdminStepUp } from "../platform/auth/step-up-credentials.server.js";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client";
import { ActionReviewDialog } from "../security/ActionReviewDialog";

type LoaderData={
  state:"ready"|"denied"|"unavailable";
  rates:readonly CurrencyRateRecord[];
  current:CurrencyRateRecord|null;
  sourceCurrencyCode:string;
  loadedCount:number;
  requestId:string|null;
};
type ApplyContext={operation:"apply";preview_id:string;affected_count:number;expires_at:string;reason:string};
type SelectContext={operation:"select";rate_id:string;reason_code:string;reason:string|null};
type StepUpContext=ApplyContext|SelectContext;
type PreviewSource={kind:"impact";rateId:string}|{kind:"refresh";providerKey:string;rateId:string};
type ActionData=
  |{kind:"preview";preview:CurrencyImpactPreviewData;source:PreviewSource;requestId:string|null}
  |{kind:"step-up-challenge";context:StepUpContext;challengeId:string;options:Record<string,unknown>}
  |{kind:"confirmed";message:string;requestId:string|null}
  |{kind:"unknown";message:string;requestId:string|null}
  |{kind:"failure";message:string;requestId:string|null;issues?:readonly {field:string;message:string}[]};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE=/^[A-Z]{3}$/;
const MAX_SCOPE_TEXT=40000;

export async function loader({request}:{request:Request}){
  const url=new URL(request.url);
  const raw=(url.searchParams.get("currency")??"USD").trim().toUpperCase();
  const code=CODE.test(raw)?raw:"USD";
  const result=await readCurrencyRates(request,code);
  const headers=cookieHeaders(result.setCookies);
  if(result.kind==="ready"){
    return data<LoaderData>({state:"ready",rates:result.rates,current:result.current,sourceCurrencyCode:result.sourceCurrencyCode,loadedCount:result.loadedCount,requestId:result.requestId},{headers});
  }
  return data<LoaderData>({
    state:result.kind==="denied"?"denied":"unavailable",
    rates:[],
    current:null,
    sourceCurrencyCode:code,
    loadedCount:0,
    requestId:result.requestId,
  },{status:result.kind==="denied"?403:503,headers});
}

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedPricingFormOrigin(request)){
    return data<ActionData>({kind:"failure",message:"درخواست مدیریت نرخ ارز معتبر نیست.",requestId:null},{status:403});
  }
  const form=await request.formData();
  const intent=String(form.get("intent")??"");
  const issues:PricingFormIssue[]=[];

  if(intent==="refresh"){
    const providerKey=pricingText(form,"provider_key",{required:true,max:120},issues);
    const code=currencyCode(form.get("source_currency_code"),"source_currency_code",issues);
    const timeout=pricingInteger(form,"timeout_ms",{min:100,max:30000},issues);
    const maxAge=pricingInteger(form,"max_age_ms",{min:60000,max:86400000},issues);
    const scopeType=scopeTypeValue(form.get("scope_type"),issues);
    const scopeIds=parseScopeIds(form.get("scope_ids"),scopeType,issues);
    const includeInactive=form.get("include_inactive")==="on";
    if(issues.length||!providerKey||!code||!scopeType)return invalid("ورودی دریافت نرخ از Provider نیاز به اصلاح دارد.",issues);
    const result=await refreshCurrencyRate(request,{
      provider_key:providerKey,
      source_currency_code:code,
      ...(timeout!==null?{timeout_ms:timeout}:{}),
      ...(maxAge!==null?{max_age_ms:maxAge}:{}),
      scope_type:scopeType,
      ...(scopeType!=="all"?{scope_ids:[...scopeIds]}:{}),
      include_inactive:includeInactive,
    });
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="ready"){
      return data<ActionData>({
        kind:"preview",
        preview:result.refresh.preview,
        source:{kind:"refresh",providerKey:result.refresh.provider_key,rateId:result.refresh.currency_rate.currency_rate_id},
        requestId:result.requestId,
      },{headers});
    }
    return mutationFailure(result,headers,"refresh");
  }

  if(intent==="register"){
    const code=currencyCode(form.get("source_currency_code"),"source_currency_code",issues);
    const rate=pricingNumber(form,"rate_to_toman",{required:true,min:Number.MIN_VALUE},issues);
    const providerId=optionalUuid(form.get("provider_id"),"provider_id",issues);
    const observed=pricingTimestamp(form,"observed_at",{},issues);
    const status=String(form.get("status")??"validated");
    if(status!=="validated"&&status!=="suspicious")issues.push({field:"status",message:"وضعیت نرخ دستی معتبر نیست."});
    if(issues.length||!code||rate===null)return invalid("نرخ دستی معتبر نیست.",issues);
    const result=await registerCurrencyRate(request,{
      source_currency_code:code,
      rate_to_toman:rate,
      ...(providerId?{provider_id:providerId}:{}),
      ...(observed?{observed_at:observed}:{}),
      status:status as "validated"|"suspicious",
    });
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="confirmed"){
      return data<ActionData>({kind:"confirmed",message:`نرخ ${result.registration.source_currency_code} ثبت شد؛ وضعیت: ${result.registration.status}.`,requestId:result.requestId},{headers});
    }
    return mutationFailure(result,headers,"register");
  }

  if(intent==="reject"){
    const rateId=pricingUuid(form,"rate_id",issues);
    const reason=pricingText(form,"reason",{required:true,max:500},issues);
    if(issues.length||!rateId||!reason)return invalid("دلیل رد نرخ معتبر نیست.",issues);
    const result=await rejectCurrencyRate(request,rateId,{reason});
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="confirmed"){
      return data<ActionData>({kind:"confirmed",message:"نرخ ارز رد شد.",requestId:result.requestId},{headers});
    }
    return mutationFailure(result,headers,"reject");
  }

  if(intent==="begin-select"){
    const rateId=pricingUuid(form,"rate_id",issues);
    const reasonCode=pricingText(form,"reason_code",{required:true,max:100},issues);
    const reason=pricingOptionalText(form,"reason",500,issues);
    if(issues.length||!rateId||!reasonCode)return invalid("اطلاعات انتخاب نرخ معتبر نیست.",issues);
    const challenge=await createAdminStepUpChallenge(request);
    if(!challenge.ok)return stepUpStartFailure(challenge);
    return data<ActionData>({
      kind:"step-up-challenge",
      context:{operation:"select",rate_id:rateId,reason_code:reasonCode,reason},
      challengeId:challenge.challengeId,
      options:challenge.options,
    });
  }

  if(intent==="impact-preview"){
    const rateId=pricingUuid(form,"currency_rate_id",issues);
    const scopeType=scopeTypeValue(form.get("scope_type"),issues);
    const scopeIds=parseScopeIds(form.get("scope_ids"),scopeType,issues);
    const includeInactive=form.get("include_inactive")==="on";
    if(issues.length||!rateId||!scopeType)return invalid("دامنه پیش‌نمایش اثر ارز معتبر نیست.",issues);
    const result=await previewCurrencyImpact(request,{
      currency_rate_id:rateId,
      scope_type:scopeType,
      ...(scopeType!=="all"?{scope_ids:[...scopeIds]}:{}),
      include_inactive:includeInactive,
    });
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="ready"){
      return data<ActionData>({kind:"preview",preview:result.preview,source:{kind:"impact",rateId},requestId:result.requestId},{headers});
    }
    return mutationFailure(result,headers,"preview");
  }

  if(intent==="begin-apply"){
    const context=parseApplyContext(form,issues);
    if(issues.length||!context)return invalid("زمینه Apply معتبر نیست.",issues);
    if(Date.parse(context.expires_at)<=Date.now()){
      return data<ActionData>({kind:"failure",message:"پیش‌نمایش اثر ارز منقضی شده است؛ پیش‌نمایش تازه بگیرید.",requestId:null},{status:409});
    }
    const challenge=await createAdminStepUpChallenge(request);
    if(!challenge.ok)return stepUpStartFailure(challenge);
    return data<ActionData>({kind:"step-up-challenge",context,challengeId:challenge.challengeId,options:challenge.options});
  }

  if(intent==="verify-step-up"){
    const context=parseStepUpContext(form.get("context"));
    const credential=parseCredential(form.get("credential"));
    if(!context||!credential){
      return data<ActionData>({kind:"failure",message:"پاسخ احراز مجدد یا زمینه عملیات معتبر نیست.",requestId:null},{status:400});
    }
    if(context.operation==="apply"&&Date.parse(context.expires_at)<=Date.now()){
      return data<ActionData>({kind:"failure",message:"پیش‌نمایش پیش از Apply منقضی شد؛ Apply ارسال نشد.",requestId:null},{status:409});
    }
    const stepped=await verifyAdminStepUp(request,credential);
    if(!stepped.ok)return stepUpStartFailure(stepped);
    if(context.operation==="select"){
      const result=await selectCurrencyRate(request,context.rate_id,stepped.token,{
        reason_code:context.reason_code,
        ...(context.reason?{reason:context.reason}:{}),
      });
      const headers=cookieHeaders(result.setCookies);
      if(result.kind==="confirmed"){
        return data<ActionData>({kind:"confirmed",message:"نرخ پس از احراز مجدد به‌عنوان نرخ منتخب ثبت شد.",requestId:result.requestId},{headers});
      }
      if(result.kind==="unknown_outcome"){
        return data<ActionData>({kind:"unknown",message:"نتیجه انتخاب نرخ قطعی نیست. چون Select فاقد Idempotency-Key است، درخواست خودکار تکرار نمی‌شود؛ فهرست نرخ‌ها را بازخوانی و نتیجه را بررسی کنید.",requestId:result.requestId},{status:503,headers});
      }
      return mutationFailure(result,headers,"select");
    }
    const result=await applyCurrencyImpact(
      request,
      stepped.token,
      currencyApplyIdempotencyKey(context.preview_id),
      {preview_id:context.preview_id,reason:context.reason,expected_affected_count:context.affected_count},
    );
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="confirmed"){
      return data<ActionData>({kind:"confirmed",message:`اعمال اثر ارز با پاسخ قطعی سرور تکمیل شد؛ ${result.result.affected_count} قیمت تغییر کرد.`,requestId:result.requestId},{headers});
    }
    if(result.kind==="unknown_outcome"){
      return data<ActionData>({kind:"unknown",message:"نتیجه Currency Apply قطعی نیست. Idempotency-Key در سرور ثابت است، اما Stage 69-F endpoint وضعیت عمومی منبع‌اثبات‌شده ندارد؛ replay خودکار انجام نمی‌شود و نتیجه باید دستی بررسی شود.",requestId:result.requestId},{status:503,headers});
    }
    return mutationFailure(result,headers,"apply");
  }

  return data<ActionData>({kind:"failure",message:"عملیات FX شناخته‌شده نیست.",requestId:null},{status:400});
}

export default function PricingFxRoute(){
  const loaderData=useLoaderData<typeof loader>();
  const fetcher=useFetcher<typeof action>();
  const [preview,setPreview]=useState<{data:CurrencyImpactPreviewData;source:PreviewSource}|null>(null);
  const [reviewOpen,setReviewOpen]=useState(false);
  const [applyReason,setApplyReason]=useState("");
  const [clientError,setClientError]=useState<string|null>(null);
  const [now,setNow]=useState(()=>Date.now());
  const handledChallenge=useRef<string|null>(null);
  const launcherRef=useRef<HTMLButtonElement|null>(null);
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
        setPreview({data:payload.preview,source:payload.source});
        setReviewOpen(false);
        setClientError(null);
        outcomeRef.current?.focus();
      });
      return;
    }
    if(payload.kind==="step-up-challenge"&&handledChallenge.current!==payload.challengeId){
      handledChallenge.current=payload.challengeId;
      void runAdminWebAuthn("authentication",payload.challengeId,payload.options)
        .then((credential)=>{
          const form=new FormData();
          form.set("intent","verify-step-up");
          form.set("context",JSON.stringify(payload.context));
          form.set("credential",JSON.stringify(credential));
          fetcher.submit(form,{method:"post"});
        })
        .catch(()=>{
          handledChallenge.current=null;
          setClientError("احراز مجدد لغو شد یا کلید امنیتی پاسخ نداد؛ عملیات حساس ارسال نشد.");
        });
      return;
    }
    if(payload.kind==="confirmed"||payload.kind==="unknown"){
      handledChallenge.current=null;
      queueMicrotask(()=>{
        setReviewOpen(false);
        setClientError(null);
        outcomeRef.current?.focus();
      });
    }
  },[fetcher.data,fetcher]);

  const response=fetcher.data;
  const blocked=preview?preview.data.items.some(item=>item.guardStatus==="blocked"||item.guardStatus==="unavailable"):false;
  const expired=preview?Date.parse(preview.data.expires_at)<=now:false;
  const openApplyReview=()=>{
    if(!preview||!applyReason.trim()){
      setClientError("برای Apply دلیل عملیاتی را وارد کنید.");
      return;
    }
    setClientError(null);
    setReviewOpen(true);
  };
  const confirmApply=()=>{
    if(!preview||!applyReason.trim()||busy||blocked||expired)return;
    const form=new FormData();
    form.set("intent","begin-apply");
    form.set("preview_id",preview.data.preview_id);
    form.set("affected_count",String(preview.data.affected_count));
    form.set("expires_at",preview.data.expires_at);
    form.set("reason",applyReason.trim());
    fetcher.submit(form,{method:"post"});
  };

  return <section className="pricing-page pricing-fx-page" aria-labelledby="pricing-fx-title">
    <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><a href="/">مدیریت</a><span aria-hidden="true">/</span><span>قیمت‌گذاری</span><span aria-hidden="true">/</span><span aria-current="page">نرخ ارز</span></nav>
    <header className="pricing-heading">
      <p className="destination-kicker">AD-D-04 · FX</p>
      <h1 id="pricing-fx-title">نرخ ارز، منبع و اثر روی قیمت‌ها</h1>
      <p>انتخاب نرخ و اعمال اثر آن دو فرمان مستقل هستند. اتصال Provider تولیدی جزو Step 77 است؛ این صفحه فقط abstraction موجود Backend را اداره می‌کند.</p>
    </header>

    <div ref={outcomeRef} tabIndex={-1}>
      {response?.kind==="confirmed"?<div className="pricing-success" role="status"><strong>{response.message}</strong>{response.requestId?<span>شناسه پیگیری: <bdi>{response.requestId}</bdi></span>:null}</div>:null}
      {response?.kind==="unknown"?<div className="pricing-error-summary" role="alert"><h2>نتیجه نامشخص است</h2><p>{response.message}</p>{response.requestId?<p>شناسه پیگیری: <bdi>{response.requestId}</bdi></p>:null}</div>:null}
      {response?.kind==="failure"?<div className="pricing-error-summary" role="alert"><h2>عملیات ادامه پیدا نکرد</h2><p>{response.message}</p>{response.issues?.length?<ul>{response.issues.map((x,i)=><li key={x.field+String(i)}><bdi>{x.field}</bdi>: {x.message}</li>)}</ul>:null}{response.requestId?<p>شناسه پیگیری: <bdi>{response.requestId}</bdi></p>:null}</div>:null}
      {clientError?<div className="pricing-error-summary" role="alert"><p>{clientError}</p></div>:null}
    </div>

    <section className="pricing-card" aria-labelledby="rates-title">
      <div className="pricing-section-heading">
        <div><h2 id="rates-title">نرخ‌های ثبت‌شده</h2><p>خواندن با permission مرجع <bdi>pricing.view</bdi> انجام می‌شود. چون OpenAPI این GET را بدون query تایپ کرده، فیلتر ارز فقط روی پاسخ canonical بارگذاری‌شده اعمال می‌شود و تعداد نمایش‌داده‌شده total سراسری نیست.</p></div>
        <Form method="get" className="pricing-filter">
          <label><span>کد ارز</span><input name="currency" defaultValue={loaderData.sourceCurrencyCode} maxLength={3} pattern="[A-Za-z]{3}"/></label>
          <button type="submit">بازخوانی</button>
        </Form>
      </div>
      {loaderData.state==="denied"?<div className="pricing-error-summary" role="alert">مجوز مشاهده نرخ ارز تأیید نشد.</div>:null}
      {loaderData.state==="unavailable"?<div className="pricing-error-summary" role="alert">خواندن نرخ ارز در دسترس نیست.</div>:null}
      {loaderData.state==="ready"&&loaderData.current?<div className="pricing-preview">
        <h3>نرخ منتخب فعلی</h3>
        <dl>
          <div><dt>شناسه</dt><dd><bdi>{loaderData.current.id}</bdi></dd></div>
          <div><dt>ارز</dt><dd><bdi>{loaderData.current.source_currency_code}</bdi></dd></div>
          <div><dt>نرخ</dt><dd>{formatToman(loaderData.current.rate_to_toman)}</dd></div>
          <div><dt>وضعیت</dt><dd><bdi>{loaderData.current.status}</bdi></dd></div>
        </dl>
      </div>:null}
      {loaderData.state==="ready"?<p className="pricing-inline-warning">از {formatNumber(loaderData.loadedCount)} رکورد بارگذاری‌شده، {formatNumber(loaderData.rates.length)} رکورد برای <bdi>{loaderData.sourceCurrencyCode}</bdi> به‌صورت محلی نمایش داده می‌شود.</p>:null}
      {loaderData.state==="ready"&&!loaderData.rates.length?<p>نرخی در پاسخ مرجع وجود ندارد.</p>:null}
      {loaderData.state==="ready"&&loaderData.rates.length?<ul className="pricing-record-list">
        {loaderData.rates.map(rate=><li key={rate.id}>
          <div><strong><bdi>{rate.source_currency_code}</bdi> · {formatToman(rate.rate_to_toman)}</strong><span><bdi>{rate.status}</bdi>{rate.is_selected?" · منتخب":""}</span></div>
          <dl>
            <div><dt>شناسه</dt><dd><bdi>{rate.id}</bdi></dd></div>
            <div><dt>مشاهده</dt><dd>{formatDate(rate.observed_at)}</dd></div>
            <div><dt>Provider ID</dt><dd><bdi>{String(rate.source_provider_id??"—")}</bdi></dd></div>
          </dl>
          <div className="pricing-fx-rate-actions">
            <fetcher.Form method="post" className="pricing-status-form">
              <input type="hidden" name="rate_id" value={rate.id}/>
              <input type="hidden" name="reason_code" value="admin_select"/>
              <label><span>دلیل انتخاب اختیاری</span><input name="reason" maxLength={500}/></label>
              <button type="submit" name="intent" value="begin-select" disabled={busy||rate.is_selected}>احراز مجدد و انتخاب نرخ</button>
            </fetcher.Form>
            <fetcher.Form method="post" className="pricing-status-form">
              <input type="hidden" name="rate_id" value={rate.id}/>
              <label><span>دلیل رد</span><input name="reason" required maxLength={500}/></label>
              <button type="submit" name="intent" value="reject" disabled={busy||rate.status==="rejected"}>رد نرخ</button>
            </fetcher.Form>
          </div>
        </li>)}
      </ul>:null}
    </section>

    <div className="pricing-grid">
      <section className="pricing-card" aria-labelledby="refresh-title">
        <h2 id="refresh-title">دریافت از Provider و پیش‌نمایش اثر</h2>
        <p>این فرمان نرخ را از abstraction موجود دریافت، ثبت و در صورت معتبر بودن impact preview ایجاد می‌کند؛ production provider readiness در این مرحله ادعا نمی‌شود.</p>
        <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
          <label><span>Provider key</span><input name="provider_key" required maxLength={120}/></label>
          <label><span>کد ارز</span><input name="source_currency_code" defaultValue="USD" required maxLength={3} pattern="[A-Za-z]{3}"/></label>
          <label><span>Timeout ms اختیاری</span><input name="timeout_ms" type="number" min="100" max="30000"/></label>
          <label><span>Max age ms اختیاری</span><input name="max_age_ms" type="number" min="60000" max="86400000"/></label>
          <label><span>دامنه اثر</span><select name="scope_type" defaultValue="all"><option value="all">all</option><option value="category">category</option><option value="brand">brand</option><option value="product">product</option></select></label>
          <label className="pricing-form-wide"><span>Scope UUIDها؛ هر خط یا با ویرگول</span><textarea name="scope_ids" maxLength={MAX_SCOPE_TEXT}/></label>
          <label className="pricing-checkbox"><input name="include_inactive" type="checkbox"/><span>شامل واریانت غیرفعال</span></label>
          <div className="pricing-actions pricing-form-wide"><button type="submit" name="intent" value="refresh" disabled={busy}>دریافت و پیش‌نمایش</button></div>
        </fetcher.Form>
      </section>

      <section className="pricing-card" aria-labelledby="register-title">
        <h2 id="register-title">ثبت نرخ دستی</h2>
        <p>ثبت نرخ با انتخاب آن یا اعمال قیمت‌ها یکی نیست. نرخ suspicious باید جداگانه بررسی شود.</p>
        <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
          <label><span>کد ارز</span><input name="source_currency_code" defaultValue="USD" required maxLength={3} pattern="[A-Za-z]{3}"/></label>
          <label><span>نرخ به تومان</span><input name="rate_to_toman" type="number" min="0.000001" step="any" required/></label>
          <label><span>Provider UUID اختیاری</span><input name="provider_id" maxLength={80}/></label>
          <label><span>Observed at با timezone اختیاری</span><input name="observed_at" placeholder="2026-10-21T10:00:00Z" maxLength={80}/></label>
          <label><span>وضعیت اولیه</span><select name="status" defaultValue="validated"><option value="validated">validated</option><option value="suspicious">suspicious</option></select></label>
          <div className="pricing-actions pricing-form-wide"><button type="submit" name="intent" value="register" disabled={busy}>ثبت نرخ</button></div>
        </fetcher.Form>
      </section>
    </div>

    <section className="pricing-card" aria-labelledby="impact-title">
      <h2 id="impact-title">پیش‌نمایش اثر یک نرخ ثبت‌شده</h2>
      <p>Scope query با cap داخلی Backend خوانده می‌شود؛ تعداد بازگشتی اثبات جمعیت کامل نیست. فقط حداکثر ۲۰۰ ردیف در preview نمایش داده می‌شود.</p>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <label><span>Currency Rate UUID</span><input name="currency_rate_id" required maxLength={80}/></label>
        <label><span>دامنه</span><select name="scope_type" defaultValue="all"><option value="all">all</option><option value="category">category</option><option value="brand">brand</option><option value="product">product</option></select></label>
        <label className="pricing-form-wide"><span>Scope UUIDها</span><textarea name="scope_ids" maxLength={MAX_SCOPE_TEXT}/></label>
        <label className="pricing-checkbox"><input name="include_inactive" type="checkbox"/><span>شامل غیرفعال</span></label>
        <div className="pricing-actions pricing-form-wide"><button type="submit" name="intent" value="impact-preview" disabled={busy}>ساخت پیش‌نمایش اثر</button></div>
      </fetcher.Form>
    </section>

    {preview?<section className="pricing-card pricing-fx-preview" aria-labelledby="fx-preview-title">
      <h2 id="fx-preview-title">بازبینی پیش از Apply</h2>
      <dl>
        <div><dt>Preview ID</dt><dd><bdi>{preview.data.preview_id}</bdi></dd></div>
        <div><dt>Rate</dt><dd>{formatToman(preview.data.rate_to_toman)}</dd></div>
        <div><dt>Affected count</dt><dd>{formatNumber(preview.data.affected_count)}</dd></div>
        <div><dt>Visible items</dt><dd>{formatNumber(preview.data.items.length)}{preview.data.affected_count>preview.data.items.length?" از کل اثر":""}</dd></div>
        <div><dt>Expires</dt><dd>{formatDate(preview.data.expires_at)}</dd></div>
      </dl>
      {preview.data.warnings.length?<div className="pricing-inline-warning"><strong>هشدارهای Backend: {formatNumber(preview.data.warnings.length)}</strong><ul>{preview.data.warnings.slice(0,20).map((w,i)=><li key={String(w.variant_id)+String(i)}><bdi>{String(w.variant_id)}</bdi> · {String(w.code)}</li>)}</ul></div>:null}
      <div className="pricing-bulk-table-wrap" tabIndex={0} aria-label="نمونه اقلام اثر نرخ ارز">
        <table className="pricing-bulk-table"><thead><tr><th>واریانت</th><th>قیمت فعلی</th><th>قیمت پیشنهادی</th><th>Guard</th></tr></thead>
          <tbody>{preview.data.items.map(item=><tr key={item.variantId}><td><bdi>{item.variantId}</bdi></td><td>{formatToman(item.oldPriceToman)}</td><td>{formatToman(item.proposedPriceToman)}</td><td><bdi>{item.guardStatus}</bdi>{item.guardReason?" · "+item.guardReason:""}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="pricing-inline-warning">Apply فقط stored guard را بررسی می‌کند. Source موجود requester-binding، بازبینی مجدد قیمت فعلی یا Profit Guard تازه و عمومی در لحظه Apply را اثبات نمی‌کند.</p>
      <label className="pricing-fx-apply-reason"><span>دلیل Apply</span><input value={applyReason} onChange={e=>setApplyReason(e.currentTarget.value)} maxLength={500}/></label>
      <div className="pricing-actions"><button ref={launcherRef} type="button" onClick={openApplyReview} disabled={busy||blocked||expired}>بازبینی نهایی و احراز مجدد</button></div>
      {blocked?<p className="pricing-error-summary" role="alert">حداقل یک ردیف guard مسدود/ناموجود دارد؛ Apply ارسال نمی‌شود.</p>:null}
      {expired?<p className="pricing-error-summary" role="alert">پیش‌نمایش منقضی شده است؛ پیش‌نمایش تازه بگیرید.</p>:null}
    </section>:null}

    <ActionReviewDialog
      open={reviewOpen&&preview!==null}
      title="تأیید اعمال اثر نرخ ارز"
      description="تعداد اثر و دلیل را دوباره بررسی کنید. سپس WebAuthn Step-Up انجام و Apply با Idempotency-Key مشتق‌شده در سرور ارسال می‌شود."
      confirmLabel="احراز مجدد و Apply"
      destructive
      busy={busy}
      onConfirm={confirmApply}
      onClose={()=>{if(!busy){setReviewOpen(false);queueMicrotask(()=>launcherRef.current?.focus());}}}
    >
      {preview?<dl className="pricing-bulk-review"><div><dt>تعداد اثر</dt><dd>{formatNumber(preview.data.affected_count)}</dd></div><div><dt>موارد نمایشی</dt><dd>{formatNumber(preview.data.items.length)}</dd></div><div><dt>دلیل</dt><dd>{applyReason}</dd></div></dl>:null}
    </ActionReviewDialog>
  </section>;
}

function mutationFailure(result:FxMutationFailure,headers:Headers,phase:string){
  if(result.kind==="invalid")return data<ActionData>({kind:"failure",message:"Backend یا فرم ورودی را نپذیرفت.",requestId:result.requestId,issues:result.fieldErrors.map(x=>({field:x.field,message:x.message||"مقدار معتبر نیست."}))},{status:422,headers});
  const messages:Record<Exclude<FxMutationFailure["kind"],"invalid">,string>={
    denied:"مجوز مدیریت FX برای این نشست تأیید نشد.",
    conflict:"وضعیت همزمان تغییر کرده است؛ داده مرجع را دوباره بخوانید.",
    expired:"پیش‌نمایش اثر ارز معتبر نیست یا منقضی شده است.",
    blocked:"Backend عملیات را به‌دلیل نرخ نامعتبر یا Profit Guard متوقف کرد.",
    step_up_required:"احراز مجدد معتبر نیست؛ عملیات حساس ارسال نشد.",
    not_found:"رکورد نرخ یا قانون در مرجع سرور پیدا نشد.",
    review_required:"نرخ دریافت‌شده به‌دلیل انحراف نیازمند بررسی مدیر است؛ impact preview ساخته نشد.",
    provider_unavailable:"Provider یا دریافت نرخ در دسترس/پیکربندی‌شده نیست. Production provider integration متعلق به Step 77 است.",
    unknown_outcome:`نتیجه ${phase} قطعی نیست و خودکار تکرار نمی‌شود.`,
    unavailable:"سرویس FX در دسترس نیست.",
  };
  return data<ActionData>({kind:result.kind==="unknown_outcome"?"unknown":"failure",message:messages[result.kind],requestId:result.requestId} as ActionData,{status:result.kind==="denied"?403:result.kind==="not_found"?404:result.kind==="conflict"||result.kind==="expired"||result.kind==="blocked"||result.kind==="review_required"?409:503,headers});
}
function parseApplyContext(form:FormData,issues:PricingFormIssue[]):ApplyContext|null{
  const previewId=pricingUuid(form,"preview_id",issues);
  const affected=pricingInteger(form,"affected_count",{required:true,min:0},issues);
  const expires=pricingText(form,"expires_at",{required:true,max:80},issues);
  const reason=pricingText(form,"reason",{required:true,max:500},issues);
  if(!previewId||affected===null||!expires||!reason||!Number.isFinite(Date.parse(expires))){if(expires&&!Number.isFinite(Date.parse(expires)))issues.push({field:"expires_at",message:"زمان انقضا معتبر نیست."});return null;}
  return{operation:"apply",preview_id:previewId,affected_count:affected,expires_at:expires,reason};
}
function parseStepUpContext(value:FormDataEntryValue|null):StepUpContext|null{
  if(typeof value!=="string"||value.length>5000)return null;
  try{
    const x=JSON.parse(value) as Partial<StepUpContext>;
    if(x.operation==="select"&&typeof x.rate_id==="string"&&UUID.test(x.rate_id)&&typeof x.reason_code==="string"&&x.reason_code.length>0&&x.reason_code.length<=100){
      const reason=typeof x.reason==="string"&&x.reason.length<=500?x.reason:null;
      return{operation:"select",rate_id:x.rate_id,reason_code:x.reason_code,reason};
    }
    if(x.operation==="apply"&&typeof x.preview_id==="string"&&UUID.test(x.preview_id)&&Number.isSafeInteger(x.affected_count)&&Number(x.affected_count)>=0&&typeof x.expires_at==="string"&&Number.isFinite(Date.parse(x.expires_at))&&typeof x.reason==="string"&&x.reason.length>0&&x.reason.length<=500){
      return{operation:"apply",preview_id:x.preview_id,affected_count:Number(x.affected_count),expires_at:x.expires_at,reason:x.reason};
    }
  }catch{return null;}
  return null;
}
function parseCredential(value:FormDataEntryValue|null){
  if(typeof value!=="string"||value.length>100000)return null;
  try{const x=JSON.parse(value);return x&&typeof x==="object"&&!Array.isArray(x)?x as {challenge_id:string;credential_id:string;client_data_json:string;authenticator_data:string;signature:string;user_handle?:string|null}:null;}catch{return null;}
}
function scopeTypeValue(value:FormDataEntryValue|null,issues:PricingFormIssue[]):"all"|"category"|"brand"|"product"|null{
  const x=String(value??"");
  if(x==="all"||x==="category"||x==="brand"||x==="product")return x;
  issues.push({field:"scope_type",message:"دامنه معتبر نیست."});return null;
}
function parseScopeIds(value:FormDataEntryValue|null,scope:"all"|"category"|"brand"|"product"|null,issues:PricingFormIssue[]):readonly string[]{
  if(scope==="all"){
    if(typeof value==="string"&&value.trim())issues.push({field:"scope_ids",message:"دامنه all شناسه هدف نمی‌پذیرد."});
    return[];
  }
  if(typeof value!=="string"||value.length>MAX_SCOPE_TEXT){issues.push({field:"scope_ids",message:"فهرست شناسه‌ها معتبر نیست."});return[];}
  const ids=[...new Set(value.split(/\r?\n|,/).map(x=>x.trim()).filter(Boolean))];
  if(!ids.length)issues.push({field:"scope_ids",message:"برای این دامنه حداقل یک UUID لازم است."});
  if(ids.length>500)issues.push({field:"scope_ids",message:"حداکثر ۵۰۰ UUID در فرم پذیرفته می‌شود."});
  if(ids.some(x=>!UUID.test(x)))issues.push({field:"scope_ids",message:"همه شناسه‌ها باید UUID معتبر باشند."});
  return ids;
}
function currencyCode(value:FormDataEntryValue|null,field:string,issues:PricingFormIssue[]):string|null{
  const code=typeof value==="string"?value.trim().toUpperCase():"";
  if(!CODE.test(code)){issues.push({field,message:"کد ارز باید سه حرف لاتین باشد."});return null;}return code;
}
function optionalUuid(value:FormDataEntryValue|null,field:string,issues:PricingFormIssue[]):string|null{
  if(value===null||value==="")return null;
  const x=String(value).trim();
  if(!UUID.test(x)){issues.push({field,message:"UUID معتبر نیست."});return null;}return x;
}
function invalid(message:string,issues:readonly PricingFormIssue[]){return data<ActionData>({kind:"failure",message,requestId:null,issues},{status:422});}
function stepUpStartFailure(challenge:{ok:false;code:string;requestId:string|null},headers=new Headers()){
  const message=challenge.code==="UNAUTHENTICATED"?"نشست مدیریت معتبر نیست.":challenge.code==="FIDO_FAILED"?"تأیید کلید امنیتی انجام نشد؛ فرمان حساس ارسال نشد.":"احراز مجدد کامل نشد؛ فرمان حساس ارسال نشد.";
  return data<ActionData>({kind:"failure",message,requestId:challenge.requestId},{status:challenge.code==="UNAUTHENTICATED"?401:403,headers});
}
function cookieHeaders(values:readonly string[]):Headers{const headers=new Headers();appendAdminAuthSetCookies(headers,values);return headers;}
function formatNumber(value:number):string{return new Intl.NumberFormat("fa-IR").format(value);}
function formatToman(value:string|number):string{const n=Number(value);return Number.isFinite(n)?new Intl.NumberFormat("fa-IR").format(n)+" تومان":String(value);}
function formatDate(value:string):string{const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"}).format(d):"نامعتبر";}
