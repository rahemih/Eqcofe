import { Form, Link } from "react-router";
import type {
  AccountWarranty,
  AccountWarrantyItem,
  AccountWarrantyTimeline,
} from "./account-contract.js";
import type {
  AccountAfterSalesMutationResult,
  AccountWarrantyLoadState,
} from "./account-after-sales.server.js";

type Props = {
  state: AccountWarrantyLoadState;
  actionData: AccountAfterSalesMutationResult | null;
  busy: boolean;
};

export function AccountWarrantyView({ state, actionData, busy }: Props) {
  if (state.status === "unauthenticated") {
    return <StatePanel title="نشست شما پایان یافته است" message="برای حفظ حریم خصوصی هیچ اطلاعات گارانتی نمایش داده نمی‌شود." />;
  }
  if (state.status === "denied") {
    return <StatePanel title="پرونده در حساب فعلی قابل دسترسی نیست" message="وجود یا محتوای پرونده متعلق به حساب دیگر نمایش داده نمی‌شود." />;
  }
  if (state.status === "invalid-reference") {
    return <StatePanel title="شماره پرونده معتبر نیست" message="برای ادامه، از فهرست پرونده‌های گارانتی حساب خود وارد شوید." />;
  }
  if (state.status === "unavailable") {
    return <StatePanel title="گارانتی موقتاً در دسترس نیست" message="هیچ وضعیت محلی یا قدیمی به‌عنوان نتیجه معتبر نمایش داده نمی‌شود." retry />;
  }

  return state.data.mode === "list"
    ? <WarrantyList items={state.data.items} actionData={actionData} busy={busy} />
    : (
      <WarrantyDetail
        item={state.data.item}
        timeline={state.data.timeline}
        timelineUnavailable={state.data.timelineUnavailable}
        actionData={actionData}
      />
    );
}

