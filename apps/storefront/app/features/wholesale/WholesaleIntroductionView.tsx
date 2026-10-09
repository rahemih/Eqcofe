import { Link } from "react-router";
import type { WholesalePageData } from "./wholesale-data.server.js";

type Props = {
  state: WholesalePageData;
};

export function WholesaleIntroductionView({ state }: Props) {
  if (state.status === "unavailable") {
    return (
      <main className="wholesale-page" aria-labelledby="wholesale-unavailable">
        <section className="wholesale-page__state" role="status">
          <p className="wholesale-page__eyebrow">فروش عمده ایکوفی</p>
          <h1 id="wholesale-unavailable">اطلاعات فروش عمده موقتاً در دسترس نیست</h1>
          <p>وضعیت حساب یا درخواست از حافظه مرورگر حدس زده نمی‌شود. برای دریافت وضعیت معتبر دوباره تلاش کنید.</p>
          <Link className="wholesale-page__primary" to="/wholesale">تلاش دوباره</Link>
        </section>
      </main>
    );
  }

  const decision = decideCta(state);

  return (
    <main className="wholesale-page">
      <header className="wholesale-page__hero" aria-labelledby="wholesale-title">
        <div>
          <p className="wholesale-page__eyebrow">SF-E-07 · تجربه خرید عمده</p>
          <h1 id="wholesale-title">خرید عمده تجهیزات قهوه از ایکوفی</h1>
          <p className="wholesale-page__lead">
            برای کسب‌وکارهایی که به خرید تعداد بالاتر نیاز دارند، درخواست فروش عمده بررسی می‌شود.
            تأیید درخواست یا میزان تخفیف از پیش تضمین نمی‌شود و قیمت نهایی فقط از سامانه قیمت‌گذاری ایکوفی می‌آید.
          </p>
          <div className="wholesale-page__actions">
            <Link className="wholesale-page__primary" to={decision.href}>{decision.label}</Link>
            {decision.secondary ? (
              <Link className="wholesale-page__secondary" to={decision.secondary.href}>
                {decision.secondary.label}
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="wholesale-page__state-card" aria-labelledby="wholesale-state-heading">
          <h2 id="wholesale-state-heading">وضعیت شما</h2>
          <p>{decision.message}</p>
          {state.status === "ready" && state.application ? (
            <p>وضعیت درخواست: <strong>{applicationStatusLabel(state.application.status)}</strong></p>
          ) : null}
        </aside>
      </header>

      <section className="wholesale-page__grid" aria-label="راهنمای فروش عمده">
        <article>
          <h2>فرایند روشن</h2>
          <p>درخواست از حساب مشتری ثبت می‌شود و نتیجه بررسی فقط از وضعیت ثبت‌شده در سرور نمایش داده می‌شود.</p>
        </article>
        <article>
          <h2>قیمت معتبر</h2>
          <p>قیمت و صرفه‌جویی احتمالی در جریان خرید بر اساس نوع مشتری و تعداد، توسط سامانه قیمت‌گذاری محاسبه می‌شود.</p>
        </article>
        <article>
          <h2>همان سبد و تسویه امن</h2>
          <p>خرید عمده از همان سبد خرید، موجودی، تسویه و سفارش اصلی فروشگاه استفاده می‌کند و مسیر موازی ایجاد نمی‌شود.</p>
        </article>
      </section>

      <section className="wholesale-page__process" aria-labelledby="wholesale-process-heading">
        <h2 id="wholesale-process-heading">مراحل درخواست</h2>
        <ol>
          <li><strong>ثبت درخواست</strong><span>اطلاعات کسب‌وکار از داخل حساب شما ارسال می‌شود.</span></li>
          <li><strong>بررسی</strong><span>وضعیت بررسی توسط تیم مجاز فروشگاه تغییر می‌کند؛ مرورگر امکان تأیید حساب را ندارد.</span></li>
          <li><strong>خرید پس از تأیید</strong><span>پس از ارتقای معتبر نوع مشتری، قیمت و شرایط خرید از پاسخ‌های سرور دریافت می‌شوند.</span></li>
        </ol>
      </section>
    </main>
  );
}

function decideCta(state: WholesalePageData): {
  href: string;
  label: string;
  message: string;
  secondary?: { href: string; label: string };
} {
  if (state.status === "unavailable") {
    return {
      href: "/wholesale",
      label: "تلاش دوباره",
      message: "اطلاعات فروش عمده موقتاً در دسترس نیست.",
    };
  }

  if (state.status === "guest") {
    return {
      href: "/account/wholesale/apply",
      label: "ورود و شروع درخواست عمده",
      message: "برای ثبت درخواست باید وارد حساب مشتری شوید.",
    };
  }

  if (state.customerType === "wholesale") {
    return {
      href: "/search",
      label: "مشاهده محصولات",
      message: "نوع مشتری حساب شما به‌صورت معتبر «عمده» ثبت شده است.",
      secondary: state.application ? { href: "/account/wholesale", label: "مشاهده وضعیت درخواست" } : undefined,
    };
  }

  if (!state.application) {
    return {
      href: "/account/wholesale/apply",
      label: "شروع درخواست عمده",
      message: "درخواست فعالی برای این حساب ثبت نشده است.",
    };
  }

  if (state.application.status === "rejected") {
    return {
      href: "/account/wholesale/apply",
      label: "ثبت درخواست جدید",
      message: "درخواست قبلی رد شده است. نوع مشتری شما همچنان خرده‌فروشی است.",
      secondary: { href: "/account/wholesale", label: "مشاهده درخواست قبلی" },
    };
  }

  return {
    href: "/account/wholesale",
    label: "مشاهده وضعیت درخواست",
    message: "یک درخواست برای این حساب وجود دارد؛ فرم دوم ساخته نمی‌شود.",
  };
}

function applicationStatusLabel(status: string): string {
  switch (status) {
    case "submitted": return "ثبت‌شده";
    case "under_review": return "در حال بررسی";
    case "approved": return "تأییدشده";
    case "rejected": return "ردشده";
    default: return "نامشخص";
  }
}
