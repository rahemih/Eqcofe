import { Link } from "react-router";
import { WishlistAction } from "../compare-wishlist/WishlistAction.js";
import type { WishlistMembershipView } from "../compare-wishlist/wishlist-action-state.js";
import type { ListingProductCardData } from "./listing-contract.js";

export function ListingProductCard({
  product,
  compareSelected,
  compareDisabledReason,
  onCompareToggle,
  wishlist,
}: {
  product: ListingProductCardData;
  compareSelected: boolean;
  compareDisabledReason: string | null;
  onCompareToggle: () => void;
  wishlist: WishlistMembershipView;
}) {
  const image = product.primary_image ?? null;
  const price = product.price ?? null;
  const availability = product.availability;
  const wishlisted = wishlist.status === "ready"
    && wishlist.productIds.includes(product.id);
  const compareBlocked = !compareSelected && Boolean(compareDisabledReason);
  const compareReasonId = compareDisabledReason
    ? `compare-reason-${product.id}`
    : undefined;

  return (
    <article className="listing-card">
      <Link className="listing-card__media" to={`/product/${product.slug}`} aria-label={`مشاهده ${product.name}`}>
        {image ? (
          <img
            src={image.url}
            alt={image.alt_text_fa ?? product.name}
            loading="lazy"
          />
        ) : (
          <span className="listing-card__media-placeholder" aria-hidden="true">
            تصویر موجود نیست
          </span>
        )}
      </Link>

      <div className="listing-card__body">
        {product.brand ? <p className="listing-card__brand">{product.brand.name_fa}</p> : null}
        <h3 className="listing-card__title">
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>

        <p className="listing-card__availability" data-in-stock={availability.in_stock}>
          {availability.sales_enabled
            ? availability.in_stock
              ? "موجود"
              : "ناموجود"
            : "فروش متوقف شده"}
        </p>

        <div className="listing-card__price">
          {price ? (
            <>
              <strong>{formatToman(price.current_toman)} تومان</strong>
              {price.old_toman !== null && price.old_toman !== undefined ? (
                <del>{formatToman(price.old_toman)} تومان</del>
              ) : null}
            </>
          ) : (
            <span>قیمت در دسترس نیست</span>
          )}
        </div>

        <div className="listing-card__evaluation">
          <button
            type="button"
            className="listing-card__compare"
            aria-pressed={compareSelected}
            aria-disabled={compareBlocked}
            aria-describedby={compareBlocked ? compareReasonId : undefined}
            onClick={onCompareToggle}
          >
            {compareSelected ? "حذف از مقایسه" : "انتخاب برای مقایسه"}
          </button>
          {!compareSelected && compareDisabledReason ? (
            <p id={compareReasonId} className="listing-card__compare-reason">
              {compareDisabledReason}
            </p>
          ) : null}
          <WishlistAction
            productId={product.id}
            wishlisted={wishlisted}
            membershipStatus={wishlist.status}
          />
        </div>
      </div>
    </article>
  );
}

function formatToman(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value);
}
