import { Form, Link } from "react-router";
import type {
  AccountReturn,
  AccountReturnItem,
  AccountReturnTimeline,
} from "./account-contract.js";
import type {
  AccountAfterSalesMutationResult,
  AccountReturnLoadState,
} from "./account-after-sales.server.js";

type Props = {
  state: AccountReturnLoadState;
  actionData: AccountAfterSalesMutationResult | null;
  busy: boolean;
};

export function AccountReturnsView({ state, actionData, busy }: Props) {
  if (state.status === "unauthenticated") {
    return <StatePanel title="نشست شما پایان یافته است" message="برای حفظ حریم خصوصی هیچ اطلاعات مرجوعی نمایش داده نمی‌شود." />;
  }
  if (state.status === "denied") {
    return <StatePanel title="پرونده در حساب فعلی قابل دسترسی نیست" message="وجود یا محتوای پرونده متعلق به حساب دیگر نمایش داده نمی‌شود." />;
  }
  if (state.status === "invalid-reference") {
    return <StatePanel title="شماره پرونده معتبر نیست" message="برای ادامه، از فهرست مرجوعی‌های حساب خود وارد پرونده شوید." />;
  }
  if (state.status === "unavailable") {
    return <StatePanel title="مرجوعی‌ها موقتاً در دسترس نیستند" message="هیچ وضعیت محلی یا قدیمی به‌عنوان نتیجه معتبر نمایش داده نمی‌شود." retry />;
  }

  return state.data.mode === "list"
    ? <ReturnList items={state.data.items} actionData={actionData} busy={busy} />
    : (
      <ReturnDetail
        item={state.data.item}
        timeline={state.data.timeline}
        timelineUnavailable={state.data.timelineUnavailable}
        actionData={actionData}
        busy={busy}
      />
    );
}

