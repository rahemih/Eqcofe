import { data, useLoaderData } from "react-router";
import { ArticleDetailView } from "../features/content/ArticleDetailView.js";
import {
  loadArticleDetailRouteData,
  type ArticleDetailRouteData,
} from "../features/content/article-detail-data.server.js";
import { articleDetailMeta } from "../features/content/article-detail-seo.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/content.css";

export const handle = {
  breadcrumb: "مقاله",
};

export const meta = ({ loaderData }: { loaderData?: ArticleDetailRouteData }) =>
  articleDetailMeta(loaderData);

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { slug?: string };
}) {
  const result = await loadArticleDetailRouteData(request, params.slug);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result.data, { headers });
}

export default function ArticleDetailRoute() {
  const state = useLoaderData<typeof loader>();
  return <ArticleDetailView state={state} />;
}
