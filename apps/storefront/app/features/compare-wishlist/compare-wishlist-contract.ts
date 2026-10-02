import type { ApiRequestInput, ApiSuccessData } from "../../platform/api/contract.js";

export type CompareValidateRequest = ApiRequestInput<"post", "/compare/validate">;
export type CompareValidateResponse = NonNullable<ApiSuccessData<"post", "/compare/validate">>;

export type CompareRequest = ApiRequestInput<"post", "/compare">;
export type CompareResponse = NonNullable<ApiSuccessData<"post", "/compare">>;

export type WishlistListRequest = ApiRequestInput<"get", "/customer/wishlist">;
export type WishlistListResponse = NonNullable<ApiSuccessData<"get", "/customer/wishlist">>;

export type WishlistAddRequest = ApiRequestInput<"post", "/customer/wishlist/{product_id}">;
export type WishlistAddResponse = NonNullable<ApiSuccessData<"post", "/customer/wishlist/{product_id}">>;

export type WishlistRemoveRequest = ApiRequestInput<"delete", "/customer/wishlist/{product_id}">;
export type WishlistRemoveResponse = ApiSuccessData<"delete", "/customer/wishlist/{product_id}">;

export type CompareRequestBody = CompareRequest["body"];
export type CompareValidateRequestBody = CompareValidateRequest["body"];
