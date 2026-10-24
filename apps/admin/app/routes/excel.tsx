import { useEffect, useRef, useState } from "react";
import { data, Link, useFetcher, useLoaderData, useParams } from "react-router";
import {
  applyExcelCatalog,
  applyExcelPricing,
  createExcelImport,
  dryRunExcel,
  excelCatalogApplyIdempotencyKey,
  excelImportIdempotencyKey,
  excelPricingApplyIdempotencyKey,
  excelRecoveryIdempotencyKey,
  parseExcelUpload,
  previewExcelCatalog,
  previewExcelPricing,
  readExcelTemplate,
  recoverExcelImport,
  type ExcelCatalogApplyData,
  type ExcelCatalogPreviewData,
  type ExcelDryRunData,
  type ExcelFailure,
  type ExcelImportData,
  type ExcelPricingApplyData,
  type ExcelPricingPreviewData,
  type ExcelRecoveryData,
  type ExcelWorkbookTemplate,
} from "../excel/excel-admin.server.js";
import { isTrustedPricingFormOrigin } from "../pricing/pricing-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { createAdminStepUpChallenge, verifyAdminStepUp } from "../platform/auth/step-up-credentials.server.js";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client";
import { ActionReviewDialog } from "../security/ActionReviewDialog";

type ExcelKind="core"|"catalog"|"pricing";
type LoaderData={
  kind:ExcelKind;
  state:"ready"|"denied"|"unavailable";
  template:ExcelWorkbookTemplate|null;
  requestId:string|null;
};
type SensitiveContext=
  |{operation:"catalog_apply";previewHash:string}
  |{operation:"pricing_apply";previewHash:string}
  |{operation:"recover";jobId:string;note:string};
type ActionData=
  |{kind:"dry-run";result:ExcelDryRunData;fileName:string;digest:string;requestId:string|null}
  |{kind:"import";result:ExcelImportData;fileName:string;digest:string;requestId:string|null}
  |{kind:"catalog-preview";result:ExcelCatalogPreviewData;fileName:string;digest:string;requestId:string|null}
  |{kind:"pricing-preview";result:ExcelPricingPreviewData;fileName:string;digest:string;requestId:string|null}
  |{kind:"confirmed";operation:"catalog_apply";result:ExcelCatalogApplyData;requestId:string|null}
  |{kind:"confirmed";operation:"pricing_apply";result:ExcelPricingApplyData;requestId:string|null}
  |{kind:"confirmed";operation:"recover";result:ExcelRecoveryData;requestId:string|null}
  |{kind:"step-up-challenge";context:SensitiveContext;challengeId:string;options:Record<string,unknown>}
  |{kind:"unknown";message:string;requestId:string|null}
  |{kind:"failure";message:string;requestId:string|null;issues?:readonly {field:string;message:string}[]};

const HASH=/^[0-9a-f]{64}$/i;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VISIBLE_LIMIT=200;

export async function loader({request,params}:{request:Request;params:{kind?:string}}){
  const kind=parseKind(params.kind);
  if(!kind)throw new Response("Not Found",{status:404});
  if(kind!=="core")return data<LoaderData>({kind,state:"ready",template:null,requestId:null});
  const result=await readExcelTemplate(request);
  const headers=cookieHeaders(result.setCookies);
  if(result.kind==="ready"){
    return data<LoaderData>({kind,state:"ready",template:result.template,requestId:result.requestId},{headers});
  }
  return data<LoaderData>({kind,state:result.kind==="denied"?"denied":"unavailable",template:null,requestId:result.requestId},{status:result.kind==="denied"?403:503,headers});
}

