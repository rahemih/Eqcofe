import { createHash } from "node:crypto";
import { ApiClientError } from "../../platform/api/errors.js";
import type { ApiClientConfig } from "../../platform/api/request.js";
import { createCustomerSessionBridge } from "../../platform/auth/session-cookie.server.js";
import type {
  AccountReturn,
  AccountReturnCancelBody,
  AccountReturnCreateBody,
  AccountReturnCreateResponse,
  AccountReturnDetailResponse,
  AccountReturnItem,
  AccountReturnsResponse,
  AccountReturnTimeline,
  AccountReturnTimelineResponse,
  AccountWarranty,
  AccountWarrantyCreateBody,
  AccountWarrantyCreateResponse,
  AccountWarrantyDetailResponse,
  AccountWarrantyItem,
  AccountWarrantyListResponse,
  AccountWarrantyTimeline,
  AccountWarrantyTimelineResponse,
} from "./account-contract.js";

export type AccountAfterSalesOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type AccountReturnPageData =
  | { mode: "list"; items: readonly AccountReturnItem[] }
  | {
      mode: "detail";
      item: AccountReturn;
      timeline: AccountReturnTimeline | null;
      timelineUnavailable: boolean;
    };

export type AccountWarrantyPageData =
  | { mode: "list"; items: readonly AccountWarrantyItem[] }
  | {
      mode: "detail";
      item: AccountWarranty;
      timeline: AccountWarrantyTimeline | null;
      timelineUnavailable: boolean;
    };

export type AccountReturnLoadState =
  | { status: "ready"; data: AccountReturnPageData; setCookies: readonly string[] }
  | { status: "unauthenticated"; setCookies: readonly string[] }
  | { status: "denied"; setCookies: readonly string[] }
  | { status: "invalid-reference"; setCookies: readonly string[] }
  | { status: "unavailable"; setCookies: readonly string[] };

export type AccountWarrantyLoadState =
  | { status: "ready"; data: AccountWarrantyPageData; setCookies: readonly string[] }
  | { status: "unauthenticated"; setCookies: readonly string[] }
  | { status: "denied"; setCookies: readonly string[] }
  | { status: "invalid-reference"; setCookies: readonly string[] }
  | { status: "unavailable"; setCookies: readonly string[] };

export type AccountAfterSalesMutationResult =
  | {
      ok: true;
      message: string;
      href?: string;
      reference?: string;
      setCookies: readonly string[];
    }
  | {
      ok: false;
      statusCode: number;
      message: string;
      setCookies: readonly string[];
    };

export async function loadAccountReturns(
  request: Request,
  returnNumber: string | undefined,
  options: AccountAfterSalesOptions = {},
): Promise<AccountReturnLoadState> {
  if (returnNumber !== undefined && !isCaseReference(returnNumber)) {
    return { status: "invalid-reference", setCookies: [] };
  }

  const bridge = safeBridge(request, options);
  if (!bridge) return { status: "unavailable", setCookies: [] };

  if (returnNumber === undefined) {
    try {
      const response = await bridge.client.request("get", "/customer/returns", {});
      const typed = response.data as AccountReturnsResponse;
      return {
        status: "ready",
        data: { mode: "list", items: typed.data },
        setCookies: bridge.takeSetCookies(),
      };
    } catch (error) {
      if (isUnauthorized(error)) {
        return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
      }
      return { status: "unavailable", setCookies: bridge.takeSetCookies() };
    }
  }

  let item: AccountReturn;
  try {
    const response = await bridge.client.request("get", "/customer/returns/{return_number}", {
      pathParams: { return_number: returnNumber },
    });
    item = (response.data as AccountReturnDetailResponse).data;
  } catch (error) {
    return returnLoadFailure(error, bridge.takeSetCookies());
  }

  let timeline: AccountReturnTimeline | null = null;
  let timelineUnavailable = false;
  try {
    const response = await bridge.client.request("get", "/customer/returns/{return_number}/timeline", {
      pathParams: { return_number: returnNumber },
    });
    timeline = (response.data as AccountReturnTimelineResponse).data;
  } catch (error) {
    if (isUnauthorized(error)) {
      return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
    }
    timelineUnavailable = true;
  }

  return {
    status: "ready",
    data: { mode: "detail", item, timeline, timelineUnavailable },
    setCookies: bridge.takeSetCookies(),
  };
}

