import type { ApiSuccessData } from "../../platform/api/contract.js";
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

export type ArticleDetailResponse = NonNullable<ApiSuccessData<"get", "/articles/{slug}">>;
export type ArticleRelatedResponse = NonNullable<ApiSuccessData<"get", "/articles/{slug}/related">>;

export type ArticleDetailRouteData = {
  article: AsyncSurfaceState<ArticleDetailResponse>;
  related: AsyncSurfaceState<ArticleRelatedResponse>;
};

export type ArticleDetailResult = {
  data: ArticleDetailRouteData;
  setCookies: readonly string[];
};

export async function loadArticleDetailRouteData(
  request: Request,
  slugRaw: string | undefined,
  options: { config?: ApiClientConfig; fetchImpl?: typeof fetch } = {},
): Promise<ArticleDetailResult> {
  const slug = normalizeSlug(slugRaw);
  if (!slug) throw new Response("Not Found", { status: 404 });

  let bridge: CustomerSessionBridge | undefined;
  try {
    bridge = createCustomerSessionBridge(request, options);
    const detail = await bridge.client.request("get", "/articles/{slug}", {
      pathParams: { slug },
    });

    let related: AsyncSurfaceState<ArticleRelatedResponse>;
    try {
      const response = await bridge.client.request("get", "/articles/{slug}/related", {
        pathParams: { slug },
        query: { limit: 6 },
      });
      related = readyState(response.data);
    } catch (error) {
      related = classifyApiFailureState(error, { method: "get", connectivity: "unknown" });
    }

    return {
      data: { article: readyState(detail.data), related },
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return {
      data: {
        article: classifyApiFailureState(error, { method: "get", connectivity: "unknown" }),
        related: classifyApiFailureState(error, { method: "get", connectivity: "unknown" }),
      },
      setCookies: bridge?.takeSetCookies() ?? [],
    };
  }
}

function normalizeSlug(value: string | undefined): string | null {
  const slug = String(value ?? "").trim().toLowerCase();
  return slug && slug.length <= 180 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}
