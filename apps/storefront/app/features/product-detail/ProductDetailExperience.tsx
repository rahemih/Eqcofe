import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFetcher } from "react-router";
import { ProductEvaluationActions } from "../compare-wishlist/ProductEvaluationActions.js";
import type { WishlistMembershipView } from "../compare-wishlist/wishlist-action-state.js";
import type {
  ProductDetailResponse,
  ProductVariant,
  RelatedProductCard,
} from "./product-detail-contract.js";
import type { ProductCartFeedback } from "./product-detail-cart.js";
import type { ResolvedProductMedia } from "./product-detail-media.js";
import { selectDefaultVariantId } from "./product-variant-selection.js";
import { ProductAddToCart } from "./ProductAddToCart.js";
import { ProductDetailSummary } from "./ProductDetailSummary.js";
import { ProductMediaGallery } from "./ProductMediaGallery.js";
import { ProductRelated } from "./ProductRelated.js";
import { ProductSpecifications } from "./ProductSpecifications.js";
import { ProductVariantSelector } from "./ProductVariantSelector.js";

const UNKNOWN_WISHLIST: WishlistMembershipView = {
  status: "unavailable",
  productIds: [],
};

export function ProductDetailExperience({
  product,
  variants,
  relatedProducts,
  media,
  variantFallback,
  cartFeedback,
}: {
  product: ProductDetailResponse;
  variants: readonly ProductVariant[] | null;
  relatedProducts: readonly RelatedProductCard[] | null;
  media: readonly ResolvedProductMedia[];
  variantFallback: ReactNode;
  cartFeedback: ProductCartFeedback | null;
}) {
  const wishlistFetcher = useFetcher<WishlistMembershipView>();
  const wishlist = wishlistFetcher.data ?? UNKNOWN_WISHLIST;
  const initialSelectedId = useMemo(
    () => selectDefaultVariantId(variants ?? []),
    [variants],
  );
  const [selectedVariantId, setSelectedVariantId] = useState(initialSelectedId);
  const selectedVariant = variants?.find((variant) => variant.id === selectedVariantId) ?? null;

  useEffect(() => {
    if (wishlistFetcher.state === "idle" && wishlistFetcher.data === undefined) {
      void wishlistFetcher.load("/actions/wishlist");
    }
  }, [wishlistFetcher]);

  return (
    <>
      <ProductDetailSummary product={product} />
      <ProductEvaluationActions product={product} wishlist={wishlist} />
      <ProductMediaGallery media={media} selectedVariantId={selectedVariantId} />
      {variants ? (
        <ProductVariantSelector
          variants={variants}
          selectedId={selectedVariantId}
          onSelect={setSelectedVariantId}
        />
      ) : variantFallback}
      <ProductAddToCart variant={selectedVariant} feedback={cartFeedback} />
      <ProductSpecifications specifications={product.specifications} />
      <ProductRelated
        products={relatedProducts}
        wishlist={wishlist}
        compareSeed={{
          id: product.id,
          name: product.name_fa,
          primaryCategoryId: product.primary_category.id,
        }}
      />
    </>
  );
}
