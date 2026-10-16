import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

type ProductCreateBody = ApiComponents["schemas"]["ProductCreateRequest"];
type ProductUpdateBody = ApiComponents["schemas"]["ProductUpdateRequest"];
type VariantCreateBody = ApiComponents["schemas"]["PostAdminProductsProductIdVariantsRequest"];
type VariantUpdateBody = ApiComponents["schemas"]["PatchAdminVariantsIdRequest"];
type Product = ApiComponents["schemas"]["AdminProductResponse"];
type Variant = ApiComponents["schemas"]["AdminVariantResponse"];
type FieldError = ApiComponents["schemas"]["FieldError"];

export type CatalogMutationFailure =
  | { kind: "denied"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "conflict"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "invalid"; requestId: string | null; fieldErrors: readonly FieldError[]; setCookies: readonly string[] }
  | { kind: "not_found"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "unknown_outcome"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "unavailable"; requestId: string | null; setCookies: readonly string[] };

export type ProductMutationResult =
  | { kind: "confirmed"; product: Product; variants: readonly Variant[]; requestId: string | null; setCookies: readonly string[] }
  | { kind: "accepted"; product: Product | null; variants: readonly Variant[]; requestId: string | null; setCookies: readonly string[] }
  | CatalogMutationFailure;

export type ProductCreateResult =
  | { kind: "confirmed"; product: Product; variants: readonly Variant[]; requestId: string | null; setCookies: readonly string[] }
  | CatalogMutationFailure;

export type VariantMutationResult = ProductMutationResult;

export async function createAdminProduct(
  request: Pick<Request, "headers">,
  body: ProductCreateBody,
): Promise<ProductCreateResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const created = await bridge.client.request("post", "/admin/products", { body });
    const confirmed = await readProductWithBridge(bridge, created.data.id);
    return {
      kind: "confirmed",
      ...confirmed,
      requestId: created.requestId ?? confirmed.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyMutationFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function updateAdminProduct(
  request: Pick<Request, "headers">,
  productId: string,
  version: number,
  body: ProductUpdateBody,
): Promise<ProductMutationResult> {
  return mutateProduct(request, productId, async (bridge) => {
    const result = await bridge.client.request("patch", "/admin/products/{id}", {
      pathParams: { id: productId },
      headers: { "If-Match": formatIfMatch(version) },
      body,
    });
    return { status: result.status, requestId: result.requestId };
  });
}

export async function publishAdminProduct(
  request: Pick<Request, "headers">,
  productId: string,
): Promise<ProductMutationResult> {
  return mutateProduct(request, productId, async (bridge) => {
    const result = await bridge.client.request("post", "/admin/products/{id}/publish", {
      pathParams: { id: productId },
    });
    return { status: result.status, requestId: result.requestId };
  });
}

export async function archiveAdminProduct(
  request: Pick<Request, "headers">,
  productId: string,
  reason: string,
): Promise<ProductMutationResult> {
  return mutateProduct(request, productId, async (bridge) => {
    const result = await bridge.client.request("post", "/admin/products/{id}/archive", {
      pathParams: { id: productId },
      body: { reason },
    });
    return { status: result.status, requestId: result.requestId };
  });
}

export async function unarchiveAdminProduct(
  request: Pick<Request, "headers">,
  productId: string,
  reason: string | null,
): Promise<ProductMutationResult> {
  return mutateProduct(request, productId, async (bridge) => {
    const result = await bridge.client.request("post", "/admin/products/{id}/unarchive", {
      pathParams: { id: productId },
      body: reason ? { reason } : {},
    });
    return { status: result.status, requestId: result.requestId };
  });
}

export async function stopAdminProductSales(
  request: Pick<Request, "headers">,
  productId: string,
  reason: string | null,
): Promise<ProductMutationResult> {
  return mutateProduct(request, productId, async (bridge) => {
    const result = await bridge.client.request("post", "/admin/products/{id}/stop-sales", {
      pathParams: { id: productId },
      body: { reason_code: "manual", ...(reason ? { reason } : {}) },
    });
    return { status: result.status, requestId: result.requestId };
  });
}

export async function resumeAdminProductSales(
  request: Pick<Request, "headers">,
  productId: string,
  comment: string | null,
): Promise<ProductMutationResult> {
  return mutateProduct(request, productId, async (bridge) => {
    const result = await bridge.client.request("post", "/admin/products/{id}/resume-sales", {
      pathParams: { id: productId },
      body: comment ? { comment } : {},
    });
    return { status: result.status, requestId: result.requestId };
  });
}

export async function createAdminVariant(
  request: Pick<Request, "headers">,
  productId: string,
  body: Omit<VariantCreateBody, "status" | "attributes">,
): Promise<VariantMutationResult> {
  return mutateProduct(request, productId, async (bridge) => {
    const result = await bridge.client.request("post", "/admin/products/{product_id}/variants", {
      pathParams: { product_id: productId },
      body: { ...body, status: "active" },
    });
    return { status: result.status, requestId: result.requestId };
  });
}

export async function updateAdminVariant(
  request: Pick<Request, "headers">,
  productId: string,
  variantId: string,
  version: number,
  body: VariantUpdateBody,
): Promise<VariantMutationResult> {
  return mutateProduct(request, productId, async (bridge) => {
    const result = await bridge.client.request("patch", "/admin/variants/{id}", {
      pathParams: { id: variantId },
      headers: { "If-Match": formatIfMatch(version) },
      body,
    });
    return { status: result.status, requestId: result.requestId };
  });
}

export async function stopAdminVariantSales(
  request: Pick<Request, "headers">,
  productId: string,
  variantId: string,
  reason: string | null,
): Promise<VariantMutationResult> {
  return mutateProduct(request, productId, async (bridge) => {
    const result = await bridge.client.request("post", "/admin/variants/{id}/stop-sales", {
      pathParams: { id: variantId },
      body: { reason_code: "manual", ...(reason ? { reason } : {}) },
    });
    return { status: result.status, requestId: result.requestId };
  });
}

export async function resumeAdminVariantSales(
  request: Pick<Request, "headers">,
  productId: string,
  variantId: string,
  comment: string | null,
): Promise<VariantMutationResult> {
  return mutateProduct(request, productId, async (bridge) => {
    const result = await bridge.client.request("post", "/admin/variants/{id}/resume-sales", {
      pathParams: { id: variantId },
      body: comment ? { comment } : {},
    });
    return { status: result.status, requestId: result.requestId };
  });
}

async function mutateProduct(
  request: Pick<Request, "headers">,
  productId: string,
  mutation: (bridge: ReturnType<typeof createAdminAuthBridge>) => Promise<{ status: number; requestId: string | null }>,
): Promise<ProductMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  let outcome: { status: number; requestId: string | null } | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    outcome = await mutation(bridge);
    const confirmed = await readProductWithBridge(bridge, productId);
    const common = {
      product: confirmed.product,
      variants: confirmed.variants,
      requestId: outcome.requestId ?? confirmed.requestId,
      setCookies: bridge.takeSetCookies(),
    };
    if (outcome.status === 202) {
      return { kind: "accepted", ...common };
    }
    return { kind: "confirmed", ...common };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    if (outcome) {
      return {
        kind: "unknown_outcome",
        requestId: outcome.requestId ?? requestIdFromError(error),
        setCookies,
      };
    }
    return classifyMutationFailure(error, setCookies);
  }
}

