import { useEffect, useRef, useState } from "react";
import { data, Form, Link, useFetcher, useLoaderData, useNavigation } from "react-router";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  probeInventory,
  submitInventoryAdjustment,
  updateWarehouseProtection,
  validateInventoryAdjustment,
  validateWarehouseProtection,
  type InventoryAdjustmentBody,
  type InventoryProbe,
} from "../operations/inventory-admin.server.js";
import {
  isTrustedOperationsFormOrigin,
  operationsFiniteNumber,
  operationsInteger,
  operationsUuid,
} from "../operations/operations-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { createAdminStepUpChallenge, verifyAdminStepUp } from "../platform/auth/step-up-credentials.server.js";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";

type AdjustmentContext=InventoryAdjustmentBody;

type ActionData=
  | {kind:"step-up-challenge";challengeId:string;options:Record<string,unknown>;context:AdjustmentContext}
  | {kind:"confirmed";message:string;requestId:string|null}
  | {kind:"unknown";message:string;requestId:string|null;idempotencyKey:string|null}
  | {kind:"conflict";message:string;requestId:string|null}
  | {kind:"failure";message:string;requestId:string|null;issues?:readonly {field:string;message:string}[]};

const PROBES=new Set<InventoryProbe>(["overview","warehouses","variant","movements","cost-basis","cost-layers"]);

export async function loader({request,params}:{request:Request;params:{view?:string}}){
  const view=parseView(params.view);
  if(view==="adjustment"){
    return data({kind:"form" as const,view});
  }
  const url=new URL(request.url);
  const requestedProbe=String(url.searchParams.get("probe")??(view==="warehouses"?"warehouses":"overview"));
  const probe=PROBES.has(requestedProbe as InventoryProbe)?requestedProbe as InventoryProbe:(view==="warehouses"?"warehouses":"overview");
  const rawVariant=String(url.searchParams.get("variant_id")??"").trim();
  const variantId=rawVariant?operationsUuid(rawVariant):null;
  const needsVariant=["variant","movements","cost-basis","cost-layers"].includes(probe);
  if(needsVariant&&!variantId){
    return data({kind:"invalid-probe" as const,view,probe,variantInput:rawVariant});
  }
  const result=await probeInventory(request,probe,variantId);
  const headers=new Headers();
  appendAdminAuthSetCookies(headers,result.setCookies);
  if(result.kind!=="ready"){
    if(result.kind==="denied")return data({kind:"denied" as const,view,requestId:result.requestId},{status:403,headers});
    if(result.kind==="not_found")return data({kind:"not-found" as const,view,requestId:result.requestId},{status:404,headers});
    return data({kind:"unavailable" as const,view,requestId:result.requestId},{status:503,headers});
  }
  return data({
    kind:"ready" as const,
    view,
    probe,
    variantInput:rawVariant,
    endpoint:result.endpoint,
    status:result.status,
    requestId:result.requestId,
  },{headers});
}

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedOperationsFormOrigin(request)){
    return data<ActionData>({kind:"failure",message:"درخواست مدیریت موجودی معتبر نیست.",requestId:null},{status:403});
  }
  const form=await request.formData();
  const intent=String(form.get("intent")??"");

  if(intent==="begin-adjustment"){
    const parsed=parseAdjustment(form);
    if(!parsed.ok)return invalid(parsed.issues);
    const challenge=await createAdminStepUpChallenge(request);
    if(!challenge.ok){
      return data<ActionData>({kind:"failure",message:stepUpFailureMessage(challenge.code),requestId:challenge.requestId},{status:challenge.code==="UNAUTHENTICATED"?401:403});
    }
    return data<ActionData>({
      kind:"step-up-challenge",
      challengeId:challenge.challengeId,
      options:challenge.options,
      context:parsed.body,
    });
  }

  if(intent==="verify-adjustment"){
    const parsed=parseAdjustment(form);
    const credential=parseCredential(form.get("credential"));
    if(!parsed.ok||!credential)return data<ActionData>({kind:"failure",message:"پاسخ احراز مجدد یا اطلاعات اصلاح موجودی معتبر نیست.",requestId:null},{status:400});
    const stepped=await verifyAdminStepUp(request,credential);
    if(!stepped.ok)return data<ActionData>({kind:"failure",message:stepUpFailureMessage(stepped.code),requestId:stepped.requestId},{status:stepped.code==="UNAUTHENTICATED"?401:403});
    const result=await submitInventoryAdjustment(request,stepped.token,parsed.body);
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="confirmed"){
      return data<ActionData>({
        kind:"confirmed",
        message:"درخواست اصلاح موجودی با پاسخ قطعی Backend ثبت شد. برای مشاهده اثر، گردش موجودی را دوباره بخوانید.",
        requestId:result.requestId,
      },{headers});
    }
    if(result.kind==="unknown_outcome"){
      return data<ActionData>({
        kind:"unknown",
        message:"نتیجهٔ اصلاح موجودی قطعی نیست. درخواست خودکار تکرار نمی‌شود؛ ابتدا گردش موجودی و وضعیت authoritative را بررسی کنید و فقط در صورت نیاز یک عملیات جدید آغاز کنید.",
        requestId:result.requestId,
        idempotencyKey:result.idempotencyKey??null,
      },{status:503,headers});
    }
    return mutationFailure(result,headers,"اصلاح موجودی");
  }

  if(intent==="update-protection"){
    const warehouseId=operationsUuid(form.get("warehouse_id"));
    const expectedVersion=operationsInteger(form.get("expected_version"));
    const percent=operationsFiniteNumber(form.get("physical_protection_percent"));
    const valid=validateWarehouseProtection({
      warehouseId:warehouseId??"",
      expectedVersion:expectedVersion??Number.NaN,
      percent:percent??Number.NaN,
    });
    if(!valid.ok)return invalid(valid.fieldErrors);
    const result=await updateWarehouseProtection(request,valid.warehouseId,valid.version,valid.body);
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="confirmed"){
      return data<ActionData>({
        kind:"confirmed",
        message:"درصد محافظت انبار با نسخهٔ مورد انتظار به‌روزرسانی شد. برای ادامه، وضعیت انبار را دوباره از سرور بخوانید.",
        requestId:result.requestId,
      },{headers});
    }
    if(result.kind==="conflict"){
      return data<ActionData>({
        kind:"conflict",
        message:"نسخهٔ انبار همزمان تغییر کرده است. هیچ overwrite انجام نشد؛ نسخهٔ تازه را از مرجع معتبر دریافت و دوباره بررسی کنید.",
        requestId:result.requestId,
      },{status:409,headers});
    }
    if(result.kind==="unknown_outcome"){
      return data<ActionData>({
        kind:"unknown",
        message:"نتیجهٔ تغییر درصد محافظت قطعی نیست. درخواست خودکار تکرار نمی‌شود؛ ابتدا وضعیت انبار را دوباره بخوانید.",
        requestId:result.requestId,
        idempotencyKey:null,
      },{status:503,headers});
    }
    return mutationFailure(result,headers,"تغییر درصد محافظت");
  }

  return data<ActionData>({kind:"failure",message:"عملیات موجودی شناخته‌شده نیست.",requestId:null},{status:400});
}

