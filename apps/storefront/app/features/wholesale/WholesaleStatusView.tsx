import { Link } from "react-router";
import type { WholesaleApplication } from "./wholesale-contract.js";
import type { WholesaleAccountSnapshot } from "./wholesale-application.server.js";

type Props = {
  state: WholesaleAccountSnapshot;
};

export function WholesaleStatusView({ state }: Props) {
  if (state.status === "unauthenticated") {
    return (
      <StatePanel
        title="برای مشاهده وضعیت وارد حساب شوید"
        message="اطلاعات درخواست فروش عمده فقط برای صاحب حساب نمایش داده می‌شود."
        href="/wholesale"
        linkLabel="بازگشت به معرفی فروش عمده"
      />
    );
  }

  if (state.status === "unavailable") {
    return (
      <StatePanel
        title="وضعیت درخواست موقتاً در دسترس نیست"
        message="هیچ وضعیت ذخیره‌شده در مرورگر به‌عنوان نتیجه معتبر نمایش داده نمی‌شود."
        href="/account/wholesale"
        linkLabel="تلاش دوباره"
      />
    );
  }

  if (!state.application) {
    return (
      <StatePanel
        title={state.customerType === "wholesale" ? "حساب شما عمده است" : "هنوز درخواستی ثبت نشده است"}
        message={
          state.customerType === "wholesale"
            ? "نوع مشتری پروفایل شما به‌صورت معتبر «عمده» است. نبودن درخواست فعلی این وضعیت را تغییر نمی‌دهد."
            : "برای این حساب درخواست فروش عمده‌ای از سرور دریافت نشد."
        }
        href={state.customerType === "wholesale" ? "/search" : "/account/wholesale/apply"}
        linkLabel={state.customerType === "wholesale" ? "مشاهده محصولات" : "ثبت درخواست فروش عمده"}
      />
    );
  }

  return (
    <ReadyStatus
      application={state.application}
      customerType={state.customerType}
    />
  );
}

