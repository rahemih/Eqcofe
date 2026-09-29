import type { ApiClientConfig } from "../../platform/api/request.js";
import {
  createCustomerSessionBridge,
  type CustomerSessionBridge,
} from "../../platform/auth/session-cookie.server.js";
import {
  classifyApiFailureState,
  readyState,
  type AsyncSurfaceState,
} from "../../platform/state/surface-state.js";
import type { ProductDetailResponse } from "./product-detail-contract.js";

export type ProductDetailRouteData = {
  product: AsyncSurfaceState<ProductDetailResponse>;
  contract: {
    method: "GET";
    path: "/products/{slug}";
    authority: "backend";
  };
};

export type LoadProductDetailOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type ProductDetailRouteDataResult = {
  data: ProductDetailRouteData;
  setCookies: readonly string[];
};

export async function loadProductDetailFoundation(
  request: Pick<Request, "headers">,
  slug: string,
  options: LoadProductDetailOptions = {},
): Promise<ProductDetailRouteDataResult> {
  let bridge: CustomerSessionBridge | undefined;

  try {
    bridge = createCustomerSessionBridge(request, options);
    const result = await bridge.client.request("get", "/products/{slug}", {
      pathParams: { slug },
    });

    return {
      data: {
        product: readyState(result.data),
        contract: productDetailContract(),
      },
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return {
      data: {
        product: classifyApiFailureState(error, {
          method: "get",
          connectivity: "unknown",
        }),
        contract: productDetailContract(),
      },
      setCookies: bridge?.takeSetCookies() ?? [],
    };
  }
}

function productDetailContract(): ProductDetailRouteData["contract"] {
  return {
    method: "GET",
    path: "/products/{slug}",
    authority: "backend",
  };
}
