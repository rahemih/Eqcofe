import { useEffect, useRef, useState } from "react";
import { data, Form, Link, useFetcher, useLoaderData, useNavigation } from "react-router";
import {
  createPurchaseOrder,
  createPurchaseRequest,
  createSupplier,
  readProcurement,
  setSupplierStatus,
  transitionPurchaseOrder,
  transitionPurchaseRequest,
  updatePurchaseOrder,
  updatePurchaseRequest,
  updateSupplier,
  validatePurchaseOrderCreate,
  validatePurchaseOrderUpdate,
  validatePurchaseRequestCreate,
  validatePurchaseRequestUpdate,
  validateSupplierCreate,
  validateSupplierUpdate,
  type ProcurementMutationResult,
  type ProcurementView,
  type PurchaseOrderCreateBody,
  type PurchaseOrderUpdateBody,
  type PurchaseRequestCreateBody,
  type PurchaseRequestUpdateBody,
  type SupplierCreateBody,
  type SupplierUpdateBody,
} from "../operations/procurement-admin.server.js";
import {
  isTrustedOperationsFormOrigin,
  operationsInteger,
  operationsUuid,
} from "../operations/operations-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { createAdminStepUpChallenge, verifyAdminStepUp } from "../platform/auth/step-up-credentials.server.js";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";

type StepUpContext={
  entity:"request"|"order";
  action:"approve"|"reject";
  id:string;
  expectedVersion:number;
  reason:string|null;
};
type ActionData=
  | {kind:"step-up-challenge";challengeId:string;options:Record<string,unknown>;context:StepUpContext}
  | {kind:"confirmed";message:string;requestId:string|null;idempotencyKey:string|null}
  | {kind:"unknown";message:string;requestId:string|null;idempotencyKey:string|null}
  | {kind:"conflict";message:string;requestId:string|null}
  | {kind:"failure";message:string;requestId:string|null;issues?:readonly {field:string;message:string}[]};

