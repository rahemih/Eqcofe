import { data, Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  createCurrencyRule,
  readCurrencyRule,
  readCurrencyRules,
  setCurrencyRuleStatus,
  updateCurrencyRule,
  type CurrencyRuleRecord,
  type FxMutationFailure,
} from "../pricing/pricing-fx.server.js";
import {
  isTrustedPricingFormOrigin,
  pricingEnum,
  pricingInteger,
  pricingNumber,
  pricingRuleScopes,
  pricingText,
  pricingUuid,
  pricingVersion,
  type PricingFormIssue,
} from "../pricing/pricing-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";

type LoaderData={
  state:"ready"|"denied"|"unavailable";
  rules:readonly CurrencyRuleRecord[];
  selected:CurrencyRuleRecord|null;
  selectedMissing:boolean;
  requestId:string|null;
};
type ActionData=
  |{kind:"confirmed";message:string;ruleId:string;requestId:string|null}
  |{kind:"invalid";message:string;issues:readonly {field:string;message:string}[];requestId:string|null}
  |{kind:"failure";message:string;requestId:string|null;needsRevalidation:boolean};

const CURRENCY_CODE=/^[A-Z]{3}$/;

export async function loader({request}:{request:Request}){
  const url=new URL(request.url);
  const selectedId=(url.searchParams.get("id")??"").trim();
  const list=await readCurrencyRules(request);
  const headers=new Headers();
  appendAdminAuthSetCookies(headers,list.setCookies);
  if(list.kind!=="ready"){
    return data<LoaderData>({state:list.kind==="denied"?"denied":"unavailable",rules:[],selected:null,selectedMissing:false,requestId:list.requestId},{status:list.kind==="denied"?403:503,headers});
  }
  if(!selectedId){
    return data<LoaderData>({state:"ready",rules:list.rules,selected:null,selectedMissing:false,requestId:list.requestId},{headers});
  }
  const detail=await readCurrencyRule(request,selectedId);
  appendAdminAuthSetCookies(headers,detail.setCookies);
  if(detail.kind==="ready"){
    return data<LoaderData>({state:"ready",rules:list.rules,selected:detail.rule,selectedMissing:false,requestId:detail.requestId??list.requestId},{headers});
  }
  if(detail.kind==="denied"){
    return data<LoaderData>({state:"denied",rules:list.rules,selected:null,selectedMissing:false,requestId:detail.requestId},{status:403,headers});
  }
  return data<LoaderData>({state:"ready",rules:list.rules,selected:null,selectedMissing:detail.kind==="not_found",requestId:detail.requestId??list.requestId},{status:detail.kind==="not_found"?404:503,headers});
}

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedPricingFormOrigin(request)){
    return data<ActionData>({kind:"failure",message:"درخواست قانون ارزی معتبر نیست.",requestId:null,needsRevalidation:false},{status:403});
  }
  const form=await request.formData();
  const intent=String(form.get("intent")??"");
  const issues:PricingFormIssue[]=[];

  if(intent==="create-rule"){
    const name=pricingText(form,"name_fa",{required:true,max:200},issues);
    const code=currencyCode(form.get("source_currency_code"),issues);
    const coefficient=pricingNumber(form,"coefficient",{required:true,min:0},issues);
    const fixed=pricingInteger(form,"fixed_cost_toman",{min:0},issues)??0;
    const rounding=pricingInteger(form,"rounding_multiple_toman",{min:1},issues)??1;
    const status=pricingEnum(form,"status",["draft","active","inactive"] as const,issues);
    const scopes=pricingRuleScopes(form,"scopes",issues);
    if(issues.length||!name||!code||coefficient===null||!status||!scopes.length)return invalid(issues);
    const result=await createCurrencyRule(request,{
      name_fa:name,
      source_currency_code:code,
      coefficient,
      fixed_cost_toman:fixed,
      rounding_multiple_toman:rounding,
      status,
      scopes:[...scopes],
    });
    return handleMutation(result,"قانون قیمت ارزی ایجاد شد.");
  }

  const ruleId=pricingUuid(form,"rule_id",issues);
  if(!ruleId)return invalid(issues);

  if(intent==="update-rule"){
    const version=pricingVersion(form,"version",issues);
    const name=pricingText(form,"name_fa",{required:true,max:200},issues);
    const coefficient=pricingNumber(form,"coefficient",{required:true,min:0},issues);
    const fixed=pricingInteger(form,"fixed_cost_toman",{required:true,min:0},issues);
    const rounding=pricingInteger(form,"rounding_multiple_toman",{required:true,min:1},issues);
    if(issues.length||version===null||!name||coefficient===null||fixed===null||rounding===null)return invalid(issues);
    const result=await updateCurrencyRule(request,ruleId,version,{
      name_fa:name,
      coefficient,
      fixed_cost_toman:fixed,
      rounding_multiple_toman:rounding,
    });
    return handleMutation(result,"قانون ارزی با If-Match معتبر به‌روزرسانی شد.");
  }

  if(intent==="activate-rule"||intent==="deactivate-rule"){
    if(issues.length)return invalid(issues);
    const status=intent==="activate-rule"?"active":"inactive";
    const result=await setCurrencyRuleStatus(request,ruleId,status);
    return handleMutation(result,status==="active"?"قانون ارزی فعال شد.":"قانون ارزی غیرفعال شد.");
  }

  return data<ActionData>({kind:"failure",message:"عملیات قانون ارزی شناخته‌شده نیست.",requestId:null,needsRevalidation:false},{status:400});
}