function WarrantyList({
  items,
  actionData,
  busy,
}: {
  items: readonly AccountWarrantyItem[];
  actionData: AccountAfterSalesMutationResult | null;
  busy: boolean;
}) {
  return (
    <div className="account-settings account-after-sales">
      <header className="account-settings__header">
        <div>
          <p className="account-overview__eyebrow">خدمات پس از فروش</p>
          <h1>پرونده‌های گارانتی من</h1>
          <p>مالکیت قلم سفارش و واجد شرایط بودن گارانتی فقط هنگام ثبت توسط سرویس معتبر بررسی می‌شود.</p>
        </div>
        <Link to="/account">بازگشت به حساب من</Link>
      </header>

      <ActionFeedback result={actionData} />

      <section className="account-settings__panel" aria-labelledby="warranty-create-heading">
        <div className="account-after-sales__heading">
          <div>
            <h2 id="warranty-create-heading">ثبت درخواست گارانتی</h2>
            <p>شناسه قلم باید متعلق به یکی از سفارش‌های همین حساب باشد.</p>
          </div>
          <Link to="/account/orders">مشاهده سفارش‌های من</Link>
        </div>

        <Form method="post" className="account-after-sales__form" replace>
          <input type="hidden" name="intent" value="create-warranty" />
          <label>
            شناسه قلم سفارش
            <input name="order_item_id" dir="ltr" autoComplete="off" required pattern="[0-9a-fA-F-]{36}" />
          </label>
          <label>
            نوع ایراد
            <input name="issue_type" maxLength={80} required />
          </label>
          <label>
            نتیجه ترجیحی
            <select name="preferred_resolution" defaultValue="">
              <option value="">بدون ترجیح</option>
              <option value="repair">تعمیر</option>
              <option value="replacement">جایگزینی</option>
              <option value="refund">بازپرداخت</option>
              <option value="inspection">بررسی فنی</option>
            </select>
          </label>
          <label className="account-after-sales__wide">
            شرح ایراد
            <textarea name="issue_description" maxLength={4000} rows={5} required />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "در حال ثبت…" : "ثبت درخواست گارانتی"}
          </button>
        </Form>
        <p className="account-after-sales__hint">
          انتخاب نتیجه ترجیحی به معنی تأیید تعمیر، جایگزینی یا بازپرداخت نیست؛ تصمیم نهایی از روند معتبر پرونده می‌آید.
        </p>
      </section>

      <section className="account-settings__panel" aria-labelledby="warranty-list-heading">
        <h2 id="warranty-list-heading">پرونده‌های گارانتی</h2>
        {items.length === 0 ? (
          <div className="account-after-sales__empty">
            <p>هنوز درخواست گارانتی در این حساب ثبت نشده است.</p>
            <Link to="/account/orders">مشاهده سفارش‌ها</Link>
          </div>
        ) : (
          <ul className="account-after-sales__list">
            {items.map((item) => (
              <li key={item.claim_number}>
                <Link to={"/account/warranty/" + encodeURIComponent(item.claim_number)}>
                  <span>
                    پرونده <bdi dir="ltr">{item.claim_number}</bdi>
                  </span>
                  <span>{statusLabel(item.status)}</span>
                  {item.order_number ? (
                    <span>
                      سفارش <bdi dir="ltr">{item.order_number}</bdi>
                    </span>
                  ) : null}
                  {item.requested_at ? <time dateTime={item.requested_at}>{formatDateTime(item.requested_at)}</time> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function WarrantyDetail({
  item,
  timeline,
  timelineUnavailable,
  actionData,
}: {
  item: AccountWarranty;
  timeline: AccountWarrantyTimeline | null;
  timelineUnavailable: boolean;
  actionData: AccountAfterSalesMutationResult | null;
}) {
  return (
    <div className="account-settings account-after-sales">
      <header className="account-settings__header">
        <div>
          <p className="account-overview__eyebrow">پرونده گارانتی</p>
          <h1><bdi dir="ltr">{item.claim_number}</bdi></h1>
          <p>وضعیت فعلی: <strong>{statusLabel(item.status)}</strong></p>
        </div>
        <Link to="/account/warranty">همه پرونده‌های گارانتی</Link>
      </header>

      <ActionFeedback result={actionData} />

      <div className="account-after-sales__detail-grid">
        <section className="account-settings__panel" aria-labelledby="warranty-summary-heading">
          <h2 id="warranty-summary-heading">خلاصه پرونده</h2>
          <dl className="account-after-sales__facts">
            <div><dt>شماره پرونده</dt><dd><bdi dir="ltr">{item.claim_number}</bdi></dd></div>
            <div><dt>وضعیت</dt><dd>{statusLabel(item.status)}</dd></div>
            <div><dt>شناسه قلم سفارش</dt><dd><bdi dir="ltr">{item.order_item_id}</bdi></dd></div>
            {item.order_number ? <div><dt>شماره سفارش</dt><dd><bdi dir="ltr">{item.order_number}</bdi></dd></div> : null}
            {item.issue_type ? <div><dt>نوع ایراد</dt><dd>{item.issue_type}</dd></div> : null}
            {item.requested_at ? <div><dt>زمان ثبت</dt><dd><time dateTime={item.requested_at}>{formatDateTime(item.requested_at)}</time></dd></div> : null}
          </dl>
          {item.issue_description ? (
            <div className="account-after-sales__description">
              <h3>شرح ثبت‌شده</h3>
              <p>{item.issue_description}</p>
            </div>
          ) : null}
        </section>

        <TimelinePanel timeline={timeline} unavailable={timelineUnavailable} />
      </div>

      <section className="account-settings__panel" aria-labelledby="warranty-action-heading">
        <h2 id="warranty-action-heading">اقدام بعدی</h2>
        <p>
          قرارداد مشتری برای پرونده موجود، اقدام لغو یا تصمیم‌گیری نهایی تعریف نکرده است.
          تغییرات بررسی، دریافت، تعمیر و تعیین تکلیف فقط از سمت فرایندهای مجاز پشتیبانی انجام می‌شوند.
        </p>
      </section>
    </div>
  );
}

function TimelinePanel({
  timeline,
  unavailable,
}: {
  timeline: AccountWarrantyTimeline | null;
  unavailable: boolean;
}) {
  return (
    <section className="account-settings__panel" aria-labelledby="warranty-timeline-heading">
      <h2 id="warranty-timeline-heading">روند پرونده</h2>
      {unavailable || !timeline ? (
        <p role="status">روند پرونده موقتاً دریافت نشد؛ وضعیت اصلی پرونده همچنان معتبر است.</p>
      ) : timeline.timeline.length === 0 ? (
        <p>هنوز رویدادی برای نمایش ثبت نشده است.</p>
      ) : (
        <ol className="account-after-sales__timeline">
          {timeline.timeline.map((entry, index) => (
            <li key={entry.created_at + "-" + index}>
              <strong>{statusLabel(entry.status)}</strong>
              {entry.from_status ? <span>از {statusLabel(entry.from_status)}</span> : null}
              {entry.reason ? <p>{entry.reason}</p> : null}
              <time dateTime={entry.created_at}>{formatDateTime(entry.created_at)}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ActionFeedback({ result }: { result: AccountAfterSalesMutationResult | null }) {
  if (!result) return null;
  return (
    <div
      className={result.ok ? "account-settings__notice" : "account-settings__error"}
      role={result.ok ? "status" : "alert"}
    >
      <p>{result.message}</p>
      {result.ok && result.href && result.reference ? (
        <Link to={result.href}>
          مشاهده پرونده <bdi dir="ltr">{result.reference}</bdi>
        </Link>
      ) : null}
    </div>
  );
}

function StatePanel({
  title,
  message,
  retry = false,
}: {
  title: string;
  message: string;
  retry?: boolean;
}) {
  return (
    <section className="account-settings__state" aria-labelledby="warranty-state-heading">
      <p className="account-overview__eyebrow">گارانتی</p>
      <h1 id="warranty-state-heading">{title}</h1>
      <p>{message}</p>
      <Link className="account-overview__primary-link" to={retry ? "/account/warranty" : "/account"}>
        {retry ? "تلاش دوباره" : "بازگشت به حساب من"}
      </Link>
    </section>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    requested: "درخواست ثبت‌شده",
    under_review: "در حال بررسی",
    approved: "تأییدشده",
    rejected: "ردشده",
    received: "دریافت‌شده",
    repairing: "در حال تعمیر",
    resolved: "تعیین تکلیف‌شده",
    closed: "بسته‌شده",
    cancelled: "لغوشده",
  };
  return labels[status] ?? status;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "تاریخ نامعتبر"
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
