import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export const STEP69_FOUNDATION_SURFACES = [
  "AD-D-01",
  "AD-D-02",
  "AD-D-03",
  "AD-D-04",
  "AD-D-05",
  "AD-D-19",
  "AD-D-20",
  "AD-D-21",
] as const;

export type Step69FoundationSurface = (typeof STEP69_FOUNDATION_SURFACES)[number];

type BasePrice = ApiComponents["schemas"]["AdminPricingBasePriceRecord"];
type PricingRule = ApiComponents["schemas"]["AdminPricingRuleRecord"];
type CurrencyRate = ApiComponents["schemas"]["AdminPricingCurrencyRateRecord"];
type CurrencyRule = ApiComponents["schemas"]["AdminPricingCurrencyRuleRecord"];
type ExcelTemplate = ApiComponents["schemas"]["ExcelWorkbookTemplate"];

type ReadCommon = {
  requestId: string | null;
  setCookies: readonly string[];
};

export type Step69FoundationRead =
  | ({ kind: "ready"; surface: "AD-D-01"; records: readonly BasePrice[] } & ReadCommon)
  | ({ kind: "ready"; surface: "AD-D-02"; records: readonly PricingRule[] } & ReadCommon)
  | ({ kind: "ready"; surface: "AD-D-04"; records: readonly CurrencyRate[]; current: CurrencyRate | null } & ReadCommon)
  | ({ kind: "ready"; surface: "AD-D-05"; records: readonly CurrencyRule[] } & ReadCommon)
  | ({ kind: "ready"; surface: "AD-D-19"; template: ExcelTemplate } & ReadCommon)
  | ({ kind: "action_only"; surface: "AD-D-03" | "AD-D-20" | "AD-D-21"; reason: string } & ReadCommon)
  | ({ kind: "denied"; surface: Step69FoundationSurface } & ReadCommon)
  | ({ kind: "unavailable"; surface: Step69FoundationSurface } & ReadCommon);

export function isStep69FoundationSurface(value: string): value is Step69FoundationSurface {
  return (STEP69_FOUNDATION_SURFACES as readonly string[]).includes(value);
}

export async function readStep69Foundation(
  request: Pick<Request, "headers">,
  surface: Step69FoundationSurface,
): Promise<Step69FoundationRead> {
  if (surface === "AD-D-03") {
    return {
      kind: "action_only",
      surface,
      reason: "وضعیت اعمال گروهی فقط با شناسهٔ عملیات معتبر قابل خواندن است؛ فهرست عمومی عملیات در قرارداد مرجع وجود ندارد.",
      requestId: null,
      setCookies: [],
    };
  }
  if (surface === "AD-D-20" || surface === "AD-D-21") {
    return {
      kind: "action_only",
      surface,
      reason: "برای این مقصد فقط پیش‌نمایش و اعمال منبع‌اثبات‌شده وجود دارد و endpoint خواندن مستقل تعریف نشده است؛ عملیات در مرحلهٔ 69-G افزوده می‌شود.",
      requestId: null,
      setCookies: [],
    };
  }

  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);

    if (surface === "AD-D-01") {
      const response = await bridge.client.request("get", "/admin/pricing/base-prices", {});
      return {
        kind: "ready",
        surface,
        records: Object.freeze([...response.data.data]),
        requestId: response.requestId ?? response.data.meta.request_id,
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (surface === "AD-D-02") {
      const response = await bridge.client.request("get", "/admin/pricing/rules", {});
      return {
        kind: "ready",
        surface,
        records: Object.freeze([...response.data.data]),
        requestId: response.requestId ?? response.data.meta.request_id,
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (surface === "AD-D-04") {
      const rates = await bridge.client.request("get", "/admin/pricing/currency-rates", {});
      const current = await bridge.client.request("get", "/admin/pricing/currency-rates/current", {});
      return {
        kind: "ready",
        surface,
        records: Object.freeze([...rates.data.data]),
        current: current.data.data ? Object.freeze({ ...current.data.data }) : null,
        requestId:
          rates.requestId ??
          current.requestId ??
          rates.data.meta.request_id ??
          current.data.meta.request_id,
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (surface === "AD-D-05") {
      const response = await bridge.client.request("get", "/admin/pricing/currency-rules", {});
      return {
        kind: "ready",
        surface,
        records: Object.freeze([...response.data.data]),
        requestId: response.requestId ?? response.data.meta.request_id,
        setCookies: bridge.takeSetCookies(),
      };
    }

    const response = await bridge.client.request("get", "/admin/excel/exports/template", {});
    return {
      kind: "ready",
      surface: "AD-D-19",
      template: Object.freeze({ ...response.data.data }),
      requestId: response.requestId ?? response.data.meta.request_id,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyFoundationReadFailure(surface, error, bridge?.takeSetCookies() ?? []);
  }
}

function classifyFoundationReadFailure(
  surface: Step69FoundationSurface,
  error: unknown,
  setCookies: readonly string[],
): Step69FoundationRead {
  if (
    error instanceof ApiClientError &&
    error.kind === "http" &&
    (error.status === 401 || error.status === 403)
  ) {
    return {
      kind: "denied",
      surface,
      requestId: error.requestId,
      setCookies,
    };
  }

  return {
    kind: "unavailable",
    surface,
    requestId: error instanceof ApiClientError ? error.requestId : null,
    setCookies,
  };
}