function ReturnList({
  items,
  actionData,
  busy,
}: {
  items: readonly AccountReturnItem[];
  actionData: AccountAfterSalesMutationResult | null;
  busy: boolean;
}) {
  return (
    <div className="account-settings account-after-sales">
      <header className="account-settings__header">
        <div>
          <p className="account-overview__eyebrow">خدمات پس از فروش</p>
          <h1>مرجوعی‌های من</h1>
          <p>ثبت و پیگیری فقط بر اساس سفارش و اقلام متعلق به همین حساب انجام می‌شود.</p>
        </div>
        <Link to="/account">بازگشت به حساب من</Link>
      </header>

      <ActionFeedback result={actionData} />

      <section className="account-settings__panel" aria-labelledby="return-create-heading">
        <div className="account-after-sales__heading">
          <div>
            <h2 id="return-create-heading">ثبت درخواست مرجوعی</h2>
            <p>وضعیت واجد شرایط بودن پس از ارسال، توسط سرویس سفارش بررسی می‌شود.</p>
          </div>
          <Link to="/account/orders">مشاهده سفارش‌های من</Link>
        </div>

        <Form method="post" className="account-after-sales__form" replace>
          <input type="hidden" name="intent" value="create-return" />
          <label>
            شماره سفارش
            <input name="order_number" dir="ltr" autoComplete="off" required maxLength={120} />
          </label>
          <label>
            شناسه قلم سفارش
            <input name="order_item_id" dir="ltr" autoComplete="off" required pattern="[0-9a-fA-F-]{36}" />
          </label>
          <label>
            تعداد
            <input name="quantity" type="number" min={1} max={1000} inputMode="numeric" required />
          </label>
          <label>
            دلیل مرجوعی
            <input name="reason_code" maxLength={100} required />
          </label>
          <label className="account-after-sales__wide">
            توضیح تکمیلی
            <textarea name="note" maxLength={1000} rows={4} />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "در حال ثبت…" : "ثبت درخواست مرجوعی"}
          </button>
        </Form>
        <p className="account-after-sales__hint">
          این فرم نتیجه مرجوعی، بازپرداخت یا جایگزینی را تضمین نمی‌کند؛ نتیجه فقط از پرونده معتبر مشخص می‌شود.
        </p>
      </section>

      <section className="account-settings__panel" aria-labelledby="return-list-heading">
        <h2 id="return-list-heading">پرونده‌های مرجوعی</h2>
        {items.length === 0 ? (
          <div className="account-after-sales__empty">
            <p>هنوز درخواست مرجوعی در این حساب ثبت نشده است.</p>
            <Link to="/account/orders">مشاهده سفارش‌ها</Link>
          </div>
        ) : (
          <ul className="account-after-sales__list">
            {items.map((item) => (
              <li key={item.return_number}>
                <Link to={"/account/returns/" + encodeURIComponent(item.return_number)}>
                  <span>
                    پرونده <bdi dir="ltr">{item.return_number}</bdi>
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

function ReturnDetail({
  item,
  timeline,
  timelineUnavailable,
  actionData,
  busy,
}: {
  item: AccountReturn;
  timeline: AccountReturnTimeline | null;
  timelineUnavailable: boolean;
  actionData: AccountAfterSalesMutationResult | null;
  busy: boolean;
}) {
  const cancellable = item.status === "requested";
  return (
    <div className="account-settings account-after-sales">
      <header className="account-settings__header">
        <div>
          <p className="account-overview__eyebrow">پرونده مرجوعی</p>
          <h1><bdi dir="ltr">{item.return_number}</bdi></h1>
          <p>وضعیت فعلی: <strong>{statusLabel(item.status)}</strong></p>
        </div>
        <Link to="/account/returns">همه مرجوعی‌ها</Link>
      </header>

      <ActionFeedback result={actionData} />

      <div className="account-after-sales__detail-grid">
        <section className="account-settings__panel" aria-labelledby="return-summary-heading">
          <h2 id="return-summary-heading">خلاصه پرونده</h2>
          <dl className="account-after-sales__facts">
            <div><dt>شماره مرجوعی</dt><dd><bdi dir="ltr">{item.return_number}</bdi></dd></div>
            <div><dt>وضعیت</dt><dd>{statusLabel(item.status)}</dd></div>
            {item.order_number ? <div><dt>شماره سفارش</dt><dd><bdi dir="ltr">{item.order_number}</bdi></dd></div> : null}
            {item.requested_at ? <div><dt>زمان ثبت</dt><dd><time dateTime={item.requested_at}>{formatDateTime(item.requested_at)}</time></dd></div> : null}
          </dl>
          <p className="account-after-sales__hint">
            جزئیات داخلی اقلام یا تصمیم‌های کارکنان تنها وقتی نمایش داده می‌شوند که قرارداد مشتری آن‌ها را به‌طور صریح ارائه کند.
          </p>
        </section>

        <TimelinePanel timeline={timeline} unavailable={timelineUnavailable} />
      </div>

      <section className="account-settings__panel" aria-labelledby="return-action-heading">
        <h2 id="return-action-heading">اقدام مشتری</h2>
        {cancellable ? (
          <>
            <p>تا پیش از شروع بررسی، امکان لغو درخواست از سمت مشتری وجود دارد. وضعیت پیش از لغو دوباره بررسی می‌شود.</p>
            <Form method="post" className="account-after-sales__cancel" replace>
              <input type="hidden" name="intent" value="cancel-return" />
              <label>
                دلیل لغو
                <textarea name="reason" maxLength={2000} rows={4} required />
              </label>
              <button type="submit" disabled={busy}>
                {busy ? "در حال بررسی…" : "لغو درخواست مرجوعی"}
              </button>
            </Form>
          </>
        ) : (
          <p>در وضعیت فعلی، اقدام لغو برای مشتری ارائه نمی‌شود. روند پرونده را از Timeline پیگیری کنید.</p>
        )}
      </section>
    </div>
  );
}

function TimelinePanel({
  timeline,
  unavailable,
}: {
  timeline: AccountReturnTimeline | null;
  unavailable: boolean;
}) {
  return (
    <section className="account-settings__panel" aria-labelledby="return-timeline-heading">
      <h2 id="return-timeline-heading">روند پرونده</h2>
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
    <section className="account-settings__state" aria-labelledby="return-state-heading">
      <p className="account-overview__eyebrow">مرجوعی سفارش</p>
      <h1 id="return-state-heading">{title}</h1>
      <p>{message}</p>
      <Link className="account-overview__primary-link" to={retry ? "/account/returns" : "/account"}>
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
    in_transit_to_store: "در مسیر مرکز خدمات",
    received: "دریافت‌شده",
    inspecting: "در حال بازرسی",
    resolved: "تعیین تکلیف‌شده",
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