export async function action({request,params}:{request:Request;params:{kind?:string}}){
  const kind=parseKind(params.kind);
  if(!kind||request.method!=="POST"||!isTrustedPricingFormOrigin(request)){
    return data<ActionData>({kind:"failure",message:"درخواست مدیریت Excel معتبر نیست.",requestId:null},{status:403});
  }
  const form=await request.formData();
  const intent=String(form.get("intent")??"");

  if(kind==="core"&&(intent==="dry-run"||intent==="import-create")){
    const parsed=await parseExcelUpload(form.get("workbook"));
    if(!parsed.ok)return localFailure(parsed.message);
    if(intent==="dry-run"){
      const result=await dryRunExcel(request,parsed.workbook);
      const headers=cookieHeaders(result.setCookies);
      if(result.kind==="ready")return data<ActionData>({kind:"dry-run",result:result.data,fileName:parsed.workbook.fileName,digest:parsed.digest,requestId:result.requestId},{headers});
      return excelFailure(result,headers,"Dry Run",false);
    }
    const result=await createExcelImport(request,parsed.workbook,excelImportIdempotencyKey(parsed.digest));
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="confirmed")return data<ActionData>({kind:"import",result:result.data,fileName:parsed.workbook.fileName,digest:parsed.digest,requestId:result.requestId},{headers});
    return excelFailure(result,headers,"Import",true);
  }

  if((kind==="catalog"||kind==="pricing")&&intent==="preview"){
    const parsed=await parseExcelUpload(form.get("workbook"));
    if(!parsed.ok)return localFailure(parsed.message);
    if(kind==="catalog"){
      const result=await previewExcelCatalog(request,parsed.workbook);
      const headers=cookieHeaders(result.setCookies);
      if(result.kind==="ready")return data<ActionData>({kind:"catalog-preview",result:result.data,fileName:parsed.workbook.fileName,digest:parsed.digest,requestId:result.requestId},{headers});
      return excelFailure(result,headers,"Catalog Preview",false);
    }
    const result=await previewExcelPricing(request,parsed.workbook);
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="ready")return data<ActionData>({kind:"pricing-preview",result:result.data,fileName:parsed.workbook.fileName,digest:parsed.digest,requestId:result.requestId},{headers});
    return excelFailure(result,headers,"Pricing Preview",false);
  }

  if((kind==="catalog"||kind==="pricing")&&intent==="begin-apply"){
    const previewHash=readHash(form.get("preview_hash"));
    if(!previewHash)return localFailure("Preview Hash معتبر نیست.");
    const challenge=await createAdminStepUpChallenge(request);
    if(!challenge.ok)return stepUpFailure(challenge);
    const context:SensitiveContext=kind==="catalog"
      ?{operation:"catalog_apply",previewHash}
      :{operation:"pricing_apply",previewHash};
    return data<ActionData>({kind:"step-up-challenge",context,challengeId:challenge.challengeId,options:challenge.options});
  }

  if(kind==="core"&&intent==="begin-recover"){
    const jobId=typeof form.get("job_id")==="string"?String(form.get("job_id")).trim():"";
    const note=normalizeNote(typeof form.get("note")==="string"?String(form.get("note")):"");
    if(!UUID.test(jobId))return localFailure("شناسه Import باید UUID معتبر باشد.");
    if(note.length<3||note.length>500||hasControlCharacters(note))return localFailure("یادداشت بازیابی باید بین ۳ تا ۵۰۰ نویسه معتبر باشد.");
    const challenge=await createAdminStepUpChallenge(request);
    if(!challenge.ok)return stepUpFailure(challenge);
    return data<ActionData>({kind:"step-up-challenge",context:{operation:"recover",jobId,note},challengeId:challenge.challengeId,options:challenge.options});
  }

  if(intent==="verify-step-up"){
    const context=parseContext(form.get("context"));
    const credential=parseCredential(form.get("credential"));
    if(!context||!credential)return localFailure("پاسخ احراز مجدد یا زمینه عملیات معتبر نیست.");
    const stepped=await verifyAdminStepUp(request,credential);
    if(!stepped.ok)return stepUpFailure(stepped);

    if(context.operation==="recover"){
      const result=await recoverExcelImport(request,stepped.token,excelRecoveryIdempotencyKey(context.jobId,context.note),context.jobId,context.note);
      const headers=cookieHeaders(result.setCookies);
      if(result.kind==="confirmed")return data<ActionData>({kind:"confirmed",operation:"recover",result:result.data,requestId:result.requestId},{headers});
      return excelFailure(result,headers,"Recovery",true);
    }

    const parsed=await parseExcelUpload(form.get("workbook"));
    if(!parsed.ok)return localFailure(parsed.message);
    if(context.operation==="catalog_apply"){
      const result=await applyExcelCatalog(request,stepped.token,excelCatalogApplyIdempotencyKey(context.previewHash),parsed.workbook,context.previewHash);
      const headers=cookieHeaders(result.setCookies);
      if(result.kind==="confirmed")return data<ActionData>({kind:"confirmed",operation:"catalog_apply",result:result.data,requestId:result.requestId},{headers});
      return excelFailure(result,headers,"Catalog Apply",true);
    }
    const result=await applyExcelPricing(request,stepped.token,excelPricingApplyIdempotencyKey(context.previewHash),parsed.workbook,context.previewHash);
    const headers=cookieHeaders(result.setCookies);
    if(result.kind==="confirmed")return data<ActionData>({kind:"confirmed",operation:"pricing_apply",result:result.data,requestId:result.requestId},{headers});
    return excelFailure(result,headers,"Pricing Apply",true);
  }

  return data<ActionData>({kind:"failure",message:"عملیات Excel برای این سطح شناخته‌شده نیست.",requestId:null},{status:400});
}

