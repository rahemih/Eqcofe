import { data, Link, useFetcher, useLoaderData, useNavigation } from "react-router";
import {
  consumeSale,
  createAllocation,
  createReservation,
  createTransfer,
  readAllocationList,
  readReservationDetail,
  readReservationList,
  readTransferDetail,
  readTransferList,
  transitionAllocation,
  transitionReservation,
  transitionTransfer,
  validateAllocationCreate,
  validateConsumeSale,
  validateReservationCreate,
  validateTransferCreate,
  type AllocationCreateBody,
  type ReservationCreateBody,
  type TransferCreateBody,
} from "../operations/inventory-flow-admin.server.js";
import {
  isTrustedOperationsFormOrigin,
  operationsInteger,
  operationsUuid,
} from "../operations/operations-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";

type View="transfers"|"reservations"|"allocations";
type ActionData=
  | {kind:"confirmed";message:string;requestId:string|null;idempotencyKey:string|null}
  | {kind:"unknown";message:string;requestId:string|null;idempotencyKey:string|null}
  | {kind:"conflict";message:string;requestId:string|null}
  | {kind:"failure";message:string;requestId:string|null;issues?:readonly {field:string;message:string}[]};

export async function loader({request,params}:{request:Request;params:{view?:string}}){
  const view=parseView(params.view);
  const url=new URL(request.url);
  const rawId=String(url.searchParams.get("id")??"").trim();
  const rawStatus=String(url.searchParams.get("status")??"").trim();
  const rawOrderItem=String(url.searchParams.get("order_item_id")??"").trim();

  let result;
  if(view==="transfers"){
    if(rawId&&!operationsUuid(rawId))return data({kind:"invalid" as const,view,message:"شناسهٔ انتقال باید UUID معتبر باشد."},{status:400});
    result=rawId?await readTransferDetail(request,rawId):await readTransferList(request);
  }else if(view==="reservations"){
    if(rawId&&!operationsUuid(rawId))return data({kind:"invalid" as const,view,message:"شناسهٔ رزرو باید UUID معتبر باشد."},{status:400});
    if(rawStatus.length>64||/[\r\n\0]/.test(rawStatus))return data({kind:"invalid" as const,view,message:"فیلتر وضعیت معتبر نیست."},{status:400});
    result=rawId?await readReservationDetail(request,rawId):await readReservationList(request,rawStatus||null);
  }else{
    if(rawOrderItem&&!operationsUuid(rawOrderItem))return data({kind:"invalid" as const,view,message:"شناسهٔ OrderItem باید UUID معتبر باشد."},{status:400});
    result=await readAllocationList(request,rawOrderItem||null);
  }

  const headers=new Headers();
  appendAdminAuthSetCookies(headers,result.setCookies);
  if(result.kind==="denied")return data({kind:"denied" as const,view,requestId:result.requestId},{status:403,headers});
  if(result.kind==="not_found")return data({kind:"not-found" as const,view,requestId:result.requestId},{status:404,headers});
  if(result.kind==="unavailable")return data({kind:"unavailable" as const,view,requestId:result.requestId},{status:503,headers});
  if(result.kind!=="ready")return data({kind:"unavailable" as const,view,requestId:null},{status:503,headers});
  return data({kind:"ready" as const,view,endpoint:result.endpoint,status:result.status,requestId:result.requestId,rawId,rawStatus,rawOrderItem},{headers});
}

