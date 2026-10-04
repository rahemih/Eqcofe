import { useMemo, useState } from "react";
import { Form, Link } from "react-router";
import type {
  CheckoutAddressActionResult,
  CheckoutAddressLoaderData,
} from "./checkout-address.server.js";

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
  const [provinceId, setProvinceId] = useState(data.provinces[0]?.id ?? "");
  const cities = useMemo(
    () => data.cities.filter((city) => city.provinceId === provinceId),
    [data.cities, provinceId],
  );

  return (
    <div className="checkout-flow">
      <header className="checkout-flow__intro">
        <p className="checkout-flow__step">مرحله ۳ از ۵</p>
        <h1>انتخاب نشانی تحویل</h1>
        <p>نشانی‌های حساب و مرجع استان/شهر فقط از داده authoritative سرور استفاده می‌کنند.</p>
      </header>

      {feedback ? (
        <div className="checkout-flow__feedback" role="alert">
          {feedback.message}
          {feedback.requestId ? <span>شناسه پیگیری: <bdi dir="ltr">{feedback.requestId}</bdi></span> : null}
        </div>
      ) : null}

      {data.addresses.length > 0 ? (
        <section className="checkout-flow__list" aria-labelledby="address-list-title">
          <h2 id="address-list-title">نشانی‌های حساب</h2>
          {data.addresses.map((address) => (
            <article className="checkout-flow__card" key={address.id} data-selected={data.selectedAddressId === address.id}>
              <div className="checkout-flow__card-heading">
                <strong>{address.recipient_name}</strong>
                {address.is_default ? <span>پیش‌فرض</span> : null}
              </div>
              <p>{address.address_line}</p>
              <p><bdi dir="ltr">{address.postal_code}</bdi> · <bdi dir="ltr">{address.recipient_mobile}</bdi></p>
              <Form method="post" className="checkout-flow__actions">
                <input type="hidden" name="intent" value="select-address" />
                <input type="hidden" name="address_id" value={address.id} />
                <button type="submit" disabled={busy}>انتخاب و ادامه</button>
              </Form>
              <details className="checkout-flow__details">
                <summary>ویرایش اطلاعات این نشانی</summary>
                <Form method="post" className="checkout-flow__form">
                  <input type="hidden" name="intent" value="update-address" />
                  <input type="hidden" name="address_id" value={address.id} />
                  <label>نام گیرنده<input name="recipient_name" defaultValue={address.recipient_name} required maxLength={150} /></label>
                  <label>موبایل گیرنده<input name="recipient_mobile" defaultValue={address.recipient_mobile} required dir="ltr" inputMode="numeric" pattern="09[0-9]{9}" /></label>
                  <label>کد پستی<input name="postal_code" defaultValue={address.postal_code} required dir="ltr" inputMode="numeric" pattern="[0-9]{10}" /></label>
                  <label className="checkout-flow__wide">نشانی<textarea name="address_line" defaultValue={address.address_line} required maxLength={1000} /></label>
                  <label>پلاک<input name="building_no" defaultValue={address.building_no ?? ""} maxLength={30} /></label>
                  <label>واحد<input name="unit_no" defaultValue={address.unit_no ?? ""} maxLength={30} /></label>
                  <button type="submit" disabled={busy}>ذخیره و ادامه</button>
                </Form>
              </details>
            </article>
          ))}
        </section>
      ) : (
        <section className="checkout-flow__card">
          <h2>اولین نشانی تحویل را ثبت کنید</h2>
          <p>استان و شهر از مرجع نسخه‌قفل‌شده سال {new Intl.NumberFormat("fa-IR").format(data.referenceYear)} دریافت شده‌اند.</p>
        </section>
      )}

      <section className="checkout-flow__card" aria-labelledby="new-address-title">
        <h2 id="new-address-title">ثبت نشانی جدید</h2>
        <p>شناسه استان و شهر توسط مرجع canonical فروشگاه صادر می‌شود و در مرورگر تولید نمی‌شود.</p>
        <Form method="post" className="checkout-flow__form">
          <input type="hidden" name="intent" value="create-address" />
          <label>
            استان
            <select name="province_id" value={provinceId} onChange={(event) => setProvinceId(event.currentTarget.value)} required disabled={busy}>
              {data.provinces.map((province) => <option key={province.id} value={province.id}>{province.name}</option>)}
            </select>
          </label>
          <label>
            شهر
            <select name="city_id" key={provinceId} required disabled={busy || cities.length === 0}>
              {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </label>
          <label>نام گیرنده<input name="recipient_name" required maxLength={150} autoComplete="name" /></label>
          <label>موبایل گیرنده<input name="recipient_mobile" required dir="ltr" inputMode="numeric" pattern="09[0-9]{9}" autoComplete="tel" /></label>
          <label>کد پستی<input name="postal_code" required dir="ltr" inputMode="numeric" pattern="[0-9]{10}" autoComplete="postal-code" /></label>
          <label className="checkout-flow__wide">نشانی<textarea name="address_line" required maxLength={1000} autoComplete="street-address" /></label>
          <label>پلاک<input name="building_no" maxLength={30} /></label>
          <label>واحد<input name="unit_no" maxLength={30} /></label>
          <label className="checkout-flow__checkbox"><input type="checkbox" name="is_default" />این نشانی پیش‌فرض باشد</label>
          <button type="submit" disabled={busy || !provinceId || cities.length === 0}>ثبت نشانی و ادامه</button>
        </Form>
      </section>

      <aside className="checkout-flow__notice">
        <strong>مرجع جغرافیایی</strong>
        <p>فهرست استان و شهر از snapshot canonical سال ۱۴۰۴ می‌آید؛ backend نیز زوج استان/شهر را دوباره اعتبارسنجی می‌کند.</p>
      </aside>
      <nav className="checkout-flow__nav" aria-label="مسیر تسویه‌حساب">
        <Link to="/checkout/identity">بازگشت به هویت</Link>
        <Link to="/cart">سبد خرید</Link>
      </nav>
      {busy ? <p role="status" aria-live="polite">در حال بررسی و ثبت نشانی معتبر…</p> : null}
    </div>
  );
}