export default function ExcelAdminRoute(){
  const loaderData=useLoaderData<typeof loader>();
  const {kind:paramKind}=useParams();
  const kind=parseKind(paramKind)??loaderData.kind;
  const fetcher=useFetcher<typeof action>();
  const [selectedFile,setSelectedFile]=useState<File|null>(null);
  const [catalogPreview,setCatalogPreview]=useState<{data:ExcelCatalogPreviewData;fileName:string;digest:string}|null>(null);
  const [pricingPreview,setPricingPreview]=useState<{data:ExcelPricingPreviewData;fileName:string;digest:string}|null>(null);
  const [reviewOpen,setReviewOpen]=useState(false);
  const [clientError,setClientError]=useState<string|null>(null);
  const handledChallenge=useRef<string|null>(null);
  const launcherRef=useRef<HTMLButtonElement|null>(null);
  const outcomeRef=useRef<HTMLDivElement|null>(null);
  const busy=fetcher.state!=="idle";

  useEffect(()=>{
    const payload=fetcher.data;
    if(!payload)return;
    if(payload.kind==="catalog-preview"){
      queueMicrotask(()=>{setCatalogPreview({data:payload.result,fileName:payload.fileName,digest:payload.digest});setPricingPreview(null);setReviewOpen(false);setClientError(null);outcomeRef.current?.focus();});
      return;
    }
    if(payload.kind==="pricing-preview"){
      queueMicrotask(()=>{setPricingPreview({data:payload.result,fileName:payload.fileName,digest:payload.digest});setCatalogPreview(null);setReviewOpen(false);setClientError(null);outcomeRef.current?.focus();});
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
          if(payload.context.operation!=="recover"){
            if(!selectedFile){
              handledChallenge.current=null;
              setClientError("فایل بازبینی‌شده دیگر در مرورگر انتخاب نشده است؛ Apply ارسال نشد.");
              return;
            }
            form.set("workbook",selectedFile);
          }
          fetcher.submit(form,{method:"post",encType:"multipart/form-data"});
        })
        .catch(()=>{handledChallenge.current=null;setClientError("احراز مجدد لغو شد یا کلید امنیتی پاسخ نداد؛ عملیات حساس ارسال نشد.");});
      return;
    }
    if(payload.kind==="confirmed"||payload.kind==="unknown"||payload.kind==="failure"){
      handledChallenge.current=null;
      queueMicrotask(()=>{setReviewOpen(false);outcomeRef.current?.focus();});
      if(payload.kind==="confirmed"&&(payload.operation==="catalog_apply"||payload.operation==="pricing_apply")){
        queueMicrotask(()=>{setCatalogPreview(null);setPricingPreview(null);});
      }
    }
  },[fetcher.data,fetcher,selectedFile]);

  const response=fetcher.data;
  const currentPreview=kind==="catalog"?catalogPreview:kind==="pricing"?pricingPreview:null;
  const previewHash=currentPreview?.data.previewHash??null;
  const pricingBlocked=pricingPreview?.data.items.some(item=>item.guardStatus==="blocked"||item.guardStatus==="unavailable")??false;

  const confirmApply=()=>{
    if(!previewHash||!selectedFile||busy)return;
    const form=new FormData();
    form.set("intent","begin-apply");
    form.set("preview_hash",previewHash);
    fetcher.submit(form,{method:"post"});
  };

  return <section className="pricing-page excel-page" aria-labelledby="excel-title">
    <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><Link to="/">مدیریت</Link><span aria-hidden="true">/</span><span>Excel</span><span aria-hidden="true">/</span><span aria-current="page">{kindLabel(kind)}</span></nav>
    <header className="pricing-heading">
      <p className="destination-kicker">{surfaceFor(kind)} · Excel</p>
      <h1 id="excel-title">{kindLabel(kind)}</h1>
      <p>فایل XLSX ورودی قابل اعتماد نیست. ساختار ZIP/OOXML، فرمول، لینک خارجی، تعداد ردیف/ستون و محدودیت‌های امنیتی فقط در Backend مرجع اعتبارسنجی می‌شوند.</p>
    </header>

    <nav className="excel-tabs" aria-label="سطوح Excel">
      <Link to="/excel/core" aria-current={kind==="core"?"page":undefined}>Template / Import</Link>
      <Link to="/excel/catalog" aria-current={kind==="catalog"?"page":undefined}>Catalog</Link>
      <Link to="/excel/pricing" aria-current={kind==="pricing"?"page":undefined}>Pricing</Link>
    </nav>

    <div ref={outcomeRef} tabIndex={-1}>
      {response?.kind==="unknown"?<div className="pricing-error-summary" role="alert"><h2>نتیجه عملیات قطعی نیست</h2><p>{response.message}</p><p>هیچ Import status/list منبع‌اثبات‌شده‌ای وجود ندارد؛ replay خودکار انجام نمی‌شود و نتیجه باید دستی تطبیق داده شود.</p>{response.requestId?<p>شناسه پیگیری: <bdi>{response.requestId}</bdi></p>:null}</div>:null}
      {response?.kind==="failure"?<div className="pricing-error-summary" role="alert"><h2>عملیات ادامه پیدا نکرد</h2><p>{response.message}</p>{response.issues?.length?<ul>{response.issues.map((x,i)=><li key={x.field+String(i)}><bdi>{x.field}</bdi>: {x.message}</li>)}</ul>:null}{response.requestId?<p>شناسه پیگیری: <bdi>{response.requestId}</bdi></p>:null}</div>:null}
      {clientError?<div className="pricing-error-summary" role="alert"><p>{clientError}</p></div>:null}
      {response?.kind==="confirmed"?<div className="pricing-success" role="status">{confirmedMessage(response)}{response.requestId?<span>شناسه پیگیری: <bdi>{response.requestId}</bdi></span>:null}</div>:null}
    </div>

    {kind==="core"?<CoreWorkspace loaderData={loaderData} fetcher={fetcher} busy={busy} onFile={setSelectedFile}/>:null}
    {kind==="catalog"?<CatalogWorkspace fetcher={fetcher} busy={busy} preview={catalogPreview} onFile={setSelectedFile} openReview={(button)=>{launcherRef.current=button;setClientError(null);setReviewOpen(true);}}/>:null}
    {kind==="pricing"?<PricingWorkspace fetcher={fetcher} busy={busy} preview={pricingPreview} blocked={pricingBlocked} onFile={setSelectedFile} openReview={(button)=>{launcherRef.current=button;setClientError(null);setReviewOpen(true);}}/>:null}

    <ActionReviewDialog
      open={reviewOpen&&currentPreview!==null}
      title={kind==="catalog"?"تأیید Apply کاتالوگ Excel":"تأیید Apply قیمت Excel"}
      description="همان فایل و Preview Hash بازبینی‌شده پس از WebAuthn Step-Up ارسال می‌شود. Idempotency-Key فقط در سرور از Preview Hash مشتق می‌شود."
      confirmLabel="احراز مجدد و Apply"
      destructive
      busy={busy}
      onConfirm={confirmApply}
      onClose={()=>{if(!busy){setReviewOpen(false);queueMicrotask(()=>launcherRef.current?.focus());}}}
    >
      {currentPreview?<dl className="pricing-bulk-review">
        <div><dt>فایل</dt><dd><bdi>{currentPreview.fileName}</bdi></dd></div>
        <div><dt>Preview Hash</dt><dd><bdi>{currentPreview.data.previewHash}</bdi></dd></div>
        <div><dt>SHA-256 transport</dt><dd><bdi>{currentPreview.digest}</bdi></dd></div>
      </dl>:null}
    </ActionReviewDialog>
  </section>;
}

