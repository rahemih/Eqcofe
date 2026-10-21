import { useEffect, useRef } from "react";
import {
  data,
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import {
  createVariantBasePrice,
  previewBasePrice,
  readBasePriceHistory,
} from "../pricing/pricing-admin.server.js";
import {
  isTrustedPricingFormOrigin,
  pricingInteger,
  pricingText,
  pricingTimestamp,
  pricingUuid,
  type PricingFormIssue,
} from "../pricing/pricing-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";

type ActionData =
  | {
      kind: "preview";
      preview: {
        variantId: string;
        currentPriceToman: number | null;
        proposedPriceToman: number;
        guardStatus: string;
        guardReason: string | null;
        effectiveFrom: string;
      };
      requestId: string | null;
    }
  | { kind: "confirmed"; message: string; requestId: string | null }
  | { kind: "invalid"; message: string; issues: readonly PricingFormIssue[]; requestId: string | null }
  | {
      kind: "failure";
      message: string;
      requestId: string | null;
      needsRevalidation?: boolean;
    };

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loader({request}:{request:Request}){
  const url=new URL(request.url);
  const filterInput=(url.searchParams.get("variant")??"").trim();
  const filterVariantId=filterInput&&UUID_RE.test(filterInput)?filterInput:null;
  const result=await readBasePriceHistory(request,filterVariantId);
  const headers=new Headers();
  appendAdminAuthSetCookies(headers,result.setCookies);

  if(result.kind==="denied"){
    return data({kind:"denied" as const,requestId:result.requestId},{status:403,headers});
  }
  if(result.kind==="not_found"){
    return data({kind:"unavailable" as const,requestId:result.requestId},{status:404,headers});
  }
  if(result.kind==="unavailable"){
    return data({kind:"unavailable" as const,requestId:result.requestId},{status:503,headers});
  }

  return data({
    kind:"ready" as const,
    records:result.records,
    loadedCount:result.loadedCount,
    filterInput,
    filterVariantId,
    filterIssue:filterInput&&!filterVariantId?"شناسهٔ فیلتر باید UUID معتبر باشد؛ فیلتر نامعتبر اعمال نشد.":null,
    requestId:result.requestId,
  },{headers});
}

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedPricingFormOrigin(request)){
    return data<ActionData>(
      {kind:"failure",message:"درخواست تغییر قیمت معتبر نیست.",requestId:null},
      {status:403},
    );
  }

  const form=await request.formData();
  const intent=String(form.get("intent")??"");
  const issues:PricingFormIssue[]=[];
  const variantId=pricingUuid(form,"variant_id",issues);
  const amount=pricingInteger(form,"amount_toman",{required:true,min:0},issues);
  const effectiveFrom=pricingTimestamp(form,"effective_from",{required:true},issues);

  if(intent==="preview-base-price"){
    if(issues.length||!variantId||amount===null||!effectiveFrom){
      return invalidAction(issues);
    }
    const result=await previewBasePrice(request,{
      variant_id:variantId,
      amount_toman:amount,
      effective_from:effectiveFrom,
      effective_until:null,
    });
    const headers=new Headers();
    appendAdminAuthSetCookies(headers,result.setCookies);
    if(result.kind==="preview"){
      return data<ActionData>({
        kind:"preview",
        preview:{
          variantId:result.preview.variant_id,
          currentPriceToman:result.preview.current_price_toman,
          proposedPriceToman:result.preview.proposed_price_toman,
          guardStatus:result.preview.profit_guard.status,
          guardReason:result.preview.profit_guard.reason??null,
          effectiveFrom:result.preview.effective_from,
        },
        requestId:result.requestId,
      },{headers});
    }
    if(result.kind==="invalid"){
      return data<ActionData>({
        kind:"invalid",
        message:"پیش‌نمایش به دلیل ورودی نامعتبر انجام نشد.",
        issues:result.fieldErrors.map((x)=>({field:x.field,message:x.message})),
        requestId:result.requestId,
      },{status:422,headers});
    }
    return data<ActionData>({
      kind:"failure",
      message:result.kind==="denied"
        ?"مجوز پیش‌نمایش قیمت برای این نشست تأیید نشد."
        :"پیش‌نمایش معتبر از سرور دریافت نشد؛ هیچ تغییری اعمال نشده است.",
      requestId:result.requestId,
    },{status:result.kind==="denied"?403:503,headers});
  }

  if(intent==="create-base-price"){
    const reason=pricingText(form,"reason",{required:true,max:1000},issues);
    if(issues.length||!variantId||amount===null||!effectiveFrom||!reason){
      return invalidAction(issues);
    }
    const result=await createVariantBasePrice(request,variantId,{
      amount_toman:amount,
      effective_from:effectiveFrom,
      reason,
    });
    const headers=new Headers();
    appendAdminAuthSetCookies(headers,result.setCookies);
    if(result.kind==="confirmed"){
      return data<ActionData>({
        kind:"confirmed",
        message:"قیمت پایه "+formatToman(result.mutation.new_price_toman)+" برای واریانت ثبت شد.",
        requestId:result.requestId,
      },{headers});
    }
    if(result.kind==="invalid"){
      return data<ActionData>({
        kind:"invalid",
        message:"Backend ورودی ایجاد قیمت را نپذیرفت.",
        issues:result.fieldErrors.map((x)=>({field:x.field,message:x.message})),
        requestId:result.requestId,
      },{status:422,headers});
    }
    return mutationFailure(result.kind,result.requestId,headers);
  }

  return data<ActionData>(
    {kind:"failure",message:"عملیات قیمت ناشناخته است.",requestId:null},
    {status:400},
  );
}

