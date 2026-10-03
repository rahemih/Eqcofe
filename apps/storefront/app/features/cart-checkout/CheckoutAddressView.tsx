import { Form, Link } from "react-router";
import type { CheckoutAddressActionResult, CheckoutAddressLoaderData } from "./checkout-address.server.js";

export function CheckoutAddressView({
  data,
  actionData,
  busy,
}: {
  data: CheckoutAddressLoaderData;
  actionData: CheckoutAddressActionResult | null;
  busy: boolean;
}) {
  const feedback = actionData?.kind === "data" ? actionData : null;
  return (
    <div className="checkout-flow">
      <header className="checkout-flow__intro">
        <p className="checkout-flow__step">مرحله ۳ از ۵</p>
        <h1>انتخاب نشانی تحویل</h1>
        <p>فقط نشانی‌های متعلق به نشست احراز‌شده قابل استفاده‌اند.</p>
      </header>
      {feedback ? <div className="checkout-flow__feedback" role="alert">{feedback.message}{feedback.requestId ? <span>شناسه پیگیری: <bdi dir="ltr">{feedback.requestId}</bdi></span> : null}</div> : null}
      {data.addresses.length === 0 ? (
        <section className="checkout-flow__card" aria-labelledby="address-empty-title">
          <h2 id="address-empty-title">هنوز نشانی قابل استفاده‌ای وجود ندارد</h2>
          <p>ثبت نشانی جدید تا اتصال مرجع معتبر استان و شهر فعال نمی‌شود. Checkout در این وضعیت fail-closed می‌ماند.</p>
          <Form method="post"><input type="hidden" name="intent" value="create-address" /><button type="submit" disabled={busy}>بررسی امکان ثبت نشانی</button></Form>
        </section>
      ) : (
        <section className="checkout-flow__list" aria-labelledby="address-list-title">
          <h2 id="address-list-title">نشانی‌های حساب</h2>
          {data.addresses.map((address) => (
            <article className="checkout-flow__card" key={address.id} data-selected={data.selectedAddressId === address.id}>
              <div className="checkout-flow__card-heading"><strong>{address.recipient_name}</strong>{address.is_default ? <span>پیش‌فرض</span> : null}</div>
              <p>{address.address_line}</p>
              <p><bdi dir="ltr">{address.postal_code}</bdi> · <bdi dir="ltr">{address.recipient_mobile}</bdi></p>
              <Form method="post" className="checkout-flow__actions"><input type="hidden" name="intent" value="select-address" /><input type="hidden" name="address_id" value={address.id} /><button type="submit" disabled={busy}>انتخاب و ادامه</button></Form>
              <details className="checkout-flow__details"><summary>ویرایش اطلاعات این نشانی</summary>
                <Form method="post" className="checkout-flow__form">
                  <input type="hidden" name="intent" value="update-address" /><input type="hidden" name="address_id" value={address.id} />
                  <label>نام گیرنده<input name="recipient_name" defaultValue={address.recipient_name} required maxLength={150} /></label>
                  <label>موبایل گیرنده<input name="recipient_mobile" defaultValue={address.recipient_mobile} required dir="ltr" pattern="09[0-9]{9}" /></label>
                  <label>کد پستی<input name="postal_code" defaultValue={address.postal_code} required dir="ltr" pattern="[0-9]{10}" /></label>
                  <label className="checkout-flow__wide">نشانی<textarea name="address_line" defaultValue={address.address_line} required maxLength={1000} /></label>
                  <label>پلاک<input name="building_no" defaultValue={address.building_no ?? ""} maxLength={30} /></label>
                  <label>واحد<input name="unit_no" defaultValue={address.unit_no ?? ""} maxLength={30} /></label>
                  <button type="submit" disabled={busy}>ذخیره و ادامه</button>
                </Form>
              </details>
            </article>
          ))}
        </section>
      )}
      <aside className="checkout-flow__notice"><strong>مرز ایمنی ثبت نشانی جدید</strong><p>API فعلی برای استان و شهر فقط UUID می‌پذیرد اما هیچ endpoint مرجع عمومی برای انتخاب آن‌ها ندارد؛ UI شناسه ساختگی تولید نمی‌کند.</p></aside>
      <nav className="checkout-flow__nav" aria-label="مسیر تسویه‌حساب"><Link to="/checkout/identity">بازگشت به هویت</Link><Link to="/cart">سبد خرید</Link></nav>
      {busy ? <p role="status" aria-live="polite">در حال بررسی نشانی معتبر…</p> : null}
    </div>
  );
}
