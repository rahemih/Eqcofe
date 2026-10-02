import { Link } from "react-router";
import type { ProductDetailResponse } from "../product-detail/product-detail-contract.js";
import { serializeCompareUrlState } from "./compare-url-state.js";
import { WishlistAction } from "./WishlistAction.js";
import type { WishlistSnapshot } from "./wishlist-snapshot.server.js";

export function ProductEvaluationActions({
  product,
  wishlist,
}: {
  product: ProductDetailResponse;
  wishlist: Pick<WishlistSnapshot, "status" | "productIds">;
}) {
  const wishlisted = wishlist.status === "ready"
    && wishlist.productIds.includes(product.id);
  const compareSearch = serializeCompareUrlState({ productIds: [product.id] });

  return (
    <section className="product-evaluation-actions" aria-labelledby="product-evaluation-title">
      <h2 id="product-evaluation-title">ارزیابی محصول</h2>
      <div className="product-evaluation-actions__grid">
        <WishlistAction
          productId={product.id}
          wishlisted={wishlisted}
          membershipStatus={wishlist.status}
        />
        <div className="compare-entry-action">
          <h3>مقایسه</h3>
          <p>
            این محصول را به مجموعه مقایسه ببرید یا از محصولات مرتبط، محصول دوم را انتخاب کنید.
          </p>
          <Link to={`/compare?${compareSearch}`}>شروع انتخاب مقایسه</Link>
        </div>
      </div>
    </section>
  );
}
