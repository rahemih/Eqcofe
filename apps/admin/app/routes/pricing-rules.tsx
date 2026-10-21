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
  createPricingRule,
  readPricingRule,
  readPricingRules,
  setPricingRuleStatus,
  updatePricingRule,
} from "../pricing/pricing-admin.server.js";
import {
  isTrustedPricingFormOrigin,
  pricingEnum,
  pricingInteger,
  pricingNumber,
  pricingOptionalEnum,
  pricingOptionalText,
  pricingRuleScopes,
  pricingText,
  pricingTimestamp,
  pricingUuid,
  pricingVersion,
  validatePricingInterval,
  type PricingFormIssue,
} from "../pricing/pricing-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";

const RULE_TYPES=["discount","quantity_discount","campaign","manual_override"] as const;
const VALUE_TYPES=["percentage","fixed_toman"] as const;
const CUSTOMER_TYPES=["retail","wholesale"] as const;
const STACKING_POLICIES=["exclusive","stackable","best_only"] as const;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ActionData =
  | {kind:"confirmed";message:string;ruleId:string;requestId:string|null}
  | {kind:"invalid";message:string;issues:readonly PricingFormIssue[];requestId:string|null}
  | {kind:"failure";message:string;requestId:string|null;needsRevalidation?:boolean};