function ReadyStatus({
  application,
  customerType,
}: {
  application: WholesaleApplication;
  customerType: "retail" | "wholesale";
}) {
  const status = statusPresentation(application.status);
  const authoritativeWholesale = customerType === "wholesale";

  return (
    <div className="wholesale-account" data-wholesale-application-status={application.status} data-customer-type={customerType}>
      <header className="wholesale-account__header">
        <div>
          <p className="wholesale-page__eyebrow">SF-E-09 · وضعیت فروش عمده</p>
          <h1>وضعیت درخواست فروش عمده</h1>
          <p>
            وضعیت درخواست از سرور دریافت شده است. نوع مشتری پروفایل، نه ظاهر این صفحه، تعیین می‌کند حساب واقعاً عمده است یا خیر.
          </p>
        </div>
        <Link to="/account">بازگشت به حساب من</Link>
      </header>

      <section className="wholesale-status__summary" aria-labelledby="wholesale-status-heading" role="status" aria-live="polite">
        <div>
          <span className="wholesale-status__label">وضعیت درخواست</span>
          <h2 id="wholesale-status-heading">{status.label}</h2>
          <p>{status.description}</p>
        </div>
        <span className="wholesale-status__badge" data-status={application.status}>
          {status.label}
        </span>
      </section>

      <section className="wholesale-account__panel" aria-labelledby="wholesale-business-heading">
        <h2 id="wholesale-business-heading">اطلاعات درخواست</h2>
        <dl className="wholesale-status__facts">
          <div><dt>شناسه درخواست</dt><dd><bdi className="wholesale-status__identifier" dir="ltr">{application.id}</bdi></dd></div>
          <div><dt>نام کسب‌وکار</dt><dd>{application.business_name}</dd></div>
          <div><dt>نام مدیر یا مسئول</dt><dd>{application.manager_name}</dd></div>
          <div><dt>نوع کسب‌وکار</dt><dd>{application.business_type}</dd></div>
          {application.business_identifier ? (
            <div><dt>شناسه کسب‌وکار</dt><dd><bdi className="wholesale-status__identifier" dir="ltr">{application.business_identifier}</bdi></dd></div>
          ) : null}
          <div>
            <dt>زمان ثبت</dt>
            <dd><time dateTime={application.submitted_at}>{formatDateTime(application.submitted_at)}</time></dd>
          </div>
          {application.review_started_at ? (
            <div>
              <dt>شروع بررسی</dt>
              <dd><time dateTime={application.review_started_at}>{formatDateTime(application.review_started_at)}</time></dd>
            </div>
          ) : null}
          {application.reviewed_at ? (
            <div>
              <dt>زمان تصمیم</dt>
              <dd><time dateTime={application.reviewed_at}>{formatDateTime(application.reviewed_at)}</time></dd>
            </div>
          ) : null}
        </dl>
      </section>

      {application.decision_note || application.rejection_reason ? (
        <section className="wholesale-account__panel" aria-labelledby="wholesale-decision-heading">
          <h2 id="wholesale-decision-heading">نتیجه ثبت‌شده</h2>
          {application.decision_note ? <p>{application.decision_note}</p> : null}
          {application.rejection_reason ? (
            <p><strong>دلیل رد:</strong> {application.rejection_reason}</p>
          ) : null}
        </section>
      ) : null}

      <section className="wholesale-account__panel" aria-labelledby="wholesale-account-authority">
        <h2 id="wholesale-account-authority">وضعیت نوع مشتری</h2>
        {authoritativeWholesale ? (
          <>
            <p>
              پروفایل معتبر سرور نوع مشتری این حساب را «عمده» اعلام می‌کند؛ قیمت و شرایط نهایی همچنان از سرویس‌های قیمت‌گذاری و خرید دریافت می‌شوند.
            </p>
            <Link className="wholesale-page__primary" to="/search">مشاهده محصولات</Link>
          </>
        ) : (
          <p>
            نوع مشتری پروفایل هنوز «خرده‌فروشی» است. حتی اگر وضعیت درخواست «تأییدشده» نمایش داده شود، رابط کاربری تا تغییر معتبر پروفایل حساب را عمده فرض نمی‌کند.
          </p>
        )}
      </section>

      {application.status === "rejected" && !authoritativeWholesale ? (
        <section className="wholesale-account__panel">
          <h2>درخواست تازه</h2>
          <p>درخواست ردشده فعال محسوب نمی‌شود و در صورت معتبر بودن وضعیت حساب می‌توانید فرم تازه‌ای ارسال کنید.</p>
          <Link className="wholesale-page__primary" to="/account/wholesale/apply">ثبت درخواست جدید</Link>
        </section>
      ) : null}
    </div>
  );
}

function StatePanel({
  title,
  message,
  href,
  linkLabel,
}: {
  title: string;
  message: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <section className="wholesale-account__state" aria-labelledby="wholesale-status-state">
      <p className="wholesale-page__eyebrow">SF-E-09 · وضعیت فروش عمده</p>
      <h1 id="wholesale-status-state">{title}</h1>
      <p>{message}</p>
      <Link className="wholesale-page__primary" to={href}>{linkLabel}</Link>
    </section>
  );
}

function statusPresentation(status: WholesaleApplication["status"]) {
  switch (status) {
    case "submitted":
      return {
        label: "ثبت‌شده",
        description: "درخواست ثبت شده و هنوز شروع بررسی از طرف تیم مجاز ثبت نشده است.",
      };
    case "under_review":
      return {
        label: "در حال بررسی",
        description: "تیم مجاز بررسی را آغاز کرده است. تصمیم نهایی هنوز ثبت نشده است.",
      };
    case "approved":
      return {
        label: "تأییدشده",
        description: "درخواست با تصمیم سرور تأیید شده است؛ نوع مشتری پروفایل همچنان مرجع نهایی هویت عمده است.",
      };
    case "rejected":
      return {
        label: "ردشده",
        description: "درخواست رد شده است. در صورت نمایش دلیل، همان داده ثبت‌شده سرور نشان داده می‌شود.",
      };
  }
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
