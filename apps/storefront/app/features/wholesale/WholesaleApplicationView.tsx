import { useMemo, useState } from "react";
import { Form, Link } from "react-router";
import type {
  WholesaleApplicationPageData,
  WholesaleSubmitResult,
} from "./wholesale-application.server.js";

type Props = {
  state: WholesaleApplicationPageData;
  actionData: WholesaleSubmitResult | null;
  busy: boolean;
};

export function WholesaleApplicationView({ state, actionData, busy }: Props) {
  if (state.status === "unauthenticated") {
    return (
      <StatePanel
        title="برای ثبت درخواست وارد حساب شوید"
        message="درخواست فروش عمده فقط برای حساب مشتری احراز‌شده ثبت می‌شود و اطلاعات نشست در مرورگر ذخیره نمی‌شود."
        href="/wholesale"
        linkLabel="بازگشت به معرفی فروش عمده"
      />
    );
  }

  if (state.status === "unavailable") {
    return (
      <StatePanel
        title="اطلاعات درخواست موقتاً در دسترس نیست"
        message="هیچ وضعیت محلی یا قدیمی به‌عنوان مجوز ثبت درخواست استفاده نمی‌شود."
        href="/account/wholesale/apply"
        linkLabel="تلاش دوباره"
      />
    );
  }

  if (state.customerType === "wholesale") {
    return (
      <StatePanel
        title="حساب شما عمده است"
        message="نوع مشتری از پروفایل معتبر سرور دریافت شده است؛ درخواست جدید برای حساب عمده ساخته نمی‌شود."
        href="/account/wholesale"
        linkLabel="مشاهده وضعیت فروش عمده"
        secondaryHref="/search"
        secondaryLabel="مشاهده محصولات"
      />
    );
  }

  if (!state.canApply) {
    return (
      <StatePanel
        title="یک درخواست برای این حساب وجود دارد"
        message="برای جلوگیری از ثبت تکراری، درخواست دیگری ساخته نمی‌شود. وضعیت فعلی را از سرور پیگیری کنید."
        href="/account/wholesale"
        linkLabel="مشاهده وضعیت درخواست"
      />
    );
  }

  return (
    <ReadyApplication
      state={state}
      actionData={actionData}
      busy={busy}
    />
  );
}

function ReadyApplication({
  state,
  actionData,
  busy,
}: {
  state: Extract<WholesaleApplicationPageData, { status: "ready" }>;
  actionData: WholesaleSubmitResult | null;
  busy: boolean;
}) {
  const initialProvince = state.provinces[0]?.id ?? "";
  const [provinceId, setProvinceId] = useState(initialProvince);
  const provinceCities = useMemo(
    () => state.cities.filter((city) => city.provinceId === provinceId),
    [state.cities, provinceId],
  );
  const cityId = provinceCities[0]?.id ?? "";

  return (
    <div className="wholesale-account" aria-busy={busy}>
      <header className="wholesale-account__header">
        <div>
          <p className="wholesale-page__eyebrow">SF-E-08 · درخواست فروش عمده</p>
          <h1>ثبت درخواست فروش عمده</h1>
          <p>
            اطلاعات کسب‌وکار برای بررسی ارسال می‌شود. ثبت درخواست به معنی تأیید حساب یا تضمین تخفیف نیست.
          </p>
        </div>
        <Link to="/wholesale">راهنمای فروش عمده</Link>
      </header>

      {state.application?.status === "rejected" ? (
        <section className="wholesale-account__notice" role="status">
          <strong>درخواست قبلی رد شده است.</strong>
          <p>
            تا زمانی که نوع مشتری در پروفایل «خرده‌فروشی» است، امکان ارسال درخواست تازه وجود دارد.
            وضعیت و دلیل ثبت‌شده قبلی را می‌توانید جداگانه مشاهده کنید.
          </p>
          <Link to="/account/wholesale">مشاهده درخواست قبلی</Link>
        </section>
      ) : null}

      {actionData && !actionData.ok ? (
        <div className="wholesale-account__error" role="alert" aria-live="assertive" tabIndex={-1}>
          {actionData.message}
        </div>
      ) : null}

      <section className="wholesale-account__panel" aria-labelledby="wholesale-apply-heading">
        <h2 id="wholesale-apply-heading">اطلاعات کسب‌وکار</h2>
        <p>مرجع استان و شهر سال {state.referenceYear} است. نوع کسب‌وکار متن آزاد و حداکثر ۱۰۰ نویسه است.</p>

        <Form method="post" replace className="wholesale-account__form" aria-describedby="wholesale-application-consent">
          <input type="hidden" name="intent" value="submit-wholesale-application" />

          <label>
            نام کسب‌وکار
            <input name="business_name" required maxLength={250} autoComplete="organization" />
          </label>

          <label>
            نام مدیر یا مسئول
            <input name="manager_name" required maxLength={200} autoComplete="name" />
          </label>

          <label>
            نوع کسب‌وکار
            <input
              name="business_type"
              required
              maxLength={100}
              placeholder="مثلاً کافه، رستوران یا فروشگاه"
            />
          </label>

          <label>
            شناسه کسب‌وکار
            <input
              name="business_identifier"
              maxLength={100}
              dir="ltr"
              autoComplete="off"
              aria-describedby="business-identifier-help"
            />
            <small id="business-identifier-help">اختیاری؛ فقط در صورت داشتن شناسه معتبر وارد کنید.</small>
          </label>

          <label>
            استان
            <select
              name="province_id"
              required
              value={provinceId}
              onChange={(event) => setProvinceId(event.currentTarget.value)}
            >
              {state.provinces.map((province) => (
                <option key={province.id} value={province.id}>{province.name}</option>
              ))}
            </select>
          </label>

          <label>
            شهر
            <select name="city_id" required key={provinceId} defaultValue={cityId}>
              {provinceCities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </label>

          <label className="wholesale-account__wide">
            توضیحات تکمیلی
            <textarea name="note" maxLength={4000} rows={5} />
          </label>

          <div className="wholesale-account__consent wholesale-account__wide">
            <p>
              با ارسال فرم فقط یک درخواست بررسی ثبت می‌شود. وضعیت نهایی، نوع مشتری و قیمت‌ها فقط از پاسخ‌های معتبر سرور تعیین می‌شوند.
            </p>
          </div>

          <button
            className="wholesale-page__primary wholesale-account__wide"
            type="submit"
            disabled={busy || !provinceId || provinceCities.length === 0}
          >
            {busy ? "در حال ثبت درخواست…" : "ارسال درخواست برای بررسی"}
          </button>
          {busy ? (
            <p className="wholesale-account__busy wholesale-account__wide" role="status" aria-live="polite">
              درخواست در حال ارسال است؛ از ارسال دوباره خودداری کنید.
            </p>
          ) : null}
        </Form>
      </section>
    </div>
  );
}

function StatePanel({
  title,
  message,
  href,
  linkLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  message: string;
  href: string;
  linkLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="wholesale-account__state" aria-labelledby="wholesale-application-state">
      <p className="wholesale-page__eyebrow">SF-E-08 · درخواست فروش عمده</p>
      <h1 id="wholesale-application-state">{title}</h1>
      <p>{message}</p>
      <div className="wholesale-page__actions">
        <Link className="wholesale-page__primary" to={href}>{linkLabel}</Link>
        {secondaryHref && secondaryLabel ? (
          <Link className="wholesale-page__secondary" to={secondaryHref}>{secondaryLabel}</Link>
        ) : null}
      </div>
    </section>
  );
}
