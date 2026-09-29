import { useMemo, useState } from "react";
import type { ProductVariant } from "./product-detail-contract.js";
import { availabilityLabel, selectDefaultVariantId, variantLabel } from "./product-variant-selection.js";
import { formatToman } from "../home/home-merchandising.js";

export function ProductVariantSelector({ variants }: { variants: readonly ProductVariant[] }) {
  const initialVariantId = useMemo(() => selectDefaultVariantId(variants), [variants]);
  const [selectedId, setSelectedId] = useState(initialVariantId);
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0] ?? null;

  if (!selected) {
    return (
      <section className="product-variants" aria-labelledby="product-variants-title">
        <h2 id="product-variants-title">انتخاب مدل</h2>
        <p className="product-variants__empty">مدلی برای انتخاب در دسترس نیست.</p>
      </section>
    );
  }

  return (
    <section className="product-variants" aria-labelledby="product-variants-title">
      <h2 id="product-variants-title">انتخاب مدل</h2>

      <div className="product-variants__choices" role="radiogroup" aria-label="مدل‌های قابل انتخاب">
        {variants.map((variant) => {
          const checked = variant.id === selected.id;
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={checked}
              className="product-variants__choice"
              data-selected={checked || undefined}
              onClick={() => setSelectedId(variant.id)}
            >
              <span>{variantLabel(variant)}</span>
              <span className="product-variants__choice-stock">{availabilityLabel(variant)}</span>
            </button>
          );
        })}
      </div>

      <div className="product-variant-state" aria-live="polite" aria-atomic="true">
        <p className="product-variant-state__name">{variantLabel(selected)}</p>
        {selected.price ? (
          <div className="product-variant-state__price">
            <strong>{formatToman(selected.price.current_toman)}</strong>
            {selected.price.old_toman && selected.price.old_toman > selected.price.current_toman ? (
              <del>{formatToman(selected.price.old_toman)}</del>
            ) : null}
            {selected.price.discount_percent ? (
              <span>{new Intl.NumberFormat("fa-IR").format(selected.price.discount_percent)}٪ تخفیف</span>
            ) : null}
          </div>
        ) : (
          <p className="product-variant-state__price-unavailable">قیمت این مدل فعلاً در دسترس نیست.</p>
        )}
        <p className="product-variant-state__availability" data-in-stock={selected.availability.in_stock}>
          {availabilityLabel(selected)}
        </p>
      </div>
    </section>
  );
}