export async function loader({request,params}:{request:Request;params:{view?:string}}){
  const view=parseView(params.view);
  const url=new URL(request.url);
  const rawId=String(url.searchParams.get("id")??"").trim();
  if(rawId&&!operationsUuid(rawId))return data({kind:"invalid" as const,view,message:"شناسه باید UUID معتبر باشد."},{status:400});
  const result=await readProcurement(request,view,rawId||null);
  const headers=cookieHeaders(result.setCookies);
  if(result.kind!=="ready"){
    if(result.kind==="denied")return data({kind:"denied" as const,view,requestId:result.requestId},{status:403,headers});
    if(result.kind==="not_found")return data({kind:"not-found" as const,view,requestId:result.requestId},{status:404,headers});
    return data({kind:"unavailable" as const,view,requestId:result.requestId},{status:503,headers});
  }
  return data({kind:"ready" as const,view,endpoint:result.endpoint,status:result.status,requestId:result.requestId,idInput:rawId},{headers});
}

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedOperationsFormOrigin(request)){
    return data<ActionData>({kind:"failure",message:"درخواست مدیریت تدارکات معتبر نیست.",requestId:null},{status:403});
  }
  const form=await request.formData();
  const intent=String(form.get("intent")??"");

  if(intent==="supplier-create"){
    const termsRaw=String(form.get("payment_terms_days")??"").trim();
    const terms=termsRaw===""?undefined:operationsInteger(termsRaw);
    const body:SupplierCreateBody={
      code:String(form.get("code")??"").trim(),
      name_fa:String(form.get("name_fa")??"").trim(),
      ...optional("legal_name",form),
      ...optional("national_id",form),
      ...optional("mobile",form),
      ...optional("phone",form),
      ...optional("email",form),
      ...(terms===undefined?{}:{payment_terms_days:terms??Number.NaN}),
      ...optional("notes",form),
    };
    const valid=validateSupplierCreate(body);
    if(!valid.ok)return invalid(valid.fieldErrors);
    return mutation(await createSupplier(request,valid.body),"ایجاد تأمین‌کننده");
  }

  if(intent==="supplier-update"){
    const target=parseVersionTarget(form);
    if(!target.ok)return invalid(target.issues);
    const body=parseObject<SupplierUpdateBody>(form.get("body_json"));
    if(!body)return invalid([{field:"body_json",message:"بدنهٔ JSON به‌روزرسانی تأمین‌کننده معتبر نیست."}]);
    const valid=validateSupplierUpdate(body);
    if(!valid.ok)return invalid(valid.fieldErrors);
    return mutation(await updateSupplier(request,target.id,target.version,valid.body),"به‌روزرسانی تأمین‌کننده");
  }

  if(intent==="supplier-status"){
    const target=parseVersionTarget(form);
    const transition=String(form.get("transition")??"");
    if(!target.ok)return invalid(target.issues);
    if(transition!=="activate"&&transition!=="deactivate")return invalid([{field:"transition",message:"وضعیت هدف معتبر نیست."}]);
    return mutation(await setSupplierStatus(request,target.id,target.version,transition),"تغییر وضعیت تأمین‌کننده");
  }

  if(intent==="request-create"){
    const items=parseArray<PurchaseRequestCreateBody["items"][number]>(form.get("items_json"));
    if(!items)return invalid([{field:"items_json",message:"آرایهٔ اقلام درخواست خرید معتبر نیست."}]);
    const body:PurchaseRequestCreateBody={
      warehouse_id:String(form.get("warehouse_id")??"").trim(),
      reason:String(form.get("reason")??"").trim(),
      items,
    };
    const valid=validatePurchaseRequestCreate(body);
    if(!valid.ok)return invalid(valid.fieldErrors);
    return mutation(await createPurchaseRequest(request,valid.body),"ایجاد درخواست خرید");
  }

  if(intent==="request-update"){
    const target=parseVersionTarget(form);
    if(!target.ok)return invalid(target.issues);
    const body=parseObject<PurchaseRequestUpdateBody>(form.get("body_json"));
    if(!body)return invalid([{field:"body_json",message:"بدنهٔ JSON به‌روزرسانی درخواست خرید معتبر نیست."}]);
    const valid=validatePurchaseRequestUpdate(body);
    if(!valid.ok)return invalid(valid.fieldErrors);
    return mutation(await updatePurchaseRequest(request,target.id,target.version,valid.body),"به‌روزرسانی درخواست خرید");
  }

  if(intent==="request-transition"){
    const target=parseVersionTarget(form);
    const transition=String(form.get("transition")??"");
    const reason=String(form.get("reason")??"").trim()||null;
    if(!target.ok)return invalid(target.issues);
    if(!["submit","approve","reject","cancel"].includes(transition))return invalid([{field:"transition",message:"گذار درخواست خرید معتبر نیست."}]);
    if((transition==="reject"||transition==="cancel")&&!reason)return invalid([{field:"reason",message:"برای رد یا لغو، دلیل الزامی است."}]);
    if(transition==="approve"||transition==="reject"){
      return beginStepUp(request,{entity:"request",action:transition,id:target.id,expectedVersion:target.version,reason});
    }
    return mutation(await transitionPurchaseRequest(request,target.id,target.version,transition as "submit"|"cancel",reason,null),"تغییر وضعیت درخواست خرید");
  }

  if(intent==="order-create"){
    const items=parseArray<PurchaseOrderCreateBody["items"][number]>(form.get("items_json"));
    if(!items)return invalid([{field:"items_json",message:"آرایهٔ اقلام سفارش خرید معتبر نیست."}]);
    const expected=String(form.get("expected_at")??"").trim();
    const requestId=String(form.get("purchase_request_id")??"").trim();
    const body:PurchaseOrderCreateBody={
      supplier_id:String(form.get("supplier_id")??"").trim(),
      warehouse_id:String(form.get("warehouse_id")??"").trim(),
      ...(requestId?{purchase_request_id:requestId}:{}),
      ...(expected?{expected_at:expected}:{}),
      items,
    };
    const valid=validatePurchaseOrderCreate(body);
    if(!valid.ok)return invalid(valid.fieldErrors);
    return mutation(await createPurchaseOrder(request,valid.body),"ایجاد سفارش خرید");
  }

  if(intent==="order-update"){
    const target=parseVersionTarget(form);
    if(!target.ok)return invalid(target.issues);
    const body=parseObject<PurchaseOrderUpdateBody>(form.get("body_json"));
    if(!body)return invalid([{field:"body_json",message:"بدنهٔ JSON به‌روزرسانی سفارش خرید معتبر نیست."}]);
    const valid=validatePurchaseOrderUpdate(body);
    if(!valid.ok)return invalid(valid.fieldErrors);
    return mutation(await updatePurchaseOrder(request,target.id,target.version,valid.body),"به‌روزرسانی سفارش خرید");
  }

  if(intent==="order-transition"){
    const target=parseVersionTarget(form);
    const transition=String(form.get("transition")??"");
    const reason=String(form.get("reason")??"").trim()||null;
    if(!target.ok)return invalid(target.issues);
    if(!["submit","approve","send","cancel","close"].includes(transition))return invalid([{field:"transition",message:"گذار سفارش خرید معتبر نیست."}]);
    if((transition==="cancel"||transition==="close")&&!reason)return invalid([{field:"reason",message:"برای لغو یا بستن سفارش، توضیح الزامی است."}]);
    if(transition==="approve")return beginStepUp(request,{entity:"order",action:"approve",id:target.id,expectedVersion:target.version,reason:null});
    return mutation(await transitionPurchaseOrder(request,target.id,target.version,transition as "submit"|"send"|"cancel"|"close",reason,null),"تغییر وضعیت سفارش خرید");
  }

  if(intent==="verify-stepup"){
    const credential=parseCredential(form.get("credential"));
    const context=parseStepUpContext(form);
    if(!credential||!context)return data<ActionData>({kind:"failure",message:"پاسخ احراز مجدد یا context عملیات معتبر نیست.",requestId:null},{status:400});
    const stepped=await verifyAdminStepUp(request,credential);
    if(!stepped.ok)return data<ActionData>({kind:"failure",message:stepUpFailureMessage(stepped.code),requestId:stepped.requestId},{status:stepped.code==="UNAUTHENTICATED"?401:403});
    if(context.entity==="request"){
      return mutation(await transitionPurchaseRequest(request,context.id,context.expectedVersion,context.action,context.reason,stepped.token),"تأیید/رد درخواست خرید");
    }
    return mutation(await transitionPurchaseOrder(request,context.id,context.expectedVersion,"approve",null,stepped.token),"تأیید سفارش خرید");
  }

  return data<ActionData>({kind:"failure",message:"عملیات تدارکات شناخته‌شده نیست.",requestId:null},{status:400});
}

