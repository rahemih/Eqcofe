import type { ApiClientConfig } from "../../platform/api/request.js";
import {
  createCustomerSessionBridge,
  type CustomerSessionBridge,
} from "../../platform/auth/session-cookie.server.js";
import {
  classifyApiFailureState,
  emptyState,
  readyState,
  type AsyncSurfaceState,
} from "../../platform/state/surface-state.js";
import {
  ListingUrlStateError,
  hasActiveListingFilters,
  parseListingUrlState,
  serializeListingUrlState,
  type ListingUrlState,
} from "../listing/listing-url-state.js";
import type { SearchListingResponse } from "../listing/listing-contract.js";

export type SearchQueryIssue = "missing" | "invalid" | null;

export type SearchRouteData = {
  query: string | null;
  queryIssue: SearchQueryIssue;
  canonicalSearch: string;
  urlState: ListingUrlState;
  listing: SearchListingResponse | null;
  results: AsyncSurfaceState<SearchListingResponse>;
  contract: {
    method: "GET";
    path: "/search";
    query: "q/cursor/limit/brand/min_price/max_price/available/sort";
    authority: "backend";
  };
};

export type LoadSearchDataOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type SearchRouteDataResult = {
  data: SearchRouteData;
  setCookies: readonly string[];
};

export async function loadSearchRouteData(
  request: Request,
  options: LoadSearchDataOptions = {},
): Promise<SearchRouteDataResult> {
  const url = new URL(request.url);

  let state: ListingUrlState;
  try {
    state = parseListingUrlState(url.searchParams, "search");
  } catch (error) {
    if (error instanceof ListingUrlStateError) {
      return {
        data: {
          query: null,
          queryIssue: "invalid",
          canonicalSearch: "",
          urlState: {},
          listing: null,
          results: emptyState("no-result"),
          contract: searchContract(),
        },
        setCookies: [],
      };
    }
    throw error;
  }

  if (!state.q) {
    return {
      data: {
        query: null,
        queryIssue: "missing",
        canonicalSearch: serializeListingUrlState(state),
        urlState: state,
        listing: null,
        results: emptyState("first-use"),
        contract: searchContract(),
      },
      setCookies: [],
    };
  }

  const canonicalSearch = serializeListingUrlState(state);
  let bridge: CustomerSessionBridge | undefined;

  try {
    bridge = createCustomerSessionBridge(request, options);
    const result = await bridge.client.request("get", "/search", {
      query: {
        q: state.q,
        ...(state.cursor === undefined ? {} : { cursor: state.cursor }),
        ...(state.limit === undefined ? {} : { limit: state.limit }),
        ...(state.brand === undefined ? {} : { brand: state.brand }),
        ...(state.minPrice === undefined ? {} : { min_price: state.minPrice }),
        ...(state.maxPrice === undefined ? {} : { max_price: state.maxPrice }),
        ...(state.available === undefined ? {} : { available: state.available }),
        ...(state.sort === undefined ? {} : { sort: state.sort }),
      },
    });

    return {
      data: {
        query: result.data.query,
        queryIssue: null,
        canonicalSearch,
        urlState: state,
        listing: result.data,
        results: result.data.items.length === 0
          ? emptyState(hasActiveListingFilters(state) ? "filtered" : "no-result")
          : readyState(result.data),
        contract: searchContract(),
      },
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return {
      data: {
        query: state.q,
        queryIssue: null,
        canonicalSearch,
        urlState: state,
        listing: null,
        results: classifyApiFailureState(error, {
          method: "get",
          connectivity: "unknown",
        }),
        contract: searchContract(),
      },
      setCookies: bridge?.takeSetCookies() ?? [],
    };
  }
}

function searchContract(): SearchRouteData["contract"] {
  return {
    method: "GET",
    path: "/search",
    query: "q/cursor/limit/brand/min_price/max_price/available/sort",
    authority: "backend",
  };
}
