import type { ApiClientConfig } from "../../platform/api/request.js";
import { readServerMediaConfig } from "../../platform/config/api.server.js";
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
import {
  PRODUCT_MEDIA_CAPABILITIES,
  type ProductMediaCapabilities,
  type ResolvedProductMedia,
} from "./product-detail-media.js";
import { resolveProductMedia } from "./product-detail-media.server.js";

export type ProductDetailRouteData = {
  product: AsyncSurfaceState<ProductDetailResponse>;
  variants: AsyncSurfaceState<ProductVariantsResponse>;
  media: readonly ResolvedProductMedia[];
  mediaCapabilities: ProductMediaCapabilities;
  contract: {
    method: "GET";
    path: "/products/{slug}";
    authority: "backend";
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
  mediaPublicBaseUrl?: string | null;
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

    const mediaBaseUrl = options.mediaPublicBaseUrl === undefined
      ? safeReadMediaBaseUrl()
      : options.mediaPublicBaseUrl;

    return {
      data: {
        product: readyState(productResult.data),
        variants,
        media: resolveProductMedia(productResult.data.media, mediaBaseUrl),
        mediaCapabilities: PRODUCT_MEDIA_CAPABILITIES,
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
        media: [],
        mediaCapabilities: PRODUCT_MEDIA_CAPABILITIES,
        contract: productDetailContract(),
      },
      setCookies: bridge?.takeSetCookies() ?? [],
    };
  }
}

function safeReadMediaBaseUrl(): string | null {
  try {
    return readServerMediaConfig().publicBaseUrl;
  } catch {
    return null;
  }
}

function productDetailContract(): ProductDetailRouteData["contract"] {
  return {
    method: "GET",
    path: "/products/{slug}",
    authority: "backend",
    variants: {
      method: "GET",
      path: "/products/{slug}/variants",
      authority: "backend",
    },
  };
}
