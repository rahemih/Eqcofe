import { useMemo, useState } from "react";
import { Form, Link } from "react-router";
import type { AccountAddress } from "./account-contract.js";
import type {
  AccountAddressPageData,
  AccountLoadState,
  AccountMutationResult,
} from "./account-settings.server.js";

type Props = {
  state: AccountLoadState<AccountAddressPageData>;
  actionData: AccountMutationResult | null;
  busy: boolean;
};

export function AccountAddressesView({ state, actionData, busy }: Props) {
  if (state.status === "unavailable") {
    return (
      <section className="account-settings__state" aria-labelledby="addresses-unavailable">
        <p className="account-overview__eyebrow">نشانی‌های من</p>
        <h1 id="addresses-unavailable">نشانی‌ها موقتاً در دسترس نیستند</h1>
        <p>هیچ فهرست محلی یا قدیمی به‌عنوان نشانی معتبر نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/account/addresses">تلاش دوباره</Link>
      </section>
    );
  }

  if (state.status === "unauthenticated") {
    return (
      <section className="account-settings__state" aria-labelledby="addresses-session-ended">
        <p className="account-overview__eyebrow">نشانی‌های من</p>
        <h1 id="addresses-session-ended">نشست شما پایان یافته است</h1>
        <p>برای حفظ حریم خصوصی هیچ نشانی یا اطلاعات گیرنده نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/">بازگشت به فروشگاه</Link>
      </section>
    );
  }

  return <ReadyAddresses data={state.data} actionData={actionData} busy={busy} />;
}

function ReadyAddresses({
  data,
  actionData,
  busy,
}: {
  data: AccountAddressPageData;
  actionData: AccountMutationResult | null;
  busy: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="account-settings">
      <header className="account-settings__header">
        <div>
          <p className="account-overview__eyebrow">SF-E-03 · حساب کاربری</p>
          <h1>نشانی‌های من</h1>
          <p>نشانی‌ها فقط از حساب فعلی دریافت می‌شوند و مرجع استان/شهر سال {data.referenceYear} است.</p>
        </div>
        <Link to="/account">بازگشت به حساب من</Link>
      </header>

      {actionData ? (
        <div
          className={actionData.ok ? "account-settings__notice" : "account-settings__error"}
          role={actionData.ok ? "status" : "alert"}
          tabIndex={actionData.ok ? undefined : -1}
        >
          {actionData.message}
        </div>
      ) : null}

      {data.addresses.length === 0 ? (
        <section className="account-settings__empty" aria-labelledby="addresses-empty">
          <h2 id="addresses-empty">هنوز نشانی ثبت نشده است</h2>
          <p>اولین نشانی را با انتخاب استان و شهر از مرجع معتبر فروشگاه ثبت کنید.</p>
        </section>
      ) : (
        <section className="account-addresses__grid" aria-label="فهرست نشانی‌ها">
          {data.addresses.map((address) => (
            <article className="account-addresses__card" key={address.id}>
              <header>
                <div>
                  <h2>{address.recipient_name}</h2>
                  {address.is_default ? <span className="account-addresses__default">نشانی پیش‌فرض</span> : null}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId((current) => current === address.id ? null : address.id)}
                  aria-expanded={editingId === address.id}
                >
                  {editingId === address.id ? "بستن ویرایش" : "ویرایش"}
                </button>
              </header>

              <address>
                <p>{address.address_line}</p>
                <p>
                  کدپستی: <bdi dir="ltr">{maskPostal(address.postal_code)}</bdi>
                </p>
                <p>
                  گیرنده: <bdi dir="ltr">{maskMobile(address.recipient_mobile)}</bdi>
                </p>
              </address>

              <div className="account-addresses__actions">
                {!address.is_default ? (
                  <Form method="post" replace>
                    <input type="hidden" name="intent" value="set-default-address" />
                    <input type="hidden" name="address_id" value={address.id} />
                    <button type="submit" disabled={busy}>انتخاب به‌عنوان پیش‌فرض</button>
                  </Form>
                ) : null}

                <details className="account-settings__danger">
                  <summary>حذف نشانی</summary>
                  <p>حذف فقط پس از تأیید Backend انجام می‌شود و نتیجه نامشخص موفق تلقی نمی‌شود.</p>
                  <Form method="post" replace>
                    <input type="hidden" name="intent" value="delete-address" />
                    <input type="hidden" name="address_id" value={address.id} />
                    <button type="submit" disabled={busy}>تأیید حذف نشانی</button>
                  </Form>
                </details>
              </div>

              {editingId === address.id ? (
                <AddressForm
                  mode="edit"
                  address={address}
                  provinces={data.provinces}
                  cities={data.cities}
                  busy={busy}
                />
              ) : null}
            </article>
          ))}
        </section>
      )}

      <section className="account-settings__panel account-addresses__create" aria-labelledby="new-address-heading">
        <h2 id="new-address-heading">افزودن نشانی</h2>
        <AddressForm
          mode="create"
          provinces={data.provinces}
          cities={data.cities}
          busy={busy}
        />
      </section>
    </div>
  );
}