function CoreWorkspace({loaderData,fetcher,busy,onFile}:{loaderData:LoaderData;fetcher:ReturnType<typeof useFetcher<typeof action>>;busy:boolean;onFile:(file:File|null)=>void}){
  const response=fetcher.data;
  return <>
    <section className="pricing-card" aria-labelledby="excel-template-title">
      <h2 id="excel-template-title">قرارداد Template مرجع</h2>
      {loaderData.state==="denied"?<p className="pricing-error-summary" role="alert">مجوز excel.view تأیید نشد.</p>:null}
      {loaderData.state==="unavailable"?<p className="pricing-error-summary" role="alert">Template مرجع در دسترس نیست.</p>:null}
      {loaderData.template?<>
        <dl className="excel-template-meta">
          <div><dt>Contract</dt><dd><bdi>{loaderData.template.contractVersion}</bdi></dd></div>
          <div><dt>نام فایل</dt><dd><bdi>{loaderData.template.fileName}</bdi></dd></div>
          <div><dt>MIME</dt><dd><bdi>{loaderData.template.mimeType}</bdi></dd></div>
        </dl>
        <p className="pricing-inline-warning">Endpoint مرجع metadata قرارداد workbook را برمی‌گرداند، نه binary XLSX؛ UI فایل دانلودی ساختگی تولید نمی‌کند.</p>
        <div className="excel-template-grid">{loaderData.template.sheets.map(sheet=><article key={sheet.name}><h3><bdi>{sheet.name}</bdi></h3><ul>{sheet.columns.map(col=><li key={col.key}><bdi>{col.key}</bdi>{col.required?" · الزامی":""}<span>{col.description}</span></li>)}</ul></article>)}</div>
      </>:null}
    </section>

    <section className="pricing-card" aria-labelledby="excel-import-title">
      <h2 id="excel-import-title">Dry Run و ایجاد Import</h2>
      <p>حداکثر فایل پذیرفته‌شده در UI برابر ۱۰ MiB است. حدود ZIP/expanded/row/column و امنیت workbook در Backend مرجع اعمال می‌شوند.</p>
      <fetcher.Form method="post" encType="multipart/form-data" className="pricing-form" aria-busy={busy}>
        <label className="pricing-form-wide"><span>فایل XLSX</span><input name="workbook" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required onChange={e=>onFile(e.currentTarget.files?.[0]??null)}/></label>
        <div className="pricing-actions pricing-form-wide">
          <button type="submit" name="intent" value="dry-run" disabled={busy}>Dry Run</button>
          <button type="submit" name="intent" value="import-create" disabled={busy}>ایجاد Import با Idempotency</button>
        </div>
      </fetcher.Form>
      {response?.kind==="dry-run"?<DryRunResult result={response.result} fileName={response.fileName} digest={response.digest}/>:null}
      {response?.kind==="import"?<ImportResult result={response.result} fileName={response.fileName} digest={response.digest}/>:null}
    </section>

    <section className="pricing-card" aria-labelledby="excel-recover-title">
      <h2 id="excel-recover-title">Recovery Import ناموفق</h2>
      <p>Recovery فقط برای Import failed و حداکثر سه تلاش در Backend مجاز است. چون status GET عمومی وجود ندارد، UUID باید از نتیجه معتبر قبلی/مدارک عملیاتی گرفته شود.</p>
      <fetcher.Form method="post" className="pricing-form" aria-busy={busy}>
        <label><span>Import Job UUID</span><input name="job_id" required maxLength={80}/></label>
        <label className="pricing-form-wide"><span>یادداشت Recovery</span><textarea name="note" required minLength={3} maxLength={500}/></label>
        <div className="pricing-actions pricing-form-wide"><button type="submit" name="intent" value="begin-recover" disabled={busy}>احراز مجدد و Recovery</button></div>
      </fetcher.Form>
    </section>
  </>;
}

