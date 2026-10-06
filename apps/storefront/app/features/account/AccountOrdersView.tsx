import { Link } from "react-router";
import type { AccountOrderItem } from "./account-contract.js";
import type { AccountOrdersLoadState } from "./account-orders.server.js";

type Props = {
  state: AccountOrdersLoadState;
};

export function AccountOrdersView({ state }: Props) {
  if (state.status === "unauthenticated") {
    return (
      <section className="account-settings__state" aria-labelledby="orders-session-ended">
        <p className="account-overview__eyebrow">سفارش‌های من</p>
        <h1 id="orders-session-ended">نشست شما پایان یافته است</h1>
        <p>برای حفظ حریم خصوصی هیچ اطلاعات سفارشی نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/">بازگشت به فروشگاه</Link>
      </section>
    );
  }

  if (state.status === "invalid-cursor") {
    return (
      <section className="account-settings__state" aria-labelledby="orders-invalid-page">
        <p className="account-overview__eyebrow">سفارش‌های من</p>
        <h1 id="orders-invalid-page">صفحه درخواستی معتبر نیست</h1>
        <p>فهرست سفارش‌ها از ابتدا و از منبع معتبر حساب قابل دریافت است.</p>
        <Link className="account-overview__primary-link" to="/account/orders">شروع از ابتدای فهرست</Link>
      </section>
    );
  }

  if (state.status === "unavailable") {
    return (
      <section className="account-settings__state" aria-labelledby="orders-unavailable">
        <p className="account-overview__eyebrow">سفارش‌های من</p>
        <h1 id="orders-unavailable">فهرست سفارش‌ها موقتاً در دسترس نیست</h1>
        <p>هیچ فهرست محلی یا قدیمی به‌عنوان وضعیت حساب نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/account/orders">تلاش دوباره</Link>
      </section>
    );
  }

  const { items, pagination } = state.data;

  return (
    <div className="account-settings">
      <header className="account-settings__header">
        <div>
          <p className="account-overview__eyebrow">SF-E-04 · حساب کاربری</p>
          <h1>سفارش‌های من</h1>
          <p>فهرست از حساب فعلی و با صفحه‌بندی cursor معتبر دریافت می‌شود.</p>
        </div>
        <Link to="/account">بازگشت به حساب من</Link>
      </header>

      {items.length === 0 ? (
        <section className="account-settings__empty" aria-labelledby="orders-empty">
          <h2 id="orders-empty">هنوز سفارشی در این صفحه وجود ندارد</h2>
          <p>اگر قبلاً سفارش داشته‌اید، از ابتدای فهرست بررسی کنید یا بعداً دوباره تلاش کنید.</p>
          <div className="account-orders__empty-actions">
            <Link to="/account/orders">ابتدای فهرست سفارش‌ها</Link>
            <Link to="/search">جستجوی محصولات</Link>
          </div>
        </section>
      ) : (
        <section className="account-orders__list" aria-label="فهرست سفارش‌ها">
          {items.map((order) => <OrderCard key={order.order_number} order={order} />)}
        </section>
      )}

      <nav className="account-orders__pagination" aria-label="صفحه‌بندی سفارش‌ها">
        <Link to="/account/orders">ابتدای فهرست</Link>
        {pagination.hasMore && pagination.nextCursor ? (
          <Link to={`/account/orders?cursor=${encodeURIComponent(pagination.nextCursor)}`}>
            سفارش‌های قدیمی‌تر
          </Link>
        ) : (
          <span aria-live="polite">پایان فهرست فعلی</span>
        )}
      </nav>
    </div>
  );
}

function OrderCard({ order }: { order: AccountOrderItem }) {
  return (
    <article className="account-orders__card">
      <div className="account-orders__summary">
        <div>
          <span className="account-orders__label">شماره سفارش</span>
          <bdi className="account-orders__reference" dir="ltr">{order.order_number}</bdi>
        </div>
        <div>
          <span className="account-orders__label">وضعیت</span>
          <strong>{orderStatusLabel(order.status)}</strong>
        </div>
        <div>
          <span className="account-orders__label">مبلغ</span>
          <strong>{formatToman(order.total_toman)}</strong>
        </div>
        <div>
          <span className="account-orders__label">تاریخ ثبت</span>
          <time dateTime={order.created_at}>{formatDate(order.created_at)}</time>
        </div>
      </div>
      <Link
        className="account-orders__detail-link"
        to={`/account/orders/${encodeURIComponent(order.order_number)}`}
        aria-label={`مشاهده جزئیات سفارش ${order.order_number}`}
      >
        مشاهده جزئیات سفارش
      </Link>
    </article>
  );
}

function orderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "پیش‌نویس",
    pending_confirmation: "در انتظار تأیید",
    confirmed: "تأییدشده",
    completed: "تکمیل‌شده",
    cancelled: "لغوشده",
    expired: "منقضی‌شده",
  };
  return labels[status] ?? status;
}

function formatToman(value: number): string {
  return `${Math.trunc(value).toLocaleString("fa-IR")} تومان`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "تاریخ نامعتبر"
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}