export default function ProcurementRoute(){
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
      queueMicrotask(()=>setClientError(null));
      void runAdminWebAuthn("authentication",payload.challengeId,payload.options)
        .then(credential=>{
          const form=stepUpContextForm(payload.context);
          form.set("intent","verify-stepup");
          form.set("credential",JSON.stringify(credential));
          fetcher.submit(form,{method:"post"});
        })
        .catch(()=>{
          handledChallenge.current=null;
          setClientError("احراز مجدد لغو شد یا کلید امنیتی پاسخ نداد؛ عملیات تأیید/رد ارسال نشد.");
          outcomeRef.current?.focus();
        });
      return;
    }
    if(payload.kind!=="step-up-challenge"){
      handledChallenge.current=null;
      queueMicrotask(()=>{setClientError(null);outcomeRef.current?.focus();});
    }
  },[fetcher.data,fetcher]);

  const view=state.view;
  return <section className="pricing-page" aria-labelledby="procurement-title">
    <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
      <Link to="/">مدیریت</Link><span aria-hidden="true">/</span><span>تدارکات</span><span aria-hidden="true">/</span>
      <span aria-current="page">{viewLabel(view)}</span>
    </nav>
    <header className="pricing-heading">
      <p className="destination-kicker">Step 70-F · AD-D-12 / AD-D-13 / AD-D-14</p>
      <h1 id="procurement-title">تأمین‌کنندگان، درخواست خرید و سفارش خرید</h1>
      <p>تمام mutationها فقط از authority زنده Backend و generated contract استفاده می‌کنند. رسید کالا، landed cost، صورتحساب و مرجوعی خرید متعلق به 70-G هستند.</p>
    </header>
    <nav className="pricing-actions" aria-label="بخش‌های تدارکات">
      <Link to="/procurement/suppliers">تأمین‌کنندگان</Link>
      <Link to="/procurement/requests">درخواست خرید</Link>
      <Link to="/procurement/orders">سفارش خرید</Link>
    </nav>

    <ReadCard state={state} busy={busy}/>

    <div ref={outcomeRef} tabIndex={-1}>
      {clientError?<div className="pricing-error-summary" role="alert"><h2>عملیات ارسال نشد</h2><p>{clientError}</p></div>:null}
      <Outcome payload={fetcher.data}/>
    </div>

    {view==="suppliers"?<SupplierForms fetcher={fetcher} busy={busy}/>:view==="requests"?<RequestForms fetcher={fetcher} busy={busy}/>:<OrderForms fetcher={fetcher} busy={busy}/>}
  </section>;
}

