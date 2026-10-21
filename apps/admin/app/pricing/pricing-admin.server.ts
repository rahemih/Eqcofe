import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type BasePriceRecord = ApiComponents["schemas"]["AdminPricingBasePriceRecord"];
export type BasePricePreview = ApiComponents["schemas"]["AdminPricingBasePricePreviewData"];
export type BasePriceCreateBody = ApiComponents["schemas"]["PriceCreateRequest"];
export type BasePricePreviewBody = ApiComponents["schemas"]["PostAdminPricingBasePricesPreviewRequest"];
export type BasePriceMutation = ApiComponents["schemas"]["AdminPricingBasePriceMutationData"];
export type PricingRuleRecord = ApiComponents["schemas"]["AdminPricingRuleRecord"];
export type PricingRuleCreateBody = ApiComponents["schemas"]["PostAdminPricingRulesRequest"];
export type PricingRuleUpdateBody = ApiComponents["schemas"]["PatchAdminPricingRulesIdRequest"];
type FieldError = ApiComponents["schemas"]["FieldError"];

type ReadFailure =
  | { kind: "denied"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "not_found"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "unavailable"; requestId: string | null; setCookies: readonly string[] };

export type BasePriceHistoryRead =
  | {
      kind: "ready";
      records: readonly BasePriceRecord[];
      loadedCount: number;
      filterVariantId: string | null;
      requestId: string | null;
      setCookies: readonly string[];
    }
  | ReadFailure;

export type PricingRuleListRead =
  | {
      kind: "ready";
      rules: readonly PricingRuleRecord[];
      requestId: string | null;
      setCookies: readonly string[];
    }
  | ReadFailure;

export type PricingRuleDetailRead =
  | {
      kind: "ready";
      rule: PricingRuleRecord;
      requestId: string | null;
      setCookies: readonly string[];
    }
  | ReadFailure;

export type BasePricePreviewResult =
  | {
      kind: "preview";
      preview: BasePricePreview;
      requestId: string | null;
      setCookies: readonly string[];
    }
  | {
      kind: "invalid";
      requestId: string | null;
      fieldErrors: readonly FieldError[];
      setCookies: readonly string[];
    }
  | {
      kind: "denied" | "unavailable";
      requestId: string | null;
      setCookies: readonly string[];
    };

export type BasePriceMutationResult =
  | {
      kind: "confirmed";
      mutation: BasePriceMutation;
      requestId: string | null;
      setCookies: readonly string[];
    }
  | PricingMutationFailure;

export type PricingRuleMutationResult =
  | {
      kind: "confirmed";
      rule: PricingRuleRecord;
      requestId: string | null;
      setCookies: readonly string[];
    }
  | PricingMutationFailure;

export type PricingMutationFailure =
  | { kind: "denied"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "conflict"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "not_found"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "invalid"; requestId: string | null; fieldErrors: readonly FieldError[]; setCookies: readonly string[] }
  | { kind: "unknown_outcome"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "unavailable"; requestId: string | null; setCookies: readonly string[] };

export async function readBasePriceHistory(
  request: Pick<Request, "headers">,
  filterVariantId: string | null = null,
): Promise<BasePriceHistoryRead> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("get", "/admin/pricing/base-prices", {});
    const loaded = Object.freeze([...result.data.data]);
    const records = filterVariantId
      ? Object.freeze(loaded.filter((record) => record.variant_id === filterVariantId))
      : loaded;
    return {
      kind: "ready",
      records,
      loadedCount: loaded.length,
      filterVariantId,
      requestId: result.requestId ?? result.data.meta.request_id,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function previewBasePrice(
  request: Pick<Request, "headers">,
  body: BasePricePreviewBody,
): Promise<BasePricePreviewResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("post", "/admin/pricing/base-prices/preview", { body });
    return {
      kind: "preview",
      preview: result.data.data,
      requestId: result.requestId ?? result.data.meta.request_id,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    if (error instanceof ApiClientError && error.kind === "http") {
      if (error.status === 401 || error.status === 403) {
        return { kind: "denied", requestId: error.requestId, setCookies };
      }
      if (error.status === 400 || error.status === 422) {
        return {
          kind: "invalid",
          requestId: error.requestId,
          fieldErrors: Object.freeze([...error.fieldErrors]),
          setCookies,
        };
      }
    }
    return {
      kind: "unavailable",
      requestId: error instanceof ApiClientError ? error.requestId : null,
      setCookies,
    };
  }
}

