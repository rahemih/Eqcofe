import type { ProductDetailResponse } from "./product-detail-contract.js";
import { formatToman } from "../home/home-merchandising.js";

export function ProductDetailSummary({ product }: { product: ProductDetailResponse }) {
  return (
    <section className="product-detail-summary" aria-labelledby="product-detail-title">
      <div className="product-detail-summary__identity">
        <p className="product-detail-summary__category">{product.primary_category.name_fa}</p>
        <h1 id="product-detail-title">{product.name_fa}</h1>
        {product.short_description ? (
          <p className="product-detail-summary__description">{product.short_description}</p>
        ) : null}
      </div>

      <div className="product-detail-summary__commercial" aria-label="وضعیت قیمت محصول">
        {product.price ? (
          <p className="product-detail-summary__price">{formatToman(product.price.current_toman)}</p>
        ) : (
          <p className="product-detail-summary__price-unavailable">قیمت فعلاً در دسترس نیست</p>
        )}
      </div>
    </section>
  );
}
