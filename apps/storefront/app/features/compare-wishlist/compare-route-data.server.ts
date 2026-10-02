import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import {
  classifyApiFailureState,
  emptyState,
  readyState,
} from "../../platform/state/surface-state.js";
import {
  loadCompare,
  validateCompare,
  type CompareWishlistDataOptions,
} from "./compare-wishlist-data.server.js";
import type {
  CompareResponse,
  CompareValidateResponse,
} from "./compare-wishlist-contract.js";
import {
  CompareUrlStateError,
  parseCompareUrlState,
  serializeCompareUrlState,
  type CompareUrlState,
} from "./compare-url-state.js";

export type CompareQueryIssue = {
  code: CompareUrlStateError["code"];
};

export type CompareRouteData = {
  urlState: CompareUrlState;
  canonicalSearch: string;
  queryIssue: CompareQueryIssue | null;
  validation: AsyncSurfaceState<CompareValidateResponse>;
  comparison: AsyncSurfaceState<CompareResponse>;
};

export type CompareRouteDataResult = {
  data: CompareRouteData;
  setCookies: readonly string[];
};

export async function loadCompareRouteData(
  request: Request,
  options: CompareWishlistDataOptions = {},
): Promise<CompareRouteDataResult> {
  let urlState: CompareUrlState;
  try {
    urlState = parseCompareUrlState(new URL(request.url).searchParams);
  } catch (error) {
    if (!(error instanceof CompareUrlStateError)) throw error;
    return {
      data: {
        urlState: { productIds: [] },
        canonicalSearch: "",
        queryIssue: { code: error.code },
        validation: emptyState("first-use"),
        comparison: emptyState("first-use"),
      },
      setCookies: [],
    };
  }

  const canonicalSearch = serializeCompareUrlState(urlState);
  if (urlState.productIds.length < 2) {
    return {
      data: {
        urlState,
        canonicalSearch,
        queryIssue: null,
        validation: emptyState("first-use"),
        comparison: emptyState("first-use"),
      },
      setCookies: [],
    };
  }

  const body = { product_ids: urlState.productIds };
  const setCookies: string[] = [];

  try {
    const validation = await validateCompare(request, { body }, options);
    setCookies.push(...validation.setCookies);

    const comparison = await loadCompare(request, { body }, options);
    setCookies.push(...comparison.setCookies);

    return {
      data: {
        urlState,
        canonicalSearch,
        queryIssue: null,
        validation: readyState(validation.data),
        comparison: readyState(comparison.data),
      },
      setCookies,
    };
  } catch (error) {
    const failureValidation = classifyApiFailureState<CompareValidateResponse>(error, {
      method: "post",
      connectivity: "unknown",
    });
    const failureComparison = classifyApiFailureState<CompareResponse>(error, {
      method: "post",
      connectivity: "unknown",
    });
    return {
      data: {
        urlState,
        canonicalSearch,
        queryIssue: null,
        validation: failureValidation,
        comparison: failureComparison,
      },
      setCookies,
    };
  }
}