function ReadCard({state,busy}:{state:ReturnType<typeof useLoaderData<typeof loader>>;busy:boolean}){
  if(state.kind==="denied")return <AdminSurfaceState kind="denied" requestId={state.requestId}/>;
  if(state.kind==="unavailable")return <AdminSurfaceState kind="error" title="خواندن تدارکات ممکن نشد" description="هیچ دادهٔ stale یا حدسی جایگزین پاسخ authoritative نمی‌شود." requestId={state.requestId}/>;
  if(state.kind==="not-found")return <AdminSurfaceState kind="empty" title="رکورد تدارکات پیدا نشد" requestId={state.requestId}/>;
  return <section className="pricing-card" aria-labelledby="procurement-read-title">
    <h2 id="procurement-read-title">خواندن authoritative</h2>
    <p>برای جلوگیری از invent کردن response shape، این مرحله فقط endpoint/status/request-id را از transport معتبر گزارش می‌کند.</p>
    <Form method="get" className="pricing-form">
      <label><span>شناسه برای خواندن جزئی (اختیاری)</span><input name="id" defaultValue={"idInput" in state?state.idInput:""} dir="ltr" autoComplete="off"/></label>
      <div className="pricing-actions pricing-form-wide"><button type="submit" disabled={busy}>خواندن از Backend</button></div>
    </Form>
    {state.kind==="invalid"?<p className="pricing-inline-warning" role="alert">{state.message}</p>:null}
    {state.kind==="ready"?<div className="pricing-success" role="status"><strong>خواندن معتبر انجام شد.</strong><span>endpoint: <bdi>{state.endpoint}</bdi></span><span>HTTP: <bdi>{state.status}</bdi></span>{state.requestId?<span>request-id: <bdi>{state.requestId}</bdi></span>:null}</div>:null}
  </section>;
}

function SupplierForms({fetcher,busy}:{fetcher:ReturnType<typeof useFetcher<typeof action>>;busy:boolean}){
  return <>
    <section className="pricing-card"><h2>ایجاد تأمین‌کننده</h2><p>Idempotency-Key فقط در سرور و به‌صورت تصادفی ساخته می‌شود.</p>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <input type="hidden" name="intent" value="supplier-create"/>
        <label><span>کد</span><input name="code" required/></label>
        <label><span>نام فارسی</span><input name="name_fa" required/></label>
        <label><span>نام حقوقی</span><input name="legal_name"/></label>
        <label><span>شناسه ملی</span><input name="national_id"/></label>
        <label><span>موبایل</span><input name="mobile" dir="ltr"/></label>
        <label><span>تلفن</span><input name="phone" dir="ltr"/></label>
        <label><span>ایمیل</span><input name="email" type="email" dir="ltr"/></label>
        <label><span>مهلت پرداخت (روز)</span><input name="payment_terms_days" type="number" min="0" step="1"/></label>
        <label className="pricing-form-wide"><span>یادداشت</span><textarea name="notes" rows={2}/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ایجاد</button></div>
      </fetcher.Form>
    </section>
    <section className="pricing-card"><h2>ویرایش تأمین‌کننده با If-Match</h2>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <input type="hidden" name="intent" value="supplier-update"/>
        <VersionFields/>
        <label className="pricing-form-wide"><span>بدنه JSON مطابق contract</span><textarea name="body_json" required rows={4} dir="ltr" defaultValue={'{"name_fa":"تأمین‌کننده نمونه","payment_terms_days":30}'}/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ثبت تغییر</button></div>
      </fetcher.Form>
    </section>
    <section className="pricing-card"><h2>فعال/غیرفعال‌سازی</h2>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <input type="hidden" name="intent" value="supplier-status"/><VersionFields/>
        <label><span>عملیات</span><select name="transition"><option value="activate">فعال‌سازی</option><option value="deactivate">غیرفعال‌سازی</option></select></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>اعمال با If-Match</button></div>
      </fetcher.Form>
    </section>
  </>;
}

