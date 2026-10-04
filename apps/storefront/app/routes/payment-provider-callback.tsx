import { redirect } from "react-router";
import { processPaymentProviderCallback } from "../features/cart-checkout/cart-checkout-data.server.js";
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function loader({ request, params }: { request: Request; params: { paymentId?: string } }) {
  const paymentId=String(params.paymentId??""),state=new URL(request.url).searchParams.get("state")??"";
  if(!UUID_RE.test(paymentId)||state.length<20||state.length>200)return redirect("/payment/return?callback=unconfirmed");
  let callback="processed";try{await processPaymentProviderCallback(paymentId,state);}catch{callback="unconfirmed";}
  return redirect("/payment/return?payment_id="+encodeURIComponent(paymentId)+"&callback="+callback);
}
export default function PaymentProviderCallbackRoute(){return null;}
