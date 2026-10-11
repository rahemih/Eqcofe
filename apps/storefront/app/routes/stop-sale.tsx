import { data, useLoaderData } from "react-router";
import { CatalogStateView } from "../features/content/CatalogStateView.js";
import { loadCatalogStateRouteData } from "../features/content/catalog-state-data.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/content.css";

export const handle = { breadcrumb: "فروش متوقف" };
export const meta = () => [
  { title: "محصولات با فروش متوقف | EQCOFE" },
  { name: "description", content: "فهرست عمومی محصولات منتشرشده‌ای که فروش مؤثر آن‌ها در EQCOFE متوقف است." },
  { name: "robots", content: "noindex,follow" },
];

export async function loader({ request }: { request: Request }) {
  const result = await loadCatalogStateRouteData(request, "stop-sale");
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result.data, { headers });
}

export default function StopSaleRoute() {
  return <CatalogStateView payload={useLoaderData<typeof loader>()} />;
}
