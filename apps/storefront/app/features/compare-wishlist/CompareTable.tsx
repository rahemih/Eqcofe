import { Link } from "react-router";
import type { CompareResponse } from "./compare-wishlist-contract.js";
import {
  removeCompareProduct,
  serializeCompareUrlState,
  type CompareUrlState,
} from "./compare-url-state.js";

export function CompareTable({
  result,
  urlState,
}: {
  result: CompareResponse;
  urlState: CompareUrlState;
}) {
  const rows = comparisonRows(result);
  const categoryName = result.products[0]?.category_name ?? "محصولات";

  return (
    <section className="compare-result" aria-labelledby="compare-result-title">
      <header className="compare-result__header">
        <p>دسته مشترک: {categoryName}</p>
        <h2 id="compare-result-title">مقایسه {formatCount(result.products.length)} محصول</h2>
      </header>

      <div className="compare-table-wrap">
        <table className="compare-table">
          <caption>ویژگی‌های قابل مقایسه و قیمت فعلی محصولات</caption>
          <thead>
            <tr>
              <th scope="col">ویژگی</th>
              {result.products.map((product) => (
                <th scope="col" key={product.id}>
                  <span>{product.name_fa}</span>
                  <Link to={`/product/${product.slug}`}>مشاهده محصول</Link>
                  <Link
                    className="compare-remove"
                    to={compareHref(removeCompareProduct(urlState, product.id))}
                  >
                    حذف از مقایسه
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">قیمت فعلی</th>
              {result.products.map((product) => (
                <td key={product.id}>
                  {product.price
                    ? `${formatToman(product.price.current_toman)} تومان`
                    : "قیمت در دسترس نیست"}
                </td>
              ))}
            </tr>
            {rows.map((row) => (
              <tr key={row.attributeId}>
                <th scope="row">{row.nameFa}{row.unit ? ` (${row.unit})` : ""}</th>
                {result.products.map((product) => (
                  <td key={product.id}>{formatSpecification(row.values.get(product.id))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function comparisonRows(result: CompareResponse) {
  const rows = new Map<string, {
    attributeId: string;
    nameFa: string;
    unit: string | null;
    values: Map<string, CompareResponse["products"][number]["specifications"][number]>;
  }>();

  for (const product of result.products) {
    for (const specification of product.specifications) {
      const existing = rows.get(specification.attribute_id);
      if (existing) {
        existing.values.set(product.id, specification);
      } else {
        rows.set(specification.attribute_id, {
          attributeId: specification.attribute_id,
          nameFa: specification.name_fa,
          unit: specification.unit ?? null,
          values: new Map([[product.id, specification]]),
        });
      }
    }
  }

  return [...rows.values()].sort((a, b) => a.nameFa.localeCompare(b.nameFa, "fa"));
}

function formatSpecification(
  specification: CompareResponse["products"][number]["specifications"][number] | undefined,
): string {
  if (!specification) return "—";
  if (specification.value_text !== null && specification.value_text !== undefined) {
    return specification.value_text;
  }
  if (specification.value_numeric !== null && specification.value_numeric !== undefined) {
    return new Intl.NumberFormat("fa-IR").format(specification.value_numeric);
  }
  if (specification.value_boolean !== null && specification.value_boolean !== undefined) {
    return specification.value_boolean ? "بله" : "خیر";
  }
  return specification.normalized_value ?? "—";
}

function compareHref(state: CompareUrlState): string {
  const search = serializeCompareUrlState(state);
  return search ? `/compare?${search}` : "/compare";
}

function formatToman(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value);
}
