import type { WishlistMembershipView } from "../compare-wishlist/wishlist-action-state.js";
import { ListingGrid, type ListingCompareSeed } from "../listing/ListingGrid.js";
import type { RelatedProductCard } from "./product-detail-contract.js";

export function ProductRelated({
  products,
  wishlist,
  compareSeed,
}: {
  products: readonly RelatedProductCard[] | null;
  wishlist: WishlistMembershipView;
  compareSeed: ListingCompareSeed;
}) {
  if (products === null) {
    return (
      <section className="product-related" aria-labelledby="product-related-title">
        <h2 id="product-related-title">محصولات مرتبط</h2>
        <p>محصولات مرتبط فعلاً در دسترس نیستند.</p>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="product-related" aria-labelledby="product-related-title">
        <h2 id="product-related-title">محصولات مرتبط</h2>
        <p>محصول مرتبط دیگری در این دسته پیدا نشد.</p>
      </section>
    );
  }

  return (
    <ListingGrid
      products={products}
      heading="محصولات مرتبط"
      wishlist={wishlist}
      compareSeed={compareSeed}
    />
  );
}