export async function loader({request}:{request:Request}){
  const url=new URL(request.url);
  const requested=(url.searchParams.get("rule")??"").trim();
  const selectedRuleId=requested&&UUID_RE.test(requested)?requested:null;
  const list=await readPricingRules(request);
  const headers=new Headers();
  appendAdminAuthSetCookies(headers,list.setCookies);

  if(list.kind==="denied"){
    return data({kind:"denied" as const,requestId:list.requestId},{status:403,headers});
  }
  if(list.kind!=="ready"){
    return data({kind:"unavailable" as const,requestId:list.requestId},{status:503,headers});
  }

  if(requested&&!selectedRuleId){
    return data({
      kind:"ready" as const,
      rules:list.rules,
      selected:null,
      selectionIssue:"شناسهٔ قانون باید UUID معتبر باشد.",
      requestId:list.requestId,
    },{headers});
  }

  if(!selectedRuleId){
    return data({
      kind:"ready" as const,
      rules:list.rules,
      selected:null,
      selectionIssue:null,
      requestId:list.requestId,
    },{headers});
  }

  const detail=await readPricingRule(request,selectedRuleId);
  appendAdminAuthSetCookies(headers,detail.setCookies);
  if(detail.kind==="denied"){
    return data({kind:"denied" as const,requestId:detail.requestId},{status:403,headers});
  }
  if(detail.kind==="not_found"){
    return data({
      kind:"ready" as const,
      rules:list.rules,
      selected:null,
      selectionIssue:"قانون انتخاب‌شده دیگر در مرجع سرور پیدا نشد.",
      requestId:detail.requestId??list.requestId,
    },{headers});
  }
  if(detail.kind==="unavailable"){
    return data({
      kind:"ready" as const,
      rules:list.rules,
      selected:null,
      selectionIssue:"جزئیات قانون انتخاب‌شده در حال حاضر قابل خواندن نیست.",
      requestId:detail.requestId??list.requestId,
    },{headers});
  }

  return data({
    kind:"ready" as const,
    rules:list.rules,
    selected:detail.rule,
    selectionIssue:null,
    requestId:detail.requestId??list.requestId,
  },{headers});
}

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedPricingFormOrigin(request)){
    return data<ActionData>(
      {kind:"failure",message:"درخواست تغییر قانون قیمت معتبر نیست.",requestId:null},
      {status:403},
    );
  }

  const form=await request.formData();
  const intent=String(form.get("intent")??"");

  if(intent==="create-rule"){
    const issues:PricingFormIssue[]=[];
    const name=pricingText(form,"name_fa",{required:true,max:250},issues);
    const ruleType=pricingEnum(form,"rule_type",RULE_TYPES,issues);
    const priority=pricingInteger(form,"priority",{required:true,min:-100000,max:100000},issues);
    const valueType=pricingEnum(form,"value_type",VALUE_TYPES,issues);
    const valueNumeric=pricingNumber(form,"value_numeric",{required:true,min:0},issues);
    const startsAt=pricingTimestamp(form,"starts_at",{},issues);
    const endsAt=pricingTimestamp(form,"ends_at",{},issues);
    const customerType=pricingOptionalEnum(form,"customer_type",CUSTOMER_TYPES,issues);
    const minQuantity=pricingInteger(form,"min_quantity",{min:1,max:1000000000},issues);
    const maxQuantity=pricingInteger(form,"max_quantity",{min:1,max:1000000000},issues);
    const stacking=pricingEnum(form,"stacking_policy",STACKING_POLICIES,issues);
    const scopes=pricingRuleScopes(form,"scopes",issues);

    validatePricingInterval(startsAt,endsAt,issues);
    if(valueType==="percentage"&&valueNumeric!==null&&valueNumeric>100){
      issues.push({field:"value_numeric",message:"درصد نمی‌تواند بیش از ۱۰۰ باشد."});
    }
    if(minQuantity!==null&&maxQuantity!==null&&maxQuantity<minQuantity){
      issues.push({field:"max_quantity",message:"حداکثر تعداد نباید کمتر از حداقل باشد."});
    }

    if(
      issues.length||!name||!ruleType||priority===null||!valueType||valueNumeric===null||
      !stacking||!scopes.length
    ){
      return invalidAction(issues);
    }

    const result=await createPricingRule(request,{
      name_fa:name,
      rule_type:ruleType,
      priority,
      value_type:valueType,
      value_numeric:valueNumeric,
      starts_at:startsAt,
      ends_at:endsAt,
      customer_type:customerType,
      min_quantity:minQuantity,
      max_quantity:maxQuantity,
      stacking_policy:stacking,
      scopes:[...scopes],
    });
    return handleMutation(result,"قانون قیمت در وضعیت draft ایجاد شد.");
  }

  const issues:PricingFormIssue[]=[];
  const ruleId=pricingUuid(form,"rule_id",issues);
  if(!ruleId)return invalidAction(issues);

  if(intent==="update-rule"){
    const version=pricingVersion(form,"version",issues);
    const name=pricingText(form,"name_fa",{required:true,max:250},issues);
    const priority=pricingInteger(form,"priority",{required:true,min:-100000,max:100000},issues);
    const valueNumeric=pricingNumber(form,"value_numeric",{required:true,min:0},issues);
    const valueType=pricingEnum(form,"value_type",VALUE_TYPES,issues);
    const startsAt=pricingTimestamp(form,"starts_at",{},issues);
    const endsAt=pricingTimestamp(form,"ends_at",{},issues);
    const minQuantity=pricingInteger(form,"min_quantity",{min:1,max:1000000000},issues);
    const maxQuantity=pricingInteger(form,"max_quantity",{min:1,max:1000000000},issues);
    const stacking=pricingEnum(form,"stacking_policy",STACKING_POLICIES,issues);

    validatePricingInterval(startsAt,endsAt,issues);
    if(valueType==="percentage"&&valueNumeric!==null&&valueNumeric>100){
      issues.push({field:"value_numeric",message:"درصد نمی‌تواند بیش از ۱۰۰ باشد."});
    }
    if(minQuantity!==null&&maxQuantity!==null&&maxQuantity<minQuantity){
      issues.push({field:"max_quantity",message:"حداکثر تعداد نباید کمتر از حداقل باشد."});
    }

    if(issues.length||version===null||!name||priority===null||valueNumeric===null||!stacking){
      return invalidAction(issues);
    }

    const result=await updatePricingRule(request,ruleId,version,{
      name_fa:name,
      priority,
      value_numeric:valueNumeric,
      starts_at:startsAt,
      ends_at:endsAt,
      min_quantity:minQuantity,
      max_quantity:maxQuantity,
      stacking_policy:stacking,
    });
    return handleMutation(result,"قانون قیمت با If-Match معتبر به‌روزرسانی شد.");
  }

  if(intent==="activate-rule"||intent==="deactivate-rule"){
    const reason=pricingOptionalText(form,"reason",1000,issues);
    if(issues.length)return invalidAction(issues);
    const status=intent==="activate-rule"?"active":"inactive";
    const result=await setPricingRuleStatus(request,ruleId,status,reason);
    return handleMutation(result,status==="active"?"قانون قیمت فعال شد.":"قانون قیمت غیرفعال شد.");
  }

  return data<ActionData>(
    {kind:"failure",message:"عملیات قانون قیمت ناشناخته است.",requestId:null},
    {status:400},
  );
}