function RequestForms({fetcher,busy}:{fetcher:ReturnType<typeof useFetcher<typeof action>>;busy:boolean}){
  return <>
    <section className="pricing-card"><h2>ایجاد درخواست خرید</h2><p>هر واریانت فقط یک‌بار و با تعداد صحیح مثبت پذیرفته می‌شود. suggested_quantity به‌دلیل نبود runtime authority در این مرحله ارسال نمی‌شود.</p>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <input type="hidden" name="intent" value="request-create"/>
        <label><span>شناسه انبار</span><input name="warehouse_id" required dir="ltr"/></label>
        <label><span>دلیل</span><input name="reason" required/></label>
        <label className="pricing-form-wide"><span>اقلام JSON</span><textarea name="items_json" required rows={5} dir="ltr" defaultValue={'[{"variant_id":"11111111-1111-4111-8111-111111111111","requested_quantity":1,"notes":"نمونه"}]'}/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ایجاد idempotent</button></div>
      </fetcher.Form>
    </section>
    <section className="pricing-card"><h2>ویرایش draft</h2>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <input type="hidden" name="intent" value="request-update"/><VersionFields/>
        <label className="pricing-form-wide"><span>بدنه JSON</span><textarea name="body_json" required rows={5} dir="ltr" defaultValue={'{"reason":"نیاز انبار"}'}/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ثبت با If-Match</button></div>
      </fetcher.Form>
    </section>
    <section className="pricing-card"><h2>گذار وضعیت درخواست خرید</h2><p>Approve و Reject فقط بعد از WebAuthn Step-Up انجام می‌شوند؛ درخواست‌کننده نمی‌تواند درخواست خودش را approve کند و Backend authority نهایی است.</p>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <input type="hidden" name="intent" value="request-transition"/><VersionFields/>
        <label><span>گذار</span><select name="transition"><option value="submit">Submit</option><option value="approve">Approve + Step-Up</option><option value="reject">Reject + Step-Up</option><option value="cancel">Cancel</option></select></label>
        <label className="pricing-form-wide"><span>دلیل برای Reject/Cancel</span><textarea name="reason" rows={2}/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>اجرای گذار</button></div>
      </fetcher.Form>
    </section>
  </>;
}

function OrderForms({fetcher,busy}:{fetcher:ReturnType<typeof useFetcher<typeof action>>;busy:boolean}){
  return <>
    <section className="pricing-card"><h2>ایجاد سفارش خرید</h2><p>مبالغ عدد صحیح غیرمنفی به تومان هستند؛ تخفیف هر قلم از subtotal آن بیشتر نمی‌شود و Backend فعال بودن تأمین‌کننده و PR اختیاری را نهایی می‌کند.</p>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <input type="hidden" name="intent" value="order-create"/>
        <label><span>شناسه تأمین‌کننده</span><input name="supplier_id" required dir="ltr"/></label>
        <label><span>شناسه انبار</span><input name="warehouse_id" required dir="ltr"/></label>
        <label><span>شناسه درخواست خرید (اختیاری)</span><input name="purchase_request_id" dir="ltr"/></label>
        <label><span>expected_at ISO (اختیاری)</span><input name="expected_at" dir="ltr" placeholder="2026-11-01T10:00:00Z"/></label>
        <label className="pricing-form-wide"><span>اقلام JSON</span><textarea name="items_json" required rows={6} dir="ltr" defaultValue={'[{"variant_id":"11111111-1111-4111-8111-111111111111","ordered_quantity":2,"unit_cost_toman":100000,"discount_toman":0,"tax_toman":0}]'}/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ایجاد idempotent</button></div>
      </fetcher.Form>
    </section>
    <section className="pricing-card"><h2>ویرایش سفارش draft</h2>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <input type="hidden" name="intent" value="order-update"/><VersionFields/>
        <label className="pricing-form-wide"><span>بدنه JSON</span><textarea name="body_json" required rows={6} dir="ltr" defaultValue={'{"expected_at":"2026-11-01T10:00:00Z"}'}/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ثبت با If-Match</button></div>
      </fetcher.Form>
    </section>
    <section className="pricing-card"><h2>گذار وضعیت سفارش خرید</h2><p>Approve با WebAuthn Step-Up و separation-of-duties انجام می‌شود. Cancel دلیل می‌خواهد؛ Close از canonical resolution_note استفاده می‌کند. هیچ retry خودکاری برای نتیجهٔ نامشخص انجام نمی‌شود.</p>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <input type="hidden" name="intent" value="order-transition"/><VersionFields/>
        <label><span>گذار</span><select name="transition"><option value="submit">Submit</option><option value="approve">Approve + Step-Up</option><option value="send">Send</option><option value="cancel">Cancel</option><option value="close">Close</option></select></label>
        <label className="pricing-form-wide"><span>دلیل/توضیح برای Cancel یا Close</span><textarea name="reason" rows={2}/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>اجرای گذار</button></div>
      </fetcher.Form>
    </section>
  </>;
}

