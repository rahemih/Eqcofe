import { Link } from "react-router";
import type { CatalogStatePayload } from "./catalog-state-data.server.js";

export function CatalogStateView({ payload }: { payload: CatalogStatePayload }) {
  const archive = payload.mode === "archive";
  const title = archive ? "آرشیو محصولات" : "محصولات با فروش متوقف";
  const intro = archive
    ? "این فهرست فقط سابقه محصولاتی را نشان می‌دهد که پیش‌تر عمومی بوده‌اند و سپس آرشیو شده‌اند. اطلاعات قیمت، موجودی و دلیل مدیریتی آرشیو نمایش داده نمی‌شود."
    : "این فهرست فقط از مرجع عمومی محصولات منتشرشده‌ای می‌آید که فروش مؤثر آن‌ها متوقف است. ناموجود بودن به‌تنهایی به معنی توقف فروش نیست.";

  return (
    <main className="content-page catalog-state-page" aria-labelledby="catalog-state-title">
      <header className="content-page__hero">
        <p className="content-page__eyebrow">{archive ? "سابقه عمومی کاتالوگ" : "وضعیت عمومی فروش"}</p>
        <h1 id="catalog-state-title">{title}</h1>
        <p>{intro}</p>
      </header>

      {payload.cursorIssue === "invalid" ? (
        <section className="content-page__state" role="alert">
          <h2>نشانی صفحه معتبر نیست</h2>
          <p>برای جلوگیری از نتیجه حدسی، فهرست از ابتدا باز می‌شود.</p>
          <Link className="content-page__action" to={archive ? "/archive" : "/stop-sale"}>بازگشت به ابتدای فهرست</Link>
        </section>
      ) : payload.state.status === "ready" ? (
        <>
          <section className="catalog-state-grid" aria-label={title}>
            {archive
              ? payload.state.data.items.map((item) => (
                  <article className="catalog-state-card" key={item.id}>
                    <p className="catalog-state-card__badge">آرشیوشده</p>
                    <h2>{item.name}</h2>
                    {item.brand ? <p>برند: {item.brand.name_fa}</p> : null}
                    <p>دسته: {item.primary_category.name_fa}</p>
                    <p><time dateTime={String(item.archived_at)}>تاریخ آرشیو: {formatDate(item.archived_at)}</time></p>
                  </article>
                ))
              : payload.state.data.items.map((item) => (
                  <article className="catalog-state-card" key={item.id}>
                    <p className="catalog-state-card__badge">فروش متوقف است</p>
                    <h2><Link to={`/product/${encodeURIComponent(item.slug)}`}>{item.name}</Link></h2>
                    {item.brand ? <p>برند: {item.brand.name_fa}</p> : null}
                    {item.primary_category ? <p>دسته: {item.primary_category.name_fa}</p> : null}
                    {item.price ? <p>{formatToman(item.price.current_toman)}</p> : null}
                    <p>این وضعیت از مرجع فروش سامانه دریافت شده است و دلیل داخلی توقف فروش در این صفحه نمایش داده نمی‌شود.</p>
                  </article>
                ))}
          </section>

          {payload.nextCursor ? (
            <nav className="content-page__pagination" aria-label="صفحه‌بندی">
              <Link className="content-page__action" rel="next" to={nextHref(payload.mode, payload.nextCursor)}>
                موارد بعدی
              </Link>
            </nav>
          ) : null}
        </>
      ) : payload.state.status === "empty" ? (
        <section className="content-page__state" role="status">
          <h2>{archive ? "محصول آرشیوشده عمومی وجود ندارد" : "محصولی با فروش متوقف برای نمایش وجود ندارد"}</h2>
          <p>این صفحه داده‌ای خارج از پاسخ معتبر سامانه تولید نمی‌کند.</p>
        </section>
      ) : (
        <section className="content-page__state" role="alert">
          <h2>دریافت فهرست انجام نشد</h2>
          <p>برای دریافت وضعیت معتبر دوباره تلاش کنید.</p>
          <Link className="content-page__action" to={archive ? "/archive" : "/stop-sale"}>تلاش دوباره</Link>
        </section>
      )}
    </main>
  );
}

function nextHref(mode: "archive" | "stop-sale", cursor: string) {
  return `/${mode}?cursor=${encodeURIComponent(cursor)}`;
}

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "نامشخص";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: "UTC" }).format(date);
}
