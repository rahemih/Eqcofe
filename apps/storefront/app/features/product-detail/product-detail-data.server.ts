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
import type {
  ProductDetailResponse,
  ProductVariantsResponse,
} from "./product-detail-contract.js";

export type ProductDetailRouteData = {
  product: AsyncSurfaceState<ProductDetailResponse>;
  variants: AsyncSurfaceState<ProductVariantsResponse>;
  contract: {
    product: {
      method: "GET";
      path: "/products/{slug}";
      authority: "backend";
    };
    variants: {
      method: "GET";
      path: "/products/{slug}/variants";
      authority: "backend";
    };
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
    const productResult = await bridge.client.request("get", "/products/{slug}", {
      pathParams: { slug },
    });

    let variants: AsyncSurfaceState<ProductVariantsResponse>;
    try {
      const variantResult = await bridge.client.request("get", "/products/{slug}/variants", {
        pathParams: { slug },
      });
      variants = readyState(variantResult.data);
    } catch (error) {
      variants = classifyApiFailureState(error, {
        method: "get",
        connectivity: "unknown",
      });
    }

    return {
      data: {
        product: readyState(productResult.data),
        variants,
        contract: productDetailContract(),
      },
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const failure = classifyApiFailureState<ProductDetailResponse>(error, {
      method: "get",
      connectivity: "unknown",
    });
    return {
      data: {
        product: failure,
        variants: classifyApiFailureState<ProductVariantsResponse>(error, {
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
    product: {
      method: "GET",
      path: "/products/{slug}",
      authority: "backend",
    },
    variants: {
      method: "GET",
      path: "/products/{slug}/variants",
      authority: "backend",
    },
  };
}