export default function PricingRulesRoute(){
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
        title="قواعد قیمت‌گذاری در دسترس نیست"
        description="تا دریافت پاسخ معتبر، دادهٔ قدیمی یا ساختگی نمایش داده نمی‌شود."
        requestId={state.requestId}
        action={{href:"/pricing/rules",label:"خواندن دوباره"}}
      />
    );
  }

  return (
    <section className="pricing-page" aria-labelledby="pricing-rules-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link><span aria-hidden="true">/</span>
        <span>قیمت و ارز</span><span aria-hidden="true">/</span>
        <span aria-current="page">قواعد قیمت‌گذاری</span>
      </nav>
      <header className="pricing-heading">
        <p className="foundation-kicker">AD-D-02 · مرحله 69-D</p>
        <h1 id="pricing-rules-title">قواعد قیمت‌گذاری</h1>
        <p>ایجاد و چرخهٔ active/inactive فقط از عملیات canonical انجام می‌شود. حذف قانون یا تغییر دامنه بعد از ایجاد در قرارداد مرجع وجود ندارد و در UI ساخته نمی‌شود.</p>
      </header>

      {actionData&&(actionData.kind==="invalid"||actionData.kind==="failure")?(
        <div className="pricing-error-summary" role="alert" tabIndex={-1} ref={errorRef}>
          <h2>{actionData.message}</h2>
          {"issues" in actionData&&actionData.issues.length?(
            <ul>{actionData.issues.map((issue,index)=><li key={issue.field+index}><bdi>{issue.field}</bdi>: {issue.message}</li>)}</ul>
          ):null}
          {actionData.requestId?<p>شناسه پیگیری: <bdi>{actionData.requestId}</bdi></p>:null}
          {actionData.needsRevalidation?<p>برای جلوگیری از overwrite یا replay، قانون را دوباره از سرور بخوانید.</p>:null}
        </div>
      ):null}

      {actionData?.kind==="confirmed"?(
        <div className="pricing-success" role="status" aria-live="polite">
          <strong>{actionData.message}</strong>
          {actionData.requestId?<span> شناسه پیگیری: <bdi>{actionData.requestId}</bdi></span>:null}
          <Link to={"/pricing/rules?rule="+encodeURIComponent(actionData.ruleId)}>خواندن نسخهٔ تازه</Link>
        </div>
      ):null}

      <div className="pricing-grid">
        <section className="pricing-card" aria-labelledby="rule-list-title">
          <h2 id="rule-list-title">قواعد بارگذاری‌شده</h2>
          <p>{state.rules.length} قانون در پاسخ فعلی است؛ سقف Backend می‌تواند این فهرست را محدود کند و این عدد به‌عنوان کل سیستم تفسیر نمی‌شود.</p>
          {state.selectionIssue?<p className="pricing-inline-warning" role="alert">{state.selectionIssue}</p>:null}
          {state.rules.length?(
            <ul className="pricing-rule-list">
              {state.rules.map((rule)=>(
                <li key={rule.id}>
                  <Link to={"/pricing/rules?rule="+encodeURIComponent(rule.id)}>
                    <span>{rule.name_fa}</span>
                    <bdi>{rule.status}</bdi>
                  </Link>
                  <small>
                    {rule.value_type==="percentage"?String(rule.value_numeric)+"٪":formatToman(rule.value_numeric)}
                    {" · "}نسخه <bdi>{String(rule.version)}</bdi>
                    {" · "}{rule.is_global?"global":"دامنهٔ غیرسراسری"}
                  </small>
                </li>
              ))}
            </ul>
          ):(
            <AdminSurfaceState kind="empty" compact title="قانون قیمتی در پاسخ معتبر نیست" description="می‌توانید یک قانون draft جدید با دامنهٔ صریح ایجاد کنید." />
          )}
        </section>

        <section className="pricing-card" aria-labelledby="create-rule-title">
          <h2 id="create-rule-title">ایجاد قانون draft</h2>
          <p>هر خط دامنه باید <bdi>global</bdi> یا <bdi>category|brand|product|variant:UUID</bdi> باشد. global باید تنها دامنه باشد.</p>
          <Form method="post" className="pricing-form" aria-busy={busy}>
            <label><span>نام فارسی</span><input name="name_fa" required maxLength={250} /></label>
            <label>
              <span>نوع قانون</span>
              <select name="rule_type" defaultValue="discount">
                <option value="discount">تخفیف</option>
                <option value="quantity_discount">تخفیف تعدادی</option>
                <option value="campaign">کمپین</option>
                <option value="manual_override">override دستی</option>
              </select>
            </label>
            <label><span>اولویت</span><input name="priority" type="number" step="1" defaultValue="100" required /></label>
            <label>
              <span>نوع مقدار</span>
              <select name="value_type" defaultValue="percentage">
                <option value="percentage">درصد</option>
                <option value="fixed_toman">مبلغ ثابت تومان</option>
              </select>
            </label>
            <label><span>مقدار</span><input name="value_numeric" type="number" min="0" step="0.0001" required /></label>
            <label>
              <span>نوع مشتری</span>
              <select name="customer_type" defaultValue="">
                <option value="">همه / null</option>
                <option value="retail">retail</option>
                <option value="wholesale">wholesale</option>
              </select>
            </label>
            <label><span>شروع اختیاری ISO</span><input name="starts_at" dir="ltr" placeholder="2026-10-21T08:30:00+03:30" /></label>
            <label><span>پایان اختیاری ISO</span><input name="ends_at" dir="ltr" placeholder="2026-11-21T08:30:00+03:30" /></label>
            <label><span>حداقل تعداد</span><input name="min_quantity" type="number" min="1" step="1" /></label>
            <label><span>حداکثر تعداد</span><input name="max_quantity" type="number" min="1" step="1" /></label>
            <label>
              <span>سیاست ترکیب</span>
              <select name="stacking_policy" defaultValue="exclusive">
                <option value="exclusive">exclusive</option>
                <option value="stackable">stackable</option>
                <option value="best_only">best_only</option>
              </select>
            </label>
            <label className="pricing-form-wide">
              <span>دامنه‌ها</span>
              <textarea name="scopes" rows={4} required placeholder={"global\nیا\ncategory:00000000-0000-4000-8000-000000000000"} dir="ltr" />
            </label>
            <div className="pricing-actions pricing-form-wide">
              <button type="submit" name="intent" value="create-rule" disabled={busy}>ایجاد قانون draft</button>
            </div>
          </Form>
        </section>
      </div>

      {state.selected?(
        <section className="pricing-card" aria-labelledby="edit-rule-title">
          <h2 id="edit-rule-title">ویرایش قانون انتخاب‌شده</h2>
          <p>
            <strong>{state.selected.name_fa}</strong> · <bdi>{state.selected.rule_type}</bdi> · <bdi>{state.selected.status}</bdi>.
            دامنه‌های غیرسراسری در پاسخ read فعلی شناسه ندارند؛ UI آن‌ها را حدس نمی‌زند و PATCH نیز دامنه را تغییر نمی‌دهد.
          </p>
          <Form method="post" className="pricing-form" aria-busy={busy}>
            <input type="hidden" name="rule_id" value={state.selected.id} />
            <input type="hidden" name="version" value={String(state.selected.version)} />
            <input type="hidden" name="value_type" value={state.selected.value_type} />
            <label><span>نام فارسی</span><input name="name_fa" required maxLength={250} defaultValue={state.selected.name_fa} /></label>
            <label><span>اولویت</span><input name="priority" type="number" step="1" required defaultValue={state.selected.priority} /></label>
            <label>
              <span>مقدار {state.selected.value_type==="percentage"?"درصد":"تومان"}</span>
              <input name="value_numeric" type="number" min="0" step="0.0001" required defaultValue={String(state.selected.value_numeric)} />
            </label>
            <label><span>شروع ISO</span><input name="starts_at" dir="ltr" defaultValue={state.selected.starts_at??""} /></label>
            <label><span>پایان ISO</span><input name="ends_at" dir="ltr" defaultValue={state.selected.ends_at??""} /></label>
            <label><span>حداقل تعداد</span><input name="min_quantity" type="number" min="1" step="1" defaultValue={state.selected.min_quantity??""} /></label>
            <label><span>حداکثر تعداد</span><input name="max_quantity" type="number" min="1" step="1" defaultValue={state.selected.max_quantity??""} /></label>
            <label>
              <span>سیاست ترکیب</span>
              <select name="stacking_policy" defaultValue={state.selected.stacking_policy}>
                <option value="exclusive">exclusive</option>
                <option value="stackable">stackable</option>
                <option value="best_only">best_only</option>
              </select>
            </label>
            <div className="pricing-actions pricing-form-wide">
              <button type="submit" name="intent" value="update-rule" disabled={busy}>ثبت با If-Match نسخهٔ فعلی</button>
            </div>
          </Form>

          <Form method="post" className="pricing-status-form" aria-busy={busy}>
            <input type="hidden" name="rule_id" value={state.selected.id} />
            <label>
              <span>دلیل تغییر وضعیت اختیاری</span>
              <input name="reason" maxLength={1000} />
            </label>
            <div className="pricing-actions">
              <button type="submit" name="intent" value="activate-rule" disabled={busy||state.selected.status==="active"}>فعال‌سازی</button>
              <button type="submit" name="intent" value="deactivate-rule" disabled={busy||state.selected.status==="inactive"}>غیرفعال‌سازی</button>
            </div>
          </Form>
          <p className="pricing-inline-warning">هیچ دکمهٔ حذف وجود ندارد؛ Backend route حذف برای Pricing Rule تعریف نکرده است.</p>
        </section>
      ):null}
    </section>
  );
}

