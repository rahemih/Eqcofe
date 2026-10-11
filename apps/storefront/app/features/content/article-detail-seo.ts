import type { ArticleDetailRouteData } from "./article-detail-data.server.js";

const FALLBACK_TITLE = "مقاله | EQCOFE";

export function articleDetailMeta(data: ArticleDetailRouteData | undefined) {
  const article = data?.article.status === "ready" ? data.article.data : null;
  if (!article) {
    return [
      { title: FALLBACK_TITLE },
      { name: "robots", content: "noindex,follow" },
    ];
  }

  const seo = article.seo;
  const entries = [
    { title: seo.title || article.title_fa || FALLBACK_TITLE },
    ...(seo.description ? [{ name: "description", content: seo.description }] : []),
    { name: "robots", content: seo.robots },
  ];
  if (!seo.canonical_url) return entries;
  return [...entries, { tagName: "link", rel: "canonical", href: seo.canonical_url }];
}

export function articleJsonLd(article: {
  title_fa: string;
  published_at: string | Date;
  seo: { title: string; description: string | null; canonical_url: string | null };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.seo.title || article.title_fa,
    datePublished: new Date(article.published_at).toISOString(),
    ...(article.seo.description ? { description: article.seo.description } : {}),
    ...(article.seo.canonical_url
      ? { mainEntityOfPage: { "@type": "WebPage", "@id": article.seo.canonical_url } }
      : {}),
    publisher: { "@type": "Organization", name: "EQCOFE", url: "https://eqcofe.com" },
  };
}