function CatalogWorkspace({fetcher,busy,preview,onFile,openReview}:{fetcher:ReturnType<typeof useFetcher<typeof action>>;busy:boolean;preview:{data:ExcelCatalogPreviewData;fileName:string;digest:string}|null;onFile:(file:File|null)=>void;openReview:(button:HTMLButtonElement)=>void}){
  return <section className="pricing-card" aria-labelledby="excel-catalog-title">
    <h2 id="excel-catalog-title">Catalog Preview / Apply</h2>
    <p>Apply فقط Product/Variant موجود را طبق preview مرجع تغییر می‌دهد؛ ایجاد Product جدید در این authority وجود ندارد.</p>
    <fetcher.Form method="post" encType="multipart/form-data" className="pricing-form" aria-busy={busy}>
      <label className="pricing-form-wide"><span>فایل XLSX</span><input name="workbook" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required onChange={e=>onFile(e.currentTarget.files?.[0]??null)}/></label>
      <div className="pricing-actions pricing-form-wide"><button type="submit" name="intent" value="preview" disabled={busy}>ساخت Catalog Preview</button></div>
    </fetcher.Form>
    {preview?<>
      <dl className="excel-template-meta">
        <div><dt>Fingerprint</dt><dd><bdi>{preview.data.fingerprint}</bdi></dd></div>
        <div><dt>Preview Hash</dt><dd><bdi>{preview.data.previewHash}</bdi></dd></div>
        <div><dt>Products</dt><dd>{formatNumber(preview.data.products.length)}</dd></div>
        <div><dt>Variants</dt><dd>{formatNumber(preview.data.variants.length)}</dd></div>
      </dl>
      <p className="pricing-inline-warning">نمایش UI برای خوانایی به ۲۰۰ ردیف اول هر مجموعه محدود است؛ Apply روی preview کامل Backend انجام می‌شود. Catalog Apply و Pricing Apply اتمیک/ترکیبی نیستند.</p>
      <div className="pricing-bulk-table-wrap" tabIndex={0} aria-label="پیش‌نمایش تغییرات Product"><table className="pricing-bulk-table"><thead><tr><th>Product</th><th>Version</th><th>Name</th><th>Status</th></tr></thead><tbody>{preview.data.products.slice(0,VISIBLE_LIMIT).map(x=><tr key={x.id}><td><bdi>{x.id}</bdi></td><td>{formatNumber(x.expectedVersion)}</td><td>{x.nameFa??"—"}</td><td><bdi>{x.status??"—"}</bdi></td></tr>)}</tbody></table></div>
      <div className="pricing-bulk-table-wrap" tabIndex={0} aria-label="پیش‌نمایش تغییرات Variant"><table className="pricing-bulk-table"><thead><tr><th>Variant</th><th>Version</th><th>Barcode</th></tr></thead><tbody>{preview.data.variants.slice(0,VISIBLE_LIMIT).map(x=><tr key={x.id}><td><bdi>{x.id}</bdi></td><td>{formatNumber(x.expectedVersion)}</td><td><bdi>{x.barcode??"—"}</bdi></td></tr>)}</tbody></table></div>
      <div className="pricing-actions"><button type="button" disabled={busy} onClick={e=>openReview(e.currentTarget)}>بازبینی نهایی و Apply</button></div>
    </>:null}
  </section>;
}