export default function PricingBasePricesRoute(){
  const state=useLoaderData<typeof loader>();
  const actionData=useActionData<ActionData>();
  const navigation=useNavigation();
  const errorRef=useRef<HTMLDivElement>(null);
  const busy=navigation.state!=="idle";

  useEffect(()=>{
    if(actionData&&(actionData.kind==="invalid"||actionData.kind==="failure")){
      errorRef.current?.focus();
    }
  },[actionData]);

  if(state.kind==="denied"){
    return <AdminSurfaceState kind="denied" requestId={state.requestId} action={{href:"/",label:"بازگشت به نمای کلی"}} />;
  }
  if(state.kind==="unavailable"){
    return (
      <AdminSurfaceState
        kind="error"
        title="تاریخچهٔ قیمت پایه در دسترس نیست"
        description="دادهٔ قدیمی جایگزین پاسخ معتبر نمی‌شود."
        requestId={state.requestId}
        action={{href:"/pricing/base-prices",label:"خواندن دوباره"}}
      />
    );
  }

  return (
    <section className="pricing-page" aria-labelledby="base-price-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link><span aria-hidden="true">/</span>
        <span>قیمت و ارز</span><span aria-hidden="true">/</span>
        <span aria-current="page">قیمت پایه و تاریخچه</span>
      </nav>
      <header className="pricing-heading">
        <p className="foundation-kicker">AD-D-01 · مرحله 69-D</p>
        <h1 id="base-price-title">قیمت پایه و تاریخچه</h1>
        <p>تاریخچه از پاسخ canonical سرور خوانده می‌شود. پیش‌نمایش فقط اطلاع‌رسانی است و مجوز ایجاد قیمت محسوب نمی‌شود.</p>
      </header>

      {actionData&&(actionData.kind==="invalid"||actionData.kind==="failure")?(
        <div className="pricing-error-summary" role="alert" tabIndex={-1} ref={errorRef}>
          <h2>{actionData.message}</h2>
          {"issues" in actionData&&actionData.issues.length?(
            <ul>{actionData.issues.map((issue,index)=><li key={issue.field+index}><bdi>{issue.field}</bdi>: {issue.message}</li>)}</ul>
          ):null}
          {actionData.requestId?<p>شناسه پیگیری: <bdi>{actionData.requestId}</bdi></p>:null}
          {actionData.needsRevalidation?<p>پیش از تلاش دوباره، تاریخچهٔ معتبر را دوباره بخوانید.</p>:null}
        </div>
      ):null}

      {actionData?.kind==="confirmed"?(
        <div className="pricing-success" role="status" aria-live="polite">
          <strong>{actionData.message}</strong>
          {actionData.requestId?<span> شناسه پیگیری: <bdi>{actionData.requestId}</bdi></span>:null}
          <Link to="/pricing/base-prices">بازخوانی تاریخچه</Link>
        </div>
      ):null}

      <section className="pricing-card" aria-labelledby="base-create-title">
        <h2 id="base-create-title">پیش‌نمایش و ثبت قیمت جدید</h2>
        <p>شناسهٔ واریانت، مبلغ صحیح تومان و زمان ISO 8601 شامل منطقهٔ زمانی وارد شود. ثبت نهایی از مسیر variant-specific انجام می‌شود.</p>
        <Form method="post" className="pricing-form" aria-busy={busy}>
          <label>
            <span>شناسهٔ واریانت</span>
            <input name="variant_id" required maxLength={80} dir="ltr" autoComplete="off" />
          </label>
          <label>
            <span>مبلغ تومان</span>
            <input name="amount_toman" required type="number" min="0" step="1" inputMode="numeric" />
          </label>
          <label>
            <span>زمان اثرگذاری</span>
            <input name="effective_from" required dir="ltr" placeholder="2026-10-21T08:30:00+03:30" autoComplete="off" />
          </label>
          <label className="pricing-form-wide">
            <span>دلیل ثبت</span>
            <textarea name="reason" maxLength={1000} rows={3} />
          </label>
          <div className="pricing-actions pricing-form-wide">
            <button type="submit" name="intent" value="preview-base-price" disabled={busy}>پیش‌نمایش کنترل سود</button>
            <button type="submit" name="intent" value="create-base-price" disabled={busy}>ثبت قیمت پایه</button>
          </div>
        </Form>
        {actionData?.kind==="preview"?(
          <div className="pricing-preview" role="status" aria-live="polite">
            <h3>نتیجهٔ پیش‌نمایش معتبر</h3>
            <dl>
              <div><dt>قیمت فعلی</dt><dd>{actionData.preview.currentPriceToman===null?"ثبت نشده":formatToman(actionData.preview.currentPriceToman)}</dd></div>
              <div><dt>قیمت پیشنهادی</dt><dd>{formatToman(actionData.preview.proposedPriceToman)}</dd></div>
              <div><dt>کنترل سود</dt><dd><bdi>{actionData.preview.guardStatus}</bdi>{actionData.preview.guardReason?" — "+actionData.preview.guardReason:""}</dd></div>
              <div><dt>زمان اثرگذاری</dt><dd><bdi>{actionData.preview.effectiveFrom}</bdi></dd></div>
            </dl>
            <p>این پیش‌نمایش apply token ایجاد نمی‌کند؛ ثبت نهایی یک درخواست جداگانه و مجوزمحور است.</p>
          </div>
        ):null}
      </section>

      <section className="pricing-card" aria-labelledby="base-history-title">
        <div className="pricing-section-heading">
          <div>
            <h2 id="base-history-title">ردیف‌های تاریخچهٔ بارگذاری‌شده</h2>
            <p>{state.loadedCount} ردیف در پاسخ فعلی بارگذاری شده است؛ این عدد شمارش کل موجودی یا کل تاریخچه تضمین‌شده نیست.</p>
          </div>
          <Form method="get" className="pricing-filter">
            <label>
              <span>فیلتر محلی شناسهٔ واریانت</span>
              <input name="variant" defaultValue={state.filterInput} dir="ltr" autoComplete="off" />
            </label>
            <button type="submit">اعمال روی ردیف‌های بارگذاری‌شده</button>
            {state.filterInput?<Link to="/pricing/base-prices">پاک‌کردن فیلتر</Link>:null}
          </Form>
        </div>
        {state.filterIssue?<p className="pricing-inline-warning" role="alert">{state.filterIssue}</p>:null}
        {state.records.length?(
          <ul className="pricing-record-list">
            {state.records.map((record)=>(
              <li key={record.id}>
                <div><strong>{formatToman(record.amount_toman)}</strong><span><bdi>{record.sku??record.variant_id}</bdi></span></div>
                <dl>
                  <div><dt>واریانت</dt><dd><bdi>{record.variant_id}</bdi></dd></div>
                  <div><dt>منبع</dt><dd><bdi>{record.source_type}</bdi></dd></div>
                  <div><dt>شروع</dt><dd><bdi>{record.valid_from}</bdi></dd></div>
                  <div><dt>پایان</dt><dd>{record.valid_until?<bdi>{record.valid_until}</bdi>:"باز"}</dd></div>
                  <div><dt>نسخه</dt><dd><bdi>{String(record.version)}</bdi></dd></div>
                </dl>
              </li>
            ))}
          </ul>
        ):(
          <AdminSurfaceState
            kind="empty"
            compact
            title={state.filterVariantId?"در ردیف‌های بارگذاری‌شده نتیجه‌ای برای این واریانت نیست":"قیمت پایه‌ای در پاسخ فعلی نیست"}
            description={state.filterVariantId?"فیلتر فقط روی پاسخ فعلی اعمال شده است؛ نبود نتیجه وجود نداشتن تاریخی رکورد را اثبات نمی‌کند.":"سرور پاسخ معتبر خالی برگردانده است."}
          />
        )}
      </section>
    </section>
  );
}