export default function PricingCurrencyRulesRoute(){
  const state=useLoaderData<typeof loader>();
  const actionData=useActionData<typeof action>();
  const navigation=useNavigation();
  const busy=navigation.state!=="idle";

  return <section className="pricing-page pricing-fx-rules-page" aria-labelledby="fx-rules-title">
    <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><a href="/">مدیریت</a><span aria-hidden="true">/</span><span>قیمت‌گذاری</span><span aria-hidden="true">/</span><span aria-current="page">قواعد ارزی</span></nav>
    <header className="pricing-heading">
      <p className="destination-kicker">AD-D-05 · FX Rules</p>
      <h1 id="fx-rules-title">قواعد قیمت‌گذاری وابسته به ارز</h1>
      <p>Rule تعیین می‌کند نرخ منتخب چگونه به تومان تبدیل شود. دامنه فقط هنگام ایجاد ثبت می‌شود؛ PATCH مرجع تغییر دامنه یا کد ارز را مجاز نمی‌کند.</p>
    </header>

    {actionData?.kind==="confirmed"?<div className="pricing-success" role="status"><strong>{actionData.message}</strong><Link to={`?id=${encodeURIComponent(actionData.ruleId)}`}>مشاهده رکورد</Link>{actionData.requestId?<span>شناسه پیگیری: <bdi>{actionData.requestId}</bdi></span>:null}</div>:null}
    {actionData?.kind==="invalid"?<div className="pricing-error-summary" role="alert"><h2>{actionData.message}</h2><ul>{actionData.issues.map((x,i)=><li key={x.field+String(i)}><bdi>{x.field}</bdi>: {x.message}</li>)}</ul></div>:null}
    {actionData?.kind==="failure"?<div className="pricing-error-summary" role="alert"><h2>عملیات انجام نشد</h2><p>{actionData.message}</p>{actionData.needsRevalidation?<p>نسخه مرجع را دوباره بخوانید؛ overwrite خاموش است.</p>:null}{actionData.requestId?<p>شناسه پیگیری: <bdi>{actionData.requestId}</bdi></p>:null}</div>:null}

    {state.state==="denied"?<div className="pricing-error-summary" role="alert">مجوز مشاهده قواعد ارزی تأیید نشد.</div>:null}
    {state.state==="unavailable"?<div className="pricing-error-summary" role="alert">خواندن قواعد ارزی در دسترس نیست.</div>:null}

    <div className="pricing-grid">
      <section className="pricing-card" aria-labelledby="rule-list-title">
        <h2 id="rule-list-title">قواعد موجود</h2>
        {state.state==="ready"&&!state.rules.length?<p>قانون ارزی در پاسخ مرجع وجود ندارد.</p>:null}
        {state.state==="ready"&&state.rules.length?<ul className="pricing-rule-list">{state.rules.map(rule=><li key={rule.id}>
          <Link to={`?id=${encodeURIComponent(rule.id)}`}>
            <span><strong>{rule.name_fa}</strong><small><bdi>{rule.source_currency_code}</bdi> · ضریب {formatNumberValue(rule.coefficient)} · نسخه <bdi>{String(rule.version)}</bdi> · {rule.is_global?"global":"دامنه محدود"}</small></span>
            <bdi>{rule.status}</bdi>
          </Link>
        </li>)}</ul>:null}
      </section>

      <section className="pricing-card" aria-labelledby="rule-create-title">
        <h2 id="rule-create-title">ایجاد قانون ارزی</h2>
        <Form method="post" className="pricing-form" aria-busy={busy}>
          <label><span>نام فارسی</span><input name="name_fa" required maxLength={200}/></label>
          <label><span>کد ارز</span><input name="source_currency_code" defaultValue="USD" required maxLength={3} pattern="[A-Za-z]{3}"/></label>
          <label><span>ضریب</span><input name="coefficient" type="number" min="0" step="any" required/></label>
          <label><span>هزینه ثابت تومان</span><input name="fixed_cost_toman" type="number" min="0" step="1" defaultValue="0"/></label>
          <label><span>گردکردن تومان</span><input name="rounding_multiple_toman" type="number" min="1" step="1" defaultValue="1"/></label>
          <label><span>وضعیت</span><select name="status" defaultValue="draft"><option value="draft">draft</option><option value="active">active</option><option value="inactive">inactive</option></select></label>
          <label className="pricing-form-wide"><span>دامنه‌ها</span><textarea name="scopes" required placeholder={"global\nیا\nbrand:UUID\ncategory:UUID\nproduct:UUID\nvariant:UUID"} maxLength={9000}/></label>
          <p className="pricing-inline-warning pricing-form-wide">global باید تنها دامنه باشد. شناسه دامنه‌ها بعد از ایجاد در PATCH مرجع قابل تغییر نیستند.</p>
          <div className="pricing-actions pricing-form-wide"><button type="submit" name="intent" value="create-rule" disabled={busy}>ایجاد قانون</button></div>
        </Form>
      </section>
    </div>

    {state.selectedMissing?<div className="pricing-error-summary" role="alert">قانون انتخاب‌شده پیدا نشد. فهرست را دوباره بخوانید.</div>:null}
    {state.selected?<section className="pricing-card" aria-labelledby="rule-edit-title">
      <h2 id="rule-edit-title">ویرایش قانون: {state.selected.name_fa}</h2>
      <p>Currency code و scope در PATCH منبع‌اثبات‌شده نیستند و این فرم آن‌ها را تغییر نمی‌دهد. نسخه فعلی: <bdi>{String(state.selected.version)}</bdi>.</p>
      <Form method="post" className="pricing-form" aria-busy={busy}>
        <input type="hidden" name="rule_id" value={state.selected.id}/>
        <input type="hidden" name="version" value={String(state.selected.version)}/>
        <label><span>نام فارسی</span><input name="name_fa" required maxLength={200} defaultValue={state.selected.name_fa}/></label>
        <label><span>ضریب</span><input name="coefficient" type="number" min="0" step="any" required defaultValue={String(state.selected.coefficient)}/></label>
        <label><span>هزینه ثابت تومان</span><input name="fixed_cost_toman" type="number" min="0" step="1" required defaultValue={String(state.selected.fixed_cost_toman)}/></label>
        <label><span>گردکردن تومان</span><input name="rounding_multiple_toman" type="number" min="1" step="1" required defaultValue={String(state.selected.rounding_multiple_toman)}/></label>
        <div className="pricing-actions pricing-form-wide"><button type="submit" name="intent" value="update-rule" disabled={busy}>ثبت با If-Match نسخه فعلی</button></div>
      </Form>
      <Form method="post" className="pricing-status-form" aria-busy={busy}>
        <input type="hidden" name="rule_id" value={state.selected.id}/>
        <div className="pricing-actions">
          <button type="submit" name="intent" value="activate-rule" disabled={busy||state.selected.status==="active"}>فعال‌سازی</button>
          <button type="submit" name="intent" value="deactivate-rule" disabled={busy||state.selected.status==="inactive"}>غیرفعال‌سازی</button>
        </div>
      </Form>
      <p className="pricing-inline-warning">هیچ route حذف برای Currency Rule وجود ندارد؛ delete UI ساخته نشده است.</p>
    </section>:null}
  </section>;
}