function PricingWorkspace({fetcher,busy,preview,blocked,onFile,openReview}:{fetcher:ReturnType<typeof useFetcher<typeof action>>;busy:boolean;preview:{data:ExcelPricingPreviewData;fileName:string;digest:string}|null;blocked:boolean;onFile:(file:File|null)=>void;openReview:(button:HTMLButtonElement)=>void}){
  return <section className="pricing-card" aria-labelledby="excel-pricing-title">
    <h2 id="excel-pricing-title">Pricing Preview / Apply</h2>
    <p>قیمت‌ها تومان صحیح نامنفی هستند. Backend در Apply قیمت فعلی را با preview تطبیق می‌دهد و authority نهایی است.</p>
    <fetcher.Form method="post" encType="multipart/form-data" className="pricing-form" aria-busy={busy}>
      <label className="pricing-form-wide"><span>فایل XLSX</span><input name="workbook" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required onChange={e=>onFile(e.currentTarget.files?.[0]??null)}/></label>
      <div className="pricing-actions pricing-form-wide"><button type="submit" name="intent" value="preview" disabled={busy}>ساخت Pricing Preview</button></div>
    </fetcher.Form>
    {preview?<>
      <dl className="excel-template-meta">
        <div><dt>Source fingerprint</dt><dd><bdi>{preview.data.sourceFingerprint}</bdi></dd></div>
        <div><dt>Preview Hash</dt><dd><bdi>{preview.data.previewHash}</bdi></dd></div>
        <div><dt>Items</dt><dd>{formatNumber(preview.data.items.length)}</dd></div>
      </dl>
      <div className="pricing-bulk-table-wrap" tabIndex={0} aria-label="پیش‌نمایش قیمت Excel"><table className="pricing-bulk-table"><thead><tr><th>SKU</th><th>Variant</th><th>قیمت فعلی</th><th>پیشنهادی</th><th>Guard</th></tr></thead><tbody>{preview.data.items.slice(0,VISIBLE_LIMIT).map(x=><tr key={x.variantId}><td><bdi>{x.sku}</bdi></td><td><bdi>{x.variantId}</bdi></td><td>{x.currentPriceToman===null?"—":formatToman(x.currentPriceToman)}</td><td>{formatToman(x.proposedPriceToman)}</td><td><bdi>{x.guardStatus}</bdi>{x.guardReason?" · "+x.guardReason:""}</td></tr>)}</tbody></table></div>
      {preview.data.items.length>VISIBLE_LIMIT?<p className="pricing-inline-warning">فقط ۲۰۰ ردیف اول در جدول نمایش داده می‌شود؛ تعداد preview مرجع {formatNumber(preview.data.items.length)} است.</p>:null}
      {blocked?<p className="pricing-error-summary" role="alert">حداقل یک ردیف preview دارای Guard مسدود/ناموجود است؛ UI Apply را ارسال نمی‌کند و Backend همچنان authority نهایی است.</p>:null}
      <p className="pricing-inline-warning">Pricing Apply و Catalog Apply تراکنش جدا دارند؛ موفقیت یکی تضمین موفقیت دیگری نیست.</p>
      <div className="pricing-actions"><button type="button" disabled={busy||blocked} onClick={e=>openReview(e.currentTarget)}>بازبینی نهایی و Apply</button></div>
    </>:null}
  </section>;
}

