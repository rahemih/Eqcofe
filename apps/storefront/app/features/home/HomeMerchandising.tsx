import { Link } from "react-router";
import { getMessages } from "../../i18n";
import type { HomeProductList } from "./home-data.server";
import {
  deriveHomeMerchandising,
  formatToman,
  productMerchandisingHref,
  type HomeMerchandisingProduct,
} from "./home-merchandising";

export function HomeMerchandising({ products }: { products: HomeProductList }) {
  const messages = getMessages();
  const items = deriveHomeMerchandising(products);

  return (
    <>
      {items.length > 0 ? (
        <section className="home-merchandising" aria-labelledby="home-merchandising-title">
          <div className="home-section-heading">
            <div>
              <p className="home-section-heading__eyebrow">{messages.home.merchandisingEyebrow}</p>
              <h2 id="home-merchandising-title">{messages.home.merchandisingTitle}</h2>
            </div>
            <p>{messages.home.merchandisingBody}</p>
          </div>

          <ul className="home-product-grid">
            {items.map((product) => (
              <li key={product.id}>
                <article className="home-product-card">
                  <div className="home-product-card__media" aria-hidden="true">
                    {messages.home.productMediaPlaceholder}
                  </div>
                  <div className="home-product-card__body">
                    <h3>{product.name}</h3>
                    <p className="home-product-card__price">{formatToman(product.currentToman)}</p>
                    <p className="home-product-card__availability">
                      {availabilityLabel(product)}
                    </p>
                    <Link to={productMerchandisingHref(product)}>
                      {messages.home.productAction}
                      <span className="sr-only"> — {product.name}</span>
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="home-promotions" aria-labelledby="home-promotions-title">
        <div className="home-section-heading">
          <div>
            <p className="home-section-heading__eyebrow">{messages.home.promotionEyebrow}</p>
            <h2 id="home-promotions-title">{messages.home.promotionTitle}</h2>
          </div>
          <p>{messages.home.promotionBody}</p>
        </div>

        <div className="home-promotion-grid">
          <article className="home-promotion-card">
            <h3>{messages.home.buyingGuideTitle}</h3>
            <p>{messages.home.buyingGuideBody}</p>
            <Link to="/articles">{messages.home.buyingGuideAction}</Link>
          </article>

          <article className="home-promotion-card">
            <h3>{messages.home.wholesaleTitle}</h3>
            <p>{messages.home.wholesaleBody}</p>
            <Link to="/wholesale">{messages.home.wholesaleAction}</Link>
          </article>
        </div>
      </section>
    </>
  );
}

function availabilityLabel(product: HomeMerchandisingProduct): string {
  const messages = getMessages();
  if (!product.salesEnabled) return messages.home.salesStopped;
  return product.inStock ? messages.home.inStock : messages.home.outOfStock;
}