export async function createVariantBasePrice(
  request: Pick<Request, "headers">,
  variantId: string,
  body: BasePriceCreateBody,
): Promise<BasePriceMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("post", "/admin/variants/{variant_id}/prices", {
      pathParams: { variant_id: variantId },
      body,
    });
    return {
      kind: "confirmed",
      mutation: result.data.data,
      requestId: result.requestId ?? result.data.meta.request_id,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyMutationFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function readPricingRules(
  request: Pick<Request, "headers">,
): Promise<PricingRuleListRead> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("get", "/admin/pricing/rules", {});
    return {
      kind: "ready",
      rules: Object.freeze([...result.data.data]),
      requestId: result.requestId ?? result.data.meta.request_id,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function readPricingRule(
  request: Pick<Request, "headers">,
  ruleId: string,
): Promise<PricingRuleDetailRead> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("get", "/admin/pricing/rules/{id}", {
      pathParams: { id: ruleId },
    });
    return {
      kind: "ready",
      rule: result.data.data,
      requestId: result.requestId ?? result.data.meta.request_id,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function createPricingRule(
  request: Pick<Request, "headers">,
  body: PricingRuleCreateBody,
): Promise<PricingRuleMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("post", "/admin/pricing/rules", { body });
    return {
      kind: "confirmed",
      rule: result.data.data,
      requestId: result.requestId ?? result.data.meta.request_id,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyMutationFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function updatePricingRule(
  request: Pick<Request, "headers">,
  ruleId: string,
  version: number,
  body: PricingRuleUpdateBody,
): Promise<PricingRuleMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("patch", "/admin/pricing/rules/{id}", {
      pathParams: { id: ruleId },
      headers: { "If-Match": formatPricingIfMatch(version) },
      body,
    });
    return {
      kind: "confirmed",
      rule: result.data.data,
      requestId: result.requestId ?? result.data.meta.request_id,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyMutationFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function setPricingRuleStatus(
  request: Pick<Request, "headers">,
  ruleId: string,
  status: "active" | "inactive",
  reason: string | null,
): Promise<PricingRuleMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = status === "active"
      ? await bridge.client.request("post", "/admin/pricing/rules/{id}/activate", {
          pathParams: { id: ruleId },
          body: reason ? { reason } : {},
        })
      : await bridge.client.request("post", "/admin/pricing/rules/{id}/deactivate", {
          pathParams: { id: ruleId },
          body: reason ? { reason } : {},
        });
    return {
      kind: "confirmed",
      rule: result.data.data,
      requestId: result.requestId ?? result.data.meta.request_id,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyMutationFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export function formatPricingIfMatch(version: number): string {
  if (!Number.isSafeInteger(version) || version < 1) throw new Error("PRICING_VERSION_INVALID");
  return `"${version}"`;
}

function classifyReadFailure(error: unknown, setCookies: readonly string[]): ReadFailure {
  if (error instanceof ApiClientError && error.kind === "http") {
    if (error.status === 401 || error.status === 403) {
      return { kind: "denied", requestId: error.requestId, setCookies };
    }
    if (error.status === 404) {
      return { kind: "not_found", requestId: error.requestId, setCookies };
    }
  }
  return {
    kind: "unavailable",
    requestId: error instanceof ApiClientError ? error.requestId : null,
    setCookies,
  };
}

function classifyMutationFailure(
  error: unknown,
  setCookies: readonly string[],
): PricingMutationFailure {
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
    if (error.status === 409 || error.status === 412 || error.status === 428) {
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
    if (error.status === 408 || (typeof error.status === "number" && error.status >= 500)) {
      return { kind: "unknown_outcome", requestId: error.requestId, setCookies };
    }
  }
  return { kind: "unavailable", requestId: error.requestId, setCookies };
}
