import { createHash } from "node:crypto";
import { ApiClientError } from "../../platform/api/errors.js";
import type { ApiClientConfig } from "../../platform/api/request.js";
import { createCustomerSessionBridge } from "../../platform/auth/session-cookie.server.js";
import type {
  AccountNotificationItem,
  AccountNotificationAcknowledgeResponse,
  AccountNotificationReadResponse,
  AccountNotificationsResponse,
  AccountWishlistItem,
  AccountWishlistResponse,
} from "./account-contract.js";

export type AccountToolsOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type AccountToolsSection<T> =
  | { status: "ready"; items: readonly T[] }
  | { status: "unavailable"; items: readonly T[] };

export type AccountToolsPageData = {
  wishlist: AccountToolsSection<AccountWishlistItem>;
  notifications: AccountToolsSection<AccountNotificationItem>;
  unreadOnly: boolean;
  notificationOffset: number;
  notificationLimit: number;
  notificationHasPotentialMore: boolean;
};

export type AccountToolsLoadState =
  | { status: "ready"; data: AccountToolsPageData; setCookies: readonly string[] }
  | { status: "unauthenticated"; setCookies: readonly string[] }
  | { status: "invalid-page"; setCookies: readonly string[] }
  | { status: "unavailable"; setCookies: readonly string[] };

export type AccountToolsMutationResult =
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

const NOTIFICATION_LIMIT = 20;
const MAX_NOTIFICATION_OFFSET = 10_000;

export async function loadAccountTools(
  request: Request,
  options: AccountToolsOptions = {},
): Promise<AccountToolsLoadState> {
  const bridge = safeBridge(request, options);
  if (!bridge) return { status: "unavailable", setCookies: [] };

  const paging = readNotificationPaging(request.url);
  if (!paging) {
    return { status: "invalid-page", setCookies: bridge.takeSetCookies() };
  }

  const [wishlistResult, notificationResult] = await Promise.allSettled([
    bridge.client.request("get", "/customer/wishlist", {}),
    bridge.client.request("get", "/customer/notifications", {
      query: {
        limit: NOTIFICATION_LIMIT,
        offset: paging.offset,
        unread_only: paging.unreadOnly,
      },
    }),
  ]);

  if (
    (wishlistResult.status === "rejected" && isUnauthorized(wishlistResult.reason))
    || (notificationResult.status === "rejected" && isUnauthorized(notificationResult.reason))
  ) {
    return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
  }

  const wishlist: AccountToolsSection<AccountWishlistItem> =
    wishlistResult.status === "fulfilled"
      ? {
          status: "ready",
          items: (wishlistResult.value.data as AccountWishlistResponse).items,
        }
      : { status: "unavailable", items: [] };

  let notifications: AccountToolsSection<AccountNotificationItem>;
  let notificationHasPotentialMore = false;
  if (notificationResult.status === "fulfilled") {
    const typed = notificationResult.value.data as AccountNotificationsResponse;
    notifications = { status: "ready", items: typed.data.items };
    notificationHasPotentialMore = typed.data.items.length === NOTIFICATION_LIMIT;
  } else {
    notifications = { status: "unavailable", items: [] };
  }

  return {
    status: "ready",
    data: {
      wishlist,
      notifications,
      unreadOnly: paging.unreadOnly,
      notificationOffset: paging.offset,
      notificationLimit: NOTIFICATION_LIMIT,
      notificationHasPotentialMore,
    },
    setCookies: bridge.takeSetCookies(),
  };
}

