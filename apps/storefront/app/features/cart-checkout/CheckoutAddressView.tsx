import { Form, Link } from "react-router";
import type { CheckoutAddressPageData, CheckoutFlowMessage } from "./checkout-flow.server.js";

export function CheckoutAddressView({ data, actionData, busy }: { data: CheckoutAddressPageData; actionData: CheckoutFlowMessage | null; busy: boolean }) {
  if ("status" in data) return <section className="checkout-flow"><h1>نشانی سفارش</h1><p className="checkout-flow__alert" role="alert">{data.message}</p><Link className="checkout-back-link" to="/checkout/identity">بازگشت به هویت</Link></section>;
  return <section className="checkout-flow" aria-labelledby="checkout-address-title">
    <header className="checkout-flow__intro"><p>مرحله ۳ از ۵</p><h1 id="checkout-address-title">انتخاب نشانی تحویل</h1><p>نشانی فقط از حساب واردشده خوانده و پیش از ادامه دوباره در سرور اعتبارسنجی می‌شود.</p></header>
    {actionData ? <p className="checkout-flow__alert" role="alert">{actionData.message}</p> : null}
    {data.addresses.length ? <div className="checkout-address-list" aria-label="نشانی‌های ثبت‌شده">{data.addresses.map((address) =>
      <article className="checkout-address-card" key={address.id}>
        <div><h2>{address.recipient_name}</h2><p>{address.address_line}</p><p>کدپستی: <bdi>{address.postal_code}</bdi> · موبایل: <bdi>{address.recipient_mobile}</bdi></p>{address.is_default ? <strong className="checkout-badge">نشانی پیش‌فرض</strong> : null}</div>
        <div className="checkout-address-card__actions">
          <Form method="post"><input type="hidden" name="intent" value="select"/><input type="hidden" name="address_id" value={address.id}/><input type="hidden" name="idempotency_key" value={data.idempotencyKey}/><button type="submit" disabled={busy}>انتخاب و ادامه</button></Form>
          {!address.is_default ? <Form method="post"><input type="hidden" name="intent" value="set-default"/><input type="hidden" name="address_id" value={address.id}/><input type="hidden" name="idempotency_key" value={data.idempotencyKey}/><button type="submit" className="checkout-secondary" disabled={busy}>پیش‌فرض شود</button></Form> : null}
        </div>
        <details><summary>ویرایش این نشانی</summary><Form method="post" className="checkout-form-grid">
          <input type="hidden" name="intent" value="update"/><input type="hidden" name="address_id" value={address.id}/><input type="hidden" name="idempotency_key" value={data.idempotencyKey}/>
          <Field label="نام گیرنده" name="recipient_name" defaultValue={address.recipient_name}/><Field label="موبایل گیرنده" name="recipient_mobile" defaultValue={address.recipient_mobile} inputMode="tel"/><Field label="کد پستی" name="postal_code" defaultValue={address.postal_code} inputMode="numeric"/><Field label="پلاک" name="building_no" defaultValue={address.building_no ?? ""} required={false}/><Field label="واحد" name="unit_no" defaultValue={address.unit_no ?? ""} required={false}/>
          <label className="checkout-form-grid__wide">نشانی دقیق<textarea name="address_line" required maxLength={1000} defaultValue={address.address_line}/></label><button type="submit" disabled={busy}>ذخیره ویرایش</button>
        </Form></details>
      </article>)}</div> : <p className="checkout-flow__status" role="status">هنوز نشانی ثبت نشده است. یک نشانی معتبر اضافه کنید.</p>}
    <section className="checkout-new-address" aria-labelledby="new-address-title"><h2 id="new-address-title">افزودن نشانی جدید</h2><p>استان و شهر به‌صورت متن انسانی حفظ می‌شوند؛ شناسه‌های داخلی این مرحله جایگزین مرجع رسمی جغرافیا نیستند.</p>
      <Form method="post" className="checkout-form-grid"><input type="hidden" name="intent" value="create"/><input type="hidden" name="idempotency_key" value={data.idempotencyKey}/>
        <Field label="نام گیرنده" name="recipient_name"/><Field label="موبایل گیرنده" name="recipient_mobile" inputMode="tel"/><Field label="استان" name="province_name"/><Field label="شهر" name="city_name"/><Field label="کد پستی" name="postal_code" inputMode="numeric"/><Field label="پلاک" name="building_no" required={false}/><Field label="واحد" name="unit_no" required={false}/>
        <label className="checkout-form-grid__wide">نشانی دقیق<textarea name="address_line" required maxLength={800}/></label><label className="checkout-checkbox"><input type="checkbox" name="is_default"/> این نشانی پیش‌فرض باشد</label><button type="submit" disabled={busy}>ثبت نشانی و ادامه</button>
      </Form></section>
    <Link className="checkout-back-link" to="/checkout/identity">بازگشت به مرحله هویت</Link>
  </section>;
}
function Field({label,name,defaultValue="",required=true,inputMode}:{label:string;name:string;defaultValue?:string;required?:boolean;inputMode?:"text"|"numeric"|"tel"}) {
  return <label>{label}<input name={name} defaultValue={defaultValue} required={required} maxLength={150} inputMode={inputMode}/></label>;
}
