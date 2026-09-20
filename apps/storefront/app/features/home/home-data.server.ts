import type { ApiSuccessData } from "../../platform/api/contract.js";
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

export type HomeProductList = NonNullable<ApiSuccessData<"get", "/products">>;

export type HomeRouteData = {
  productPreview: AsyncSurfaceState<HomeProductList>;
  contract: {
    method: "GET";
    path: "/products";
    query: "backend-default";
    authority: "backend";
  };
};

export type LoadHomeDataOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type HomeRouteDataResult = {
  data: HomeRouteData;
  setCookies: readonly string[];
};

export async function loadHomeRouteData(
  request: Pick<Request, "headers">,
  options: LoadHomeDataOptions = {},
): Promise<HomeRouteDataResult> {
  let bridge: CustomerSessionBridge | undefined;

  try {
    bridge = createCustomerSessionBridge(request, options);
    const result = await bridge.client.request("get", "/products", {});

    return {
      data: {
        productPreview: result.data.items.length === 0
          ? emptyState("first-use")
          : readyState(result.data),
        contract: homeContract(),
      },
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return {
      data: {
        productPreview: classifyApiFailureState(error, {
          method: "get",
          connectivity: "unknown",
        }),
        contract: homeContract(),
      },
      setCookies: bridge?.takeSetCookies() ?? [],
    };
  }
}

function homeContract(): HomeRouteData["contract"] {
  return {
    method: "GET",
    path: "/products",
    query: "backend-default",
    authority: "backend",
  };
}
