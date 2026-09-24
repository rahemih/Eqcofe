import { data, useLoaderData, useNavigation } from "react-router";
import { ListingControls } from "../features/listing/ListingControls.js";
import { ListingGrid } from "../features/listing/ListingGrid.js";
import { ListingPagination } from "../features/listing/ListingPagination.js";
import { searchMeta } from "../features/listing/listing-seo.js";
import {
  loadSearchRouteData,
} from "../features/search/search-data.server.js";
import { SearchState } from "../features/search/SearchState.js";
import type { SearchRouteData } from "../features/search/search-data.server.js";
import { selectSearchResults } from "../features/search/search-state.js";
import { faIR } from "../i18n/fa-IR.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/search.css";

export const handle = {
  breadcrumb: "جست‌وجو",
};

export const meta = ({ loaderData }: { loaderData?: SearchRouteData }) => searchMeta(loaderData);

export async function loader({ request }: { request: Request }) {
  const result = await loadSearchRouteData(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result.data, { headers });
}

export default function SearchRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const pending = navigation.state === "loading" && navigation.location?.pathname === "/search";
  const results = selectSearchResults(loaderData.results);
  const listing = loaderData.listing;
  const retryHref = loaderData.canonicalSearch
    ? `/search?${loaderData.canonicalSearch}`
    : "/search";

  return (
    <>
      {pending ? <p className="listing-pending" role="status" aria-live="polite">{faIR.search.state.loading.body}</p> : null}
    <div className="search-page" data-search-state={loaderData.results.status} aria-busy={pending}>
      <header className="search-intro">
        <p className="search-intro__eyebrow">{faIR.search.eyebrow}</p>
        <h1>{faIR.search.title}</h1>
        {loaderData.query ? (
          <p className="search-intro__summary">
            {faIR.search.summaryPrefix} <bdi>«{loaderData.query}»</bdi>
          </p>
        ) : (
          <p className="search-intro__summary">{faIR.search.introBody}</p>
        )}
      </header>

      <SearchState
        state={loaderData.results}
        queryIssue={loaderData.queryIssue}
        query={loaderData.query}
        retryHref={retryHref}
      />

      {listing && loaderData.query ? (
        <ListingControls
          key={loaderData.canonicalSearch}
          mode="search"
          basePath="/search"
          state={loaderData.urlState}
          facets={listing.facets}
        />
      ) : null}

      {results ? (
        <ListingGrid products={results.items} heading={faIR.search.gridHeading} />
      ) : null}

      {listing ? (
        <ListingPagination
          basePath="/search"
          state={loaderData.urlState}
          pagination={listing.pagination}
        />
      ) : null}
    </div>
    </>
  );
}
