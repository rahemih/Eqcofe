import type { ApiRequestInput, ApiSuccessData } from "../../platform/api/contract.js";

export type CartCreateRequest = ApiRequestInput<"post", "/cart">;
export type CartCreateResponse = NonNullable<ApiSuccessData<"post", "/cart">>;
export type CartViewRequest = ApiRequestInput<"get", "/cart/{id}">;
export type CartViewResponse = NonNullable<ApiSuccessData<"get", "/cart/{id}">>;
export type CartAddItemRequest = ApiRequestInput<"post", "/cart/{id}/items">;
export type CartAddItemResponse = NonNullable<ApiSuccessData<"post", "/cart/{id}/items">>;
export type CartUpdateItemRequest = ApiRequestInput<"patch", "/cart/{id}/items/{itemId}">;
export type CartUpdateItemResponse = NonNullable<ApiSuccessData<"patch", "/cart/{id}/items/{itemId}">>;
export type CartRemoveItemRequest = ApiRequestInput<"delete", "/cart/{id}/items/{itemId}">;
export type CartRemoveItemResponse = ApiSuccessData<"delete", "/cart/{id}/items/{itemId}">;

export type CheckoutQuoteRequest = ApiRequestInput<"post", "/cart/{id}/quote">;
export type CheckoutQuoteResponse = NonNullable<ApiSuccessData<"post", "/cart/{id}/quote">>;
export type CheckoutReserveRequest = ApiRequestInput<"post", "/checkout/{id}/reserve">;
export type CheckoutReserveResponse = NonNullable<ApiSuccessData<"post", "/checkout/{id}/reserve">>;
export type CheckoutOrderRequest = ApiRequestInput<"post", "/checkout/{id}/order">;
export type CheckoutOrderResponse = NonNullable<ApiSuccessData<"post", "/checkout/{id}/order">>;

export type CustomerCartRequest = ApiRequestInput<"get", "/customer/cart">;
export type CustomerCartResponse = NonNullable<ApiSuccessData<"get", "/customer/cart">>;
export type CustomerCartAccessRequest = ApiRequestInput<"post", "/customer/cart/access">;
export type CustomerCartAccessResponse = NonNullable<ApiSuccessData<"post", "/customer/cart/access">>;
export type CustomerCartMergeRequest = ApiRequestInput<"post", "/customer/cart/merge">;
export type CustomerCartMergeResponse = NonNullable<ApiSuccessData<"post", "/customer/cart/merge">>;

export type CustomerAddressesRequest = ApiRequestInput<"get", "/customer/addresses">;
export type CustomerAddressesResponse = NonNullable<ApiSuccessData<"get", "/customer/addresses">>;
export type CustomerAddressCreateRequest = ApiRequestInput<"post", "/customer/addresses">;
export type CustomerAddressCreateResponse = NonNullable<ApiSuccessData<"post", "/customer/addresses">>;
export type CustomerAddressUpdateRequest = ApiRequestInput<"patch", "/customer/addresses/{id}">;
export type CustomerAddressUpdateResponse = NonNullable<ApiSuccessData<"patch", "/customer/addresses/{id}">>;
export type CustomerAddressDeleteRequest = ApiRequestInput<"delete", "/customer/addresses/{id}">;
export type CustomerAddressDeleteResponse = ApiSuccessData<"delete", "/customer/addresses/{id}">;
export type CustomerAddressSetDefaultRequest = ApiRequestInput<"post", "/customer/addresses/{id}/set-default">;
export type CustomerAddressSetDefaultResponse = NonNullable<ApiSuccessData<"post", "/customer/addresses/{id}/set-default">>;

export type ShippingMethodsRequest = ApiRequestInput<"get", "/shipping-methods">;
export type ShippingMethodsResponse = NonNullable<ApiSuccessData<"get", "/shipping-methods">>;

export type PaymentInitiateRequest = ApiRequestInput<"post", "/orders/{order_number}/payments">;
export type PaymentInitiateResponse = NonNullable<ApiSuccessData<"post", "/orders/{order_number}/payments">>;
export type PaymentStatusRequest = ApiRequestInput<"get", "/payments/{payment_id}/status">;
export type PaymentStatusResponse = NonNullable<ApiSuccessData<"get", "/payments/{payment_id}/status">>;
export type PaymentVerifyRequest = ApiRequestInput<"post", "/payments/{payment_id}/verify">;
export type PaymentVerifyResponse = NonNullable<ApiSuccessData<"post", "/payments/{payment_id}/verify">>;
export type GuestOrderRequest = ApiRequestInput<"get", "/orders/{number}">;
export type GuestOrderResponse = NonNullable<ApiSuccessData<"get", "/orders/{number}">>;

export type CheckoutQuoteBody = CheckoutQuoteRequest["body"];
export type CheckoutOrderBody = CheckoutOrderRequest["body"];
export type CustomerAddressCreateBody = CustomerAddressCreateRequest["body"];
export type CustomerAddressUpdateBody = CustomerAddressUpdateRequest["body"];