export async function action({request,params}:{request:Request;params:{view?:string}}){
  if(request.method!=="POST"||!isTrustedOperationsFormOrigin(request)){
    return data<ActionData>({kind:"failure",message:"درخواست گردش موجودی معتبر نیست.",requestId:null},{status:403});
  }
  const view=parseView(params.view);
  const form=await request.formData();
  const intent=String(form.get("intent")??"");

  if(view==="transfers"&&intent==="create-transfer"){
    const parsed=parseTransferCreate(form);
    if(!parsed.ok)return invalid(parsed.issues);
    const valid=validateTransferCreate(parsed.body);
    if(!valid.ok)return invalid(valid.fieldErrors);
    return mutationResponse(await createTransfer(request,valid.body),"انتقال انبار ایجاد شد.");
  }
  if(view==="transfers"&&intent==="transition-transfer"){
    const id=String(form.get("id")??"").trim();
    const operation=String(form.get("operation")??"");
    if(!["approve","ship","receive","cancel"].includes(operation))return localFailure("عملیات انتقال معتبر نیست.");
    return mutationResponse(await transitionTransfer(request,id,operation as "approve"|"ship"|"receive"|"cancel"),"عملیات انتقال با پاسخ قطعی Backend تکمیل شد.");
  }

  if(view==="reservations"&&intent==="create-reservation"){
    const parsed=parseReservationCreate(form);
    if(!parsed.ok)return invalid(parsed.issues);
    const valid=validateReservationCreate(parsed.body);
    if(!valid.ok)return invalid(valid.fieldErrors);
    return mutationResponse(await createReservation(request,valid.body),"رزرو موجودی ایجاد شد.");
  }
  if(view==="reservations"&&intent==="transition-reservation"){
    const id=String(form.get("id")??"").trim();
    const operation=String(form.get("operation")??"");
    if(!["begin-payment","late-payment-review","convert","release","release-commitment","expire"].includes(operation))return localFailure("عملیات رزرو معتبر نیست.");
    return mutationResponse(await transitionReservation(request,id,operation as "begin-payment"|"late-payment-review"|"convert"|"release"|"release-commitment"|"expire"),"عملیات رزرو با پاسخ قطعی Backend تکمیل شد.");
  }

  if(view==="allocations"&&intent==="create-allocation"){
    const body:AllocationCreateBody={
      order_item_id:String(form.get("order_item_id")??"").trim(),
      warehouse_id:String(form.get("warehouse_id")??"").trim(),
      variant_id:String(form.get("variant_id")??"").trim(),
      quantity:operationsInteger(form.get("quantity"))??Number.NaN,
      reservation_id:optionalText(form.get("reservation_id")),
    };
    const valid=validateAllocationCreate(body);
    if(!valid.ok)return invalid(valid.fieldErrors);
    return mutationResponse(await createAllocation(request,valid.body),"تخصیص موجودی ایجاد شد.");
  }
  if(view==="allocations"&&intent==="transition-allocation"){
    const id=String(form.get("id")??"").trim();
    const operation=String(form.get("operation")??"");
    if(!["pick","unpick","release"].includes(operation))return localFailure("عملیات تخصیص معتبر نیست.");
    return mutationResponse(await transitionAllocation(request,id,operation as "pick"|"unpick"|"release"),"وضعیت تخصیص با پاسخ قطعی Backend تغییر کرد.");
  }
  if(view==="allocations"&&intent==="consume-sale"){
    const valid=validateConsumeSale({allocation_id:String(form.get("allocation_id")??"").trim()});
    if(!valid.ok)return invalid(valid.fieldErrors);
    return mutationResponse(await consumeSale(request,valid.body),"خروج فروش و ثبت FIFO/COGS با پاسخ قطعی Backend تکمیل شد.");
  }

  return localFailure("عملیات گردش موجودی شناخته‌شده نیست.");
}