export default function InventoryAdminRoute(){
  const state=useLoaderData<typeof loader>();
  const fetcher=useFetcher<typeof action>();
  const navigation=useNavigation();
  const handledChallenge=useRef<string|null>(null);
  const outcomeRef=useRef<HTMLDivElement|null>(null);
  const [clientError,setClientError]=useState<string|null>(null);
  const busy=fetcher.state!=="idle"||navigation.state!=="idle";

  useEffect(()=>{
    const payload=fetcher.data;
    if(!payload)return;
    if(payload.kind==="step-up-challenge"&&handledChallenge.current!==payload.challengeId){
      handledChallenge.current=payload.challengeId;
      setClientError(null);
      void runAdminWebAuthn("authentication",payload.challengeId,payload.options)
        .then((credential)=>{
          const form=adjustmentContextForm(payload.context);
          form.set("intent","verify-adjustment");
          form.set("credential",JSON.stringify(credential));
          fetcher.submit(form,{method:"post"});
        })
        .catch(()=>{
          handledChallenge.current=null;
          setClientError("احراز مجدد لغو شد یا کلید امنیتی پاسخ نداد؛ اصلاح موجودی ارسال نشد.");
          outcomeRef.current?.focus();
        });
      return;
    }
    if(payload.kind!=="step-up-challenge"){
      handledChallenge.current=null;
      setClientError(null);
      queueMicrotask(()=>outcomeRef.current?.focus());
    }
  },[fetcher.data,fetcher]);

  const view=state.view;
  return (
    <section className="pricing-page" aria-labelledby="inventory-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link><span aria-hidden="true">/</span>
        <span>موجودی</span><span aria-hidden="true">/</span>
        <span aria-current="page">{view==="adjustment"?"اصلاح موجودی":view==="warehouses"?"محافظت انبار":"نمای وضعیت"}</span>
      </nav>
      <header className="pricing-heading">
        <p className="destination-kicker">Step 70-D · AD-D-06 / AD-D-07</p>
        <h1 id="inventory-title">مدیریت موجودی و محافظت انبار</h1>
        <p>داده و عملیات فقط از authority منبع‌اثبات‌شده استفاده می‌کنند. انتقال، رزرو، تخصیص و مصرف فروش در این مرحله فعال نیستند.</p>
      </header>

      <nav className="pricing-actions" aria-label="بخش‌های موجودی">
        <Link to="/inventory/overview">نمای وضعیت و بهای تمام‌شده</Link>
        <Link to="/inventory/adjustment">اصلاح موجودی</Link>
        <Link to="/inventory/warehouses">محافظت انبار</Link>
      </nav>

      <div ref={outcomeRef} tabIndex={-1}>
        {clientError?<div className="pricing-error-summary" role="alert"><h2>عملیات ارسال نشد</h2><p>{clientError}</p></div>:null}
        <Outcome data={fetcher.data}/>
      </div>

      {view==="adjustment"?(
        <section className="pricing-card" aria-labelledby="inventory-adjust-title">
          <h2 id="inventory-adjust-title">اصلاح موجودی با Step-Up</h2>
          <p>Backend authority نهایی موجودی، bucketها، FIFO و موجودی درگیر است. پس از تأیید فرم، WebAuthn Step-Up انجام می‌شود و Idempotency-Key فقط در سرور ساخته می‌شود.</p>
          <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
            <input type="hidden" name="intent" value="begin-adjustment"/>
            <label><span>شناسه انبار</span><input name="warehouse_id" required dir="ltr" autoComplete="off"/></label>
            <label><span>شناسه واریانت</span><input name="variant_id" required dir="ltr" autoComplete="off"/></label>
            <label><span>تغییر تعداد</span><input name="quantity_delta" type="number" step="1" required/></label>
            <label><span>نوع اصلاح</span><select name="adjustment_type" defaultValue="count_correction">
              {INVENTORY_ADJUSTMENT_TYPES.map(type=><option key={type} value={type}>{adjustmentLabel(type)}</option>)}
            </select></label>
            <label><span>بهای واحد تومان (در صورت نیاز)</span><input name="unit_cost_toman" type="number" min="0" step="1"/></label>
            <label className="pricing-form-wide"><span>دلیل</span><textarea name="reason" required rows={3}/></label>
            <div className="pricing-actions pricing-form-wide"><button type="submit" disabled={busy}>احراز مجدد و ارسال اصلاح</button></div>
          </fetcher.Form>
        </section>
      ):view==="warehouses"?(
        <section className="pricing-card" aria-labelledby="warehouse-protection-title">
          <h2 id="warehouse-protection-title">درصد محافظت فروش حضوری</h2>
          <p>نسخهٔ فعلی entity باید صریحاً وارد شود و به If-Match تبدیل می‌شود. در conflict هیچ overwrite خودکاری انجام نمی‌شود. مقدار منبع پیش‌فرض ۲۰٪ است، اما این فرم مقدار فعلی را حدس نمی‌زند.</p>
          {state.kind==="ready"?<p className="pricing-success">خواندن فهرست انبارها از <bdi>{state.endpoint}</bdi> با HTTP <bdi>{state.status}</bdi> موفق بود.</p>:null}
          <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
            <input type="hidden" name="intent" value="update-protection"/>
            <label><span>شناسه انبار</span><input name="warehouse_id" required dir="ltr" autoComplete="off"/></label>
            <label><span>نسخهٔ فعلی</span><input name="expected_version" required type="number" min="1" step="1"/></label>
            <label><span>درصد محافظت</span><input name="physical_protection_percent" required type="number" min="0" max="100" step="any"/></label>
            <div className="pricing-actions pricing-form-wide"><button type="submit" disabled={busy}>ثبت با If-Match</button></div>
          </fetcher.Form>
        </section>
      ):<InventoryOverview state={state} busy={busy}/>}
    </section>
  );
}

