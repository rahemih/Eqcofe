import { Link } from "react-router";
import type { AccountOverviewData } from "./account-data.server.js";

type AccountOverviewViewProps = {
  state: AccountOverviewData;
};

const toman = new Intl.NumberFormat("fa-IR");

export function AccountOverviewView({ state }: AccountOverviewViewProps) {
  if (state.status === "unauthenticated") {
    return (
      <section className="account-overview__state" aria-labelledby="account-session-ended">
        <p className="account-overview__eyebrow">حساب کاربری</p>
        <h1 id="account-session-ended">نشست شما پایان یافته است</h1>
        <p>برای حفظ حریم خصوصی هیچ اطلاعات شخصی یا سفارشی نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/">بازگشت به فروشگاه</Link>
      </section>
    );
  }

  return (
    <div className="account-overview">
      <header className="account-overview__header">
        <div>
          <p className="account-overview__eyebrow">پیشخوان حساب کاربری</p>
          <h1>حساب من</h1>
          <p>اطلاعات این صفحه از نشست و سرویس‌های authoritative حساب دریافت می‌شوند.</p>
        </div>
        <Link className="account-overview__primary-link" to="/account/orders">مشاهده سفارش‌های من</Link>
      </header>

      {state.partialFailures.length > 0 ? (
        <div className="account-overview__notice" role="status">
          بخشی از اطلاعات موقتاً در دسترس نیست؛ سایر بخش‌های حساب همچنان قابل استفاده‌اند.
        </div>
      ) : null}

      <nav className="account-overview__nav" aria-label="بخش‌های حساب">
        <Link to="/account/profile">پروفایل و امنیت</Link>
        <Link to="/account/addresses">نشانی‌های من</Link>
        <Link to="/account/orders">سفارش‌های من</Link>
        <Link to="/account/tools">ابزارهای مشتری</Link>
        <Link to="/account/returns">مرجوعی‌ها</Link>
        <Link to="/account/warranty">گارانتی</Link>
      </nav>

      <section className="account-overview__grid" aria-label="خلاصه حساب">
        <article className="account-overview__card">
          <h2>هویت و امنیت</h2>
          <dl>
            <div>
              <dt>نوع نشست</dt>
              <dd>{state.actor.type === "customer" ? "مشتری" : state.actor.type}</dd>
            </div>
            <div>
              <dt>شناسه حساب</dt>
              <dd dir="ltr">{state.actor.accountId}</dd>
            </div>
          </dl>
          <Link to="/account/profile">مدیریت پروفایل و امنیت</Link>
        </article>

        <article className="account-overview__card">
          <div className="account-overview__card-heading">
            <h2>سفارش‌های اخیر</h2>
            <Link to="/account/orders">همه سفارش‌ها</Link>
          </div>
          {state.partialFailures.includes("orders") ? (
            <p role="status">دریافت سفارش‌ها انجام نشد. بعداً دوباره تلاش کنید.</p>
          ) : state.recentOrders.length === 0 ? (
            <p>هنوز سفارشی در حساب شما ثبت نشده است.</p>
          ) : (
            <ul className="account-overview__list">
              {state.recentOrders.map((order) => (
                <li key={order.order_number}>
                  <Link to={"/account/orders/" + encodeURIComponent(order.order_number)}>
                    <span dir="ltr">{order.order_number}</span>
                    <span>{order.status}</span>
                    <span>{toman.format(order.total_toman)} تومان</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="account-overview__card">
          <div className="account-overview__card-heading">
            <h2>اعلان‌های اخیر</h2>
            <Link to="/account/tools">ابزارهای مشتری</Link>
          </div>
          {state.partialFailures.includes("notifications") ? (
            <p role="status">اعلان‌ها موقتاً در دسترس نیستند.</p>
          ) : state.recentNotifications.length === 0 ? (
            <p>اعلان تازه‌ای ندارید.</p>
          ) : (
            <ul className="account-overview__list">
              {state.recentNotifications.map((notification) => (
                <li key={notification.id}>
                  <div>
                    <strong>{notification.title ?? "اعلان حساب"}</strong>
                    <p>{notification.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="account-overview__card">
          <h2>خدمات مشتری</h2>
          <p>مرجوعی و گارانتی در مراحل بعدی Step 64 به صفحات عملیاتی کامل تبدیل می‌شوند.</p>
          <div className="account-overview__actions">
            <Link to="/account/returns">مرجوعی‌ها</Link>
            <Link to="/account/warranty">گارانتی</Link>
          </div>
        </article>
      </section>
    </div>
  );
}