export default function InventoryFlowRoute(){
  const state=useLoaderData<typeof loader>();
  const fetcher=useFetcher<typeof action>();
  const navigation=useNavigation();
  const busy=fetcher.state!=="idle"||navigation.state!=="idle";
  const view=state.view;

  return (
    <section className="pricing-page" aria-labelledby="flow-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link><span aria-hidden="true">/</span>
        <span>گردش موجودی</span><span aria-hidden="true">/</span>
        <span aria-current="page">{view==="transfers"?"انتقال":view==="reservations"?"رزرو":"تخصیص و خروج فروش"}</span>
      </nav>
      <header className="pricing-heading">
        <p className="destination-kicker">Step 70-E · AD-D-08 / AD-D-09 / AD-D-10</p>
        <h1 id="flow-title">انتقال، رزرو، تخصیص و خروج فروش</h1>
        <p>تمام state transitionها در Backend authoritative هستند. UI هیچ retry خودکار، Step-Up ساختگی یا response-shape حدسی ایجاد نمی‌کند.</p>
      </header>

      <nav className="pricing-actions" aria-label="بخش‌های گردش موجودی">
        <Link to="/inventory-flows/transfers">انتقال بین انبارها</Link>
        <Link to="/inventory-flows/reservations">رزرو و پرداخت</Link>
        <Link to="/inventory-flows/allocations">تخصیص، Pick و خروج فروش</Link>
      </nav>

      <Outcome payload={fetcher.data} view={view}/>

      {state.kind==="denied"?<AdminSurfaceState kind="denied" requestId={state.requestId}/>:null}
      {state.kind==="unavailable"?<AdminSurfaceState kind="error" title="خواندن گردش موجودی ممکن نشد" description="دادهٔ stale یا حدسی جایگزین پاسخ معتبر نمی‌شود." requestId={state.requestId}/>:null}
      {state.kind==="not-found"?<AdminSurfaceState kind="empty" title="مرجع در Backend پیدا نشد" requestId={state.requestId}/>:null}
      {state.kind==="invalid"?<AdminSurfaceState kind="error" title="فیلتر خواندن معتبر نیست" description={state.message}/>:null}
      {state.kind==="ready"?<ReadProof state={state}/>:null}

      {view==="transfers"?<TransferForms fetcher={fetcher} busy={busy}/>:view==="reservations"?<ReservationForms fetcher={fetcher} busy={busy}/>:<AllocationForms fetcher={fetcher} busy={busy}/>}
    </section>
  );
}

function ReadProof({state}:{state:Extract<ReturnType<typeof useLoaderData<typeof loader>>,{kind:"ready"}>}){
  return (
    <section className="pricing-card" aria-labelledby="flow-read-title">
      <h2 id="flow-read-title">خواندن authoritative</h2>
      <p>generated contract برای body این GETها type قابل مصرفی ارائه نمی‌کند؛ بنابراین فقط endpoint، HTTP status و request-id نمایش داده می‌شود.</p>
      <div className="pricing-success" role="status">
        <strong>خواندن معتبر انجام شد.</strong>
        <span>endpoint: <bdi>{state.endpoint}</bdi></span>
        <span>HTTP: <bdi>{state.status}</bdi></span>
        {state.requestId?<span>request-id: <bdi>{state.requestId}</bdi></span>:null}
      </div>
      {state.view==="transfers"?<FilterForm fields="transfer" state={state}/>:state.view==="reservations"?<FilterForm fields="reservation" state={state}/>:<FilterForm fields="allocation" state={state}/>}
    </section>
  );
}

function FilterForm({fields,state}:{fields:"transfer"|"reservation"|"allocation";state:Extract<ReturnType<typeof useLoaderData<typeof loader>>,{kind:"ready"}>}){
  return (
    <form method="get" className="pricing-form">
      {fields!=="allocation"?<label><span>شناسه برای جزئیات (اختیاری)</span><input name="id" dir="ltr" defaultValue={state.rawId}/></label>:null}
      {fields==="reservation"?<label><span>فیلتر وضعیت (اختیاری)</span><input name="status" maxLength={64} defaultValue={state.rawStatus}/></label>:null}
      {fields==="allocation"?<label><span>فیلتر OrderItem (اختیاری)</span><input name="order_item_id" dir="ltr" defaultValue={state.rawOrderItem}/></label>:null}
      <div className="pricing-actions pricing-form-wide"><button type="submit">خواندن دوباره</button></div>
    </form>
  );
}

