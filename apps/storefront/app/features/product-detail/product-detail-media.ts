import type { ProductMedia } from "./product-detail-contract.js";

export type ResolvedProductMedia = ProductMedia & {
  delivery_url: string | null;
  delivery_status: "ready" | "unconfigured" | "invalid-key";
};

export type ProductMediaCapabilities = {
  image: true;
  video: true;
  model3d: false;
  spin360: false;
  authority: "canonical-product-media-contract";
};

export const PRODUCT_MEDIA_CAPABILITIES: ProductMediaCapabilities = Object.freeze({
  image: true,
  video: true,
  model3d: false,
  spin360: false,
  authority: "canonical-product-media-contract",
});

export function selectVisibleProductMedia(
  media: readonly ResolvedProductMedia[],
  selectedVariantId: string | null,
): readonly ResolvedProductMedia[] {
  return [...media]
    .filter((item) => item.variant_id == null || item.variant_id === selectedVariantId)
    .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));
}