function invalidAction(issues:readonly PricingFormIssue[]){
  return data<ActionData>({
    kind:"invalid",
    message:"ورودی‌های قانون قیمت نیاز به اصلاح دارند.",
    issues,
    requestId:null,
  },{status:422});
}

async function handleMutation(
  result:Awaited<ReturnType<typeof createPricingRule>>,
  successMessage:string,
){
  const headers=new Headers();
  appendAdminAuthSetCookies(headers,result.setCookies);
  if(result.kind==="confirmed"){
    return data<ActionData>({
      kind:"confirmed",
      message:successMessage,
      ruleId:result.rule.id,
      requestId:result.requestId,
    },{headers});
  }
  if(result.kind==="invalid"){
    return data<ActionData>({
      kind:"invalid",
      message:"Backend ورودی قانون قیمت را نپذیرفت.",
      issues:result.fieldErrors.map((x)=>({field:x.field,message:x.message})),
      requestId:result.requestId,
    },{status:422,headers});
  }
  const message={
    denied:"مجوز تغییر قانون قیمت برای این نشست تأیید نشد.",
    conflict:"نسخهٔ قانون همزمان تغییر کرده است؛ نسخهٔ تازه را دوباره بخوانید.",
    not_found:"قانون قیمت در مرجع سرور پیدا نشد.",
    unknown_outcome:"نتیجهٔ mutation قطعی نیست؛ چون این عملیات Idempotency-Key ندارد، خودکار دوباره ارسال نمی‌شود.",
    unavailable:"سرویس قانون قیمت در دسترس نیست.",
  }[result.kind];
  return data<ActionData>({
    kind:"failure",
    message,
    requestId:result.requestId,
    needsRevalidation:result.kind==="conflict"||result.kind==="unknown_outcome",
  },{status:result.kind==="denied"?403:result.kind==="not_found"?404:result.kind==="conflict"?409:503,headers});
}

function formatToman(value:string|number):string{
  const numeric=Number(value);
  if(!Number.isFinite(numeric))return String(value);
  return new Intl.NumberFormat("fa-IR").format(numeric)+" تومان";
}
