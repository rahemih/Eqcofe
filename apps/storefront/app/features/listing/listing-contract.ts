import type { ApiComponents, ApiSuccessData } from "../../platform/api/contract.js";

export type ListingProductCardData = ApiComponents["schemas"]["ProductCard"];
export type ListingPagination = ApiComponents["schemas"]["CursorPagination"];
export type ProductListingResponse = NonNullable<ApiSuccessData<"get", "/products">>;
export type SearchListingResponse = NonNullable<ApiSuccessData<"get", "/search">>;
export type CategoryListingResponse = NonNullable<ApiSuccessData<"get", "/categories/{slug}/products">>;
export type BrandListingResponse = NonNullable<ApiSuccessData<"get", "/brands/{slug}/products">>;
