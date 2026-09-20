import { data, useLoaderData } from "react-router";
import { HomeDiscovery } from "../features/home/HomeDiscovery";
import { HomeMerchandising } from "../features/home/HomeMerchandising";
import { HomeProductState } from "../features/home/HomeProductState";
import { selectHomeProducts } from "../features/home/home-product-state";
import { loadHomeRouteData } from "../features/home/home-data.server";
import { getMessages } from "../i18n";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server";
import "../styles/home.css";

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
  const messages = getMessages();
  const products = selectHomeProducts(loaderData.productPreview);

  return (
    <div className="home-page" data-home-products-state={loaderData.productPreview.status}>
      <section className="home-intro" aria-labelledby="home-title">
        <p className="home-intro__eyebrow">{messages.home.eyebrow}</p>
        <h1 id="home-title">{messages.home.title}</h1>
        <p className="home-intro__body">{messages.home.introBody}</p>
      </section>

      <HomeProductState state={loaderData.productPreview} />

      {products ? <HomeDiscovery products={products} /> : null}

      <HomeMerchandising products={products} />
    </div>
  );
}
