import type { ListingProductCardData } from "./listing-contract.js";
import { ListingProductCard } from "./ListingProductCard.js";
import "../../styles/listing.css";

export function ListingGrid({
  products,
  heading,
}: {
  products: readonly ListingProductCardData[];
  heading: string;
}) {
  return (
    <section className="listing-section" aria-labelledby="listing-grid-title">
      <div className="listing-section__heading">
        <h2 id="listing-grid-title">{heading}</h2>
        <span>{products.length.toLocaleString("fa-IR")} مورد</span>
      </div>
      <div className="listing-grid">
        {products.map((product) => (
          <ListingProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
