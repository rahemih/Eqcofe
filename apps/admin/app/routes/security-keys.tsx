import { data, redirect, useFetcher, useLoaderData, useRevalidator } from "react-router";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { ApiComponents } from "../platform/api/contract";
import {
  createAdminStepUpChallenge,
  createAdditionalCredentialChallenge,
  listAdminFidoCredentials,
  revokeAdminFidoCredential,
  verifyAdditionalCredential,
  verifyAdminStepUp,
  type CredentialFlowFailureCode
} from "../platform/auth/step-up-credentials.server";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client";
import { ActionReviewDialog } from "../security/ActionReviewDialog";

type Credential=ApiComponents["schemas"]["AdminFidoCredentialSummary"];
type StepUpBody=ApiComponents["schemas"]["PostAdminAuthStepUpVerifyRequest"];
type RegistrationBody=ApiComponents["schemas"]["PostAdminAuthFidoVerifyRequest"];
type Review={kind:"add"}|{kind:"revoke";credential:Credential};

type ActionData=
  | {kind:"step-up-challenge";action:"add"|"revoke";credentialId:string|null;challengeId:string;options:Record<string,unknown>}
  | {kind:"registration-challenge";stepUpToken:string;challengeId:string;options:Record<string,unknown>}
  | {kind:"success";message:string}
  | {kind:"discarded"}
  | {kind:"failure";message:string;requestId:string|null};

export async function loader({request}:{request:Request}){
  const result=await listAdminFidoCredentials(request);
  if(!result.ok){
    if(result.code==="UNAUTHENTICATED")throw redirect("/login");
    return data({kind:"unavailable" as const,message:failureMessage(result.code),requestId:result.requestId},{status:result.code==="UNAVAILABLE"?503:409});
  }
  return data({kind:"ready" as const,credentials:result.credentials});
}

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedFormOrigin(request))return data<ActionData>({kind:"failure",message:"درخواست امنیتی معتبر نیست.",requestId:null},{status:403});
  const form=await request.formData();
  const intent=String(form.get("intent")??"");
  if(intent==="discard")return data<ActionData>({kind:"discarded"});

  if(intent==="begin-add"||intent==="begin-revoke"){
    const actionKind=intent==="begin-add"?"add":"revoke";
    const credentialId=actionKind==="revoke"?String(form.get("credential_id")??""):null;
    if(actionKind==="revoke"){
      const current=await listAdminFidoCredentials(request);
      if(!current.ok){
        if(current.code==="UNAUTHENTICATED")throw redirect("/login");
        return failureData(current.code,current.requestId);
      }
      if(!credentialId||!current.credentials.some(item=>item.id===credentialId))return data<ActionData>({kind:"failure",message:"اقدام انتخاب‌شده در زمینهٔ فعلی در دسترس نیست.",requestId:null},{status:403});
    }
    const challenge=await createAdminStepUpChallenge(request);
    if(!challenge.ok){
      if(challenge.code==="UNAUTHENTICATED")throw redirect("/login");
      return failureData(challenge.code,challenge.requestId);
    }
    return data<ActionData>({kind:"step-up-challenge",action:actionKind,credentialId,challengeId:challenge.challengeId,options:challenge.options});
  }

  if(intent==="verify-step-up"){
    const actionKind=form.get("action_kind")==="revoke"?"revoke":"add";
    const credentialId=actionKind==="revoke"?String(form.get("credential_id")??""):null;
    const body=parseJsonBody<StepUpBody>(form.get("credential"));
    if(!body)return data<ActionData>({kind:"failure",message:"پاسخ احراز مجدد معتبر نیست.",requestId:null},{status:400});
    const stepped=await verifyAdminStepUp(request,body);
    if(!stepped.ok){
      if(stepped.code==="UNAUTHENTICATED")throw redirect("/login");
      return failureData(stepped.code,stepped.requestId);
    }
    if(actionKind==="revoke"){
      if(!credentialId)return data<ActionData>({kind:"failure",message:"اقدام انتخاب‌شده معتبر نیست.",requestId:null},{status:400});
      const result=await revokeAdminFidoCredential(request,stepped.token,credentialId);
      if(!result.ok){
        if(result.code==="UNAUTHENTICATED")throw redirect("/login");
        return failureData(result.code,result.requestId);
      }
      return data<ActionData>({kind:"success",message:"کلید امنیتی انتخاب‌شده با تأیید سرور لغو شد."});
    }
    const registration=await createAdditionalCredentialChallenge(request,stepped.token);
    if(!registration.ok){
      if(registration.code==="UNAUTHENTICATED")throw redirect("/login");
      return failureData(registration.code,registration.requestId);
    }
    return data<ActionData>({kind:"registration-challenge",stepUpToken:stepped.token,challengeId:registration.challengeId,options:registration.options});
  }

  if(intent==="verify-registration"){
    const token=String(form.get("step_up_token")??"");
    const deviceName=String(form.get("device_name")??"").trim().slice(0,150)||"Security key";
    const body=parseJsonBody<RegistrationBody>(form.get("credential"));
    if(!body||token.length<16||token.length>8192)return data<ActionData>({kind:"failure",message:"زمینهٔ ثبت کلید منقضی یا نامعتبر است.",requestId:null},{status:400});
    const result=await verifyAdditionalCredential(request,token,{...body,device_name:deviceName});
    if(!result.ok){
      if(result.code==="UNAUTHENTICATED")throw redirect("/login");
      return failureData(result.code,result.requestId);
    }
    return data<ActionData>({kind:"success",message:"کلید امنیتی جدید با تأیید سرور ثبت شد."});
  }

  return data<ActionData>({kind:"failure",message:"مرحلهٔ امنیتی شناخته‌شده نیست.",requestId:null},{status:400});
}

