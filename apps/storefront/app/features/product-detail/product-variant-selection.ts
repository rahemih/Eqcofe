import type { ProductVariant } from "./product-detail-contract.js";

export function selectDefaultVariantId(variants: readonly ProductVariant[]): string | null {
  const preferred = variants.find((variant) => (
    variant.sales_enabled
    && variant.availability.sales_enabled
    && variant.availability.in_stock
    && variant.price !== null
  ));
  return preferred?.id
    ?? variants.find((variant) => variant.sales_enabled && variant.availability.sales_enabled)?.id
    ?? variants[0]?.id
    ?? null;
}

export function availabilityLabel(variant: ProductVariant): string {
  if (!variant.sales_enabled || !variant.availability.sales_enabled) return "فروش این مدل متوقف است";
  if (!variant.availability.in_stock) return "ناموجود";
  const quantity = variant.availability.available_quantity;
  if (quantity !== null && quantity !== undefined && quantity < 10) {
    return `${new Intl.NumberFormat("fa-IR").format(quantity)} عدد باقی مانده`;
  }
  return "موجود";
}

export function variantLabel(variant: ProductVariant): string {
  if (variant.name_suffix?.trim()) return variant.name_suffix.trim();
  const labels = variant.attributes.map((attribute) => {
    const value = attribute.value_text
      ?? (attribute.value_numeric === null || attribute.value_numeric === undefined
        ? null
        : new Intl.NumberFormat("fa-IR").format(attribute.value_numeric))
      ?? (attribute.value_boolean === null || attribute.value_boolean === undefined
        ? null
        : attribute.value_boolean ? "بله" : "خیر")
      ?? attribute.normalized_value
      ?? "";
    return value ? `${attribute.name_fa}: ${value}${attribute.unit ? ` ${attribute.unit}` : ""}` : attribute.name_fa;
  });
  return labels.length > 0 ? labels.join("، ") : variant.sku;
}
