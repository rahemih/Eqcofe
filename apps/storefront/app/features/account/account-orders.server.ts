import { createHash } from "node:crypto";
import { ApiClientError } from "../../platform/api/errors.js";
import type { ApiClientConfig } from "../../platform/api/request.js";
import { createCustomerSessionBridge } from "../../platform/auth/session-cookie.server.js";
import type {
  AccountOrder,
  AccountOrderCancelBody,
  AccountOrderInvoice,
  AccountOrderInvoiceResponse,
  AccountOrderItem,
  AccountOrderTimeline,
  AccountOrdersResponse,
  AccountOrderDetailResponse,
} from "./account-contract.js";

export type AccountOrdersOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type AccountOrdersPageData = {
  items: readonly AccountOrderItem[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export type AccountOrdersLoadState =
  | { status: "ready"; data: AccountOrdersPageData; setCookies: readonly string[] }
  | { status: "unauthenticated"; setCookies: readonly string[] }
  | { status: "invalid-cursor"; setCookies: readonly string[] }
  | { status: "unavailable"; setCookies: readonly string[] };

export type AccountOrderDetailPageData = {
  order: AccountOrder;
  timeline: AccountOrderTimeline | null;
  invoice: AccountOrderInvoice | null;
  partialFailures: readonly ("timeline" | "invoice")[];
};

export type AccountOrderDetailLoadState =
  | { status: "ready"; data: AccountOrderDetailPageData; setCookies: readonly string[] }
  | { status: "unauthenticated"; setCookies: readonly string[] }
  | { status: "denied"; setCookies: readonly string[] }
  | { status: "invalid-order-number"; setCookies: readonly string[] }
  | { status: "unavailable"; setCookies: readonly string[] };

export type AccountOrderMutationResult =
  | {
      ok: true;
      message: string;
      setCookies: readonly string[];
    }
  | {
      ok: false;
      statusCode: number;
      message: string;
      setCookies: readonly string[];
    };

const PAGE_SIZE = 12;

export async function loadAccountOrders(
  request: Request,
  options: AccountOrdersOptions = {},
): Promise<AccountOrdersLoadState> {
  const bridge = safeBridge(request, options);
  if (!bridge) return { status: "unavailable", setCookies: [] };

  const cursor = readCursor(request.url);
  if (cursor === INVALID_CURSOR) {
    return { status: "invalid-cursor", setCookies: bridge.takeSetCookies() };
  }

  try {
    const response = await bridge.client.request("get", "/customer/orders", {
      query: {
        limit: PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      },
    });
    const typed = response.data as AccountOrdersResponse;
    const pagination = typed.meta.pagination;
    return {
      status: "ready",
      data: {
        items: typed.data.items,
        pagination: {
          hasMore: pagination?.has_more === true,
          nextCursor: pagination?.next_cursor ?? null,
        },
      },
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    if (isUnauthorized(error)) {
      return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
    }
    if (isInvalidCursor(error)) {
      return { status: "invalid-cursor", setCookies: bridge.takeSetCookies() };
    }
    return { status: "unavailable", setCookies: bridge.takeSetCookies() };
  }
}

export async function loadAccountOrderDetail(
  request: Request,
  orderNumber: string | undefined,
  options: AccountOrdersOptions = {},
): Promise<AccountOrderDetailLoadState> {
  if (!isOrderNumber(orderNumber)) {
    return { status: "invalid-order-number", setCookies: [] };
  }

  const bridge = safeBridge(request, options);
  if (!bridge) return { status: "unavailable", setCookies: [] };

  let order: AccountOrder;
  try {
    const detailResponse = await bridge.client.request("get", "/customer/orders/{order_number}", {
      pathParams: { order_number: orderNumber },
    });
    order = (detailResponse.data as AccountOrderDetailResponse).data;
  } catch (error) {
    return detailLoadFailure(error, bridge.takeSetCookies());
  }

  const [timelineResult, invoiceResult] = await Promise.allSettled([
    bridge.client.request("get", "/customer/orders/{order_number}/timeline", {
      pathParams: { order_number: orderNumber },
    }),
    bridge.client.request("get", "/customer/orders/{order_number}/invoice", {
      pathParams: { order_number: orderNumber },
    }),
  ]);

  if (
    (timelineResult.status === "rejected" && isUnauthorized(timelineResult.reason))
    || (invoiceResult.status === "rejected" && isUnauthorized(invoiceResult.reason))
  ) {
    return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
  }

  const partialFailures: ("timeline" | "invoice")[] = [];
  let timeline: AccountOrderTimeline | null = null;
  let invoice: AccountOrderInvoice | null = null;

  if (timelineResult.status === "fulfilled") {
    const normalized = normalizeOrderTimeline(timelineResult.value.data, orderNumber);
    if (normalized) timeline = normalized;
    else partialFailures.push("timeline");
  } else {
    partialFailures.push("timeline");
  }

  if (invoiceResult.status === "fulfilled") {
    invoice = (invoiceResult.value.data as AccountOrderInvoiceResponse).data;
  } else {
    partialFailures.push("invoice");
  }

  return {
    status: "ready",
    data: {
      order,
      timeline,
      invoice,
      partialFailures,
    },
    setCookies: bridge.takeSetCookies(),
  };
}

export async function mutateAccountOrder(
  request: Request,
  orderNumber: string | undefined,
  options: AccountOrdersOptions = {},
): Promise<AccountOrderMutationResult> {
  if (!isOrderNumber(orderNumber)) {
    return {
      ok: false,
      statusCode: 404,
      message: "سفارش در حساب فعلی قابل دسترسی نیست.",
      setCookies: [],
    };
  }

  const bridge = safeBridge(request, options);
  if (!bridge) return unavailableMutation();

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent !== "cancel-order") {
    return invalidMutation("عملیات سفارش شناخته‌شده نیست.", bridge.takeSetCookies());
  }

  try {
    const current = await bridge.client.request("get", "/customer/orders/{order_number}", {
      pathParams: { order_number: orderNumber },
    });
    const order = (current.data as AccountOrderDetailResponse).data;

    if (!order.allowed_actions.includes("cancel_order")) {
      return {
        ok: false,
        statusCode: 409,
        message: "وضعیت فعلی سفارش اجازه لغو نمی‌دهد. جزئیات تازه سفارش را بررسی کنید.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    const body = parseCancelBody(form);
    if (!body) {
      return invalidMutation("دلیل لغو سفارش معتبر نیست.", bridge.takeSetCookies());
    }

    await bridge.client.request("post", "/customer/orders/{order_number}/cancel", {
      pathParams: { order_number: orderNumber },
      headers: {
        "Idempotency-Key": stableOrderIdempotencyKey(
          request,
          orderNumber,
          JSON.stringify(body),
        ),
      },
      body,
    });

    return {
      ok: true,
      message: "درخواست لغو سفارش با موفقیت ثبت شد.",
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return mutationFailure(error, bridge.takeSetCookies());
  }
}

function normalizeOrderTimeline(
  value: unknown,
  expectedOrderNumber: string,
): AccountOrderTimeline | null {
  const envelope = asRecord(value);
  const data = asRecord(envelope?.data);
  if (!data || data.order_number !== expectedOrderNumber || !Array.isArray(data.timeline)) {
    return null;
  }

  const timeline: AccountOrderTimeline["timeline"] = [];
  for (const candidate of data.timeline) {
    const row = asRecord(candidate);
    if (!row) return null;

    const toStatus = cleanTimelineString(row.to_status) ?? cleanTimelineString(row.status);
    const fromStatus = cleanTimelineNullableString(row.from_status);
    const reason = cleanTimelineNullableString(row.reason);
    const createdAt = cleanTimelineString(row.created_at);

    if (
      !toStatus
      || fromStatus === undefined
      || reason === undefined
      || !createdAt
      || Number.isNaN(new Date(createdAt).getTime())
    ) {
      return null;
    }

    timeline.push({
      from_status: fromStatus,
      to_status: toStatus,
      reason,
      created_at: createdAt,
    });
  }

  return { order_number: expectedOrderNumber, timeline };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanTimelineString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 200 ? normalized : null;
}

function cleanTimelineNullableString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.length <= 1000 ? normalized : undefined;
}

function safeBridge(
  request: Pick<Request, "headers">,
  options: AccountOrdersOptions,
) {
  try {
    return createCustomerSessionBridge(request, options);
  } catch {
    return null;
  }
}

function detailLoadFailure(
  error: unknown,
  setCookies: readonly string[],
): AccountOrderDetailLoadState {
  if (isUnauthorized(error)) return { status: "unauthenticated", setCookies };
  if (isDenied(error)) return { status: "denied", setCookies };
  return { status: "unavailable", setCookies };
}

function mutationFailure(
  error: unknown,
  setCookies: readonly string[],
): AccountOrderMutationResult {
  if (!(error instanceof ApiClientError)) {
    return {
      ok: false,
      statusCode: 503,
      message: "نتیجه عملیات قطعی نشد؛ وضعیت سفارش را دوباره دریافت کنید و موفقیت را فرض نکنید.",
      setCookies,
    };
  }

  if (error.status === 401) {
    return {
      ok: false,
      statusCode: 401,
      message: "نشست شما پایان یافته است؛ هیچ تغییری ثبت‌شده فرض نمی‌شود.",
      setCookies,
    };
  }
  if (error.status === 403 || error.status === 404) {
    return {
      ok: false,
      statusCode: error.status,
      message: "سفارش در حساب فعلی قابل دسترسی نیست.",
      setCookies,
    };
  }
  if (error.status === 409) {
    return {
      ok: false,
      statusCode: 409,
      message: "وضعیت سفارش تغییر کرده است؛ جزئیات تازه را بررسی و دوباره تصمیم‌گیری کنید.",
      setCookies,
    };
  }
  if (error.status === 422) {
    return {
      ok: false,
      statusCode: 422,
      message: "اطلاعات لغو سفارش معتبر نیست.",
      setCookies,
    };
  }

  return {
    ok: false,
    statusCode: 503,
    message: "نتیجه عملیات قطعی نشد؛ وضعیت سفارش را دوباره دریافت کنید و موفقیت را فرض نکنید.",
    setCookies,
  };
}

function parseCancelBody(form: FormData): AccountOrderCancelBody | null {
  const reasonCode = cleanRequired(form.get("reason_code"), 100);
  const note = cleanNullable(form.get("note"), 1000);
  if (!reasonCode || note === undefined) return null;
  return {
    reason_code: reasonCode,
    note,
  };
}

function cleanRequired(value: unknown, max: number): string | null {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) return null;
  return normalized;
}

function cleanNullable(value: unknown, max: number): string | null | undefined {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.length > max) return undefined;
  return normalized;
}

function stableOrderIdempotencyKey(
  request: Request,
  orderNumber: string,
  material: string,
): string {
  const hash = createHash("sha256");
  for (const part of [
    "customer-order-cancel",
    orderNumber,
    request.headers.get("cookie") ?? "",
    material,
  ]) {
    hash.update(part).update("\0");
  }
  return hash.digest("hex");
}

function readCursor(url: string): string | null | typeof INVALID_CURSOR {
  const value = new URL(url).searchParams.get("cursor");
  if (!value) return null;
  if (value.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(value)) return INVALID_CURSOR;
  return value;
}

function isOrderNumber(value: string | undefined): value is string {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= 120
    && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError
    && error.kind === "http"
    && error.status === 401;
}

function isDenied(error: unknown): boolean {
  return error instanceof ApiClientError
    && error.kind === "http"
    && (error.status === 403 || error.status === 404);
}

function isInvalidCursor(error: unknown): boolean {
  return error instanceof ApiClientError
    && error.kind === "http"
    && (error.status === 400 || error.status === 422)
    && /cursor/i.test(error.message);
}

function invalidMutation(
  message: string,
  setCookies: readonly string[],
): AccountOrderMutationResult {
  return { ok: false, statusCode: 422, message, setCookies };
}

function unavailableMutation(): AccountOrderMutationResult {
  return {
    ok: false,
    statusCode: 503,
    message: "سرویس سفارش موقتاً در دسترس نیست؛ هیچ تغییری ثبت‌شده فرض نمی‌شود.",
    setCookies: [],
  };
}

const INVALID_CURSOR = Symbol("invalid-cursor");
