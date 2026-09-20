import { Link } from "react-router";
import { getMessages } from "../../i18n";
import type { HomeProductList } from "./home-data.server";
import {
  brandDiscoveryHref,
  categoryDiscoveryHref,
  deriveHomeDiscovery,
} from "./home-discovery";

export function HomeDiscovery({ products }: { products: HomeProductList }) {
  const messages = getMessages();
  const discovery = deriveHomeDiscovery(products);

  if (discovery.categories.length === 0 && discovery.brands.length === 0) {
    return null;
  }

  return (
    <section className="home-discovery" aria-labelledby="home-discovery-title">
      <div className="home-discovery__intro">
        <p className="home-discovery__eyebrow">{messages.home.discoveryEyebrow}</p>
        <h2 id="home-discovery-title">{messages.home.discoveryTitle}</h2>
        <p>{messages.home.discoveryBody}</p>
      </div>

      <div className="home-discovery__groups">
        {discovery.categories.length > 0 ? (
          <section aria-labelledby="home-categories-title">
            <h3 id="home-categories-title">{messages.home.categoriesTitle}</h3>
            <ul className="home-discovery__list">
              {discovery.categories.map((category) => (
                <li key={category.id}>
                  <Link
                    to={categoryDiscoveryHref(category)}
                    aria-label={`${messages.home.categoryLinkLabel} ${category.nameFa}`}
                  >
                    {category.nameFa}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {discovery.brands.length > 0 ? (
          <section aria-labelledby="home-brands-title">
            <h3 id="home-brands-title">{messages.home.brandsTitle}</h3>
            <ul className="home-discovery__list">
              {discovery.brands.map((brand) => (
                <li key={brand.id}>
                  <Link
                    to={brandDiscoveryHref(brand)}
                    aria-label={`${messages.home.brandSearchLabel} ${brand.nameFa}`}
                  >
                    {brand.nameFa}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </section>
  );
}
