import { useMemo, useState, type ReactNode } from "react";
import type { ProductDetailResponse, ProductVariant } from "./product-detail-contract.js";
import type { ResolvedProductMedia } from "./product-detail-media.server.js";
import { selectDefaultVariantId } from "./product-variant-selection.js";
import { ProductDetailSummary } from "./ProductDetailSummary.js";
import { ProductMediaGallery } from "./ProductMediaGallery.js";
import { ProductVariantSelector } from "./ProductVariantSelector.js";

export function ProductDetailExperience({
  product,
  variants,
  media,
  variantFallback,
}: {
  product: ProductDetailResponse;
  variants: readonly ProductVariant[] | null;
  media: readonly ResolvedProductMedia[];
  variantFallback: ReactNode;
}) {
  const initialSelectedId = useMemo(
    () => selectDefaultVariantId(variants ?? []),
    [variants],
  );
  const [selectedVariantId, setSelectedVariantId] = useState(initialSelectedId);

  return (
    <>
      <ProductDetailSummary product={product} />
      <ProductMediaGallery media={media} selectedVariantId={selectedVariantId} />
      {variants ? (
        <ProductVariantSelector
          variants={variants}
          selectedId={selectedVariantId}
          onSelect={setSelectedVariantId}
        />
      ) : variantFallback}
    </>
  );
}
