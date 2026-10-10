import { Form, Link } from "react-router";
import type {
  AccountOrder,
  AccountOrderInvoice,
  AccountOrderTimeline,
} from "./account-contract.js";
import type {
  AccountOrderDetailLoadState,
  AccountOrderMutationResult,
} from "./account-orders.server.js";

type Props = {
  state: AccountOrderDetailLoadState;
  actionData: AccountOrderMutationResult | null;
  busy: boolean;
};

export function AccountOrderDetailView({ state, actionData, busy }: Props) {
  if (state.status === "unauthenticated") {
    return (
      <section className="account-settings__state" aria-labelledby="order-session-ended">
        <p className="account-overview__eyebrow">جزئیات سفارش</p>
        <h1 id="order-session-ended">نشست شما پایان یافته است</h1>
        <p>برای حفظ حریم خصوصی هیچ اطلاعات سفارشی نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/">بازگشت به فروشگاه</Link>
      </section>
    );
  }

  if (state.status === "denied" || state.status === "invalid-order-number") {
    return (
      <section className="account-settings__state" aria-labelledby="order-denied">
        <p className="account-overview__eyebrow">جزئیات سفارش</p>
        <h1 id="order-denied">سفارش در حساب فعلی قابل دسترسی نیست</h1>
        <p>وجود یا محتوای سفارش متعلق به حساب دیگر نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/account/orders">بازگشت به سفارش‌های من</Link>
      </section>
    );
  }

  if (state.status === "unavailable") {
    return (
      <section className="account-settings__state" aria-labelledby="order-unavailable">
        <p className="account-overview__eyebrow">جزئیات سفارش</p>
        <h1 id="order-unavailable">جزئیات سفارش موقتاً در دسترس نیست</h1>
        <p>وضعیت موفقیت یا اطلاعات قدیمی به‌صورت حدسی نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/account/orders">بازگشت به سفارش‌ها</Link>
      </section>
    );
  }

  const { order, timeline, invoice, partialFailures } = state.data;
  const canCancel = order.allowed_actions.includes("cancel_order");

  return (
    <div className="account-settings">
      <header className="account-settings__header">
        <div>
          <p className="account-overview__eyebrow">SF-E-05 · سفارش مشتری</p>
          <h1>جزئیات سفارش</h1>
          <p>
            شماره سفارش:{" "}
            <bdi className="account-orders__reference" dir="ltr">{order.order_number}</bdi>
          </p>
        </div>
        <Link to="/account/orders">بازگشت به سفارش‌های من</Link>
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

      {partialFailures.length > 0 ? (
        <div className="account-settings__error" role="status">
          بخشی از اطلاعات جانبی سفارش تازه دریافت نشد. جزئیات اصلی سفارش همچنان از منبع معتبر نمایش داده می‌شود.
        </div>
      ) : null}

      {order.customer_type === "wholesale" ? (
        <div className="account-settings__notice" role="status">
          این سفارش با زمینه عمده ذخیره‌شده در Checkout ثبت شده است؛ قیمت و تخفیف از Snapshot سفارش نمایش داده می‌شوند، نه از نوع فعلی حساب.
        </div>
      ) : null}

      <OrderSummary order={order} />

      <section className="account-settings__panel" aria-labelledby="order-items-heading">
        <h2 id="order-items-heading">اقلام سفارش</h2>
        <div className="account-order-detail__items">
          {order.items.map((item) => (
            <article className="account-order-detail__item" key={item.id}>
              <div>
                <strong>{item.product_name}</strong>
                <span>
                  کد کالا: <bdi dir="ltr">{item.sku}</bdi>
                </span>
              </div>
              <dl>
                <div><dt>تعداد</dt><dd>{item.quantity.toLocaleString("fa-IR")}</dd></div>
                <div><dt>قیمت واحد</dt><dd>{formatToman(item.unit_final_toman)}</dd></div>
                <div><dt>جمع قلم</dt><dd>{formatToman(item.line_total_toman)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <div className="account-order-detail__columns">
        <TimelinePanel timeline={timeline} orderNumber={order.order_number} />
        <InvoicePanel invoice={invoice} />
      </div>

      <section className="account-settings__panel" aria-labelledby="order-actions-heading">
        <h2 id="order-actions-heading">اقدامات سفارش</h2>
        {canCancel ? (
          <details className="account-settings__danger">
            <summary>لغو سفارش</summary>
            <p>
              امکان لغو از وضعیت فعلی Backend آمده است. قبل از ارسال، وضعیت سفارش روی سرور دوباره بررسی می‌شود.
            </p>
            <Form method="post" className="account-settings__form" replace>
              <input type="hidden" name="intent" value="cancel-order" />
              <label>
                دلیل لغو
                <input
                  name="reason_code"
                  required
                  maxLength={100}
                  autoComplete="off"
                  placeholder="دلیل کوتاه لغو را بنویسید"
                />
              </label>
              <label className="account-settings__wide">
                توضیح تکمیلی (اختیاری)
                <textarea name="note" maxLength={1000} rows={3} />
              </label>
              <button className="account-settings__primary" type="submit" disabled={busy}>
                {busy ? "در حال بررسی و ثبت…" : "تأیید لغو سفارش"}
              </button>
            </Form>
          </details>
        ) : (
          <p className="account-order-detail__terminal">
            در وضعیت فعلی، Backend اقدام لغو را برای این سفارش مجاز اعلام نکرده است.
          </p>
        )}
      </section>
    </div>
  );
}

function OrderSummary({ order }: { order: AccountOrder }) {
  return (
    <section className="account-settings__panel" aria-labelledby="order-summary-heading">
      <h2 id="order-summary-heading">خلاصه وضعیت</h2>
      <dl className="account-order-detail__summary-grid">
        <div><dt>وضعیت سفارش</dt><dd>{statusLabel(order.order_status)}</dd></div>
        <div><dt>وضعیت پرداخت</dt><dd>{statusLabel(order.payment_status)}</dd></div>
        <div><dt>وضعیت ارسال</dt><dd>{statusLabel(order.fulfillment_status)}</dd></div>
        <div><dt>وضعیت مرجوعی</dt><dd>{statusLabel(order.return_status)}</dd></div>
        <div><dt>جمع کالاها</dt><dd>{formatToman(order.subtotal_toman)}</dd></div>
        <div><dt>تخفیف</dt><dd>{formatToman(order.discount_total_toman)}</dd></div>
        <div><dt>مالیات</dt><dd>{formatToman(order.tax_total_toman)}</dd></div>
        <div><dt>هزینه ارسال</dt><dd>{formatToman(order.shipping_charge_toman)}</dd></div>
        <div className="account-order-detail__total"><dt>مبلغ نهایی</dt><dd>{formatToman(order.grand_total_toman)}</dd></div>
        <div><dt>تاریخ ثبت</dt><dd><time dateTime={order.created_at}>{formatDateTime(order.created_at)}</time></dd></div>
      </dl>
    </section>
  );
}

function TimelinePanel({
  timeline,
  orderNumber,
}: {
  timeline: AccountOrderTimeline | null;
  orderNumber: string;
}) {
  return (
    <section className="account-settings__panel" aria-labelledby="order-timeline-heading">
      <h2 id="order-timeline-heading">روند سفارش</h2>
      {!timeline ? (
        <p>Timeline در حال حاضر قابل دریافت نیست. وضعیت اصلی سفارش همچنان معتبر است.</p>
      ) : timeline.timeline.length === 0 ? (
        <p>رویداد ثبت‌شده‌ای برای نمایش وجود ندارد.</p>
      ) : (
        <ol className="account-order-detail__timeline">
          {timeline.timeline.map((entry, index) => (
            <li key={`${orderNumber}-${entry.created_at}-${index}`}>
              <strong>{statusLabel(entry.to_status)}</strong>
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

function InvoicePanel({ invoice }: { invoice: AccountOrderInvoice | null }) {
  return (
    <section className="account-settings__panel" aria-labelledby="order-invoice-heading">
      <h2 id="order-invoice-heading">فاکتور سفارش</h2>
      {!invoice ? (
        <p>فاکتور در حال حاضر قابل دریافت نیست. فایل یا مبلغ جایگزین ساخته نمی‌شود.</p>
      ) : (
        <>
          <p>
            شماره فاکتور: <bdi className="account-orders__reference" dir="ltr">{invoice.invoice_number}</bdi>
          </p>
          <p>
            تاریخ صدور: <time dateTime={invoice.issued_at}>{formatDateTime(invoice.issued_at)}</time>
          </p>
          <dl className="account-order-detail__invoice">
            <div><dt>جمع کالاها</dt><dd>{formatToman(invoice.order.subtotal_toman)}</dd></div>
            <div><dt>تخفیف</dt><dd>{formatToman(invoice.order.discount_total_toman)}</dd></div>
            <div><dt>مالیات</dt><dd>{formatToman(invoice.order.tax_total_toman)}</dd></div>
            <div><dt>ارسال</dt><dd>{formatToman(invoice.order.shipping_charge_toman)}</dd></div>
            <div><dt>مبلغ نهایی</dt><dd>{formatToman(invoice.order.grand_total_toman)}</dd></div>
          </dl>
          <p className="account-order-detail__hint">
            این نمایش، فاکتور authoritative حساب است؛ در قرارداد فعلی فایل PDF جداگانه‌ای تعریف نشده است.
          </p>
        </>
      )}
    </section>
  );
}

function formatToman(value: number): string {
  return `${Math.trunc(value).toLocaleString("fa-IR")} تومان`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "تاریخ نامعتبر"
    : new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "پیش‌نویس",
    pending_confirmation: "در انتظار تأیید",
    confirmed: "تأییدشده",
    completed: "تکمیل‌شده",
    cancelled: "لغوشده",
    expired: "منقضی‌شده",
    unpaid: "پرداخت‌نشده",
    pending: "در انتظار",
    authorized: "مجازشده",
    paid: "پرداخت‌شده",
    partially_refunded: "بخشی بازپرداخت‌شده",
    refunded: "بازپرداخت‌شده",
    failed: "ناموفق",
    unfulfilled: "ارسال آغاز نشده",
    partially_allocated: "تخصیص جزئی",
    allocated: "تخصیص‌یافته",
    preparing: "در حال آماده‌سازی",
    partially_shipped: "ارسال جزئی",
    shipped: "ارسال‌شده",
    partially_delivered: "تحویل جزئی",
    delivered: "تحویل‌شده",
    none: "بدون درخواست",
    requested: "درخواست ثبت‌شده",
    partially_returned: "مرجوعی جزئی",
    returned: "مرجوع‌شده",
    closed: "بسته‌شده",
  };
  return labels[status] ?? status;
}
