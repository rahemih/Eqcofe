import type { ApiSuccessData } from "../../platform/api/contract.js";
import type { ApiClientConfig } from "../../platform/api/request.js";
import { ApiClientError } from "../../platform/api/errors.js";
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
import type { CategoryListingResponse } from "../listing/listing-contract.js";
import {
  ListingUrlStateError,
  parseListingUrlState,
  serializeListingUrlState,
} from "../listing/listing-url-state.js";

export type CategoryContextResponse = NonNullable<ApiSuccessData<"get", "/categories/{slug}">>;
export type CategoryRouteIssue = "missing-slug" | "invalid-query" | "not-found" | null;

export type CategoryRouteData = {
  slug: string | null;
  category: CategoryContextResponse | null;
  issue: CategoryRouteIssue;
  canonicalSearch: string;
  products: AsyncSurfaceState<CategoryListingResponse>;
  contract: {
    context: "GET /categories/{slug}";
    products: "GET /categories/{slug}/products";
    query: "cursor/limit";
    authority: "backend";
  };
};

export type LoadCategoryDataOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type CategoryRouteDataResult = {
  data: CategoryRouteData;
  setCookies: readonly string[];
};

export async function loadCategoryRouteData(
  request: Request,
  slug: string | undefined,
  options: LoadCategoryDataOptions = {},
): Promise<CategoryRouteDataResult> {
  if (!slug) {
    return localIssue("missing-slug", null);
  }

  const url = new URL(request.url);
  let queryState;
  try {
    queryState = parseListingUrlState(url.searchParams, "collection");
  } catch (error) {
    if (error instanceof ListingUrlStateError) {
      return localIssue("invalid-query", slug);
    }
    throw error;
  }

  const canonicalSearch = serializeListingUrlState(queryState);
  let bridge: CustomerSessionBridge | undefined;

  try {
    bridge = createCustomerSessionBridge(request, options);
    const contextResult = await bridge.client.request("get", "/categories/{slug}", {
      path: { slug },
    });

    try {
      const productResult = await bridge.client.request("get", "/categories/{slug}/products", {
        path: { slug },
        query: {
          ...(queryState.cursor === undefined ? {} : { cursor: queryState.cursor }),
          ...(queryState.limit === undefined ? {} : { limit: queryState.limit }),
        },
      });

      return {
        data: {
          slug,
          category: contextResult.data,
          issue: null,
          canonicalSearch,
          products: productResult.data.items.length === 0
            ? emptyState("no-result")
            : readyState(productResult.data),
          contract: categoryContract(),
        },
        setCookies: bridge.takeSetCookies(),
      };
    } catch (error) {
      if (isNotFound(error)) {
        return {
          data: {
            slug,
            category: null,
            issue: "not-found",
            canonicalSearch,
            products: emptyState("no-result"),
            contract: categoryContract(),
          },
          setCookies: bridge.takeSetCookies(),
        };
      }

      return {
        data: {
          slug,
          category: contextResult.data,
          issue: null,
          canonicalSearch,
          products: classifyApiFailureState(error, {
            method: "get",
            connectivity: "unknown",
          }),
          contract: categoryContract(),
        },
        setCookies: bridge.takeSetCookies(),
      };
    }
  } catch (error) {
    if (isNotFound(error)) {
      return {
        data: {
          slug,
          category: null,
          issue: "not-found",
          canonicalSearch,
          products: emptyState("no-result"),
          contract: categoryContract(),
        },
        setCookies: bridge?.takeSetCookies() ?? [],
      };
    }

    return {
      data: {
        slug,
        category: null,
        issue: null,
        canonicalSearch,
        products: classifyApiFailureState(error, {
          method: "get",
          connectivity: "unknown",
        }),
        contract: categoryContract(),
      },
      setCookies: bridge?.takeSetCookies() ?? [],
    };
  }
}

function localIssue(
  issue: Exclude<CategoryRouteIssue, "not-found" | null>,
  slug: string | null,
): CategoryRouteDataResult {
  return {
    data: {
      slug,
      category: null,
      issue,
      canonicalSearch: "",
      products: emptyState("no-result"),
      contract: categoryContract(),
    },
    setCookies: [],
  };
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiClientError
    && error.kind === "http"
    && error.status === 404;
}

function categoryContract(): CategoryRouteData["contract"] {
  return {
    context: "GET /categories/{slug}",
    products: "GET /categories/{slug}/products",
    query: "cursor/limit",
    authority: "backend",
  };
}
