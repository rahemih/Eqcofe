import type { ApiComponents, ApiSuccessData } from "../../platform/api/contract.js";

export type ListingProductCardData = ApiComponents["schemas"]["ProductCard"];
export type ListingPagination = ApiComponents["schemas"]["CursorPagination"];
export type ListingFacets = ApiComponents["schemas"]["ListingFacets"];
export type ListingBrandFacet = ApiComponents["schemas"]["BrandRef"];
export type CategoryFilterDefinition = ApiComponents["schemas"]["CategoryFilterDefinition"];
export type CategoryFiltersResponse = ApiComponents["schemas"]["CategoryFiltersResponse"];
export type ProductListingResponse = NonNullable<ApiSuccessData<"get", "/products">>;
export type SearchListingResponse = NonNullable<ApiSuccessData<"get", "/search">>;
export type CategoryListingResponse = NonNullable<ApiSuccessData<"get", "/categories/{slug}/products">>;
export type BrandListingResponse = NonNullable<ApiSuccessData<"get", "/brands/{slug}/products">>;
