import { data, useLoaderData, useNavigation } from "react-router";
import { CompareState } from "../features/compare-wishlist/CompareState.js";
import { CompareTable } from "../features/compare-wishlist/CompareTable.js";
import {
  loadCompareRouteData,
  type CompareRouteData,
} from "../features/compare-wishlist/compare-route-data.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/compare.css";

export const handle = {
  breadcrumb: "مقایسه محصولات",
};

export const meta = ({ loaderData }: { loaderData?: CompareRouteData }) => [
  { title: loaderData?.comparison.status === "ready" ? "مقایسه محصولات | EQCOFE" : "مقایسه محصولات | EQCOFE" },
  { name: "robots", content: "noindex,follow" },
];

export async function loader({ request }: { request: Request }) {
  const result = await loadCompareRouteData(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result.data, { headers });
}

export default function CompareRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const pending = navigation.state === "loading" && navigation.location?.pathname === "/compare";

  return (
    <div className="compare-page" data-compare-state={loaderData.comparison.status} aria-busy={pending}>
      <header className="compare-intro">
        <p>ارزیابی محصول</p>
        <h1>مقایسه محصولات</h1>
        <p>حداکثر چهار محصول هم‌دسته را با داده‌های معتبر سرور مقایسه کنید.</p>
      </header>

      {pending ? (
        <p role="status" aria-live="polite">در حال به‌روزرسانی مقایسه…</p>
      ) : null}

      <CompareState state={loaderData.comparison} issue={loaderData.queryIssue} />

      {loaderData.comparison.status === "ready" ? (
        <CompareTable result={loaderData.comparison.data} urlState={loaderData.urlState} />
      ) : null}
    </div>
  );
}
