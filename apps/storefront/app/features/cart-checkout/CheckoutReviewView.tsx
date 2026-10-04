import { Form, Link } from "react-router";
import type { CheckoutReviewActionResult, CheckoutReviewLoaderData } from "./checkout-review.server.js";

export function CheckoutReviewView({ data, actionData, busy }: { data: CheckoutReviewLoaderData; actionData: CheckoutReviewActionResult | null; busy: boolean }) {
  const { snapshot, address, cart } = data;
  const feedback = actionData?.kind === "data" ? actionData : null;
  return <div className="checkout-flow checkout-review">
    <header className="checkout-flow__intro"><p className="checkout-flow__step">مرحله ۵ از ۵</p><h1>بازبینی و ثبت سفارش</h1><p>این صفحه Snapshot معتبر Quote را بازبینی می‌کند؛ ثبت سفارش با کلید idempotent انجام می‌شود.</p></header>
    {feedback ? <div className="checkout-flow__feedback" role="alert">{feedback.message}{feedback.requestId ? <span>شناسه پیگیری: <bdi dir="ltr">{feedback.requestId}</bdi></span> : null}</div> : null}
    <div className="checkout-review__grid">
      <div>
        <section className="checkout-flow__card"><h2>کالاها</h2><ul className="checkout-review__items">{cart.data.items.map(item=><li key={item.id}><span>{item.product_name}</span><span>تعداد {new Intl.NumberFormat("fa-IR").format(item.quantity)}</span></li>)}</ul></section>
        <section className="checkout-flow__card"><h2>نشانی و تحویل</h2><p>{address.recipient_name} — {address.address_line}</p><p><bdi dir="ltr">{address.postal_code}</bdi> · <bdi dir="ltr">{address.recipient_mobile}</bdi></p><p>{snapshot.shipping.nameFa}</p><div className="checkout-flow__actions"><Link to="/checkout/address">تغییر نشانی</Link><Link to="/checkout/delivery">تغییر روش تحویل</Link></div></section>
      </div>
      <aside className="checkout-flow__card checkout-review__summary"><h2>خلاصه مبلغ</h2><dl>
        <div><dt>جمع پایه</dt><dd>{t(snapshot.subtotalToman)} تومان</dd></div><div><dt>تخفیف قیمت‌گذاری</dt><dd>{t(snapshot.pricingDiscountToman)} تومان</dd></div><div><dt>تخفیف بازاریابی</dt><dd>{t(snapshot.marketingDiscountToman)} تومان</dd></div><div><dt>ارسال</dt><dd>{t(snapshot.shippingToman)} تومان</dd></div><div><dt>مالیات</dt><dd>{t(snapshot.taxToman)} تومان</dd></div><div className="checkout-review__total"><dt>مبلغ نهایی</dt><dd>{t(snapshot.totalToman)} تومان</dd></div>
      </dl><p>اعتبار Quote تا <time dateTime={snapshot.expiresAt}>{new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short"}).format(new Date(snapshot.expiresAt))}</time></p>
      <Form method="post"><input type="hidden" name="intent" value="submit-order"/><button type="submit" disabled={busy}>ثبت سفارش و رفتن به پرداخت</button></Form>
      <p className="checkout-review__payment-note">پس از ثبت idempotent سفارش، پرداخت از مسیر authoritative آغاز می‌شود. خطا یا بازگشت درگاه هرگز به‌تنهایی موفقیت پرداخت محسوب نمی‌شود.</p></aside>
    </div>
    <nav className="checkout-flow__nav"><Link to="/checkout/delivery">بازگشت به تحویل</Link><Link to="/cart">سبد خرید</Link></nav>
    {busy ? <p role="status" aria-live="polite">در حال رزرو و ثبت idempotent سفارش…</p> : null}
  </div>;
}
function t(value:number){return new Intl.NumberFormat("fa-IR").format(value);}
