import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";
import { formatIfMatch } from "./catalog-mutation.server.js";

export type AdminBrand = ApiComponents["schemas"]["AdminBrandResponse"];
export type AdminCategory = ApiComponents["schemas"]["AdminCategoryResponse"];
export type AdminAttribute = ApiComponents["schemas"]["AdminAttributeResponse"];
export type AdminAttributeValue = ApiComponents["schemas"]["AdminAttributeValueResponse"];
export type AdminAttributeAssignment = ApiComponents["schemas"]["AdminAttributeAssignmentView"];
export type AdminProduct = ApiComponents["schemas"]["AdminProductResponse"];
export type AdminVariant = ApiComponents["schemas"]["AdminVariantResponse"];
export type BrandCreateBody = ApiComponents["schemas"]["PostAdminBrandsRequest"];
export type BrandUpdateBody = ApiComponents["schemas"]["PatchAdminBrandsIdRequest"];
export type CategoryCreateBody = ApiComponents["schemas"]["PostAdminCategoriesRequest"];
export type CategoryUpdateBody = ApiComponents["schemas"]["PatchAdminCategoriesIdRequest"];
export type AttributeCreateBody = ApiComponents["schemas"]["CreateCatalogAttributeRequest"];
export type AttributeUpdateBody = ApiComponents["schemas"]["UpdateCatalogAttributeRequest"];
export type AttributeValueCreateBody = ApiComponents["schemas"]["CreateCatalogAttributeValueRequest"];
export type AttributeValueUpdateBody = ApiComponents["schemas"]["UpdateCatalogAttributeValueRequest"];
export type AttributeAssignmentInput = ApiComponents["schemas"]["CatalogAttributeAssignment"];
type FieldError = ApiComponents["schemas"]["FieldError"];

type ReadFailure =
  | { kind: "denied"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "not_found"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "unavailable"; requestId: string | null; setCookies: readonly string[] };

export type StructureListRead<T> =
  | { kind: "ready"; items: readonly T[]; requestId: string | null; setCookies: readonly string[] }
  | ReadFailure;

export type AttributeStructureRead =
  | {
      kind: "ready";
      attributes: readonly AdminAttribute[];
      selectedAttributeId: string | null;
      values: readonly AdminAttributeValue[];
      requestId: string | null;
      setCookies: readonly string[];
    }
  | ReadFailure;

export type AssignmentRead =
  | {
      kind: "ready";
      assignments: readonly AdminAttributeAssignment[];
      requestId: string | null;
      setCookies: readonly string[];
    }
  | ReadFailure;

export type StructureMutationResult =
  | { kind: "confirmed" | "accepted"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "denied" | "conflict" | "not_found" | "unknown_outcome" | "unavailable"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "invalid"; requestId: string | null; fieldErrors: readonly FieldError[]; setCookies: readonly string[] };

export async function readAdminBrands(request: Pick<Request, "headers">): Promise<StructureListRead<AdminBrand>> {
  return readList(request, (bridge) => bridge.client.request("get", "/admin/brands", {}));
}

export async function readAdminCategories(request: Pick<Request, "headers">): Promise<StructureListRead<AdminCategory>> {
  return readList(request, (bridge) => bridge.client.request("get", "/admin/categories", {}));
}