function TransferForms({fetcher,busy}:{fetcher:ReturnType<typeof useFetcher<typeof action>>;busy:boolean}){
  return <div className="pricing-grid">
    <section className="pricing-card"><h2>ایجاد انتقال</h2><p>هر خط قلم: <bdi>variant_uuid,quantity</bdi>. مبدا و مقصد باید متفاوت باشند.</p>
      <fetcher.Form method="post" className="pricing-form">
        <input type="hidden" name="intent" value="create-transfer"/>
        <label><span>انبار مبدا</span><input name="source_warehouse_id" dir="ltr" required/></label>
        <label><span>انبار مقصد</span><input name="destination_warehouse_id" dir="ltr" required/></label>
        <label className="pricing-form-wide"><span>اقلام</span><textarea name="items" rows={5} required placeholder="variant_uuid,2"/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ایجاد انتقال</button></div>
      </fetcher.Form>
    </section>
    <section className="pricing-card"><h2>تغییر وضعیت انتقال</h2><p>Approve و Cancel replay خودکار ندارند؛ Ship و Receive idempotency سروری دارند.</p>
      <fetcher.Form method="post" className="pricing-form">
        <input type="hidden" name="intent" value="transition-transfer"/>
        <label><span>شناسه انتقال</span><input name="id" dir="ltr" required/></label>
        <label><span>عملیات</span><select name="operation" defaultValue="approve"><option value="approve">Approve</option><option value="ship">Ship</option><option value="receive">Receive</option><option value="cancel">Cancel</option></select></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ارسال عملیات</button></div>
      </fetcher.Form>
    </section>
  </div>;
}

function ReservationForms({fetcher,busy}:{fetcher:ReturnType<typeof useFetcher<typeof action>>;busy:boolean}){
  return <div className="pricing-grid">
    <section className="pricing-card"><h2>ایجاد رزرو</h2><p>هر خط قلم: <bdi>warehouse_uuid,variant_uuid,quantity</bdi>. انقضا باید آینده باشد.</p>
      <fetcher.Form method="post" className="pricing-form">
        <input type="hidden" name="intent" value="create-reservation"/>
        <label><span>Cart ID (اختیاری)</span><input name="cart_id" dir="ltr"/></label>
        <label><span>Order ID (اختیاری)</span><input name="order_id" dir="ltr"/></label>
        <label><span>Customer ID (اختیاری)</span><input name="customer_id" dir="ltr"/></label>
        <label><span>Expires At (ISO)</span><input name="expires_at" dir="ltr" required placeholder="2026-10-28T12:00:00+03:30"/></label>
        <label><span>Payment Grace (اختیاری)</span><input name="payment_grace_until" dir="ltr"/></label>
        <label className="pricing-form-wide"><span>اقلام</span><textarea name="items" rows={5} required placeholder="warehouse_uuid,variant_uuid,1"/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ایجاد رزرو</button></div>
      </fetcher.Form>
    </section>
    <section className="pricing-card"><h2>چرخه رزرو و پرداخت</h2><p>Late-payment-review و Convert idempotent هستند؛ سایر transitionها فقط یک‌بار ارسال می‌شوند و در outcome نامعلوم retry خودکار ندارند.</p>
      <fetcher.Form method="post" className="pricing-form">
        <input type="hidden" name="intent" value="transition-reservation"/>
        <label><span>شناسه رزرو</span><input name="id" dir="ltr" required/></label>
        <label><span>عملیات</span><select name="operation" defaultValue="begin-payment">
          <option value="begin-payment">Begin payment</option><option value="late-payment-review">Late payment review</option><option value="convert">Convert</option><option value="release">Release</option><option value="release-commitment">Release commitment</option><option value="expire">Expire</option>
        </select></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ارسال عملیات</button></div>
      </fetcher.Form>
    </section>
  </div>;
}

