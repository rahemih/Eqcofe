import { data, useLoaderData } from "react-router";
import { ArticleListView } from "../features/content/ArticleListView.js";
import { loadArticleListRouteData } from "../features/content/article-list-data.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/content.css";

export const handle = {
  breadcrumb: "مقالات",
};

export const meta = () => [
  { title: "مقالات و راهنمای خرید تجهیزات قهوه | EQCOFE" },
  {
    name: "description",
    content: "مقالات منتشرشده ایکوفی درباره انتخاب، مقایسه و استفاده از تجهیزات قهوه.",
  },
];

export async function loader({ request }: { request: Request }) {
  const result = await loadArticleListRouteData(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result.data, { headers });
}

export default function ArticlesRoute() {
  const state = useLoaderData<typeof loader>();
  return <ArticleListView state={state} />;
}