function InventoryOverview({state,busy}:{state:ReturnType<typeof useLoaderData<typeof loader>>;busy:boolean}){
  if(state.kind==="denied")return <AdminSurfaceState kind="denied" requestId={state.requestId}/>;
  if(state.kind==="unavailable")return <AdminSurfaceState kind="error" title="خواندن موجودی ممکن نشد" description="دادهٔ حدسی یا stale جایگزین پاسخ معتبر نمی‌شود." requestId={state.requestId}/>;
  if(state.kind==="not-found")return <AdminSurfaceState kind="empty" title="مرجع موجودی پیدا نشد" requestId={state.requestId}/>;
  return (
    <section className="pricing-card" aria-labelledby="inventory-probe-title">
      <h2 id="inventory-probe-title">خواندن منبع‌اثبات‌شده</h2>
      <p>قرارداد generated فعلی body پاسخ این GETها را تایپ نکرده است؛ بنابراین این نما عمداً shape داده را حدس نمی‌زند و فقط موفقیت endpoint، status و request-id را گزارش می‌کند.</p>
      <Form method="get" className="pricing-form">
        <label>
          <span>نوع خواندن</span>
          <select name="probe" defaultValue={state.kind==="ready"?state.probe:"overview"} disabled={busy}>
            <option value="overview">فهرست موجودی</option>
            <option value="variant">جزئیات واریانت</option>
            <option value="movements">گردش موجودی</option>
            <option value="cost-basis">بهای واحد فعلی</option>
            <option value="cost-layers">لایه‌های FIFO</option>
            <option value="warehouses">فهرست انبارها</option>
          </select>
        </label>
        <label>
          <span>شناسهٔ واریانت برای خواندن‌های جزئی</span>
          <input name="variant_id" defaultValue={"variantInput" in state?state.variantInput:""} dir="ltr" autoComplete="off"/>
        </label>
        <div className="pricing-actions pricing-form-wide"><button type="submit" disabled={busy}>خواندن از Backend</button></div>
      </Form>
      {state.kind==="invalid-probe"?<p className="pricing-inline-warning" role="alert">برای این خواندن، UUID معتبر واریانت الزامی است.</p>:null}
      {state.kind==="ready"?<div className="pricing-success" role="status">
        <strong>خواندن معتبر انجام شد.</strong>
        <span>endpoint: <bdi>{state.endpoint}</bdi></span>
        <span>HTTP: <bdi>{state.status}</bdi></span>
        {state.requestId?<span>request-id: <bdi>{state.requestId}</bdi></span>:null}
      </div>:null}
    </section>
  );
}

