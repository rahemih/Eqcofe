import { Form, Link } from "react-router";
import type { CheckoutDeliveryPageData } from "./checkout-flow.server.js";
const toman = new Intl.NumberFormat("fa-IR");
export function CheckoutDeliveryView({data,busy}:{data:CheckoutDeliveryPageData;busy:boolean}) {
  if ("status" in data) return <section className="checkout-flow"><h1>روش تحویل</h1><p className="checkout-flow__alert" role="alert">{data.message}</p><Link className="checkout-back-link" to="/checkout/address">بازگشت به نشانی</Link></section>;
  return <section className="checkout-flow" aria-labelledby="checkout-delivery-title">
    <header className="checkout-flow__intro"><p>مرحله ۴ از ۵</p><h1 id="checkout-delivery-title">روش تحویل</h1><p>هزینه و روش ارسال فقط از فهرست معتبر سرور استفاده می‌شود.</p></header>
    <article className="checkout-current-address"><h2>نشانی انتخاب‌شده</h2><p>{data.address.recipient_name} — {data.address.address_line}</p><Link to="/checkout/address">تغییر نشانی</Link></article>
    {data.methods.length ? <Form method="post" action="/checkout/review" className="checkout-delivery-form">
      <input type="hidden" name="intent" value="prepare"/><input type="hidden" name="quote_idempotency_key" value={data.quoteIdempotencyKey}/><input type="hidden" name="reservation_idempotency_key" value={data.reservationIdempotencyKey}/>
      <fieldset><legend>روش تحویل را انتخاب کنید</legend>{data.methods.map((method,index)=><label className="checkout-choice" key={method.id}><input type="radio" name="shipping_method_id" value={method.id} defaultChecked={index===0} required/><span><strong>{method.name_fa}</strong><small>{toman.format(method.fee_toman)} تومان</small></span></label>)}</fieldset>
      <label>کد تخفیف (اختیاری)<input name="coupon_code" maxLength={100} autoComplete="off"/></label><button type="submit" disabled={busy}>محاسبه نهایی و بازبینی</button>
    </Form> : <p className="checkout-flow__alert" role="alert">هیچ روش ارسال فعالی از سرور دریافت نشد.</p>}
    <Link className="checkout-back-link" to="/checkout/address">بازگشت به نشانی</Link>
  </section>;
}
