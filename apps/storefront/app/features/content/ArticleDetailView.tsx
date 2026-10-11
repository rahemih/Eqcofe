import { Link } from "react-router";
import type { ArticleDetailRouteData } from "./article-detail-data.server.js";
import { articleJsonLd } from "./article-detail-seo.js";

export function ArticleDetailView({ state }: { state: ArticleDetailRouteData }) {
  if (state.article.status !== "ready") {
    return (
      <main className="content-page" aria-labelledby="article-detail-title">
        <h1 id="article-detail-title">مقاله</h1>
        <section className="content-page__state" role="alert">
          <h2>مقاله در دسترس نیست</h2>
          <p>محتوای نامعتبر، پیش‌نویس یا دریافت ناموفق به‌صورت حدسی نمایش داده نمی‌شود.</p>
          <Link className="content-page__action" to="/articles">بازگشت به همه مقاله‌ها</Link>
        </section>
      </main>
    );
  }

  const article = state.article.data;
  const jsonLd = JSON.stringify(articleJsonLd(article)).replace(/</g, "\\u003c");

  return (
    <main className="content-page article-detail" aria-labelledby="article-detail-title">
      <script type="application/ld+json">{jsonLd}</script>
      <nav aria-label="مسیر مقاله">
        <Link to="/articles">مقالات</Link>
      </nav>
      <article>
        <header className="article-detail__header">
          <p className="content-page__eyebrow">مقاله منتشرشده ایکوفی</p>
          <h1 id="article-detail-title">{article.title_fa}</h1>
          <time dateTime={String(article.published_at)}>{formatDate(article.published_at)}</time>
          {article.meta_description ? <p>{article.meta_description}</p> : null}
        </header>

        <div className="article-detail__body">
          {String(article.body).split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>

      {state.related.status === "ready" && state.related.data.items.length > 0 ? (
        <aside className="article-related" aria-labelledby="article-related-title">
          <h2 id="article-related-title">مقاله‌های مرتبط</h2>
          <ul>
            {state.related.data.items.map((item) => (
              <li key={item.id}>
                <Link to={`/articles/${encodeURIComponent(item.slug)}`}>{item.title_fa}</Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </main>
  );
}

function formatDate(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "تاریخ انتشار نامشخص";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: "UTC" }).format(date);
}