async function readProductWithBridge(
  bridge: ReturnType<typeof createAdminAuthBridge>,
  productId: string,
): Promise<{ product: Product; variants: readonly Variant[]; requestId: string | null }> {
  const productResult = await bridge.client.request("get", "/admin/products/{id}", {
    pathParams: { id: productId },
  });
  const variantResult = await bridge.client.request("get", "/admin/products/{product_id}/variants", {
    pathParams: { product_id: productId },
  });
  return {
    product: productResult.data,
    variants: Object.freeze([...variantResult.data]),
    requestId: productResult.requestId ?? variantResult.requestId,
  };
}

function requestIdFromError(error: unknown): string | null {
  return error instanceof ApiClientError ? error.requestId : null;
}

function classifyMutationFailure(
  error: unknown,
  setCookies: readonly string[],
): CatalogMutationFailure {
  if (!(error instanceof ApiClientError)) {
    return { kind: "unknown_outcome", requestId: null, setCookies };
  }

  if (error.kind === "network" || error.kind === "timeout" || error.kind === "aborted") {
    return { kind: "unknown_outcome", requestId: error.requestId, setCookies };
  }

  if (error.kind === "http") {
    if (error.status === 401 || error.status === 403) {
      return { kind: "denied", requestId: error.requestId, setCookies };
    }
    if (error.status === 404) {
      return { kind: "not_found", requestId: error.requestId, setCookies };
    }
    if (error.status === 409) {
      return { kind: "conflict", requestId: error.requestId, setCookies };
    }
    if (error.status === 400 || error.status === 422) {
      return {
        kind: "invalid",
        requestId: error.requestId,
        fieldErrors: Object.freeze([...error.fieldErrors]),
        setCookies,
      };
    }
    if (error.status === 408 || error.status >= 500) {
      return { kind: "unknown_outcome", requestId: error.requestId, setCookies };
    }
  }

  return { kind: "unavailable", requestId: error.requestId, setCookies };
}

export function formatIfMatch(version: number): string {
  if (!Number.isInteger(version) || version < 1) throw new Error("CATALOG_VERSION_INVALID");
  return `"${version}"`;
}