function Outcome({data:payload}:{data:ActionData|undefined}){
  if(!payload||payload.kind==="step-up-challenge")return null;
  if(payload.kind==="confirmed")return <div className="pricing-success" role="status"><strong>{payload.message}</strong>{payload.requestId?<span> request-id: <bdi>{payload.requestId}</bdi></span>:null}</div>;
  if(payload.kind==="unknown")return <div className="pricing-error-summary" role="alert"><h2>نتیجه نامشخص است</h2><p>{payload.message}</p>{payload.requestId?<p>request-id: <bdi>{payload.requestId}</bdi></p>:null}{payload.idempotencyKey?<p>شناسه idempotency ثبت‌شده برای بررسی: <bdi>{payload.idempotencyKey}</bdi></p>:null}<Link to="/inventory/overview?probe=movements">ابتدا گردش موجودی را بررسی کنید</Link></div>;
  if(payload.kind==="conflict")return <div className="pricing-error-summary" role="alert"><h2>تعارض نسخه</h2><p>{payload.message}</p>{payload.requestId?<p>request-id: <bdi>{payload.requestId}</bdi></p>:null}</div>;
  return <div className="pricing-error-summary" role="alert"><h2>عملیات ادامه پیدا نکرد</h2><p>{payload.message}</p>{payload.issues?.length?<ul>{payload.issues.map((x,i)=><li key={x.field+i}>{x.message}</li>)}</ul>:null}{payload.requestId?<p>request-id: <bdi>{payload.requestId}</bdi></p>:null}</div>;
}