function AllocationForms({fetcher,busy}:{fetcher:ReturnType<typeof useFetcher<typeof action>>;busy:boolean}){
  return <div className="pricing-grid">
    <section className="pricing-card"><h2>ایجاد تخصیص</h2>
      <fetcher.Form method="post" className="pricing-form">
        <input type="hidden" name="intent" value="create-allocation"/>
        <label><span>OrderItem ID</span><input name="order_item_id" dir="ltr" required/></label>
        <label><span>Warehouse ID</span><input name="warehouse_id" dir="ltr" required/></label>
        <label><span>Variant ID</span><input name="variant_id" dir="ltr" required/></label>
        <label><span>Quantity</span><input name="quantity" type="number" min="1" step="1" required/></label>
        <label><span>Reservation ID (اختیاری)</span><input name="reservation_id" dir="ltr"/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ایجاد تخصیص</button></div>
      </fetcher.Form>
    </section>
    <section className="pricing-card"><h2>Pick / Unpick / Release</h2>
      <fetcher.Form method="post" className="pricing-form">
        <input type="hidden" name="intent" value="transition-allocation"/>
        <label><span>Allocation ID</span><input name="id" dir="ltr" required/></label>
        <label><span>عملیات</span><select name="operation" defaultValue="pick"><option value="pick">Pick</option><option value="unpick">Unpick</option><option value="release">Release</option></select></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ارسال عملیات</button></div>
      </fetcher.Form>
    </section>
    <section className="pricing-card"><h2>خروج قطعی فروش</h2><p>فقط تخصیص Pick‌شده توسط Backend قابل مصرف است. FIFO/COGS در سرور authoritative است.</p>
      <fetcher.Form method="post" className="pricing-form">
        <input type="hidden" name="intent" value="consume-sale"/>
        <label><span>Allocation ID</span><input name="allocation_id" dir="ltr" required/></label>
        <div className="pricing-actions pricing-form-wide"><button disabled={busy}>ثبت خروج فروش</button></div>
      </fetcher.Form>
    </section>
  </div>;
}

function Outcome({payload,view}:{payload:ActionData|undefined;view:View}){
  if(!payload)return null;
  if(payload.kind==="confirmed")return <div className="pricing-success" role="status"><strong>{payload.message}</strong>{payload.requestId?<span> request-id: <bdi>{payload.requestId}</bdi></span>:null}<Link to={"/inventory-flows/"+view}>بازخوانی وضعیت authoritative</Link></div>;
  if(payload.kind==="unknown")return <div className="pricing-error-summary" role="alert"><h2>نتیجه عملیات نامشخص است</h2><p>{payload.message}</p><p>هیچ retry خودکاری انجام نمی‌شود. پیش از اقدام بعدی وضعیت authoritative همین بخش را دوباره بخوانید.</p>{payload.requestId?<p>request-id: <bdi>{payload.requestId}</bdi></p>:null}{payload.idempotencyKey?<p>کلید idempotency ثبت‌شده برای بررسی: <bdi>{payload.idempotencyKey}</bdi></p>:null}<Link to={"/inventory-flows/"+view}>خواندن وضعیت</Link></div>;
  if(payload.kind==="conflict")return <div className="pricing-error-summary" role="alert"><h2>تعارض وضعیت</h2><p>{payload.message}</p>{payload.requestId?<p>request-id: <bdi>{payload.requestId}</bdi></p>:null}<Link to={"/inventory-flows/"+view}>بازخوانی وضعیت</Link></div>;
  return <div className="pricing-error-summary" role="alert"><h2>عملیات ادامه پیدا نکرد</h2><p>{payload.message}</p>{payload.issues?.length?<ul>{payload.issues.map((x,i)=><li key={x.field+i}>{x.message}</li>)}</ul>:null}{payload.requestId?<p>request-id: <bdi>{payload.requestId}</bdi></p>:null}</div>;
}