function VersionFields(){
  return <><label><span>شناسه</span><input name="id" required dir="ltr" autoComplete="off"/></label><label><span>نسخه فعلی</span><input name="expected_version" required type="number" min="1" step="1"/></label></>;
}
function Outcome({payload}:{payload:ActionData|undefined}){
  if(!payload||payload.kind==="step-up-challenge")return null;
  if(payload.kind==="confirmed")return <div className="pricing-success" role="status"><strong>{payload.message}</strong>{payload.requestId?<span> request-id: <bdi>{payload.requestId}</bdi></span>:null}{payload.idempotencyKey?<span> idempotency: <bdi>{payload.idempotencyKey}</bdi></span>:null}</div>;
  if(payload.kind==="unknown")return <div className="pricing-error-summary" role="alert"><h2>نتیجه نامشخص است</h2><p>{payload.message}</p>{payload.requestId?<p>request-id: <bdi>{payload.requestId}</bdi></p>:null}{payload.idempotencyKey?<p>idempotency ثبت‌شده: <bdi>{payload.idempotencyKey}</bdi></p>:null}<p>ابتدا وضعیت authoritative همان Supplier/PR/PO را دوباره بخوانید؛ retry خودکار انجام نمی‌شود.</p></div>;
  if(payload.kind==="conflict")return <div className="pricing-error-summary" role="alert"><h2>تعارض نسخه/وضعیت</h2><p>{payload.message}</p>{payload.requestId?<p>request-id: <bdi>{payload.requestId}</bdi></p>:null}</div>;
  return <div className="pricing-error-summary" role="alert"><h2>عملیات ادامه پیدا نکرد</h2><p>{payload.message}</p>{payload.issues?.length?<ul>{payload.issues.map((x,i)=><li key={x.field+i}>{x.message}</li>)}</ul>:null}{payload.requestId?<p>request-id: <bdi>{payload.requestId}</bdi></p>:null}</div>;
}

