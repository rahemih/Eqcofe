import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export const ADMIN_CATALOG_PAGE_LIMIT = 25;
export const ADMIN_CATALOG_CURSOR_MAX_LENGTH = 2048;

export type AdminCatalogProduct = ApiComponents["schemas"]["AdminProductResponse"];
export type AdminCatalogVariant = ApiComponents["schemas"]["AdminVariantResponse"];
export type AdminCatalogPagination = ApiComponents["schemas"]["CursorPagination"];

export type AdminCatalogPageRead =
  | {
      kind: "ready";
      items: readonly AdminCatalogProduct[];
      pagination: AdminCatalogPagination;
      requestId: string | null;
      setCookies: readonly string[];
    }
  | CatalogReadFailure;

export type AdminCatalogProductRead =
  | {
      kind: "ready";
      product: AdminCatalogProduct;
      variants: readonly AdminCatalogVariant[];
      requestId: string | null;
      setCookies: readonly string[];
    }
  | CatalogReadFailure
  | {
      kind: "not_found";
      requestId: string | null;
      setCookies: readonly string[];
    };

export type CatalogReadFailure =
  | {
      kind: "denied";
      requestId: string | null;
      setCookies: readonly string[];
    }
  | {
      kind: "unavailable";
      requestId: string | null;
      setCookies: readonly string[];
    };

export type CatalogCursorInput =
  | { ok: true; cursor: string | null }
  | { ok: false };

export function normalizeCatalogCursor(value: string | null): CatalogCursorInput {
  if (value === null || value === "") return { ok: true, cursor: null };
  if (value.length > ADMIN_CATALOG_CURSOR_MAX_LENGTH || /[\u0000-\u001f\u007f]/.test(value)) {
    return { ok: false };
  }
  return { ok: true, cursor: value };
}

export async function readAdminCatalogPage(
  request: Pick<Request, "headers">,
  cursor: string | null,
): Promise<AdminCatalogPageRead> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("get", "/admin/products", {
      query: {
        limit: ADMIN_CATALOG_PAGE_LIMIT,
        ...(cursor ? { cursor } : {}),
      },
    });

    return {
      kind: "ready",
      items: Object.freeze([...result.data.items]),
      pagination: Object.freeze({ ...result.data.pagination }),
      requestId: result.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyCatalogReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function readAdminCatalogProduct(
  request: Pick<Request, "headers">,
  productId: string,
): Promise<AdminCatalogProductRead> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const productResult = await bridge.client.request("get", "/admin/products/{id}", {
      pathParams: { id: productId },
    });
    const variantResult = await bridge.client.request("get", "/admin/products/{product_id}/variants", {
      pathParams: { product_id: productId },
    });

    return {
      kind: "ready",
      product: productResult.data,
      variants: Object.freeze([...variantResult.data]),
      requestId: productResult.requestId ?? variantResult.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    if (error instanceof ApiClientError && error.kind === "http" && error.status === 404) {
      return { kind: "not_found", requestId: error.requestId, setCookies };
    }
    return classifyCatalogReadFailure(error, setCookies);
  }
}

function classifyCatalogReadFailure(
  error: unknown,
  setCookies: readonly string[],
): CatalogReadFailure {
  if (
    error instanceof ApiClientError &&
    error.kind === "http" &&
    (error.status === 401 || error.status === 403)
  ) {
    return { kind: "denied", requestId: error.requestId, setCookies };
  }

  return {
    kind: "unavailable",
    requestId: error instanceof ApiClientError ? error.requestId : null,
    setCookies,
  };
}
