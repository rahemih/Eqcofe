import { Form, Link } from "react-router";
import type {
  AccountNotificationItem,
  AccountWishlistItem,
} from "./account-contract.js";
import type {
  AccountToolsLoadState,
  AccountToolsMutationResult,
  AccountToolsPageData,
} from "./account-tools.server.js";

type Props = {
  state: AccountToolsLoadState;
  actionData: AccountToolsMutationResult | null;
  busy: boolean;
};

export function AccountToolsView({ state, actionData, busy }: Props) {
  if (state.status === "unauthenticated") {
    return (
      <section className="account-settings__state" aria-labelledby="tools-session-ended">
        <p className="account-overview__eyebrow">ابزارهای مشتری</p>
        <h1 id="tools-session-ended">نشست شما پایان یافته است</h1>
        <p>برای حفظ حریم خصوصی هیچ علاقه‌مندی یا اعلان شخصی نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/">بازگشت به فروشگاه</Link>
      </section>
    );
  }

  if (state.status === "invalid-page") {
    return (
      <section className="account-settings__state" aria-labelledby="tools-invalid-page">
        <p className="account-overview__eyebrow">ابزارهای مشتری</p>
        <h1 id="tools-invalid-page">صفحه اعلان درخواستی معتبر نیست</h1>
        <p>برای جلوگیری از نمایش وضعیت نامعتبر، فهرست را از ابتدا دریافت کنید.</p>
        <Link className="account-overview__primary-link" to="/account/tools">بازگشت به ابتدای ابزارها</Link>
      </section>
    );
  }

  if (state.status === "unavailable") {
    return (
      <section className="account-settings__state" aria-labelledby="tools-unavailable">
        <p className="account-overview__eyebrow">ابزارهای مشتری</p>
        <h1 id="tools-unavailable">ابزارهای حساب موقتاً در دسترس نیستند</h1>
        <p>هیچ داده محلی یا قدیمی به‌عنوان وضعیت معتبر حساب نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/account/tools">تلاش دوباره</Link>
      </section>
    );
  }

  return (
    <ReadyTools
      data={state.data}
      actionData={actionData}
      busy={busy}
    />
  );
}

function ReadyTools({
  data,
  actionData,
  busy,
}: {
  data: AccountToolsPageData;
  actionData: AccountToolsMutationResult | null;
  busy: boolean;
}) {
  return (
    <div className="account-settings account-tools">
      <header className="account-settings__header">
        <div>
          <p className="account-overview__eyebrow">SF-E-06 · حساب کاربری</p>
          <h1>ابزارهای مشتری</h1>
          <p>فقط قابلیت‌هایی نمایش داده می‌شوند که سرویس فعال حساب مشتری واقعاً پشتیبانی می‌کند.</p>
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

      <nav className="account-tools__nav" aria-label="بخش‌های فعال ابزارهای مشتری">
        <a href="#wishlist">علاقه‌مندی‌ها</a>
        <a href="#notifications">اعلان‌ها</a>
        <a href="#availability">قابلیت‌های دیگر</a>
      </nav>

      <section id="wishlist" className="account-settings__panel" aria-labelledby="wishlist-heading">
        <div className="account-tools__section-heading">
          <div>
            <h2 id="wishlist-heading">علاقه‌مندی‌های من</h2>
            <p>فهرست مستقیماً از حساب فعلی دریافت می‌شود.</p>
          </div>
          <Link to="/search">پیدا کردن محصول</Link>
        </div>

        {data.wishlist.status === "unavailable" ? (
          <div className="account-tools__section-state" role="status">
            <p>علاقه‌مندی‌ها موقتاً دریافت نشدند.</p>
            <Link to="/account/tools#wishlist">تلاش دوباره برای علاقه‌مندی‌ها</Link>
          </div>
        ) : data.wishlist.items.length === 0 ? (
          <div className="account-tools__section-state">
            <p>هنوز محصولی در علاقه‌مندی‌های شما نیست.</p>
            <Link to="/search">مشاهده محصولات</Link>
          </div>
        ) : (
          <ul className="account-tools__wishlist-list">
            {data.wishlist.items.map((item) => (
              <WishlistItemRow key={item.product_id} item={item} busy={busy} />
            ))}
          </ul>
        )}
      </section>

      <section id="notifications" className="account-settings__panel" aria-labelledby="notifications-heading">
        <div className="account-tools__section-heading">
          <div>
            <h2 id="notifications-heading">اعلان‌های حساب</h2>
            <p>متن و وضعیت اعلان‌ها از صندوق درون‌برنامه‌ای همان حساب دریافت می‌شود.</p>
          </div>
          <div className="account-tools__filter" aria-label="فیلتر اعلان‌ها">
            <Link
              aria-current={!data.unreadOnly ? "page" : undefined}
              to={notificationUrl(false, 0)}
            >
              همه
            </Link>
            <Link
              aria-current={data.unreadOnly ? "page" : undefined}
              to={notificationUrl(true, 0)}
            >
              فقط خوانده‌نشده
            </Link>
          </div>
        </div>

        {data.notifications.status === "unavailable" ? (
          <div className="account-tools__section-state" role="status">
            <p>اعلان‌ها موقتاً دریافت نشدند؛ علاقه‌مندی‌ها همچنان مستقل قابل استفاده‌اند.</p>
            <Link to={notificationUrl(data.unreadOnly, data.notificationOffset)}>
              تلاش دوباره برای اعلان‌ها
            </Link>
          </div>
        ) : data.notifications.items.length === 0 ? (
          <div className="account-tools__section-state">
            <p>
              {data.unreadOnly
                ? "اعلان خوانده‌نشده‌ای در این صفحه وجود ندارد."
                : "اعلانی در این صفحه وجود ندارد."}
            </p>
            {data.notificationOffset > 0 ? (
              <Link to={notificationUrl(data.unreadOnly, 0)}>بازگشت به ابتدای اعلان‌ها</Link>
            ) : null}
          </div>
        ) : (
          <ul className="account-tools__notification-list">
            {data.notifications.items.map((item) => (
              <NotificationRow key={item.id} item={item} busy={busy} />
            ))}
          </ul>
        )}

        <nav className="account-tools__pagination" aria-label="صفحه‌بندی اعلان‌ها">
          {data.notificationOffset > 0 ? (
            <Link
              to={notificationUrl(
                data.unreadOnly,
                Math.max(0, data.notificationOffset - data.notificationLimit),
              )}
            >
              اعلان‌های جدیدتر
            </Link>
          ) : (
            <span>ابتدای فهرست</span>
          )}

          {data.notifications.status === "ready" && data.notificationHasPotentialMore ? (
            <Link
              to={notificationUrl(
                data.unreadOnly,
                data.notificationOffset + data.notificationLimit,
              )}
            >
              اعلان‌های قدیمی‌تر
            </Link>
          ) : (
            <span>پایان صفحه فعلی</span>
          )}
        </nav>
      </section>

      <section id="availability" className="account-settings__panel" aria-labelledby="availability-heading">
        <h2 id="availability-heading">قابلیت‌های دیگر</h2>
        <p>
          هشدار محصول، باشگاه امتیاز و ثبت نظر در طراحی اولیه این صفحه دیده شده‌اند،
          اما در این مرحله فقط قابلیت‌هایی فعال می‌شوند که سرویس مشتری واقعاً پشتیبانی می‌کند.
        </p>
        <div className="account-tools__deferred" role="status">
          <span>هشدار محصول: فعلاً فعال نیست</span>
          <span>باشگاه امتیاز: فعلاً فعال نیست</span>
          <span>ثبت نظر از این صفحه: فعلاً فعال نیست</span>
        </div>
      </section>
    </div>
  );
}