function parseAdjustment(form:FormData){
  const warehouseId=operationsUuid(form.get("warehouse_id"));
  const variantId=operationsUuid(form.get("variant_id"));
  const quantityDelta=operationsInteger(form.get("quantity_delta"));
  const unitRaw=String(form.get("unit_cost_toman")??"").trim();
  const unitCostToman=unitRaw===""?null:operationsInteger(unitRaw);
  const adjustmentType=String(form.get("adjustment_type")??"");
  const reason=String(form.get("reason")??"").trim();
  const result=validateInventoryAdjustment({
    warehouseId:warehouseId??"",
    variantId:variantId??"",
    quantityDelta:quantityDelta??Number.NaN,
    adjustmentType,
    reason,
    unitCostToman:unitRaw!==""&&unitCostToman===null?Number.NaN:unitCostToman,
  });
  return result.ok?result:{ok:false as const,issues:result.fieldErrors};
}

function adjustmentContextForm(body:AdjustmentContext):FormData{
  const form=new FormData();
  form.set("warehouse_id",body.warehouse_id);
  form.set("variant_id",body.variant_id);
  form.set("quantity_delta",String(body.quantity_delta));
  form.set("adjustment_type",body.adjustment_type);
  form.set("reason",body.reason);
  if(body.unit_cost_toman!==undefined)form.set("unit_cost_toman",String(body.unit_cost_toman));
  return form;
}

function parseCredential(value:FormDataEntryValue|null){
  if(typeof value!=="string"||value.length>100000)return null;
  try{
    const parsed=JSON.parse(value);
    return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:null;
  }catch{return null;}
}

function invalid(issues:readonly {field:string;message:string}[]){
  return data<ActionData>({kind:"failure",message:"ورودی‌ها نیاز به اصلاح دارند.",requestId:null,issues},{status:422});
}

function mutationFailure(result:Exclude<Awaited<ReturnType<typeof updateWarehouseProtection>>,{kind:"confirmed"}>,headers:Headers,label:string){
  if(result.kind==="invalid")return data<ActionData>({kind:"failure",message:"Backend ورودی "+label+" را نپذیرفت.",requestId:result.requestId,issues:result.fieldErrors.map(x=>({field:x.field,message:x.message}))},{status:422,headers});
  const messages={
    denied:"مجوز این عملیات برای نشست فعلی تأیید نشد.",
    not_found:"مرجع موردنظر در Backend پیدا نشد.",
    conflict:"نسخه یا وضعیت authoritative تغییر کرده است.",
    unknown_outcome:"نتیجهٔ عملیات قطعی نیست و نباید خودکار تکرار شود.",
    unavailable:"سرویس موجودی در دسترس نیست.",
  } as const;
  return data<ActionData>({kind:result.kind==="conflict"?"conflict":"failure",message:messages[result.kind],requestId:result.requestId},{status:result.kind==="denied"?403:result.kind==="not_found"?404:result.kind==="conflict"?409:503,headers});
}

function cookieHeaders(values:readonly string[]):Headers{const headers=new Headers();appendAdminAuthSetCookies(headers,values);return headers;}
function parseView(value:string|undefined):"overview"|"adjustment"|"warehouses"{return value==="adjustment"||value==="warehouses"?value:"overview";}
function adjustmentLabel(value:string):string{
  const labels:Record<string,string>={
    count_correction:"اصلاح شمارش",
    receipt_adjustment:"اصلاح رسید",
    manual:"اصلاح دستی",
    damage:"انتقال به آسیب‌دیده",
    quarantine:"انتقال به قرنطینه",
    quarantine_release:"آزادسازی قرنطینه",
    damaged_disposal:"امحای آسیب‌دیده",
  };
  return labels[value]??value;
}
function stepUpFailureMessage(code:string):string{
  if(code==="UNAUTHENTICATED")return"نشست مدیریت معتبر نیست.";
  if(code==="FIDO_FAILED")return"تأیید کلید امنیتی انجام نشد؛ اصلاح موجودی ارسال نشد.";
  if(code==="STEP_UP_REQUIRED")return"احراز مجدد منقضی یا نامعتبر است؛ اصلاح موجودی ارسال نشد.";
  return"احراز مجدد کامل نشد؛ اصلاح موجودی ارسال نشد.";
}

