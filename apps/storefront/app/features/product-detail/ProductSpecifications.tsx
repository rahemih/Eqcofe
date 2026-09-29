import type { ProductSpecification } from "./product-detail-contract.js";

export function ProductSpecifications({
  specifications,
}: {
  specifications: readonly ProductSpecification[];
}) {
  return (
    <section className="product-specifications" aria-labelledby="product-specifications-title">
      <h2 id="product-specifications-title">مشخصات محصول</h2>
      {specifications.length ? (
        <dl className="product-specifications__list">
          {specifications.map((specification) => (
            <div key={specification.attribute_value_id} className="product-specifications__item">
              <dt>{specification.name_fa}</dt>
              <dd>{formatSpecificationValue(specification)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="product-specifications__empty">مشخصاتی برای این محصول ثبت نشده است.</p>
      )}
    </section>
  );
}

export function formatSpecificationValue(specification: ProductSpecification): string {
  const value = specification.value_text
    ?? (specification.value_numeric === null || specification.value_numeric === undefined
      ? null
      : new Intl.NumberFormat("fa-IR").format(specification.value_numeric))
    ?? (specification.value_boolean === null || specification.value_boolean === undefined
      ? null
      : specification.value_boolean ? "بله" : "خیر")
    ?? specification.normalized_value
    ?? "—";
  return specification.unit && value !== "—" ? `${value} ${specification.unit}` : value;
}