function WishlistItemRow({
  item,
  busy,
}: {
  item: AccountWishlistItem;
  busy: boolean;
}) {
  return (
    <li className="account-tools__wishlist-item">
      <div>
        <strong>محصول ذخیره‌شده</strong>
        <span>
          شناسه: <bdi dir="ltr">…{item.product_id.slice(-8)}</bdi>
        </span>
        <time dateTime={item.added_at}>{formatDateTime(item.added_at)}</time>
      </div>
      <Form method="post" replace>
        <input type="hidden" name="intent" value="wishlist-remove" />
        <input type="hidden" name="product_id" value={item.product_id} />
        <button type="submit" disabled={busy}>
          {busy ? "در حال ثبت…" : "حذف از علاقه‌مندی‌ها"}
        </button>
      </Form>
    </li>
  );
}

function NotificationRow({
  item,
  busy,
}: {
  item: AccountNotificationItem;
  busy: boolean;
}) {
  return (
    <li className="account-tools__notification" data-read={item.read_at ? "true" : "false"}>
      <div className="account-tools__notification-copy">
        <div className="account-tools__notification-heading">
          <strong>{item.title ?? "اعلان حساب"}</strong>
          <span>{item.read_at ? "خوانده‌شده" : "جدید"}</span>
        </div>
        <p>{item.body}</p>
        <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
      </div>

      <div className="account-tools__notification-actions">
        {!item.read_at ? (
          <Form method="post" replace>
            <input type="hidden" name="intent" value="notification-read" />
            <input type="hidden" name="notification_id" value={item.id} />
            <button type="submit" disabled={busy}>علامت‌گذاری به‌عنوان خوانده‌شده</button>
          </Form>
        ) : null}

        {!item.acknowledged_at ? (
          <Form method="post" replace>
            <input type="hidden" name="intent" value="notification-acknowledge" />
            <input type="hidden" name="notification_id" value={item.id} />
            <button type="submit" disabled={busy}>تأیید دریافت</button>
          </Form>
        ) : (
          <span className="account-tools__acknowledged">دریافت تأیید شده است</span>
        )}
      </div>
    </li>
  );
}

function notificationUrl(unreadOnly: boolean, offset: number): string {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unread", "1");
  if (offset > 0) params.set("offset", String(offset));
  const query = params.toString();
  return query ? `/account/tools?${query}#notifications` : "/account/tools#notifications";
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