export async function readAdminAttributes(
  request: Pick<Request, "headers">,
  options: { categoryId?: string; selectedAttributeId?: string | null } = {},
): Promise<AttributeStructureRead> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const list = await bridge.client.request("get", "/admin/attributes", {
      query: options.categoryId ? { category_id: options.categoryId } : {},
    });
    const selectedAttributeId = options.selectedAttributeId ?? null;
    let values: readonly AdminAttributeValue[] = [];
    let requestId = list.requestId;
    if (selectedAttributeId) {
      if (!list.data.some((attribute) => attribute.id === selectedAttributeId)) {
        return { kind: "not_found", requestId, setCookies: bridge.takeSetCookies() };
      }
      const result = await bridge.client.request("get", "/admin/attributes/{id}/values", {
        pathParams: { id: selectedAttributeId },
      });
      values = Object.freeze([...result.data]);
      requestId = requestId ?? result.requestId;
    }
    return {
      kind: "ready",
      attributes: Object.freeze([...list.data]),
      selectedAttributeId,
      values,
      requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export type AssignmentWorkspaceRead =
  | {
      kind: "ready";
      product: AdminProduct;
      variants: readonly AdminVariant[];
      target: { type: "product"; id: string } | { type: "variant"; id: string };
      attributes: readonly (AdminAttribute & { values: readonly AdminAttributeValue[] })[];
      assignments: readonly AdminAttributeAssignment[];
      requestId: string | null;
      setCookies: readonly string[];
    }
  | ReadFailure;

export async function readAdminAssignmentWorkspace(
  request: Pick<Request, "headers">,
  productId: string,
  requestedVariantId: string | null,
): Promise<AssignmentWorkspaceRead> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const productResult = await bridge.client.request("get", "/admin/products/{id}", {
      pathParams: { id: productId },
    });
    const variantResult = await bridge.client.request("get", "/admin/products/{product_id}/variants", {
      pathParams: { product_id: productId },
    });
    const variants = Object.freeze([...variantResult.data]);
    const target = requestedVariantId
      ? { type: "variant" as const, id: requestedVariantId }
      : { type: "product" as const, id: productId };
    if (requestedVariantId && !variants.some((variant) => variant.id === requestedVariantId)) {
      return { kind: "not_found", requestId: productResult.requestId ?? variantResult.requestId, setCookies: bridge.takeSetCookies() };
    }

    const attributeResult = await bridge.client.request("get", "/admin/attributes", {
      query: { category_id: productResult.data.primary_category.id },
    });
    const eligible = attributeResult.data.filter((attribute) =>
      target.type === "variant" ? attribute.is_variant_attribute : !attribute.is_variant_attribute
    );
    const attributes: Array<AdminAttribute & { values: readonly AdminAttributeValue[] }> = [];
    let requestId = productResult.requestId ?? variantResult.requestId ?? attributeResult.requestId;
    for (const attribute of eligible) {
      const values = await bridge.client.request("get", "/admin/attributes/{id}/values", {
        pathParams: { id: attribute.id },
      });
      requestId = requestId ?? values.requestId;
      attributes.push({ ...attribute, values: Object.freeze([...values.data]) });
    }

    const assignmentResult = target.type === "product"
      ? await bridge.client.request("get", "/admin/products/{product_id}/attributes", { pathParams: { product_id: target.id } })
      : await bridge.client.request("get", "/admin/variants/{id}/attributes", { pathParams: { id: target.id } });
    requestId = requestId ?? assignmentResult.requestId;

    return {
      kind: "ready",
      product: productResult.data,
      variants,
      target,
      attributes: Object.freeze(attributes),
      assignments: Object.freeze([...assignmentResult.data]),
      requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function readAdminAssignments(
  request: Pick<Request, "headers">,
  target: { type: "product"; id: string } | { type: "variant"; id: string },
): Promise<AssignmentRead> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = target.type === "product"
      ? await bridge.client.request("get", "/admin/products/{product_id}/attributes", { pathParams: { product_id: target.id } })
      : await bridge.client.request("get", "/admin/variants/{id}/attributes", { pathParams: { id: target.id } });
    return {
      kind: "ready",
      assignments: Object.freeze([...result.data]),
      requestId: result.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function readAssignmentOptions(
  request: Pick<Request, "headers">,
  categoryId: string,
  targetType: "product" | "variant",
): Promise<
  | { kind: "ready"; attributes: readonly (AdminAttribute & { values: readonly AdminAttributeValue[] })[]; requestId: string | null; setCookies: readonly string[] }
  | ReadFailure
> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const list = await bridge.client.request("get", "/admin/attributes", { query: { category_id: categoryId } });
    const eligible = list.data.filter((attribute) =>
      targetType === "variant" ? attribute.is_variant_attribute : !attribute.is_variant_attribute
    );
    const withValues: Array<AdminAttribute & { values: readonly AdminAttributeValue[] }> = [];
    let requestId = list.requestId;
    for (const attribute of eligible) {
      const values = await bridge.client.request("get", "/admin/attributes/{id}/values", {
        pathParams: { id: attribute.id },
      });
      requestId = requestId ?? values.requestId;
      withValues.push({ ...attribute, values: Object.freeze([...values.data]) });
    }
    return {
      kind: "ready",
      attributes: Object.freeze(withValues),
      requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function createAdminBrand(request: Pick<Request, "headers">, body: BrandCreateBody) {
  return mutateAndConfirm(request,
    (bridge) => bridge.client.request("post", "/admin/brands", { body }),
    (bridge) => bridge.client.request("get", "/admin/brands", {}),
  );
}
export async function updateAdminBrand(request: Pick<Request, "headers">, id: string, version: number, body: BrandUpdateBody) {
  return mutateAndConfirm(request,
    (bridge) => bridge.client.request("patch", "/admin/brands/{id}", { pathParams: { id }, headers: { "If-Match": formatIfMatch(version) }, body }),
    (bridge) => bridge.client.request("get", "/admin/brands", {}),
  );
}
export async function setAdminBrandSales(request: Pick<Request, "headers">, id: string, enabled: boolean, note: string | null) {
  return mutateAndConfirm(request,
    (bridge) => enabled
      ? bridge.client.request("post", "/admin/brands/{id}/resume-sales", { pathParams: { id }, body: note ? { comment: note } : {} })
      : bridge.client.request("post", "/admin/brands/{id}/stop-sales", { pathParams: { id }, body: { reason_code: "manual", ...(note ? { reason: note } : {}) } }),
    (bridge) => bridge.client.request("get", "/admin/brands", {}),
  );
}

export async function createAdminCategory(request: Pick<Request, "headers">, body: CategoryCreateBody) {
  return mutateAndConfirm(request,
    (bridge) => bridge.client.request("post", "/admin/categories", { body }),
    (bridge) => bridge.client.request("get", "/admin/categories", {}),
  );
}
export async function updateAdminCategory(request: Pick<Request, "headers">, id: string, version: number, body: CategoryUpdateBody) {
  return mutateAndConfirm(request,
    (bridge) => bridge.client.request("patch", "/admin/categories/{id}", { pathParams: { id }, headers: { "If-Match": formatIfMatch(version) }, body }),
    (bridge) => bridge.client.request("get", "/admin/categories", {}),
  );
}
export async function setAdminCategorySales(request: Pick<Request, "headers">, id: string, enabled: boolean, note: string | null) {
  return mutateAndConfirm(request,
    (bridge) => enabled
      ? bridge.client.request("post", "/admin/categories/{id}/resume-sales", { pathParams: { id }, body: note ? { comment: note } : {} })
      : bridge.client.request("post", "/admin/categories/{id}/stop-sales", { pathParams: { id }, body: { reason_code: "manual", ...(note ? { reason: note } : {}) } }),
    (bridge) => bridge.client.request("get", "/admin/categories", {}),
  );
}

export async function createAdminAttribute(request: Pick<Request, "headers">, body: AttributeCreateBody) {
  return mutateAndConfirm(request,
    (bridge) => bridge.client.request("post", "/admin/attributes", { body }),
    (bridge) => bridge.client.request("get", "/admin/attributes", {}),
  );
}
export async function updateAdminAttribute(request: Pick<Request, "headers">, id: string, version: number, body: AttributeUpdateBody) {
  return mutateAndConfirm(request,
    (bridge) => bridge.client.request("patch", "/admin/attributes/{id}", { pathParams: { id }, headers: { "If-Match": formatIfMatch(version) }, body }),
    (bridge) => bridge.client.request("get", "/admin/attributes", {}),
  );
}
export async function createAdminAttributeValue(request: Pick<Request, "headers">, attributeId: string, body: AttributeValueCreateBody) {
  return mutateAndConfirm(request,
    (bridge) => bridge.client.request("post", "/admin/attributes/{id}/values", { pathParams: { id: attributeId }, body }),
    (bridge) => bridge.client.request("get", "/admin/attributes/{id}/values", { pathParams: { id: attributeId } }),
  );
}
export async function updateAdminAttributeValue(request: Pick<Request, "headers">, attributeId: string, valueId: string, version: number, body: AttributeValueUpdateBody) {
  return mutateAndConfirm(request,
    (bridge) => bridge.client.request("patch", "/admin/attribute-values/{id}", { pathParams: { id: valueId }, headers: { "If-Match": formatIfMatch(version) }, body }),
    (bridge) => bridge.client.request("get", "/admin/attributes/{id}/values", { pathParams: { id: attributeId } }),
  );
}

export async function setAdminAssignments(
  request: Pick<Request, "headers">,
  parentProductId: string,
  target: { type: "product"; id: string } | { type: "variant"; id: string },
  values: readonly AttributeAssignmentInput[],
): Promise<StructureMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  let outcome: { status: number; requestId: string | null } | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    if (target.type === "product") {
      if (target.id !== parentProductId) {
        return { kind: "not_found", requestId: null, setCookies: bridge.takeSetCookies() };
      }
      await bridge.client.request("get", "/admin/products/{id}", { pathParams: { id: parentProductId } });
      outcome = await bridge.client.request("put", "/admin/products/{product_id}/attributes", {
        pathParams: { product_id: parentProductId },
        body: { values: [...values] },
      });
      await bridge.client.request("get", "/admin/products/{product_id}/attributes", {
        pathParams: { product_id: parentProductId },
      });
    } else {
      const variants = await bridge.client.request("get", "/admin/products/{product_id}/variants", {
        pathParams: { product_id: parentProductId },
      });
      if (!variants.data.some((variant) => variant.id === target.id)) {
        return { kind: "not_found", requestId: variants.requestId, setCookies: bridge.takeSetCookies() };
      }
      outcome = await bridge.client.request("put", "/admin/variants/{id}/attributes", {
        pathParams: { id: target.id },
        body: { values: [...values] },
      });
      await bridge.client.request("get", "/admin/variants/{id}/attributes", { pathParams: { id: target.id } });
    }
    return {
      kind: outcome.status === 202 ? "accepted" : "confirmed",
      requestId: outcome.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    if (outcome) return { kind: "unknown_outcome", requestId: outcome.requestId ?? requestIdFrom(error), setCookies };
    return classifyMutationFailure(error, setCookies);
  }
}

async function readList<T>(
  request: Pick<Request, "headers">,
  reader: (bridge: ReturnType<typeof createAdminAuthBridge>) => Promise<{ data: T[]; requestId: string | null }>,
): Promise<StructureListRead<T>> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await reader(bridge);
    return { kind: "ready", items: Object.freeze([...result.data]), requestId: result.requestId, setCookies: bridge.takeSetCookies() };
  } catch (error) {
    return classifyReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

async function mutateAndConfirm(
  request: Pick<Request, "headers">,
  mutation: (bridge: ReturnType<typeof createAdminAuthBridge>) => Promise<{ status: number; requestId: string | null }>,
  reread: (bridge: ReturnType<typeof createAdminAuthBridge>) => Promise<unknown>,
): Promise<StructureMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  let outcome: { status: number; requestId: string | null } | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    outcome = await mutation(bridge);
    await reread(bridge);
    return {
      kind: outcome.status === 202 ? "accepted" : "confirmed",
      requestId: outcome.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    if (outcome) return { kind: "unknown_outcome", requestId: outcome.requestId ?? requestIdFrom(error), setCookies };
    return classifyMutationFailure(error, setCookies);
  }
}

function classifyReadFailure(error: unknown, setCookies: readonly string[]): ReadFailure {
  if (error instanceof ApiClientError && error.kind === "http") {
    if (error.status === 401 || error.status === 403) return { kind: "denied", requestId: error.requestId, setCookies };
    if (error.status === 404) return { kind: "not_found", requestId: error.requestId, setCookies };
  }
  return { kind: "unavailable", requestId: requestIdFrom(error), setCookies };
}

function classifyMutationFailure(error: unknown, setCookies: readonly string[]): StructureMutationResult {
  if (!(error instanceof ApiClientError)) return { kind: "unknown_outcome", requestId: null, setCookies };
  if (error.kind === "network" || error.kind === "timeout" || error.kind === "aborted") {
    return { kind: "unknown_outcome", requestId: error.requestId, setCookies };
  }
  if (error.kind === "http") {
    if (error.status === 401 || error.status === 403) return { kind: "denied", requestId: error.requestId, setCookies };
    if (error.status === 404) return { kind: "not_found", requestId: error.requestId, setCookies };
    if (error.status === 409) return { kind: "conflict", requestId: error.requestId, setCookies };
    if (error.status === 400 || error.status === 422) {
      return { kind: "invalid", requestId: error.requestId, fieldErrors: Object.freeze([...error.fieldErrors]), setCookies };
    }
    if (error.status === 408 || (typeof error.status === "number" && error.status >= 500)) {
      return { kind: "unknown_outcome", requestId: error.requestId, setCookies };
    }
  }
  return { kind: "unavailable", requestId: error.requestId, setCookies };
}

function requestIdFrom(error: unknown): string | null {
  return error instanceof ApiClientError ? error.requestId : null;
}
