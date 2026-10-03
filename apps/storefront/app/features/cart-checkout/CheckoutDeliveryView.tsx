import { Form, Link } from "react-router";
import type { CheckoutDeliveryActionResult, CheckoutDeliveryLoaderData } from "./checkout-delivery.server.js";

export function CheckoutDeliveryView({ data, actionData, busy }: { data: CheckoutDeliveryLoaderData; actionData: CheckoutDeliveryActionResult | null; busy: boolean }) {
  const feedback = actionData?.kind === "data" ? actionData : null;
  return <div className="checkout-flow">
    <header className="checkout-flow__intro"><p className="checkout-flow__step">مرحله ۴ از ۵</p><h1>روش تحویل و محاسبه مبلغ نهایی</h1><p>هزینه تحویل و Quote فقط از پاسخ authoritative سرور استفاده می‌شوند.</p></header>
    <section className="checkout-flow__card"><h2>نشانی انتخاب‌شده</h2><p>{data.address.recipient_name} — {data.address.address_line}</p><Link to="/checkout/address">تغییر نشانی</Link></section>
    {feedback ? <div className="checkout-flow__feedback" role="alert">{feedback.message}{feedback.requestId ? <span>شناسه پیگیری: <bdi dir="ltr">{feedback.requestId}</bdi></span> : null}</div> : null}
    <Form method="post" className="checkout-flow__card checkout-flow__form">
      <input type="hidden" name="intent" value="quote" />
      <h2 className="checkout-flow__wide">روش تحویل</h2>
      {data.methods.length === 0 ? <p className="checkout-flow__wide" role="alert">هیچ روش تحویل فعالی از سرور دریافت نشد.</p> : null}
      <div className="checkout-flow__wide checkout-flow__choices">{data.methods.map((method,index)=><label className="checkout-flow__choice" key={method.id}><input type="radio" name="shipping_method_id" value={method.id} required defaultChecked={index===0} disabled={busy}/><span><strong>{method.name_fa}</strong><small>{new Intl.NumberFormat("fa-IR").format(method.fee_toman)} تومان</small></span></label>)}</div>
      <label className="checkout-flow__wide">کد تخفیف (اختیاری)<input name="coupon_code" maxLength={100} autoComplete="off"/></label>
      <button type="submit" className="checkout-flow__wide" disabled={busy || data.methods.length===0}>محاسبه مبلغ نهایی و بازبینی</button>
    </Form>
    <nav className="checkout-flow__nav"><Link to="/checkout/address">بازگشت به نشانی</Link><Link to="/cart">سبد خرید</Link></nav>
    {busy ? <p role="status" aria-live="polite">در حال دریافت Quote معتبر…</p> : null}
  </div>;
}