export async function loadAccountWarranty(
  request: Request,
  claimNumber: string | undefined,
  options: AccountAfterSalesOptions = {},
): Promise<AccountWarrantyLoadState> {
  if (claimNumber !== undefined && !isCaseReference(claimNumber)) {
    return { status: "invalid-reference", setCookies: [] };
  }

  const bridge = safeBridge(request, options);
  if (!bridge) return { status: "unavailable", setCookies: [] };

  if (claimNumber === undefined) {
    try {
      const response = await bridge.client.request("get", "/customer/warranty/claims", {});
      const typed = response.data as AccountWarrantyListResponse;
      return {
        status: "ready",
        data: { mode: "list", items: typed.data },
        setCookies: bridge.takeSetCookies(),
      };
    } catch (error) {
      if (isUnauthorized(error)) {
        return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
      }
      return { status: "unavailable", setCookies: bridge.takeSetCookies() };
    }
  }

  let item: AccountWarranty;
  try {
    const response = await bridge.client.request("get", "/customer/warranty/claims/{claim_number}", {
      pathParams: { claim_number: claimNumber },
    });
    item = (response.data as AccountWarrantyDetailResponse).data;
  } catch (error) {
    return warrantyLoadFailure(error, bridge.takeSetCookies());
  }

  let timeline: AccountWarrantyTimeline | null = null;
  let timelineUnavailable = false;
  try {
    const response = await bridge.client.request("get", "/customer/warranty/claims/{claim_number}/timeline", {
      pathParams: { claim_number: claimNumber },
    });
    timeline = (response.data as AccountWarrantyTimelineResponse).data;
  } catch (error) {
    if (isUnauthorized(error)) {
      return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
    }
    timelineUnavailable = true;
  }

  return {
    status: "ready",
    data: { mode: "detail", item, timeline, timelineUnavailable },
    setCookies: bridge.takeSetCookies(),
  };
}