function AddressForm({
  mode,
  address,
  provinces,
  cities,
  busy,
}: {
  mode: "create" | "edit";
  address?: AccountAddress;
  provinces: AccountAddressPageData["provinces"];
  cities: AccountAddressPageData["cities"];
  busy: boolean;
}) {
  const initialProvince = address?.province_id ?? provinces[0]?.id ?? "";
  const [provinceId, setProvinceId] = useState(initialProvince);
  const provinceCities = useMemo(
    () => cities.filter((city) => city.provinceId === provinceId),
    [cities, provinceId],
  );
  const currentCity =
    address && address.province_id === provinceId
      ? address.city_id
      : provinceCities[0]?.id ?? "";

  return (
    <Form method="post" className="account-settings__form account-addresses__form" replace>
      <input type="hidden" name="intent" value={mode === "create" ? "create-address" : "update-address"} />
      {address ? <input type="hidden" name="address_id" value={address.id} /> : null}

      <label>
        نام گیرنده
        <input
          name="recipient_name"
          required
          maxLength={150}
          defaultValue={address?.recipient_name ?? ""}
          autoComplete="name"
        />
      </label>

      <label>
        شماره همراه گیرنده
        <input
          name="recipient_mobile"
          required
          inputMode="numeric"
          pattern="[0-9۰-۹٠-٩]{11}"
          defaultValue={address?.recipient_mobile ?? ""}
          autoComplete="tel"
          dir="ltr"
        />
      </label>

      <label>
        استان
        <select
          name="province_id"
          required
          value={provinceId}
          onChange={(event) => setProvinceId(event.currentTarget.value)}
        >
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>{province.name}</option>
          ))}
        </select>
      </label>

      <label>
        شهر
        <select name="city_id" required key={provinceId} defaultValue={currentCity}>
          {provinceCities.map((city) => (
            <option key={city.id} value={city.id}>{city.name}</option>
          ))}
        </select>
      </label>

      <label>
        کد پستی
        <input
          name="postal_code"
          required
          inputMode="numeric"
          pattern="[0-9۰-۹٠-٩]{10}"
          defaultValue={address?.postal_code ?? ""}
          autoComplete="postal-code"
          dir="ltr"
        />
      </label>

      <label className="account-settings__wide">
        نشانی کامل
        <textarea
          name="address_line"
          required
          maxLength={1000}
          defaultValue={address?.address_line ?? ""}
          autoComplete="street-address"
          rows={4}
        />
      </label>

      <label>
        پلاک
        <input name="building_no" maxLength={30} defaultValue={address?.building_no ?? ""} />
      </label>

      <label>
        واحد
        <input name="unit_no" maxLength={30} defaultValue={address?.unit_no ?? ""} />
      </label>

      {mode === "create" ? (
        <label className="account-settings__check">
          <input type="checkbox" name="is_default" />
          این نشانی پیش‌فرض باشد
        </label>
      ) : null}

      <button className="account-settings__primary" type="submit" disabled={busy || !provinceId || provinceCities.length === 0}>
        {busy ? "در حال ثبت…" : mode === "create" ? "ثبت نشانی" : "ذخیره ویرایش"}
      </button>
    </Form>
  );
}

function maskMobile(value: string): string {
  if (value.length < 7) return "••••";
  return value.slice(0, 4) + "••••" + value.slice(-3);
}

function maskPostal(value: string): string {
  if (value.length < 4) return "••••";
  return "••••••" + value.slice(-4);
}