function DryRunResult({result,fileName,digest}:{result:ExcelDryRunData;fileName:string;digest:string}){
  return <div className="pricing-preview"><h3>نتیجه Dry Run</h3><p><bdi>{fileName}</bdi> · SHA-256 <bdi>{digest}</bdi></p><dl><div><dt>Valid</dt><dd>{result.valid?"بله":"خیر"}</dd></div><div><dt>Checked</dt><dd>{formatNumber(result.checkedRows)}</dd></div><div><dt>Valid rows</dt><dd>{formatNumber(result.validRows)}</dd></div><div><dt>Invalid rows</dt><dd>{formatNumber(result.invalidRows)}</dd></div></dl>{result.rows.some(x=>!x.valid)?<ul className="excel-error-list">{result.rows.filter(x=>!x.valid).slice(0,VISIBLE_LIMIT).flatMap(row=>row.errors.map((e,i)=><li key={row.sheet+row.row+e.code+String(i)}><bdi>{row.sheet}:{row.row}</bdi> · <bdi>{e.code}</bdi> · {e.message}</li>))}</ul>:null}</div>;
}
function ImportResult({result,fileName,digest}:{result:ExcelImportData;fileName:string;digest:string}){
  return <div className="pricing-success" role="status"><strong>Import با پاسخ قطعی سرور ثبت شد.</strong><span>فایل: <bdi>{fileName}</bdi></span><span>SHA-256: <bdi>{digest}</bdi></span><span>Job: <bdi>{result.job.id}</bdi></span><span>Status: <bdi>{result.job.status}</bdi></span><span>Created: {result.created?"yes":"no"} · Replay: {result.replay?"yes":"no"}</span></div>;
}
function confirmedMessage(response:Extract<ActionData,{kind:"confirmed"}>){
  if(response.operation==="catalog_apply")return <><strong>Catalog Apply تکمیل شد.</strong><span>Products: {formatNumber(response.result.products)} · Variants: {formatNumber(response.result.variants)}</span></>;
  if(response.operation==="pricing_apply")return <><strong>Pricing Apply تکمیل شد.</strong><span>Affected: {formatNumber(response.result.affectedCount)}</span></>;
  return <><strong>Recovery تکمیل شد.</strong><span>Job: <bdi>{response.result.jobId}</bdi> · تلاش بعدی: {formatNumber(response.result.nextAttemptNo)}</span></>;
}

