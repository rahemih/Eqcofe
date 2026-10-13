import { Form, data, redirect, useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import { useEffect, useRef } from "react";
import type { ApiComponents } from "../platform/api/contract";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server";
import { beginAdminLogin, requestAdminFidoChallenge, verifyAdminFido } from "../platform/auth/admin-auth-flow.server";
import { probeAdminSession } from "../platform/auth/admin-session.server";
import { runAdminWebAuthn } from "../platform/auth/webauthn.client";

type VerifyBody=ApiComponents["schemas"]["PostAdminAuthFidoVerifyRequest"];
type ActionPayload=
  | {kind:"preauth";expiresInSeconds:number}
  | {kind:"challenge";mode:"registration"|"authentication";challengeId:string;options:Record<string,unknown>}
  | {kind:"enrollment-required"}
  | {kind:"failure";message:string;requestId:string|null};

export async function loader({request}:{request:Request}){
  const probe=await probeAdminSession(request);
  const headers=new Headers();
  appendAdminAuthSetCookies(headers,probe.setCookies);
  if(probe.kind==="authenticated") throw redirect("/",{headers});
  if(probe.kind==="unavailable") return data({kind:"unavailable" as const,requestId:probe.requestId},{status:503,headers});
  return data({kind:"ready" as const},{headers});
}

export async function action({request}:{request:Request}){
  if(request.method!=="POST"||!isTrustedFormOrigin(request)) return data<ActionPayload>({kind:"failure",message:"درخواست ورود معتبر نیست.",requestId:null},{status:403});
  const form=await request.formData();
  const intent=String(form.get("intent")??"");
  if(intent==="password"){
    const result=await beginAdminLogin(request,String(form.get("username")??""),String(form.get("password")??""));
    const headers=appendHeaders(result.setCookies);
    if(result.ok)return data<ActionPayload>({kind:"preauth",expiresInSeconds:result.expiresInSeconds},{headers});
    return data<ActionPayload>(failurePayload(result.code,result.requestId),{status:statusFor(result.code),headers});
  }
  if(intent==="challenge"){
    const token=String(form.get("enrollment_token")??"").trim()||null;
    const result=await requestAdminFidoChallenge(request,token);
    const headers=appendHeaders(result.setCookies);
    if(result.ok)return data<ActionPayload>({kind:"challenge",mode:result.mode,challengeId:result.challengeId,options:result.options},{headers});
    if(result.code==="ENROLLMENT_TOKEN_REQUIRED")return data<ActionPayload>({kind:"enrollment-required"},{status:401,headers});
    return data<ActionPayload>(failurePayload(result.code,result.requestId),{status:statusFor(result.code),headers});
  }
  if(intent==="verify"){
    const body=parseVerifyBody(form.get("credential"));
    if(!body)return data<ActionPayload>({kind:"failure",message:"پاسخ کلید امنیتی معتبر نیست.",requestId:null},{status:400});
    const result=await verifyAdminFido(request,body);
    const headers=appendHeaders(result.setCookies);
    if(result.ok)throw redirect("/",{headers});
    return data<ActionPayload>(failurePayload(result.code,result.requestId),{status:statusFor(result.code),headers});
  }
  return data<ActionPayload>({kind:"failure",message:"مرحله ورود شناخته‌شده نیست.",requestId:null},{status:400});
}

export default function LoginRoute(){
  const loaderState=useLoaderData<typeof loader>();
  const actionState=useActionData<typeof action>();
  const navigation=useNavigation();
  const submit=useSubmit();
  const handledChallenge=useRef<string|null>(null);
  const busy=navigation.state!=="idle";

  useEffect(()=>{
    if(actionState?.kind==="preauth"){
      const form=new FormData();
      form.set("intent","challenge");
      void submit(form,{method:"post"});
    }
  },[actionState,submit]);

  useEffect(()=>{
    if(actionState?.kind!=="challenge"||handledChallenge.current===actionState.challengeId)return;
    handledChallenge.current=actionState.challengeId;
    void runAdminWebAuthn(actionState.mode,actionState.challengeId,actionState.options)
      .then((credential)=>{
        const form=new FormData();
        form.set("intent","verify");
        form.set("credential",JSON.stringify(credential));
        return submit(form,{method:"post"});
      })
      .catch(()=>{handledChallenge.current=null;});
  },[actionState,submit]);

  if(loaderState.kind==="unavailable"){
    return <AuthState title="ورود مدیریت موقتاً در دسترس نیست" message="تا زمانی که سرویس احراز هویت قابل بررسی نباشد، اطلاعات ورود دریافت نمی‌شود." requestId={loaderState.requestId}/>;
  }

  const showEnrollment=actionState?.kind==="enrollment-required";
  const failure=actionState?.kind==="failure"?actionState:null;
  return (
    <main className="admin-login-page" id="admin-main">
      <section className="admin-login-card" aria-labelledby="admin-login-title" aria-busy={busy}>
        <p className="auth-kicker">EQCOFE Admin</p>
        <h1 id="admin-login-title">ورود امن مدیریت</h1>
        <p className="auth-intro">ورود با نام کاربری و رمز آغاز می‌شود و با کلید امنیتی WebAuthn تکمیل خواهد شد.</p>
        {failure?<div className="auth-alert" role="alert"><p>{failure.message}</p>{failure.requestId?<p className="auth-request-id">شناسه پیگیری: <bdi>{failure.requestId}</bdi></p>:null}</div>:null}
        {showEnrollment?(
          <Form method="post" className="auth-form">
            <input type="hidden" name="intent" value="challenge"/>
            <label htmlFor="enrollment-token">توکن ثبت کلید امنیتی</label>
            <input id="enrollment-token" name="enrollment_token" type="password" minLength={32} maxLength={256} autoComplete="off" required/>
            <button type="submit" disabled={busy}>ادامه ثبت کلید امنیتی</button>
          </Form>
        ):(
          <Form method="post" className="auth-form" replace>
            <input type="hidden" name="intent" value="password"/>
            <label htmlFor="username">نام کاربری</label>
            <input id="username" name="username" type="text" autoComplete="username" maxLength={320} required/>
            <label htmlFor="password">رمز عبور</label>
            <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={1024} required/>
            <button type="submit" disabled={busy}>{busy?"در حال بررسی…":"ادامه با کلید امنیتی"}</button>
          </Form>
        )}
        {actionState?.kind==="challenge"?<p className="auth-progress" role="status">در انتظار تأیید کلید امنیتی…</p>:null}
        <p className="auth-footnote">نشست مدیریت فقط با کوکی HttpOnly نگه‌داری می‌شود؛ رمز و پاسخ کلید امنیتی در حافظه مرورگر ذخیره نمی‌شوند.</p>
      </section>
    </main>
  );
}

function AuthState({title,message,requestId}:{title:string;message:string;requestId:string|null}){
  return <main className="auth-state-page" id="admin-main"><section className="auth-state-card" role="status"><p className="auth-kicker">پنل مدیریت</p><h1>{title}</h1><p>{message}</p>{requestId?<p className="auth-request-id">شناسه پیگیری: <bdi>{requestId}</bdi></p>:null}<a className="auth-secondary-link" href="/login">تلاش دوباره</a></section></main>;
}
function appendHeaders(values:readonly string[]):Headers{const headers=new Headers();appendAdminAuthSetCookies(headers,values);return headers;}
function parseVerifyBody(value:FormDataEntryValue|null):VerifyBody|null{if(typeof value!=="string"||value.length>40000)return null;try{const parsed=JSON.parse(value) as unknown;return isRecord(parsed)&&typeof parsed.challenge_id==="string"&&typeof parsed.credential_id==="string"&&typeof parsed.client_data_json==="string"?parsed as VerifyBody:null;}catch{return null;}}
function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==="object"&&value!==null&&!Array.isArray(value);}
function isTrustedFormOrigin(request:Request):boolean{const origin=request.headers.get("origin");if(origin)return origin===new URL(request.url).origin;const site=request.headers.get("sec-fetch-site");return site==="same-origin"||site==="none";}
function statusFor(code:string):number{return code==="RATE_LIMITED"?429:code==="UNAVAILABLE"?503:code==="INVALID_INPUT"?400:401;}
function failurePayload(code:string,requestId:string|null):ActionPayload{
  const messages:Record<string,string>={
    INVALID_INPUT:"اطلاعات ورود کامل یا معتبر نیست.",
    INVALID_CREDENTIALS:"نام کاربری یا رمز عبور معتبر نیست.",
    RATE_LIMITED:"تعداد تلاش‌ها زیاد است. کمی بعد دوباره امتحان کنید.",
    PREAUTH_REQUIRED:"مرحله ورود منقضی شده است. ورود را از ابتدا انجام دهید.",
    FIDO_FAILED:"تأیید کلید امنیتی انجام نشد. دوباره تلاش کنید.",
    SESSION_EXPIRED:"نشست مدیریت معتبر نیست. ورود را از ابتدا انجام دهید.",
    UNAVAILABLE:"سرویس ورود مدیریت موقتاً قابل استفاده نیست."
  };
  return {kind:"failure",message:messages[code]??"ورود تکمیل نشد.",requestId};
}
