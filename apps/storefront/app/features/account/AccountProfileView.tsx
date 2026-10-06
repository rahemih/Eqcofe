import { Form, Link } from "react-router";
import type {
  AccountLoadState,
  AccountMutationResult,
  AccountProfilePageData,
} from "./account-settings.server.js";

type Props = {
  state: AccountLoadState<AccountProfilePageData>;
  actionData: AccountMutationResult | null;
  busy: boolean;
};

export function AccountProfileView({ state, actionData, busy }: Props) {
  if (state.status === "unavailable") {
    return (
      <section className="account-settings__state" aria-labelledby="profile-unavailable">
        <p className="account-overview__eyebrow">پروفایل و امنیت</p>
        <h1 id="profile-unavailable">اطلاعات پروفایل موقتاً در دسترس نیست</h1>
        <p>هیچ اطلاعاتی از حافظه مرورگر به‌عنوان وضعیت حساب استفاده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/account/profile">تلاش دوباره</Link>
      </section>
    );
  }

  if (state.status === "unauthenticated") {
    return (
      <section className="account-settings__state" aria-labelledby="profile-session-ended">
        <p className="account-overview__eyebrow">پروفایل و امنیت</p>
        <h1 id="profile-session-ended">نشست شما پایان یافته است</h1>
        <p>برای حفظ حریم خصوصی هیچ اطلاعات شخصی نمایش داده نمی‌شود.</p>
        <Link className="account-overview__primary-link" to="/">بازگشت به فروشگاه</Link>
      </section>
    );
  }

  const profile = state.data.profile;
  return (
    <div className="account-settings">
      <header className="account-settings__header">
        <div>
          <p className="account-overview__eyebrow">SF-E-02 · حساب کاربری</p>
          <h1>پروفایل و امنیت</h1>
          <p>فقط فیلدهایی که قرارداد فعلی حساب اجازه می‌دهد قابل ویرایش‌اند.</p>
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

      <div className="account-settings__layout">
        <section className="account-settings__panel" aria-labelledby="profile-heading">
          <h2 id="profile-heading">اطلاعات پروفایل</h2>
          <Form method="post" className="account-settings__form" replace>
            <input type="hidden" name="intent" value="update-profile" />

            <label>
              نام
              <input
                name="first_name"
                maxLength={100}
                defaultValue={profile.first_name ?? ""}
                autoComplete="given-name"
              />
            </label>

            <label>
              نام خانوادگی
              <input
                name="last_name"
                maxLength={100}
                defaultValue={profile.last_name ?? ""}
                autoComplete="family-name"
              />
            </label>

            <label>
              ایمیل
              <input
                name="email"
                type="email"
                maxLength={320}
                defaultValue={profile.email ?? ""}
                autoComplete="email"
                inputMode="email"
                dir="ltr"
              />
            </label>

            <div className="account-settings__readonly">
              <span>شماره موبایل</span>
              <bdi dir="ltr">{maskMobile(profile.mobile)}</bdi>
              <small>تغییر شماره موبایل در قرارداد فعلی پروفایل پشتیبانی نمی‌شود.</small>
            </div>

            <button className="account-settings__primary" type="submit" disabled={busy}>
              {busy ? "در حال ذخیره…" : "ذخیره تغییرات پروفایل"}
            </button>
          </Form>
        </section>

        <aside className="account-settings__panel" aria-labelledby="security-heading">
          <h2 id="security-heading">امنیت نشست</h2>
          <p>
            شناسه نشست، توکن و مجوزهای داخلی در این صفحه نمایش داده یا در مرورگر ذخیره نمی‌شوند.
          </p>
          <div className="account-settings__security-actions">
            <Form method="post" replace>
              <input type="hidden" name="intent" value="logout" />
              <button type="submit" disabled={busy}>خروج از این نشست</button>
            </Form>

            <details className="account-settings__danger">
              <summary>خروج از همه دستگاه‌ها</summary>
              <p>این اقدام همه نشست‌های فعال حساب را پایان می‌دهد.</p>
              <Form method="post" replace>
                <input type="hidden" name="intent" value="logout-all" />
                <button type="submit" disabled={busy}>تأیید خروج از همه نشست‌ها</button>
              </Form>
            </details>
          </div>
        </aside>
      </div>
    </div>
  );
}

function maskMobile(value: string | null | undefined): string {
  if (!value) return "ثبت نشده";
  if (value.length < 7) return "••••";
  return value.slice(0, 4) + "••••" + value.slice(-3);
}