function excelFailure(result:ExcelFailure,headers:Headers,phase:string,mutation:boolean){
  if(result.kind==="invalid")return data<ActionData>({kind:"failure",message:"Backend یا فرم ورودی Excel را نپذیرفت.",requestId:result.requestId,issues:result.fieldErrors.map(x=>({field:x.field,message:x.message||"مقدار معتبر نیست."}))},{status:422,headers});
  const messages:Record<Exclude<ExcelFailure["kind"],"invalid">,string>={
    denied:"مجوز Excel برای این نشست تأیید نشد.",
    step_up_required:"احراز مجدد معتبر نیست؛ عملیات حساس ارسال نشد.",
    conflict:"وضعیت/Preview همزمان تغییر کرده یا دیگر معتبر نیست؛ نتیجه را دستی بازبینی کنید.",
    not_found:"رکورد مرجع برای این عملیات پیدا نشد.",
    unknown_outcome:`نتیجه ${phase} قطعی نیست و خودکار تکرار نمی‌شود.`,
    unavailable:"سرویس Excel در دسترس نیست.",
  };
  const unknown=mutation&&result.kind==="unknown_outcome";
  return data<ActionData>({kind:unknown?"unknown":"failure",message:messages[result.kind],requestId:result.requestId} as ActionData,{status:result.kind==="denied"?403:result.kind==="not_found"?404:result.kind==="conflict"?409:503,headers});
}
function localFailure(message:string){return data<ActionData>({kind:"failure",message,requestId:null},{status:422});}
function stepUpFailure(challenge:{ok:false;code:string;requestId:string|null}){
  const message=challenge.code==="UNAUTHENTICATED"?"نشست مدیریت معتبر نیست.":challenge.code==="FIDO_FAILED"?"تأیید کلید امنیتی انجام نشد؛ فرمان حساس ارسال نشد.":"احراز مجدد کامل نشد؛ فرمان حساس ارسال نشد.";
  return data<ActionData>({kind:"failure",message,requestId:challenge.requestId},{status:challenge.code==="UNAUTHENTICATED"?401:403});
}
function parseKind(value:string|undefined):ExcelKind|null{return value==="core"||value==="catalog"||value==="pricing"?value:null;}
function kindLabel(kind:ExcelKind):string{return kind==="core"?"Template، Dry Run، Import و Recovery":kind==="catalog"?"Catalog Excel":"Pricing Excel";}
function surfaceFor(kind:ExcelKind):string{return kind==="core"?"AD-D-19":kind==="catalog"?"AD-D-20":"AD-D-21";}
function readHash(value:FormDataEntryValue|null):string|null{const x=typeof value==="string"?value.trim().toLowerCase():"";return HASH.test(x)?x:null;}
function normalizeNote(value:string):string{return value.normalize("NFKC").trim().replace(/\s+/g," ");}
function parseContext(value:FormDataEntryValue|null):SensitiveContext|null{
  if(typeof value!=="string"||value.length>1500)return null;
  try{
    const x=JSON.parse(value) as Partial<SensitiveContext>&{operation?:string};
    if((x.operation==="catalog_apply"||x.operation==="pricing_apply")&&typeof x.previewHash==="string"&&HASH.test(x.previewHash))return{operation:x.operation,previewHash:x.previewHash.toLowerCase()};
    if(x.operation==="recover"&&typeof x.jobId==="string"&&UUID.test(x.jobId)&&typeof x.note==="string"){
      const note=normalizeNote(x.note);if(note.length>=3&&note.length<=500&&!hasControlCharacters(note))return{operation:"recover",jobId:x.jobId,note};
    }
  }catch{return null;}
  return null;
}
function parseCredential(value:FormDataEntryValue|null){
  if(typeof value!=="string"||value.length>100000)return null;
  try{const x=JSON.parse(value);return x&&typeof x==="object"&&!Array.isArray(x)?x as {challenge_id:string;credential_id:string;client_data_json:string;authenticator_data:string;signature:string;user_handle?:string|null}:null;}catch{return null;}
}
function hasControlCharacters(value:string):boolean{for(const ch of value){const code=ch.charCodeAt(0);if(code<=0x1f||code===0x7f)return true;}return false;}
function cookieHeaders(values:readonly string[]):Headers{const headers=new Headers();appendAdminAuthSetCookies(headers,values);return headers;}
function formatNumber(value:number):string{return new Intl.NumberFormat("fa-IR").format(value);}
function formatToman(value:number):string{return new Intl.NumberFormat("fa-IR").format(value)+" تومان";}
