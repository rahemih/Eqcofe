import { Link } from "react-router";
import type { ArticleListRouteData } from "./article-list-data.server.js";
import type { ArticleSummary } from "./article-contract.js";

type Props = {
  state: ArticleListRouteData;
};

export function ArticleListView({ state }: Props) {
  const retryHref = "/articles";

  return (
    <main className="content-page" aria-labelledby="article-list-title">
      <header className="content-page__hero">
        <p className="content-page__eyebrow">SF-F-01 · محتوای منتشرشده ایکوفی</p>
        <h1 id="article-list-title">مقالات و راهنمای خرید تجهیزات قهوه</h1>
        <p>
          راهنماهای منتشرشده برای انتخاب، مقایسه و استفاده بهتر از تجهیزات قهوه.
          فقط محتوایی نمایش داده می‌شود که سامانه محتوای ایکوفی برای انتشار عمومی ارائه کرده است.
        </p>
      </header>

      {state.cursorIssue === "invalid" ? (
        <section className="content-page__state" role="alert">
          <h2>نشانی صفحه معتبر نیست</h2>
          <p>برای جلوگیری از نمایش نتیجه حدسی، فهرست از ابتدا بارگذاری می‌شود.</p>
          <Link className="content-page__action" to={retryHref}>بازگشت به همه مقاله‌ها</Link>
        </section>
      ) : state.articles.status === "ready" ? (
        <>
          <section className="article-grid" aria-label="فهرست مقاله‌های منتشرشده">
            {state.articles.data.items.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </section>
          {state.nextCursor ? (
            <nav className="content-page__pagination" aria-label="صفحه‌بندی مقاله‌ها">
              <Link
                className="content-page__action"
                rel="next"
                to={nextPageHref(state.nextCursor)}
              >
                مقاله‌های بعدی
              </Link>
            </nav>
          ) : null}
        </>
      ) : state.articles.status === "empty" ? (
        <section className="content-page__state" role="status">
          <h2>فعلاً مقاله‌ای برای نمایش نیست</h2>
          <p>محتوای منتشرنشده یا پیش‌نویس به‌صورت حدسی نمایش داده نمی‌شود.</p>
        </section>
      ) : (
        <section className="content-page__state" role="alert">
          <h2>دریافت مقاله‌ها انجام نشد</h2>
          <p>برای دریافت نسخه معتبر از سرور دوباره تلاش کنید.</p>
          <Link className="content-page__action" to={retryHref}>تلاش دوباره</Link>
        </section>
      )}
    </main>
  );
}

function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <article className="article-card">
      <p className="article-card__date">
        <time dateTime={String(article.published_at)}>{formatPublishedDate(article.published_at)}</time>
      </p>
      <h2>
        <Link to={`/articles/${encodeURIComponent(article.slug)}`}>{article.title_fa}</Link>
      </h2>
      {article.meta_description ? <p>{article.meta_description}</p> : null}
      <Link className="article-card__link" to={`/articles/${encodeURIComponent(article.slug)}`}>
        مطالعه مقاله
      </Link>
    </article>
  );
}

function nextPageHref(cursor: string): string {
  const params = new URLSearchParams({ cursor });
  return `/articles?${params.toString()}`;
}

function formatPublishedDate(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "تاریخ انتشار نامشخص";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}
