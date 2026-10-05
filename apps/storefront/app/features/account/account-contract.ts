import type { ApiRequestInput, ApiSuccessData } from "../../platform/api/contract.js";

export type AccountSessionRequest = ApiRequestInput<"get", "/auth/session">;
export type AccountSessionResponse = NonNullable<ApiSuccessData<"get", "/auth/session">>;

export type AccountOrdersRequest = ApiRequestInput<"get", "/customer/orders">;
export type AccountOrdersResponse = NonNullable<ApiSuccessData<"get", "/customer/orders">>;

export type AccountNotificationsRequest = ApiRequestInput<"get", "/customer/notifications">;
export type AccountNotificationsResponse = NonNullable<ApiSuccessData<"get", "/customer/notifications">>;

export type AccountActor = AccountSessionResponse["data"]["actor"];
export type AccountOrderItem = AccountOrdersResponse["data"]["items"][number];
export type AccountNotificationItem = AccountNotificationsResponse["data"]["items"][number];