export default function SecurityKeysRoute(){
  const state=useLoaderData<typeof loader>();
  const fetcher=useFetcher<typeof action>();
  const revalidator=useRevalidator();
  const [review,setReview]=useState<Review|null>(null);
  const [deviceName,setDeviceName]=useState("Security key");
  const [clientError,setClientError]=useState<string|null>(null);
  const launcherRef=useRef<HTMLElement|null>(null);
  const handledChallenge=useRef<string|null>(null);
  const stepUpTokenRef=useRef<string|null>(null);
  const busy=fetcher.state!=="idle";

  useEffect(()=>{
    const payload=fetcher.data;
    if(!payload)return;
    if(payload.kind==="step-up-challenge"&&handledChallenge.current!==payload.challengeId){
      handledChallenge.current=payload.challengeId;
      setClientError(null);
      void runAdminWebAuthn("authentication",payload.challengeId,payload.options)
        .then((credential)=>{
          const form=new FormData();
          form.set("intent","verify-step-up");
          form.set("action_kind",payload.action);
          if(payload.credentialId)form.set("credential_id",payload.credentialId);
          form.set("credential",JSON.stringify(credential));
          fetcher.submit(form,{method:"post"});
        })
        .catch(()=>{handledChallenge.current=null;setClientError("احراز مجدد لغو شد یا کلید امنیتی پاسخ نداد.");});
      return;
    }
    if(payload.kind==="registration-challenge"&&handledChallenge.current!==payload.challengeId){
      handledChallenge.current=payload.challengeId;
      stepUpTokenRef.current=payload.stepUpToken;
      setClientError(null);
      const discard=new FormData();
      discard.set("intent","discard");
      fetcher.submit(discard,{method:"post"});
      void runAdminWebAuthn("registration",payload.challengeId,payload.options)
        .then((credential)=>{
          const token=stepUpTokenRef.current;
          stepUpTokenRef.current=null;
          if(!token)throw new Error("STEP_UP_CONTEXT_DISCARDED");
          const form=new FormData();
          form.set("intent","verify-registration");
          form.set("step_up_token",token);
          form.set("device_name",deviceName);
          form.set("credential",JSON.stringify(credential));
          fetcher.submit(form,{method:"post"});
        })
        .catch(()=>{stepUpTokenRef.current=null;handledChallenge.current=null;setClientError("ثبت کلید امنیتی لغو شد یا قابل تکمیل نبود.");});
      return;
    }
    if(payload.kind==="success"){
      stepUpTokenRef.current=null;
      handledChallenge.current=null;
      queueMicrotask(()=>{
        setClientError(null);
        setReview(null);
        void revalidator.revalidate();
        launcherRef.current?.focus();
      });
    }
  },[fetcher.data,fetcher,revalidator,deviceName]);

  if(state.kind==="unavailable"){
    return <StateCard title="کلیدهای امنیتی فعلاً قابل بررسی نیستند" message={state.message} requestId={state.requestId}/>;
  }

  const credentials=state.credentials;
  const onlyCredential=credentials.length<=1;
  const failure=fetcher.data?.kind==="failure"?fetcher.data:null;
  const openAdd=(event:MouseEvent<HTMLButtonElement>)=>{launcherRef.current=event.currentTarget;setClientError(null);setDeviceName("Security key");setReview({kind:"add"});};
  const openRevoke=(event:MouseEvent<HTMLButtonElement>,credential:Credential)=>{launcherRef.current=event.currentTarget;setClientError(null);setReview({kind:"revoke",credential});};
  const closeReview=()=>{if(busy)return;stepUpTokenRef.current=null;handledChallenge.current=null;setClientError(null);setReview(null);const discard=new FormData();discard.set("intent","discard");fetcher.submit(discard,{method:"post"});queueMicrotask(()=>launcherRef.current?.focus());};
  const confirmReview=()=>{
    if(!review||busy)return;
    handledChallenge.current=null;
    const form=new FormData();
    if(review.kind==="add")form.set("intent","begin-add");
    else{form.set("intent","begin-revoke");form.set("credential_id",review.credential.id);}
    fetcher.submit(form,{method:"post"});
  };

  return (
    <section className="security-keys-page" aria-labelledby="security-keys-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه"><a href="/">مدیریت</a><span aria-hidden="true">/</span><span aria-current="page">کلیدهای امنیتی من</span></nav>
      <div className="security-keys-heading">
        <div>
          <p className="destination-kicker">امنیت نشست</p>
          <h1 id="security-keys-title">کلیدهای امنیتی من</h1>
          <p>افزودن یا لغو کلید فقط پس از احراز مجدد WebAuthn انجام می‌شود. نتیجه همیشه از سرور دوباره خوانده می‌شود.</p>
        </div>
        <button type="button" className="security-key-primary" onClick={openAdd}>افزودن کلید</button>
      </div>

      {(failure||clientError)?<div className="auth-alert" role="alert"><p>{failure?.message??clientError}</p>{failure?.requestId?<p className="auth-request-id">شناسه پیگیری: <bdi>{failure.requestId}</bdi></p>:null}</div>:null}
      {fetcher.data?.kind==="success"?<p className="security-key-outcome" role="status">{fetcher.data.message}</p>:null}

      {credentials.length?(
        <ul className="security-key-list">
          {credentials.map((credential)=>(
            <li key={credential.id} className="security-key-card">
              <div>
                <h2>{credential.device_name}</h2>
                <dl>
                  <div><dt>ثبت</dt><dd>{formatDate(credential.created_at)}</dd></div>
                  <div><dt>آخرین استفاده</dt><dd>{credential.last_used_at?formatDate(credential.last_used_at):"هنوز ثبت نشده"}</dd></div>
                  <div><dt>پشتیبان‌گیری دستگاه</dt><dd>{credential.backed_up?"فعال":"غیرفعال"}</dd></div>
                </dl>
              </div>
              <button type="button" onClick={(event)=>openRevoke(event,credential)} disabled={onlyCredential} aria-describedby={onlyCredential?"last-key-note":undefined}>لغو کلید</button>
            </li>
          ))}
        </ul>
      ):<p className="destination-state">کلید امنیتی فعالی برای این نشست گزارش نشد. برای حفظ دسترسی، ابتدا وضعیت حساب را با مسئول مجاز بررسی کنید.</p>}
      {onlyCredential&&credentials.length?<p id="last-key-note" className="security-key-note">آخرین کلید فعال از این صفحه قابل لغو نیست؛ Backend نیز این محدودیت را به‌صورت قطعی اعمال می‌کند.</p>:null}

      <ActionReviewDialog
        open={review!==null}
        title={review?.kind==="revoke"?"لغو کلید امنیتی":"افزودن کلید امنیتی"}
        description={review?.kind==="revoke"?"این کلید پس از احراز مجدد از حساب شما لغو می‌شود. اگر زمینه یا نشست تغییر کرده باشد عملیات متوقف خواهد شد.":"پس از احراز مجدد، مرورگر برای ثبت یک کلید فیزیکی جدید درخواست خواهد داد. هیچ توکن امنیتی در حافظهٔ پایدار مرورگر ذخیره نمی‌شود."}
        confirmLabel={review?.kind==="revoke"?"احراز مجدد و لغو":"احراز مجدد و ادامه ثبت"}
        destructive={review?.kind==="revoke"}
        busy={busy}
        onConfirm={confirmReview}
        onClose={closeReview}
      >
        {review?.kind==="add"?<label className="security-key-name"><span>نام دستگاه</span><input value={deviceName} onChange={(event)=>setDeviceName(event.currentTarget.value)} maxLength={150} autoComplete="off"/></label>:null}
        {review?.kind==="revoke"?<dl className="security-key-review"><div><dt>کلید</dt><dd>{review.credential.device_name}</dd></div><div><dt>زمان ثبت</dt><dd>{formatDate(review.credential.created_at)}</dd></div></dl>:null}
      </ActionReviewDialog>
    </section>
  );
}

