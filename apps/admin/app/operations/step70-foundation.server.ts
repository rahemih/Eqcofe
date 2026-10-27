import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export const STEP70_FOUNDATION_SURFACES = [
  "AD-D-06",
  "AD-D-07",
  "AD-D-08",
  "AD-D-09",
  "AD-D-10",
  "AD-D-11",
  "AD-D-12",
  "AD-D-13",
  "AD-D-14",
  "AD-D-15",
  "AD-D-16",
  "AD-D-17",
  "AD-D-18",
  "AD-E-09",
  "AD-E-10",
  "AD-E-11",
] as const;

export type Step70FoundationSurface = (typeof STEP70_FOUNDATION_SURFACES)[number];

type Step70ReadySurface = Exclude<
  Step70FoundationSurface,
  "AD-D-07" | "AD-E-09" | "AD-E-10"
>;

type ReadCommon = {
  requestId: string | null;
  setCookies: readonly string[];
};

export type Step70FoundationRead =
  | ({
      kind: "ready";
      surface: Step70ReadySurface;
      endpoint: string;
      status: number;
    } & ReadCommon)
  | ({
      kind: "boundary";
      surface: "AD-D-07" | "AD-E-09" | "AD-E-10";
      reason: string;
    } & ReadCommon)
  | ({
      kind: "denied";
      surface: Step70FoundationSurface;
    } & ReadCommon)
  | ({
      kind: "unavailable";
      surface: Step70FoundationSurface;
    } & ReadCommon);

export function isStep70FoundationSurface(value: string): value is Step70FoundationSurface {
  return (STEP70_FOUNDATION_SURFACES as readonly string[]).includes(value);
}

export async function readStep70Foundation(
  request: Pick<Request, "headers">,
  surface: Step70FoundationSurface,
): Promise<Step70FoundationRead> {
  const boundary = boundaryFor(surface);
  if (boundary) {
    return {
      kind: "boundary",
      surface: boundary.surface,
      reason: boundary.reason,
      requestId: null,
      setCookies: [],
    };
  }

  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);

    switch (surface) {
      case "AD-D-06":
        return ready(
          surface,
          "/admin/inventory",
          await bridge.client.request("get", "/admin/inventory", {}),
          bridge,
        );
      case "AD-D-08":
        return ready(
          surface,
          "/admin/inventory/transfers",
          await bridge.client.request("get", "/admin/inventory/transfers", {}),
          bridge,
        );
      case "AD-D-09":
        return ready(
          surface,
          "/admin/inventory/reservations",
          await bridge.client.request("get", "/admin/inventory/reservations", {}),
          bridge,
        );
      case "AD-D-10":
        return ready(
          surface,
          "/admin/inventory/allocations",
          await bridge.client.request("get", "/admin/inventory/allocations", {}),
          bridge,
        );
      case "AD-D-11":
        return ready(
          surface,
          "/admin/inventory/warehouses",
          await bridge.client.request("get", "/admin/inventory/warehouses", {}),
          bridge,
        );
      case "AD-D-12":
        return ready(
          surface,
          "/admin/procurement/suppliers",
          await bridge.client.request("get", "/admin/procurement/suppliers", {}),
          bridge,
        );
      case "AD-D-13":
        return ready(
          surface,
          "/admin/procurement/purchase-requests",
          await bridge.client.request("get", "/admin/procurement/purchase-requests", {}),
          bridge,
        );
      case "AD-D-14":
        return ready(
          surface,
          "/admin/procurement/purchase-orders",
          await bridge.client.request("get", "/admin/procurement/purchase-orders", {}),
          bridge,
        );
      case "AD-D-15":
        return ready(
          surface,
          "/admin/procurement/goods-receipts",
          await bridge.client.request("get", "/admin/procurement/goods-receipts", {}),
          bridge,
        );
      case "AD-D-16":
        return ready(
          surface,
          "/admin/procurement/landed-costs",
          await bridge.client.request("get", "/admin/procurement/landed-costs", {}),
          bridge,
        );
      case "AD-D-17":
        return ready(
          surface,
          "/admin/procurement/supplier-invoices",
          await bridge.client.request("get", "/admin/procurement/supplier-invoices", {}),
          bridge,
        );
      case "AD-D-18":
        return ready(
          surface,
          "/admin/procurement/purchase-returns",
          await bridge.client.request("get", "/admin/procurement/purchase-returns", {}),
          bridge,
        );
      case "AD-E-11":
        return ready(
          surface,
          "/admin/pos/reconciliation/failed",
          await bridge.client.request("get", "/admin/pos/reconciliation/failed", {}),
          bridge,
        );
      default:
        return {
          kind: "unavailable",
          surface,
          requestId: null,
          setCookies: bridge.takeSetCookies(),
        };
    }
  } catch (error) {
    return classifyStep70ReadFailure(surface, error, bridge?.takeSetCookies() ?? []);
  }
}

function boundaryFor(
  surface: Step70FoundationSurface,
):
  | {
      surface: "AD-D-07" | "AD-E-09" | "AD-E-10";
      reason: string;
    }
  | null {
  if (surface === "AD-D-07") {
    return {
      surface,
      reason:
        "اصلاح موجودی فقط عملیات تغییردهندهٔ منبع‌اثبات‌شده دارد؛ مرحلهٔ 70-C endpoint خواندن ساختگی ایجاد نمی‌کند و اجرای اصلاح در 70-D باقی می‌ماند.",
    };
  }
  if (surface === "AD-E-09") {
    return {
      surface,
      reason:
        "پس از تطبیق 70-B هیچ endpoint منبع‌اثبات‌شده‌ای برای فروشگاه، صندوق، شیفت یا سفارش عمومی POS باقی نمانده است؛ این سطح فقط مرز نبود authority را نشان می‌دهد.",
    };
  }
  if (surface === "AD-E-10") {
    return {
      surface,
      reason:
        "خواندن اسکن POS به kind و value صریح اپراتور نیاز دارد؛ مرحلهٔ 70-C اسکن مصنوعی یا مقدار پیش‌فرض تولید نمی‌کند و گردش فروش در 70-H باقی می‌ماند.",
    };
  }
  return null;
}

function ready(
  surface: Step70ReadySurface,
  endpoint: string,
  response: { status: number; requestId: string | null },
  bridge: ReturnType<typeof createAdminAuthBridge>,
): Step70FoundationRead {
  return {
    kind: "ready",
    surface,
    endpoint,
    status: response.status,
    requestId: response.requestId,
    setCookies: bridge.takeSetCookies(),
  };
}

function classifyStep70ReadFailure(
  surface: Step70FoundationSurface,
  error: unknown,
  setCookies: readonly string[],
): Step70FoundationRead {
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