async function beginStepUp(request:Request,context:StepUpContext){
  const challenge=await createAdminStepUpChallenge(request);
  if(!challenge.ok)return data<ActionData>({kind:"failure",message:stepUpFailureMessage(challenge.code),requestId:challenge.requestId},{status:challenge.code==="UNAUTHENTICATED"?401:403});
  return data<ActionData>({kind:"step-up-challenge",challengeId:challenge.challengeId,options:challenge.options,context});
}
function mutation(result:ProcurementMutationResult,label:string){
  const headers=cookieHeaders(result.setCookies);
  if(result.kind==="confirmed")return data<ActionData>({kind:"confirmed",message:label+" با پاسخ قطعی Backend انجام شد. وضعیت authoritative را دوباره بخوانید.",requestId:result.requestId,idempotencyKey:result.idempotencyKey},{headers});
  if(result.kind==="unknown_outcome")return data<ActionData>({kind:"unknown",message:"نتیجهٔ "+label+" قطعی نیست. هیچ retry خودکاری انجام نمی‌شود.",requestId:result.requestId,idempotencyKey:result.idempotencyKey},{status:503,headers});
  if(result.kind==="conflict")return data<ActionData>({kind:"conflict",message:"نسخه یا وضعیت authoritative تغییر کرده است؛ هیچ overwrite خودکاری انجام نشد.",requestId:result.requestId},{status:409,headers});
  if(result.kind==="invalid")return data<ActionData>({kind:"failure",message:"Backend ورودی عملیات را نپذیرفت.",requestId:result.requestId,issues:result.fieldErrors.map(x=>({field:x.field,message:x.message}))},{status:422,headers});
  const message=result.kind==="denied"?"مجوز عملیات تأیید نشد.":result.kind==="not_found"?"مرجع موردنظر پیدا نشد.":"سرویس تدارکات در دسترس نیست.";
  return data<ActionData>({kind:"failure",message,requestId:result.requestId},{status:result.kind==="denied"?403:result.kind==="not_found"?404:503,headers});
}
function parseVersionTarget(form:FormData){
  const id=operationsUuid(form.get("id"));
  const version=operationsInteger(form.get("expected_version"));
  const issues:{field:string;message:string}[]=[];
  if(!id)issues.push({field:"id",message:"شناسه باید UUID معتبر باشد."});
  if(version===null||version<1)issues.push({field:"expected_version",message:"نسخه باید عدد صحیح مثبت باشد."});
  return issues.length?{ok:false as const,issues}:{ok:true as const,id:id!,version:version!};
}
function parseObject<T>(value:FormDataEntryValue|null):T|null{
  if(typeof value!=="string"||!value.trim()||value.length>100000)return null;
  try{const parsed=JSON.parse(value);return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed as T:null;}catch{return null;}
}
function parseArray<T>(value:FormDataEntryValue|null):T[]|null{
  if(typeof value!=="string"||!value.trim()||value.length>100000)return null;
  try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed as T[]:null;}catch{return null;}
}
function optional(name:string,form:FormData):Record<string,string>{
  const value=String(form.get(name)??"").trim();return value?{[name]:value}:{};
}
function parseCredential(value:FormDataEntryValue|null){
  if(typeof value!=="string"||value.length>100000)return null;
  try{const parsed=JSON.parse(value);return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:null;}catch{return null;}
}
function parseStepUpContext(form:FormData):StepUpContext|null{
  const entity=String(form.get("entity")??"");
  const action=String(form.get("action")??"");
  const id=operationsUuid(form.get("id"));
  const expectedVersion=operationsInteger(form.get("expected_version"));
  const reason=String(form.get("reason")??"").trim()||null;
  if((entity!=="request"&&entity!=="order")||(action!=="approve"&&action!=="reject")||!id||expectedVersion===null||expectedVersion<1)return null;
  if(entity==="order"&&action!=="approve")return null;
  if(entity==="request"&&action==="reject"&&!reason)return null;
  return{entity,action,id,expectedVersion,reason};
}
function stepUpContextForm(context:StepUpContext):FormData{
  const form=new FormData();form.set("entity",context.entity);form.set("action",context.action);form.set("id",context.id);form.set("expected_version",String(context.expectedVersion));if(context.reason)form.set("reason",context.reason);return form;
}
function invalid(issues:readonly {field:string;message:string}[]){return data<ActionData>({kind:"failure",message:"ورودی‌ها نیاز به اصلاح دارند.",requestId:null,issues},{status:422});}
function cookieHeaders(values:readonly string[]):Headers{const headers=new Headers();appendAdminAuthSetCookies(headers,values);return headers;}
function parseView(value:string|undefined):ProcurementView{return value==="requests"||value==="orders"?value:"suppliers";}
function viewLabel(view:ProcurementView){return view==="suppliers"?"تأمین‌کنندگان":view==="requests"?"درخواست خرید":"سفارش خرید";}
function stepUpFailureMessage(code:string):string{
  if(code==="UNAUTHENTICATED")return"نشست مدیریت معتبر نیست.";
  if(code==="FIDO_FAILED")return"تأیید کلید امنیتی انجام نشد؛ عملیات ارسال نشد.";
  if(code==="STEP_UP_REQUIRED")return"احراز مجدد منقضی یا نامعتبر است؛ عملیات ارسال نشد.";
  return"احراز مجدد کامل نشد؛ عملیات ارسال نشد.";
}