function failureData(code:CredentialFlowFailureCode,requestId:string|null){
  const status=code==="UNAVAILABLE"?503:code==="INVALID_INPUT"?400:code==="LAST_CREDENTIAL"||code==="CONFLICT"?409:403;
  return data<ActionData>({kind:"failure",message:failureMessage(code),requestId},{status});
}
function failureMessage(code:CredentialFlowFailureCode):string{
  const messages:Record<CredentialFlowFailureCode,string>={
    INVALID_INPUT:"درخواست امنیتی معتبر نیست.",
    UNAUTHENTICATED:"نشست مدیریت معتبر نیست.",
    STEP_UP_REQUIRED:"احراز مجدد منقضی یا نامعتبر است. اقدام را از ابتدا بررسی کنید.",
    LAST_CREDENTIAL:"آخرین کلید امنیتی فعال قابل لغو نیست.",
    CREDENTIAL_NOT_FOUND:"اقدام انتخاب‌شده در زمینهٔ فعلی در دسترس نیست.",
    FIDO_FAILED:"تأیید کلید امنیتی انجام نشد.",
    CONFLICT:"وضعیت امنیتی تغییر کرده است. فهرست را دوباره بررسی کنید.",
    UNAVAILABLE:"سرویس امنیتی موقتاً قابل بررسی نیست."
  };
  return messages[code];
}
function StateCard({title,message,requestId}:{title:string;message:string;requestId:string|null}){
  return <section className="destination-state" role="status"><p className="destination-kicker">امنیت نشست</p><h1>{title}</h1><p>{message}</p>{requestId?<p className="auth-request-id">شناسه پیگیری: <bdi>{requestId}</bdi></p>:null}</section>;
}
function parseJsonBody<T>(value:FormDataEntryValue|null):T|null{if(typeof value!=="string"||value.length>50000)return null;try{const parsed=JSON.parse(value) as unknown;return typeof parsed==="object"&&parsed!==null&&!Array.isArray(parsed)?parsed as T:null;}catch{return null;}}
function isTrustedFormOrigin(request:Request):boolean{const origin=request.headers.get("origin");if(origin)return origin===new URL(request.url).origin;const site=request.headers.get("sec-fetch-site");return site==="same-origin"||site==="none";}
function formatDate(value:string):string{try{return new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch{return "زمان نامعتبر";}}
