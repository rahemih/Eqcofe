import { data, useLoaderData } from "react-router";
import { RoutePlaceholder } from "../components/RoutePlaceholder";
import { loadHomeRouteData } from "../features/home/home-data.server";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server";

export const handle = {
  breadcrumb: "خانه",
};

export async function loader({ request }: { request: Request }) {
  const result = await loadHomeRouteData(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result.data, { headers });
}

export default function HomeRoute() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <div data-home-products-state={loaderData.productPreview.status}>
      <RoutePlaceholder
        screenId="SF-B-01"
        title="خانه"
        targetStep={59}
        routeIntent="/"
      />
    </div>
  );
}