export async function mutateAccountTools(
  request: Request,
  options: AccountToolsOptions = {},
): Promise<AccountToolsMutationResult> {
  const bridge = safeBridge(request, options);
  if (!bridge) return unavailableMutation();

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  try {
    if (intent === "wishlist-remove") {
      const productId = String(form.get("product_id") ?? "");
      if (!ENTITY_ID.test(productId)) {
        return invalidMutation("شناسه محصول معتبر نیست.", bridge.takeSetCookies());
      }

      const current = await bridge.client.request("get", "/customer/wishlist", {});
      const wishlist = current.data as AccountWishlistResponse;
      if (!wishlist.items.some((item) => item.product_id === productId)) {
        return {
          ok: true,
          message: "فهرست علاقه‌مندی‌ها تازه است و این محصول دیگر در آن نیست.",
          setCookies: bridge.takeSetCookies(),
        };
      }

      await bridge.client.request("delete", "/customer/wishlist/{product_id}", {
        pathParams: { product_id: productId },
        headers: {
          "Idempotency-Key": stableToolsIdempotencyKey(request, intent, productId),
        },
      });
      return {
        ok: true,
        message: "محصول از علاقه‌مندی‌های شما حذف شد.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (intent === "notification-read" || intent === "notification-acknowledge") {
      const notificationId = String(form.get("notification_id") ?? "");
      if (!ENTITY_ID.test(notificationId)) {
        return invalidMutation("شناسه اعلان معتبر نیست.", bridge.takeSetCookies());
      }

      if (intent === "notification-read") {
        const response = await bridge.client.request(
          "patch",
          "/customer/notifications/{id}/read",
          {
            pathParams: { id: notificationId },
            headers: {
              "Idempotency-Key": stableToolsIdempotencyKey(request, intent, notificationId),
            },
          },
        );
        void (response.data as AccountNotificationReadResponse).data.id;
        return {
          ok: true,
          message: "اعلان به‌عنوان خوانده‌شده ثبت شد.",
          setCookies: bridge.takeSetCookies(),
        };
      }

      const response = await bridge.client.request(
        "post",
        "/customer/notifications/{id}/acknowledge",
        {
          pathParams: { id: notificationId },
          headers: {
            "Idempotency-Key": stableToolsIdempotencyKey(request, intent, notificationId),
          },
        },
      );
      void (response.data as AccountNotificationAcknowledgeResponse).data.id;
      return {
        ok: true,
        message: "دریافت اعلان تأیید شد.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    return invalidMutation("عملیات ابزارهای حساب شناخته‌شده نیست.", bridge.takeSetCookies());
  } catch (error) {
    return mutationFailure(error, bridge.takeSetCookies());
  }
}

function safeBridge(
  request: Pick<Request, "headers">,
  options: AccountToolsOptions,
) {
  try {
    return createCustomerSessionBridge(request, options);
  } catch {
    return null;
  }
}

function readNotificationPaging(url: string): {
  unreadOnly: boolean;
  offset: number;
} | null {
  const parsed = new URL(url);
  const rawOffset = parsed.searchParams.get("offset");
  let offset = 0;

  if (rawOffset !== null) {
    if (!/^(0|[1-9]\d*)$/.test(rawOffset)) return null;
    offset = Number(rawOffset);
    if (!Number.isSafeInteger(offset) || offset > MAX_NOTIFICATION_OFFSET) return null;
  }

  return {
    unreadOnly: parsed.searchParams.get("unread") === "1",
    offset,
  };
}

function mutationFailure(
  error: unknown,
  setCookies: readonly string[],
): AccountToolsMutationResult {
  if (!(error instanceof ApiClientError)) {
    return {
      ok: false,
      statusCode: 503,
      message: "نتیجه عملیات قطعی نشد؛ اطلاعات حساب را دوباره دریافت کنید و موفقیت را فرض نکنید.",
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
      message: "این مورد در حساب فعلی قابل دسترسی نیست.",
      setCookies,
    };
  }

  if (error.status === 409) {
    return {
      ok: false,
      statusCode: 409,
      message: "اطلاعات هم‌زمان تغییر کرده است؛ صفحه را تازه کنید و دوباره بررسی کنید.",
      setCookies,
    };
  }

  if (error.status === 400 || error.status === 422) {
    return {
      ok: false,
      statusCode: 422,
      message: "درخواست ارسال‌شده معتبر نیست.",
      setCookies,
    };
  }

  return {
    ok: false,
    statusCode: 503,
    message: "نتیجه عملیات قطعی نشد؛ اطلاعات حساب را دوباره دریافت کنید و موفقیت را فرض نکنید.",
    setCookies,
  };
}

function stableToolsIdempotencyKey(
  request: Request,
  intent: string,
  resourceId: string,
): string {
  const hash = createHash("sha256");
  for (const part of [
    "customer-account-tools",
    intent,
    resourceId,
    request.headers.get("cookie") ?? "",
  ]) {
    hash.update(part).update("\0");
  }
  return hash.digest("hex");
}

function invalidMutation(
  message: string,
  setCookies: readonly string[],
): AccountToolsMutationResult {
  return { ok: false, statusCode: 422, message, setCookies };
}

function unavailableMutation(): AccountToolsMutationResult {
  return {
    ok: false,
    statusCode: 503,
    message: "سرویس ابزارهای حساب موقتاً در دسترس نیست؛ هیچ تغییری ثبت‌شده فرض نمی‌شود.",
    setCookies: [],
  };
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError
    && error.kind === "http"
    && error.status === 401;
}

const ENTITY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
