import { useFetcher, useLoaderData, useNavigation, data, redirect, Link } from "react-router";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { readAdminAuthorizationContext } from "../platform/auth/context.server.js";
import { isTrustedOperationsFormOrigin, operationsInteger, operationsUuid, operationsText } from "../operations/operations-form.server.js";
import {
  scanPos, createPosSale, addPosLine, pricePosSale, commitPosSale,
  validateAddLine, validatePrice, validateCommit, type PosSaleResult,
} from "../operations/pos-sale.server.js";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";

type ActionResult={kind:"confirmed"|"unknown"|"failure"|"conflict";message:string;requestId:string|null;key?:string|null;sale?:{id:string;version:number;status:string;total_toman:number};price?:{sale_id:string;customer_type:string;total_toman:number}};
const withCookies=(setCookies:readonly string[])=>{const h=new Headers();appendAdminAuthSetCookies(h,setCookies);return h;};
const actionFailure=(message:string,status=422)=>data<ActionResult>({kind:"failure",message,requestId:null},{status});
export async function loader({request}:{request:Request}){
  const auth=await readAdminAuthorizationContext(request),headers=withCookies(auth.setCookies);
  if(auth.kind==="unauthenticated")throw redirect("/login",{headers});
  if(auth.kind==="unavailable")return data({kind:"unavailable" as const,requestId:auth.requestId,canSell:false},{status:503,headers});
  const canScan=auth.permissions.includes("pos.view"),canSell=auth.permissions.includes("pos.sell");
  if(!canScan&&!canSell)return data({kind:"denied" as const,canSell:false,requestId:null},{status:403,headers});
  const params=new URL(request.url).searchParams,kind=params.get("kind"),value=params.get("value");
  if(kind!==null||value!==null){
    if(!canScan)return data({kind:"denied" as const,requestId:null,canSell},{status:403,headers});
    const result=await scanPos(request,kind,value);
    appendAdminAuthSetCookies(headers,result.setCookies);
    if(result.kind==="ready")return data({kind:"ready" as const,requestId:result.requestId,canSell,scan:result.scan},{headers});
    return data({kind:result.kind,requestId:result.requestId,canSell},{status:result.kind==="invalid"?400:result.kind==="denied"?403:result.kind==="not_found"?404:503,headers});
  }
  return data({kind:"ready" as const,requestId:null,canSell,scan:null},{headers});
}
export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedOperationsFormOrigin(request))return actionFailure("درخواست POST از مبدأ نامعتبر مسدود شد.",403);
  const auth=await readAdminAuthorizationContext(request);
  if(auth.kind!=="authorized"||!auth.permissions.includes("pos.sell"))return data<ActionResult>({kind:"failure",message:"مجوز فروش حضوری تأیید نشد.",requestId:null},{status:auth.kind==="unavailable"?503:403,headers:withCookies(auth.setCookies)});
  const form=await request.formData(),intent=form.get("intent"),saleId=operationsUuid(form.get("sale_id"));
  let result:PosSaleResult;
  if(intent==="create-sale")result=await createPosSale(request);
  else if(intent==="add-line"){
    const body={variant_id:operationsUuid(form.get("variant_id")),quantity:operationsInteger(form.get("quantity"))};
    const v=validateAddLine(body);
    if(!saleId||!v.ok)return actionFailure("شناسه فروش، کالا یا تعداد معتبر نیست.");
    result=await addPosLine(request,saleId,v.body);
  }else if(intent==="price"){
    const v=validatePrice({customer_type:form.get("customer_type")});
    if(!saleId||!v.ok)return actionFailure("شناسه فروش یا نوع مشتری معتبر نیست.");
    result=await pricePosSale(request,saleId,v.body);
  }else if(intent==="commit"){
    const body={warehouse_id:operationsUuid(form.get("warehouse_id")),expected_version:operationsInteger(form.get("expected_version")),
      payment_method:form.get("payment_method"),external_reference:form.get("external_reference")===null?undefined:form.get("external_reference")===""?undefined:operationsText(form.get("external_reference"),120)};
    const v=validateCommit(body);
    if(!saleId||!v.ok)return actionFailure("شناسه، نسخه فروش و روش پرداخت معتبر نیست.");
    result=await commitPosSale(request,saleId,v.body);
  }else return actionFailure("عملیات POS در قرارداد منبع وجود ندارد.",400);
  const headers=withCookies([...auth.setCookies,...result.setCookies]);
  if(result.kind==="confirmed")return data<ActionResult>({kind:"confirmed",message:"نتیجه قطعی عملیات از سرور دریافت شد. برای عملیات بعدی نسخه معتبر را بررسی کنید.",requestId:result.requestId,key:result.idempotencyKey,sale:result.sale,price:result.price},{headers});
  if(result.kind==="unknown_outcome")return data<ActionResult>({kind:"unknown",message:"وضعیت عملیات نامعلوم است؛ هیچ retry خودکاری انجام نمی‌شود. با سوابق معتبر سرور تطبیق دهید.",requestId:result.requestId,key:result.idempotencyKey},{status:503,headers});
  if(result.kind==="conflict")return data<ActionResult>({kind:"conflict",message:"نسخه یا وضعیت فروش تغییر کرده است؛ بدون داده معتبر تکرار نکنید.",requestId:result.requestId},{status:409,headers});
  return data<ActionResult>({kind:"failure",message:result.kind==="invalid"?"ورودی عملیات معتبر نیست.":result.kind==="denied"?"دسترسی مجاز نیست.":result.kind==="not_found"?"مرجع یافت نشد.":"سرویس فروش در دسترس نیست.",requestId:result.requestId},{status:result.kind==="invalid"?422:result.kind==="denied"?403:result.kind==="not_found"?404:503,headers});
}
export default function PosSalesRoute(){
  const state=useLoaderData<typeof loader>(),fetcher=useFetcher<typeof action>(),navigation=useNavigation();
  const busy=fetcher.state!=="idle"||navigation.state!=="idle";
  return <section className="pricing-page" aria-labelledby="pos-sale-title" dir="rtl">
    <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><Link to="/">مدیریت</Link><span>/</span><span>فروش حضوری</span></nav>
    <header className="pricing-heading"><p className="destination-kicker">Step 70-H1 · AD-E-10</p><h1 id="pos-sale-title">اسکن کالا و فروش حضوری</h1>
      <p>قیمت، موجودی، تسویه و وضعیت فروش فقط از Backend معتبر می‌آید. فروشگاه/شیفت و سفارش بدون سرویس واقعی فعال نیستند.</p></header>
    {state.kind==="denied"?<AdminSurfaceState kind="denied"/>:state.kind==="unavailable"?<AdminSurfaceState kind="error" requestId={state.requestId}/>:null}
    {state.kind==="ready"?
      <><section aria-labelledby="pos-scan"><h2 id="pos-scan">جستجوی اسکن کالا</h2>
        <form method="get" className="pricing-actions"><label>نوع اسکن <select name="kind" required><option value="sku">SKU</option><option value="barcode">بارکد</option></select></label>
          <label>مقدار <input name="value" required maxLength={120}/></label><button type="submit">بررسی کالا</button></form>
        {state.scan?<p role="status">کالا: <bdi>{state.scan.sku}</bdi> · شناسه واریانت: <bdi>{state.scan.variantId}</bdi> · بارکد: <bdi>{state.scan.barcode??"ثبت نشده"}</bdi></p>:null}
      </section>{state.canSell?<section aria-labelledby="pos-forms"><h2 id="pos-forms">فروش حضوری</h2>
        <p>شناسه فروش و نسخه باید از پاسخ قطعی Backend یا سوابق معتبر آن تهیه شوند. کلید Idempotency فقط توسط سرور مدیریت تولید می‌شود.</p>
        <fetcher.Form method="post" className="pricing-actions"><input type="hidden" name="intent" value="create-sale"/><button type="submit" disabled={busy}>ایجاد پیش‌نویس فروش</button></fetcher.Form>
        <fetcher.Form method="post" className="pricing-actions"><input type="hidden" name="intent" value="add-line"/>
          <label>شناسه فروش <input name="sale_id" required placeholder="UUID"/></label><label>شناسه واریانت <input name="variant_id" required placeholder="UUID"/></label>
          <label>تعداد <input name="quantity" type="number" min={1} max={999} step={1} required/></label>
          <button type="submit" disabled={busy}>افزودن قلم</button></fetcher.Form>
        <fetcher.Form method="post" className="pricing-actions"><input type="hidden" name="intent" value="price"/>
          <label>شناسه فروش <input name="sale_id" required placeholder="UUID"/></label><label>نوع مشتری <select name="customer_type"><option value="retail">خرده‌فروش</option><option value="wholesale">عمده‌فروش</option></select></label>
          <button type="submit" disabled={busy}>دریافت قیمت معتبر</button></fetcher.Form>
        <fetcher.Form method="post" className="pricing-actions"><input type="hidden" name="intent" value="commit"/>
          <label>شناسه فروش <input name="sale_id" required placeholder="UUID"/></label><label>شناسه انبار <input name="warehouse_id" required placeholder="UUID"/></label>
          <label>نسخه معتبر فروش <input name="expected_version" type="number" min={1} step={1} required/></label>
          <label>پرداخت <select name="payment_method"><option value="cash">نقدی</option><option value="card">کارت</option></select></label>
          <label>شماره مرجع اختیاری <input name="external_reference" maxLength={120}/></label>
          <button type="submit" disabled={busy}>ثبت قطعی فروش</button></fetcher.Form>
      </section>:<p role="status">مجوز pos.sell در نشست فعلی وجود ندارد؛ فقط اسکن با pos.view مجاز است.</p>}</>:null}
    {fetcher.data?<section role="status" aria-live="polite" aria-label="نتیجه عملیات فروش"><h2>نتیجه عملیات</h2><p>{fetcher.data.message}</p>
      {fetcher.data.kind==="confirmed"&&fetcher.data.sale?<p>شناسه فروش: <bdi>{fetcher.data.sale.id}</bdi> · نسخه: <bdi>{fetcher.data.sale.version}</bdi> · وضعیت: {fetcher.data.sale.status}</p>:null}
      {fetcher.data.kind==="confirmed"&&fetcher.data.price?<p>مبلغ معتبر: {fetcher.data.price.total_toman.toLocaleString("fa-IR")} تومان</p>:null}
      {fetcher.data.key?<p>شناسه پیگیری عملیات: <bdi>{fetcher.data.key}</bdi></p>:null}
      {fetcher.data.requestId?<p>شناسه درخواست: <bdi>{fetcher.data.requestId}</bdi></p>:null}
    </section>:null}
    <p>فرمان‌های آفلاین و تطبیق فروش در بسته مستقل 70-H2 انجام می‌شوند؛ ۸ عملیات بدون منبع همچنان NO_ACTION هستند.</p>
  </section>;
}
