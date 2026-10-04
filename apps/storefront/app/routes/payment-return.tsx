import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { StatePanel } from "../components/StatePanel.js";
import { PaymentReturnView } from "../features/cart-checkout/PaymentReturnView.js";
import { handlePaymentReturnAction, loadPaymentReturn, type PaymentActionResult } from "../features/cart-checkout/checkout-payment.server.js";
import "../styles/checkout-flow.css";
export const handle={breadcrumb:"بازگشت از پرداخت"};
export const meta=()=>[{title:"بررسی نتیجه پرداخت | EQCOFE"},{name:"robots",content:"noindex,nofollow"}];
export async function loader({request}:{request:Request}){try{return data({kind:"ready" as const,value:await loadPaymentReturn(request)});}catch{return data({kind:"recovery" as const});}}
export async function action({request}:{request:Request}){const result=await handlePaymentReturnAction(request);if(result.kind==="redirect"){const headers=new Headers();for(const cookie of result.setCookies)headers.append("Set-Cookie",cookie);return redirect(result.location,{headers});}return data<PaymentActionResult>(result,{status:result.statusCode});}
export default function PaymentReturnRoute(){const loaderData=useLoaderData<typeof loader>(),actionData=useActionData<typeof action>()??null,navigation=useNavigation(),busy=navigation.state!=="idle";if(loaderData.kind==="recovery")return <main className="checkout-flow-page"><h1>بررسی نتیجه پرداخت</h1><StatePanel variant="recovery" title="مرجع امن پرداخت در دسترس نیست" message="بدون Checkout token و handoff امضاشده، شناسه پرداخت از URL پذیرفته نمی‌شود. از نتیجه سفارش یا حساب کاربری ادامه دهید."/></main>;return <main className="checkout-flow-page" aria-busy={busy}><PaymentReturnView data={loaderData.value} actionData={actionData} busy={busy}/></main>;}
