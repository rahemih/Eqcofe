import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

type Brand = ApiComponents["schemas"]["AdminBrandResponse"];
type Category = ApiComponents["schemas"]["AdminCategoryResponse"];

export type CatalogReferenceRead = {
  brands: readonly Brand[] | null;
  categories: readonly Category[] | null;
  requestId: string | null;
  setCookies: readonly string[];
};

export async function readCatalogReferences(
  request: Pick<Request, "headers">,
): Promise<CatalogReferenceRead> {
  const bridge = createAdminAuthBridge(request);
  let requestId: string | null = null;

  const brands = await safeRead(async () => {
    const result = await bridge.client.request("get", "/admin/brands", {});
    requestId ??= result.requestId;
    return result.data;
  });

  const categories = await safeRead(async () => {
    const result = await bridge.client.request("get", "/admin/categories", {});
    requestId ??= result.requestId;
    return result.data;
  });

  return {
    brands: brands ? Object.freeze([...brands]) : null,
    categories: categories ? Object.freeze([...categories]) : null,
    requestId,
    setCookies: bridge.takeSetCookies(),
  };
}

async function safeRead<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      error.kind === "http" &&
      (error.status === 401 || error.status === 403 || error.status === 404)
    ) {
      return null;
    }
    if (
      error instanceof ApiClientError &&
      (error.kind === "network" || error.kind === "timeout" || error.kind === "aborted")
    ) {
      return null;
    }
    return null;
  }
}
