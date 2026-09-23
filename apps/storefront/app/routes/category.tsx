import { data, useLoaderData, useNavigation } from "react-router";
import {
  loadCategoryRouteData,
} from "../features/category/category-data.server.js";
import { CategoryState } from "../features/category/CategoryState.js";
import type { CategoryRouteData } from "../features/category/category-data.server.js";
import { selectCategoryProducts } from "../features/category/category-state.js";
import { ListingControls } from "../features/listing/ListingControls.js";
import { ListingGrid } from "../features/listing/ListingGrid.js";
import { ListingPagination } from "../features/listing/ListingPagination.js";
import { categoryMeta } from "../features/listing/listing-seo.js";
import { faIR } from "../i18n/fa-IR.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/category.css";

export const handle = {
  breadcrumb: "دسته‌بندی",
};

export const meta = ({ data: routeData }: { data?: CategoryRouteData }) => categoryMeta(routeData);

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { slug?: string };
}) {
  const result = await loadCategoryRouteData(request, params.slug);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result.data, { headers });
}

export default function CategoryRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const pending = navigation.state === "loading" && navigation.location?.pathname.startsWith("/category/");
  const products = selectCategoryProducts(loaderData.products);
  const listing = loaderData.listing;
  const categoryTitle = loaderData.category?.name_fa ?? faIR.category.title;
  const basePath = loaderData.slug
    ? `/category/${encodeURIComponent(loaderData.slug)}`
    : "/category";
  const retryHref = loaderData.canonicalSearch
    ? `${basePath}?${loaderData.canonicalSearch}`
    : basePath;

  return (
    <>
      {pending ? <p className="listing-pending" role="status" aria-live="polite">{faIR.category.state.loading.body}</p> : null}
    <div className="category-page" data-category-state={loaderData.products.status} aria-busy={pending}>
      <header className="category-intro">
        <p className="category-intro__eyebrow">{faIR.category.eyebrow}</p>
        <h1>{categoryTitle}</h1>
        {loaderData.category?.description ? (
          <p className="category-intro__summary">{loaderData.category.description}</p>
        ) : (
          <p className="category-intro__summary">{faIR.category.introBody}</p>
        )}
      </header>

      <CategoryState
        state={loaderData.products}
        issue={loaderData.issue}
        retryHref={retryHref}
      />

      {listing && loaderData.category ? (
        <ListingControls
          key={`${loaderData.slug}:${loaderData.canonicalSearch}`}
          mode="collection"
          basePath={basePath}
          state={loaderData.urlState}
          facets={listing.facets}
          categoryFilters={loaderData.categoryFilters?.filters ?? []}
        />
      ) : null}

      {products ? (
        <ListingGrid products={products.items} heading={faIR.category.gridHeading} />
      ) : null}

      {listing ? (
        <ListingPagination
          basePath={basePath}
          state={loaderData.urlState}
          pagination={listing.pagination}
        />
      ) : null}
    </div>
    </>
  );
}
