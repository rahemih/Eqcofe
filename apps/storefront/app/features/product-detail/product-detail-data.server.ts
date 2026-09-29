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
  RelatedProductCard,
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
  related: AsyncSurfaceState<readonly RelatedProductCard[]>;
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
    related: {
      method: "GET";
      path: "/categories/{slug}/products";
      authority: "backend";
      source: "primary-category";
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

    let related: AsyncSurfaceState<readonly RelatedProductCard[]>;
    try {
      const relatedResult = await bridge.client.request("get", "/categories/{slug}/products", {
        pathParams: { slug: productResult.data.primary_category.slug },
        query: { limit: 5 },
      });
      related = readyState(
        relatedResult.data.items
          .filter((item) => item.id !== productResult.data.id)
          .slice(0, 4),
      );
    } catch (error) {
      related = classifyApiFailureState<readonly RelatedProductCard[]>(error, {
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
        related,
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
        related: classifyApiFailureState<readonly RelatedProductCard[]>(error, {
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
    related: {
      method: "GET",
      path: "/categories/{slug}/products",
      authority: "backend",
      source: "primary-category",
    },
  };
}