function invalidAction(issues:readonly PricingFormIssue[]){
  return data<ActionData>({
    kind:"invalid",
    message:"ورودی‌ها نیاز به اصلاح دارند.",
    issues,
    requestId:null,
  },{status:422});
}

function mutationFailure(
  kind:"denied"|"conflict"|"not_found"|"unknown_outcome"|"unavailable",
  requestId:string|null,
  headers:Headers,
){
  const map={
    denied:"مجوز تغییر قیمت برای این نشست تأیید نشد.",
    conflict:"وضعیت معتبر همزمان تغییر کرده است؛ تاریخچه را دوباره بخوانید.",
    not_found:"واریانت موردنظر دیگر از مرجع سرور پیدا نشد.",
    unknown_outcome:"نتیجهٔ درخواست ثبت قیمت قطعی نیست؛ برای جلوگیری از ثبت تکراری، خودکار دوباره ارسال نمی‌شود.",
    unavailable:"سرویس قیمت‌گذاری در دسترس نیست.",
  } as const;
  return data<ActionData>({
    kind:"failure",
    message:map[kind],
    requestId,
    needsRevalidation:kind==="conflict"||kind==="unknown_outcome",
  },{status:kind==="denied"?403:kind==="not_found"?404:kind==="conflict"?409:503,headers});
}

function formatToman(value:string|number):string{
  const numeric=Number(value);
  if(!Number.isFinite(numeric))return String(value);
  return new Intl.NumberFormat("fa-IR").format(numeric)+" تومان";
}
