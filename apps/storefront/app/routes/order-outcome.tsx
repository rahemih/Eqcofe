import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { StatePanel } from "../components/StatePanel.js";
import { OrderOutcomeView } from "../features/cart-checkout/OrderOutcomeView.js";
import { handleOrderOutcomeAction, loadOrderOutcome, type PaymentActionResult } from "../features/cart-checkout/checkout-payment.server.js";
import "../styles/checkout-flow.css";
export const handle={breadcrumb:"نتیجه سفارش"};
export const meta=()=>[{title:"نتیجه سفارش | EQCOFE"},{name:"robots",content:"noindex,nofollow"}];
export async function loader({request,params}:{request:Request;params:{orderNumber?:string}}){const orderNumber=String(params.orderNumber??"");try{return data({kind:"ready" as const,value:await loadOrderOutcome(request,orderNumber)});}catch{return data({kind:"recovery" as const});}}
export async function action({request,params}:{request:Request;params:{orderNumber?:string}}){const result=await handleOrderOutcomeAction(request,String(params.orderNumber??""));if(result.kind==="redirect"){const headers=new Headers();for(const cookie of result.setCookies)headers.append("Set-Cookie",cookie);return redirect(result.location,{headers});}return data<PaymentActionResult>(result,{status:result.statusCode});}
export default function OrderOutcomeRoute(){const loaderData=useLoaderData<typeof loader>(),actionData=useActionData<typeof action>()??null,navigation=useNavigation(),busy=navigation.state!=="idle";if(loaderData.kind==="recovery")return <main className="checkout-flow-page"><h1>نتیجه سفارش</h1><StatePanel variant="recovery" title="سفارش از این نشست قابل بازیابی نیست" message="نتیجه موفقیت ساخته نمی‌شود. در صورت ورود، از سفارش‌های حساب کاربری یا پشتیبانی با مرجع سفارش ادامه دهید."/></main>;return <main className="checkout-flow-page" aria-busy={busy}><OrderOutcomeView data={loaderData.value} actionData={actionData} busy={busy}/></main>;}
