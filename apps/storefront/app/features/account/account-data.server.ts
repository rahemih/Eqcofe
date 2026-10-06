import { ApiClientError } from "../../platform/api/errors.js";
import type { ApiClientConfig } from "../../platform/api/request.js";
import {
  createCustomerSessionBridge,
} from "../../platform/auth/session-cookie.server.js";
import type {
  AccountActor,
  AccountNotificationItem,
  AccountNotificationsResponse,
  AccountOrderItem,
  AccountOrdersResponse,
  AccountSessionResponse,
} from "./account-contract.js";

export type AccountDataOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type AccountOverviewData =
  | {
      status: "unauthenticated";
      setCookies: readonly string[];
    }
  | {
      status: "unavailable";
      setCookies: readonly string[];
    }
  | {
      status: "ready";
      actor: AccountActor;
      recentOrders: readonly AccountOrderItem[];
      recentNotifications: readonly AccountNotificationItem[];
      partialFailures: readonly ("orders" | "notifications")[];
      setCookies: readonly string[];
    };

export async function loadAccountOverview(
  request: Pick<Request, "headers">,
  options: AccountDataOptions = {},
): Promise<AccountOverviewData> {
  let bridge: ReturnType<typeof createCustomerSessionBridge>;
  try {
    bridge = createCustomerSessionBridge(request, options);
  } catch {
    return { status: "unavailable", setCookies: [] };
  }

  let session: AccountSessionResponse;
  try {
    const response = await bridge.client.request("get", "/auth/session", {});
    session = response.data;
  } catch (error) {
    if (isUnauthorized(error)) {
      return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
    }
    return { status: "unavailable", setCookies: bridge.takeSetCookies() };
  }

  const [ordersResult, notificationsResult] = await Promise.allSettled([
    bridge.client.request("get", "/customer/orders", { query: { limit: 3 } }),
    bridge.client.request("get", "/customer/notifications", { query: { limit: 3, offset: 0 } }),
  ]);

  const partialFailures: ("orders" | "notifications")[] = [];
  let recentOrders: readonly AccountOrderItem[] = [];
  let recentNotifications: readonly AccountNotificationItem[] = [];

  if (ordersResult.status === "fulfilled") {
    const orders = ordersResult.value.data as AccountOrdersResponse;
    recentOrders = orders.data.items.slice(0, 3);
  } else if (isUnauthorized(ordersResult.reason)) {
    return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
  } else {
    partialFailures.push("orders");
  }

  if (notificationsResult.status === "fulfilled") {
    const notifications = notificationsResult.value.data as AccountNotificationsResponse;
    recentNotifications = notifications.data.items.slice(0, 3);
  } else if (isUnauthorized(notificationsResult.reason)) {
    return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
  } else {
    partialFailures.push("notifications");
  }

  return {
    status: "ready",
    actor: session.data.actor,
    recentOrders,
    recentNotifications,
    partialFailures,
    setCookies: bridge.takeSetCookies(),
  };
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError
    && error.kind === "http"
    && error.status === 401;
}
