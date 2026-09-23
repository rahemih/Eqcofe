import { Link } from "react-router";
import type { ListingProductCardData } from "./listing-contract.js";

export function ListingProductCard({ product }: { product: ListingProductCardData }) {
  const image = product.primary_image ?? null;
  const price = product.price ?? null;
  const availability = product.availability;

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
      </div>
    </article>
  );
}

function formatToman(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value);
}
