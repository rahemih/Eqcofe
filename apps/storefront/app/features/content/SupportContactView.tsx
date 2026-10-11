import { Link } from "react-router";

const supportPaths = [
  {
    title: "سفارش‌ها",
    body: "برای مشاهده وضعیت سفارش، جزئیات و اقدام‌های مجاز مربوط به همان سفارش از حساب کاربری استفاده کنید.",
    to: "/account/orders",
    action: "مشاهده سفارش‌های من",
  },
  {
    title: "مرجوعی",
    body: "درخواست و پیگیری مرجوعی باید به سفارش متعلق به همان مشتری متصل باشد و نتیجه آن از پرونده معتبر سامانه مشخص می‌شود.",
    to: "/account/returns",
    action: "مرجوعی‌های من",
  },
  {
    title: "گارانتی",
    body: "برای گارانتی از پرونده متعلق به حساب و سفارش خود استفاده کنید؛ ثبت درخواست به معنی تأیید پوشش نیست.",
    to: "/account/warranty",
    action: "پرونده‌های گارانتی",
  },
  {
    title: "خرید عمده",
    body: "درخواست و وضعیت عمده‌فروشی از حساب مشتری پیگیری می‌شود و فقط وضعیت معتبر سامانه اختیار عمده ایجاد می‌کند.",
    to: "/account/wholesale",
    action: "وضعیت عمده‌فروشی",
  },
  {
    title: "پرسش‌های عمومی",
    body: "برای پرسش‌های عمومی درباره قیمت، پرداخت، سفارش و خدمات پس از فروش ابتدا پاسخ‌های مصوب را بررسی کنید.",
    to: "/faq",
    action: "پرسش‌های متداول",
  },
] as const;

export function SupportContactView() {
  return (
    <main className="content-page support-page" aria-labelledby="support-title">
      <header className="content-page__hero">
        <p className="content-page__eyebrow">SF-F-04 · تماس و پشتیبانی</p>
        <h1 id="support-title">تماس و پشتیبانی</h1>
        <p>
          برای امنیت و دقت، درخواست‌های مربوط به سفارش و خدمات پس از فروش از مسیرهای متعلق به حساب همان مشتری پیگیری می‌شوند.
        </p>
      </header>

      <aside className="support-page__notice" role="note" aria-labelledby="support-direct-title">
        <h2 id="support-direct-title">ارسال مستقیم پیام عمومی هنوز فعال نیست</h2>
        <p>
          در حال حاضر API عمومی مصوبی برای ارسال پیام پشتیبانی وجود ندارد؛ بنابراین این صفحه موفقیت ارسال پیام یا کانال ارتباطی ساختگی نمایش نمی‌دهد.
        </p>
      </aside>

      <section className="support-page__privacy" aria-labelledby="support-privacy-title">
        <h2 id="support-privacy-title">اطلاعات حساس ارسال نکنید</h2>
        <p>
          رمز یک‌بارمصرف، token، secret، رمز حساب یا اطلاعات کامل کارت و پرداخت را در هیچ متن پشتیبانی وارد نکنید.
        </p>
      </section>

      <section className="support-route-grid" aria-labelledby="support-routes-title">
        <h2 id="support-routes-title">مسیر مناسب را انتخاب کنید</h2>
        <div className="support-route-grid__items">
          {supportPaths.map((item) => (
            <article className="support-route-card" key={item.to}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <Link className="content-page__action" to={item.to}>{item.action}</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
