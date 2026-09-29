import type { ApiComponents, ApiSuccessData } from "../../platform/api/contract.js";

export type ProductDetailResponse = NonNullable<ApiSuccessData<"get", "/products/{slug}">>;
export type ProductVariantsResponse = NonNullable<ApiSuccessData<"get", "/products/{slug}/variants">>;

export type ProductDetail = ApiComponents["schemas"]["PublicProductResponse"];
export type ProductVariant = ApiComponents["schemas"]["PublicVariantResponse"];
export type ProductMedia = ApiComponents["schemas"]["PublicProductMediaView"];
export type ProductSpecification = ApiComponents["schemas"]["ProductSpecificationView"];

export type ProductDetailFoundation = {
  product: ProductDetailResponse;
  contract: {
    method: "GET";
    path: "/products/{slug}";
    authority: "backend";
  };
};
