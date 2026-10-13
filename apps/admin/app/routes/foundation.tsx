export default function AdminFoundationRoute() {
  return (
    <section className="foundation-page" aria-labelledby="foundation-title">
      <div className="foundation-heading">
        <p className="foundation-kicker">مرحله 67-E</p>
        <h1 id="foundation-title">پوستهٔ مجوزمحور مدیریت</h1>
        <p>مقصدهای این پوسته فقط از مجوزها و دامنهٔ نشست تأییدشدهٔ سرور ساخته می‌شوند. نمایش یک مقصد به معنی مجوز اجرای عملیات آن نیست.</p>
      </div>
      <div className="foundation-grid" aria-label="مرزهای این مرحله">
        <article className="foundation-card">
          <h2>مقصدهای مجاز</h2>
          <p>ناوبری و جستجو فقط عنوان مقصدهایی را نشان می‌دهند که شواهد مجوز runtime برای آن‌ها قابل اثبات است.</p>
        </article>
        <article className="foundation-card">
          <h2>دامنهٔ فقط‌خواندنی</h2>
          <p>دامنه‌های انبار یا فروشگاه حضوری از نشست سرور خوانده می‌شوند و در این پوسته قابل تغییر یا جعل نیستند.</p>
        </article>
        <article className="foundation-card">
          <h2>داشبورد بدون دادهٔ ساختگی</h2>
          <p>تا زمانی که runtime معتبر داشبورد در مرحلهٔ 67-G اثبات نشود، هیچ KPI، شمارنده یا وضعیت عملیاتی ساخته یا نمایش داده نمی‌شود.</p>
        </article>
      </div>
    </section>
  );
}
