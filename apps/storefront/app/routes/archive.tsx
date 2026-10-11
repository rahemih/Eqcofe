import { data, useLoaderData } from "react-router";
import { CatalogStateView } from "../features/content/CatalogStateView.js";
import { loadCatalogStateRouteData } from "../features/content/catalog-state-data.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/content.css";

export const handle = { breadcrumb: "آرشیو محصولات" };
export const meta = () => [
  { title: "آرشیو محصولات | EQCOFE" },
  { name: "description", content: "سابقه عمومی محصولات پیش‌تر منتشرشده و سپس آرشیوشده EQCOFE." },
  { name: "robots", content: "noindex,follow" },
];

export async function loader({ request }: { request: Request }) {
  const result = await loadCatalogStateRouteData(request, "archive");
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result.data, { headers });
}

export default function ArchiveRoute() {
  return <CatalogStateView payload={useLoaderData<typeof loader>()} />;
}
