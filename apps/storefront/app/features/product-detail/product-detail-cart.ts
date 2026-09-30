import type { ProductVariant } from "./product-detail-contract.js";

export type ProductCartFeedback = {
  status: "success" | "error";
  message: string;
  requestId?: string | null;
};

export function canAddVariantToCart(variant: ProductVariant | null): boolean {
  return Boolean(
    variant
    && variant.sales_enabled
    && variant.availability.sales_enabled
    && variant.availability.in_stock,
  );
}