export async function mutateAccountReturn(
  request: Request,
  returnNumber: string | undefined,
  options: AccountAfterSalesOptions = {},
): Promise<AccountAfterSalesMutationResult> {
  const bridge = safeBridge(request, options);
  if (!bridge) return unavailableMutation("مرجوعی");

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  try {
    if (intent === "create-return") {
      if (returnNumber !== undefined) {
        return invalidMutation("ثبت مرجوعی تازه از صفحه جزئیات پرونده مجاز نیست.", bridge.takeSetCookies());
      }

      const orderNumber = cleanReference(form.get("order_number"));
      const orderItemId = cleanEntityId(form.get("order_item_id"));
      const quantity = cleanPositiveInteger(form.get("quantity"), 1000);
      const reasonCode = cleanRequired(form.get("reason_code"), 100);
      const note = cleanNullable(form.get("note"), 1000);
      if (!orderNumber || !orderItemId || !quantity || !reasonCode || note === undefined) {
        return invalidMutation("اطلاعات درخواست مرجوعی کامل یا معتبر نیست.", bridge.takeSetCookies());
      }

      const body: AccountReturnCreateBody = {
        items: [{
          order_item_id: orderItemId,
          quantity,
          reason_code: reasonCode,
          note,
        }],
      };

      const response = await bridge.client.request("post", "/customer/orders/{order_number}/returns", {
        pathParams: { order_number: orderNumber },
        headers: {
          "Idempotency-Key": stableAfterSalesKey(
            request,
            "create-return",
            orderNumber,
            JSON.stringify(body),
          ),
        },
        body,
      });
      const created = (response.data as AccountReturnCreateResponse).data;
      return {
        ok: true,
        message: "درخواست مرجوعی ثبت شد. نتیجه نهایی فقط از وضعیت پرونده مشخص می‌شود.",
        reference: created.return_number,
        href: `/account/returns/${encodeURIComponent(created.return_number)}`,
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (intent === "cancel-return") {
      if (!isCaseReference(returnNumber)) {
        return invalidMutation("پرونده مرجوعی معتبر نیست.", bridge.takeSetCookies());
      }

      const current = await bridge.client.request("get", "/customer/returns/{return_number}", {
        pathParams: { return_number: returnNumber },
      });
      const item = (current.data as AccountReturnDetailResponse).data;
      if (item.status !== "requested") {
        return {
          ok: false,
          statusCode: 409,
          message: "وضعیت فعلی پرونده دیگر اجازه لغو توسط مشتری را نمی‌دهد. صفحه را تازه کنید.",
          setCookies: bridge.takeSetCookies(),
        };
      }

      const reason = cleanRequired(form.get("reason"), 2000);
      if (!reason) {
        return invalidMutation("دلیل لغو مرجوعی الزامی است.", bridge.takeSetCookies());
      }
      const body: AccountReturnCancelBody = { reason };

      await bridge.client.request("post", "/customer/returns/{return_number}/cancel", {
        pathParams: { return_number: returnNumber },
        headers: {
          "Idempotency-Key": stableAfterSalesKey(
            request,
            "cancel-return",
            returnNumber,
            JSON.stringify(body),
          ),
        },
        body,
      });

      return {
        ok: true,
        message: "درخواست مرجوعی لغو شد. وضعیت تازه پرونده را دوباره دریافت کنید.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    return invalidMutation("عملیات مرجوعی شناخته‌شده نیست.", bridge.takeSetCookies());
  } catch (error) {
    return mutationFailure(error, bridge.takeSetCookies(), "مرجوعی");
  }
}

export async function mutateAccountWarranty(
  request: Request,
  claimNumber: string | undefined,
  options: AccountAfterSalesOptions = {},
): Promise<AccountAfterSalesMutationResult> {
  const bridge = safeBridge(request, options);
  if (!bridge) return unavailableMutation("گارانتی");

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent !== "create-warranty" || claimNumber !== undefined) {
    return invalidMutation(
      claimNumber !== undefined
        ? "برای پرونده گارانتی موجود، اقدام مشتری دیگری در قرارداد فعلی تعریف نشده است."
        : "عملیات گارانتی شناخته‌شده نیست.",
      bridge.takeSetCookies(),
    );
  }

  const orderItemId = cleanEntityId(form.get("order_item_id"));
  const issueType = cleanRequired(form.get("issue_type"), 80);
  const issueDescription = cleanRequired(form.get("issue_description"), 4000);
  const preferredResolution = cleanPreferredResolution(form.get("preferred_resolution"));

  if (!orderItemId || !issueType || !issueDescription || preferredResolution === undefined) {
    return invalidMutation("اطلاعات درخواست گارانتی کامل یا معتبر نیست.", bridge.takeSetCookies());
  }

  const body: AccountWarrantyCreateBody = {
    order_item_id: orderItemId,
    issue_type: issueType,
    issue_description: issueDescription,
    preferred_resolution: preferredResolution,
  };

  try {
    const response = await bridge.client.request("post", "/customer/warranty/claims", {
      headers: {
        "Idempotency-Key": stableAfterSalesKey(
          request,
          "create-warranty",
          orderItemId,
          JSON.stringify(body),
        ),
      },
      body,
    });
    const created = (response.data as AccountWarrantyCreateResponse).data;
    return {
      ok: true,
      message: "درخواست گارانتی ثبت شد. پذیرش یا نتیجه پرونده فقط از وضعیت معتبر آن مشخص می‌شود.",
      reference: created.claim_number,
      href: `/account/warranty/${encodeURIComponent(created.claim_number)}`,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return mutationFailure(error, bridge.takeSetCookies(), "گارانتی");
  }
}

function returnLoadFailure(
  error: unknown,
  setCookies: readonly string[],
): AccountReturnLoadState {
  if (isUnauthorized(error)) return { status: "unauthenticated", setCookies };
  if (isDenied(error)) return { status: "denied", setCookies };
  return { status: "unavailable", setCookies };
}

function warrantyLoadFailure(
  error: unknown,
  setCookies: readonly string[],
): AccountWarrantyLoadState {
  if (isUnauthorized(error)) return { status: "unauthenticated", setCookies };
  if (isDenied(error)) return { status: "denied", setCookies };
  return { status: "unavailable", setCookies };
}

function mutationFailure(
  error: unknown,
  setCookies: readonly string[],
  subject: "مرجوعی" | "گارانتی",
): AccountAfterSalesMutationResult {
  if (!(error instanceof ApiClientError)) {
    return {
      ok: false,
      statusCode: 503,
      message: `نتیجه عملیات ${subject} قطعی نشد؛ وضعیت حساب را دوباره دریافت کنید و موفقیت را فرض نکنید.`,
      setCookies,
    };
  }

  if (error.status === 401) {
    return {
      ok: false,
      statusCode: 401,
      message: "نشست شما پایان یافته است؛ هیچ تغییر جدیدی ثبت‌شده فرض نمی‌شود.",
      setCookies,
    };
  }

  if (error.status === 403 || error.status === 404) {
    return {
      ok: false,
      statusCode: error.status,
      message: `این پرونده یا منبع ${subject} در حساب فعلی قابل دسترسی نیست.`,
      setCookies,
    };
  }

  if (error.status === 409) {
    return {
      ok: false,
      statusCode: 409,
      message: "وضعیت پرونده هم‌زمان تغییر کرده است؛ اطلاعات تازه را دریافت و دوباره بررسی کنید.",
      setCookies,
    };
  }

  if (error.status === 400 || error.status === 422) {
    return {
      ok: false,
      statusCode: 422,
      message: `درخواست ${subject} با وضعیت یا اطلاعات فعلی قابل پذیرش نیست. فیلدها و پرونده مرتبط را بررسی کنید.`,
      setCookies,
    };
  }

  return {
    ok: false,
    statusCode: 503,
    message: `نتیجه عملیات ${subject} قطعی نشد؛ وضعیت حساب را دوباره دریافت کنید و موفقیت را فرض نکنید.`,
    setCookies,
  };
}

function safeBridge(
  request: Pick<Request, "headers">,
  options: AccountAfterSalesOptions,
) {
  try {
    return createCustomerSessionBridge(request, options);
  } catch {
    return null;
  }
}

function stableAfterSalesKey(
  request: Request,
  intent: string,
  reference: string,
  material: string,
): string {
  const hash = createHash("sha256");
  for (const part of [
    "customer-after-sales",
    intent,
    reference,
    request.headers.get("cookie") ?? "",
    material,
  ]) {
    hash.update(part).update("\0");
  }
  return hash.digest("hex");
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

function cleanReference(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return isCaseReference(normalized) ? normalized : null;
}

function cleanEntityId(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return ENTITY_ID.test(normalized) ? normalized : null;
}

function cleanPositiveInteger(value: unknown, max: number): number | null {
  const raw = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed <= max ? parsed : null;
}

function cleanPreferredResolution(
  value: unknown,
): AccountWarrantyCreateBody["preferred_resolution"] | undefined {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  if (
    normalized === "repair"
    || normalized === "replacement"
    || normalized === "refund"
    || normalized === "inspection"
  ) {
    return normalized;
  }
  return undefined;
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

function isCaseReference(value: string | undefined): value is string {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= 120
    && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

function invalidMutation(
  message: string,
  setCookies: readonly string[],
): AccountAfterSalesMutationResult {
  return { ok: false, statusCode: 422, message, setCookies };
}

function unavailableMutation(
  subject: "مرجوعی" | "گارانتی",
): AccountAfterSalesMutationResult {
  return {
    ok: false,
    statusCode: 503,
    message: `سرویس ${subject} موقتاً در دسترس نیست؛ هیچ تغییری ثبت‌شده فرض نمی‌شود.`,
    setCookies: [],
  };
}

const ENTITY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