function invalid(issues:readonly PricingFormIssue[]){
  return data<ActionData>({kind:"invalid",message:"ورودی‌های قانون ارزی نیاز به اصلاح دارند.",issues,requestId:null},{status:422});
}
async function handleMutation(result:Awaited<ReturnType<typeof createCurrencyRule>>,message:string){
  const headers=new Headers();
  appendAdminAuthSetCookies(headers,result.setCookies);
  if(result.kind==="confirmed"){
    return data<ActionData>({kind:"confirmed",message,ruleId:result.rule.id,requestId:result.requestId},{headers});
  }
  if(result.kind==="invalid"){
    return data<ActionData>({kind:"invalid",message:"Backend ورودی قانون ارزی را نپذیرفت.",issues:result.fieldErrors.map(x=>({field:x.field,message:x.message||"مقدار معتبر نیست."})),requestId:result.requestId},{status:422,headers});
  }
  const messages:Record<Exclude<FxMutationFailure["kind"],"invalid">,string>={
    denied:"مجوز تغییر قانون ارزی برای این نشست تأیید نشد.",
    conflict:"نسخه قانون همزمان تغییر کرده است؛ نسخه تازه را دوباره بخوانید.",
    expired:"پیش‌نمایش منقضی شده است.",
    blocked:"Backend عملیات را متوقف کرد.",
    step_up_required:"احراز مجدد لازم است.",
    not_found:"قانون ارزی پیدا نشد.",
    review_required:"رکورد نیازمند بررسی است.",
    provider_unavailable:"Provider در دسترس نیست.",
    unknown_outcome:"نتیجه mutation قطعی نیست؛ چون این Rule mutation کلید idempotency ندارد، خودکار دوباره ارسال نمی‌شود.",
    unavailable:"سرویس قانون ارزی در دسترس نیست.",
  };
  return data<ActionData>({kind:"failure",message:messages[result.kind],requestId:result.requestId,needsRevalidation:result.kind==="conflict"||result.kind==="unknown_outcome"},{status:result.kind==="denied"?403:result.kind==="not_found"?404:result.kind==="conflict"?409:503,headers});
}
function currencyCode(value:FormDataEntryValue|null,issues:PricingFormIssue[]):string|null{
  const code=typeof value==="string"?value.trim().toUpperCase():"";
  if(!CURRENCY_CODE.test(code)){issues.push({field:"source_currency_code",message:"کد ارز باید سه حرف لاتین باشد."});return null;}
  return code;
}
function formatNumberValue(value:string|number):string{const n=Number(value);return Number.isFinite(n)?new Intl.NumberFormat("fa-IR",{maximumFractionDigits:6}).format(n):String(value);}
