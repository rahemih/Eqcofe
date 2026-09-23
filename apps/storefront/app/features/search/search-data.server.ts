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
  parseListingUrlState,
  serializeListingUrlState,
} from "../listing/listing-url-state.js";
import type { SearchListingResponse } from "../listing/listing-contract.js";

export type SearchQueryIssue = "missing" | "invalid" | null;

export type SearchRouteData = {
  query: string | null;
  queryIssue: SearchQueryIssue;
  canonicalSearch: string;
  results: AsyncSurfaceState<SearchListingResponse>;
  contract: {
    method: "GET";
    path: "/search";
    query: "q/cursor/limit";
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

  let state;
  try {
    state = parseListingUrlState(url.searchParams, "search");
  } catch (error) {
    if (error instanceof ListingUrlStateError) {
      return {
        data: {
          query: null,
          queryIssue: "invalid",
          canonicalSearch: "",
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
      },
    });

    return {
      data: {
        query: result.data.query,
        queryIssue: null,
        canonicalSearch,
        results: result.data.items.length === 0
          ? emptyState("no-result")
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
    query: "q/cursor/limit",
    authority: "backend",
  };
}