function mutationResponse(result:Awaited<ReturnType<typeof createTransfer>>,successMessage:string){
  const headers=new Headers();appendAdminAuthSetCookies(headers,result.setCookies);
  if(result.kind==="confirmed")return data<ActionData>({kind:"confirmed",message:successMessage,requestId:result.requestId,idempotencyKey:result.idempotencyKey},{headers});
  if(result.kind==="unknown_outcome")return data<ActionData>({kind:"unknown",message:"پاسخ قطعی از Backend دریافت نشد.",requestId:result.requestId,idempotencyKey:result.idempotencyKey},{status:503,headers});
  if(result.kind==="conflict")return data<ActionData>({kind:"conflict",message:"state معتبر همزمان تغییر کرده است؛ عملیات خودکار تکرار نشد.",requestId:result.requestId},{status:409,headers});
  if(result.kind==="invalid")return data<ActionData>({kind:"failure",message:"Backend ورودی عملیات را نپذیرفت.",requestId:result.requestId,issues:result.fieldErrors.map(x=>({field:x.field,message:x.message}))},{status:422,headers});
  const map={denied:"مجوز عملیات برای این نشست تأیید نشد.",not_found:"مرجع موردنظر پیدا نشد.",unavailable:"سرویس گردش موجودی در دسترس نیست."} as const;
  return data<ActionData>({kind:"failure",message:map[result.kind],requestId:result.requestId},{status:result.kind==="denied"?403:result.kind==="not_found"?404:503,headers});
}

function parseTransferCreate(form:FormData):{ok:true;body:TransferCreateBody}|{ok:false;issues:readonly {field:string;message:string}[]}{
  const parsed=parseLines(String(form.get("items")??""),2);
  if(!parsed.ok)return parsed;
  return{ok:true,body:{
    source_warehouse_id:String(form.get("source_warehouse_id")??"").trim(),
    destination_warehouse_id:String(form.get("destination_warehouse_id")??"").trim(),
    items:parsed.rows.map(row=>({variant_id:row[0],quantity:Number(row[1])})),
  }};
}

function parseReservationCreate(form:FormData):{ok:true;body:ReservationCreateBody}|{ok:false;issues:readonly {field:string;message:string}[]}{
  const parsed=parseLines(String(form.get("items")??""),3);
  if(!parsed.ok)return parsed;
  return{ok:true,body:{
    cart_id:optionalText(form.get("cart_id")),
    order_id:optionalText(form.get("order_id")),
    customer_id:optionalText(form.get("customer_id")),
    expires_at:String(form.get("expires_at")??"").trim(),
    payment_grace_until:optionalText(form.get("payment_grace_until")),
    items:parsed.rows.map(row=>({warehouse_id:row[0],variant_id:row[1],quantity:Number(row[2])})),
  }};
}

function parseLines(value:string,columns:number):{ok:true;rows:string[][]}|{ok:false;issues:readonly {field:string;message:string}[]}{
  if(value.length>50000)return{ok:false,issues:[{field:"items",message:"متن اقلام بیش از حد بزرگ است."}]};
  const lines=value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length)return{ok:false,issues:[{field:"items",message:"حداقل یک قلم الزامی است."}]};
  const rows:string[][]=[];
  for(const [index,line] of lines.entries()){
    const parts=line.split(",").map(x=>x.trim());
    if(parts.length!==columns||parts.some(x=>!x||/[\r\n\0]/.test(x)))return{ok:false,issues:[{field:"items",message:`قالب خط ${index+1} معتبر نیست.`}]};
    rows.push(parts);
  }
  return{ok:true,rows};
}

function invalid(issues:readonly {field:string;message:string}[]){return data<ActionData>({kind:"failure",message:"ورودی‌ها نیاز به اصلاح دارند.",requestId:null,issues},{status:422});}
function localFailure(message:string){return data<ActionData>({kind:"failure",message,requestId:null},{status:400});}
function optionalText(value:FormDataEntryValue|null):string|null{if(typeof value!=="string")return null;const v=value.trim();return v||null;}
function parseView(value:string|undefined):View{return value==="reservations"||value==="allocations"?value:"transfers";}
