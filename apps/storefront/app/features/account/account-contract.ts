import type { ApiRequestInput, ApiSuccessData } from "../../platform/api/contract.js";

export type AccountSessionRequest = ApiRequestInput<"get", "/auth/session">;
export type AccountSessionResponse = NonNullable<ApiSuccessData<"get", "/auth/session">>;

export type AccountLogoutRequest = ApiRequestInput<"post", "/auth/logout">;
export type AccountLogoutResponse = NonNullable<ApiSuccessData<"post", "/auth/logout">>;
export type AccountLogoutAllRequest = ApiRequestInput<"post", "/auth/logout-all">;
export type AccountLogoutAllResponse = NonNullable<ApiSuccessData<"post", "/auth/logout-all">>;

export type AccountProfileRequest = ApiRequestInput<"get", "/customer/profile">;
export type AccountProfileResponse = NonNullable<ApiSuccessData<"get", "/customer/profile">>;
export type AccountProfileUpdateRequest = ApiRequestInput<"patch", "/customer/profile">;
export type AccountProfileUpdateResponse = NonNullable<ApiSuccessData<"patch", "/customer/profile">>;
export type AccountProfileUpdateBody = NonNullable<AccountProfileUpdateRequest["body"]>;

export type AccountAddressesRequest = ApiRequestInput<"get", "/customer/addresses">;
export type AccountAddressesResponse = NonNullable<ApiSuccessData<"get", "/customer/addresses">>;
export type AccountAddressCreateRequest = ApiRequestInput<"post", "/customer/addresses">;
export type AccountAddressCreateResponse = NonNullable<ApiSuccessData<"post", "/customer/addresses">>;
export type AccountAddressCreateBody = NonNullable<AccountAddressCreateRequest["body"]>;
export type AccountAddressUpdateRequest = ApiRequestInput<"patch", "/customer/addresses/{id}">;
export type AccountAddressUpdateResponse = NonNullable<ApiSuccessData<"patch", "/customer/addresses/{id}">>;
export type AccountAddressUpdateBody = NonNullable<AccountAddressUpdateRequest["body"]>;
export type AccountAddressSetDefaultRequest = ApiRequestInput<"post", "/customer/addresses/{id}/set-default">;
export type AccountAddressSetDefaultResponse = NonNullable<ApiSuccessData<"post", "/customer/addresses/{id}/set-default">>;
export type AccountAddressDeleteRequest = ApiRequestInput<"delete", "/customer/addresses/{id}">;

export type AccountOrdersRequest = ApiRequestInput<"get", "/customer/orders">;
export type AccountOrdersResponse = NonNullable<ApiSuccessData<"get", "/customer/orders">>;
export type AccountOrderDetailRequest = ApiRequestInput<"get", "/customer/orders/{order_number}">;
export type AccountOrderDetailResponse = NonNullable<ApiSuccessData<"get", "/customer/orders/{order_number}">>;
export type AccountOrderTimelineRequest = ApiRequestInput<"get", "/customer/orders/{order_number}/timeline">;
export type AccountOrderTimelineResponse = NonNullable<ApiSuccessData<"get", "/customer/orders/{order_number}/timeline">>;
export type AccountOrderInvoiceRequest = ApiRequestInput<"get", "/customer/orders/{order_number}/invoice">;
export type AccountOrderInvoiceResponse = NonNullable<ApiSuccessData<"get", "/customer/orders/{order_number}/invoice">>;
export type AccountOrderCancelRequest = ApiRequestInput<"post", "/customer/orders/{order_number}/cancel">;
export type AccountOrderCancelResponse = NonNullable<ApiSuccessData<"post", "/customer/orders/{order_number}/cancel">>;
export type AccountOrderCancelBody = NonNullable<AccountOrderCancelRequest["body"]>;

export type AccountWishlistRequest = ApiRequestInput<"get", "/customer/wishlist">;
export type AccountWishlistResponse = NonNullable<ApiSuccessData<"get", "/customer/wishlist">>;
export type AccountWishlistRemoveRequest = ApiRequestInput<"delete", "/customer/wishlist/{product_id}">;

export type AccountNotificationsRequest = ApiRequestInput<"get", "/customer/notifications">;
export type AccountNotificationsResponse = NonNullable<ApiSuccessData<"get", "/customer/notifications">>;
export type AccountNotificationReadRequest = ApiRequestInput<"patch", "/customer/notifications/{id}/read">;
export type AccountNotificationReadResponse = NonNullable<ApiSuccessData<"patch", "/customer/notifications/{id}/read">>;
export type AccountNotificationAcknowledgeRequest = ApiRequestInput<"post", "/customer/notifications/{id}/acknowledge">;
export type AccountNotificationAcknowledgeResponse = NonNullable<ApiSuccessData<"post", "/customer/notifications/{id}/acknowledge">>;

export type AccountActor = AccountSessionResponse["data"]["actor"];
export type AccountProfile = AccountProfileResponse;
export type AccountAddress = AccountAddressesResponse["data"][number];
export type AccountOrderItem = AccountOrdersResponse["data"]["items"][number];
export type AccountOrder = AccountOrderDetailResponse["data"];
export type AccountOrderTimeline = AccountOrderTimelineResponse["data"];
export type AccountOrderInvoice = AccountOrderInvoiceResponse["data"];
export type AccountOrderCancelResult = AccountOrderCancelResponse["data"];
export type AccountWishlistItem = AccountWishlistResponse["items"][number];
export type AccountNotificationItem = AccountNotificationsResponse["data"]["items"][number];
